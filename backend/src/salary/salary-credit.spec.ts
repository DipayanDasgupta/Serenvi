import { SalaryService } from './salary.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Month-end credit tests: wallet credit + ledger + pay record + pending reset
 * all commit together, and a cron retry after a successful run must not pay
 * twice (the (distributorId, month, year) record is the idempotency guard).
 */
class FakePrisma {
  distributors = new Map<string, any>();
  ledger: Array<any> = [];
  payRecords: Array<any> = [];
  failLedgerWrite = false;
  forceDuplicatePay = false;

  distributor = {
    findMany: async ({ where }: any = {}) => {
      let rows = [...this.distributors.values()];
      if (where?.currentLeadershipSalary?.gt !== undefined) {
        rows = rows.filter((r) =>
          r.currentLeadershipSalary.gt(where.currentLeadershipSalary.gt),
        );
      }
      return rows.map((r) => ({ ...r }));
    },
    findUnique: async ({ where }: any) => {
      const d = this.distributors.get(where.id);
      return d ? { ...d } : null;
    },
    update: async ({ where, data }: any) => {
      const d = this.distributors.get(where.id)!;
      if (data.walletBalance?.increment) {
        d.walletBalance = d.walletBalance.plus(data.walletBalance.increment);
      }
      if (data.currentLeadershipSalary !== undefined) {
        d.currentLeadershipSalary = new Decimal(data.currentLeadershipSalary);
      }
      this.distributors.set(where.id, d);
      return { ...d };
    },
    updateMany: async () => ({ count: 0 }),
  };

  walletTransaction = {
    create: async ({ data }: any) => {
      if (this.failLedgerWrite) {
        throw new Error('simulated crash: ledger write failed');
      }
      this.ledger.push(data);
      return data;
    },
  };

  leadershipSalary = {
    create: async ({ data }: any) => {
      const dupe = this.payRecords.find(
        (r) =>
          r.distributorId === data.distributorId &&
          r.month === data.month &&
          r.year === data.year,
      );
      if (dupe || this.forceDuplicatePay) {
        const err: any = new Error('unique');
        err.code = 'P2002';
        throw err;
      }
      const row = { id: `ls-${this.payRecords.length + 1}`, ...data };
      this.payRecords.push(row);
      return row;
    },
  };

  sale = { aggregate: async () => ({ _sum: { saleAmount: new Decimal(0) } }) };

  // Real transactions roll back every write when the callback throws. Snapshot
  // and restore so an aborted credit cannot leave a partial wallet balance.
  $transaction = async (cb: any) => {
    const balances = new Map(
      [...this.distributors.entries()].map(([k, v]) => [k, v.walletBalance]),
    );
    const pendings = new Map(
      [...this.distributors.entries()].map(([k, v]) => [k, v.currentLeadershipSalary]),
    );
    const ledgerLength = this.ledger.length;
    const payLength = this.payRecords.length;
    try {
      return await cb(this);
    } catch (error) {
      for (const [k, v] of this.distributors) {
        v.walletBalance = balances.get(k)!;
        v.currentLeadershipSalary = pendings.get(k)!;
      }
      this.ledger.length = ledgerLength;
      this.payRecords.length = payLength;
      throw error;
    }
  };
}

function seed(prisma: FakePrisma, id: string, pending: number) {
  prisma.distributors.set(id, {
    id,
    name: id,
    status: 'ACTIVE',
    sponsorId: 'root',
    monthlySales: new Decimal(50000),
    level1Sales: new Decimal(50000),
    teamMonthlySales: new Decimal(50000),
    teamSales: new Decimal(50000),
    walletBalance: new Decimal(0),
    currentLeadershipSalary: new Decimal(pending),
    currentLeadershipRank: 5,
  });
}

/** 30 Sep 2026 — an unambiguous last-day-of-month date. */
const LAST_DAY = new Date(2026, 8, 30, 23, 59, 0);

function runAsLastDay(service: SalaryService) {
  return service.creditEndOfMonthSalary(LAST_DAY);
}

describe('SalaryService month-end credit', () => {
  it('credits wallet, logs, records the pay row and clears pending', async () => {
    const prisma = new FakePrisma();
    seed(prisma, 'a', 1300);
    const service = new SalaryService(prisma as any);

    await runAsLastDay(service);

    expect(prisma.distributors.get('a').walletBalance.toNumber()).toBe(1300);
    expect(prisma.distributors.get('a').currentLeadershipSalary.toNumber()).toBe(0);
    expect(prisma.ledger).toHaveLength(1);
    expect(prisma.ledger[0].type).toBe('LEADERSHIP_SALARY');
    expect(prisma.payRecords).toHaveLength(1);
    const rec = prisma.payRecords[0];
    // Recorded against the month that was just closed.
    expect(rec.month).toBe(9);
    expect(rec.year).toBe(2026);
    expect(rec.salaryAmount.toNumber()).toBe(1300);
  });

  it('never pays twice on a cron retry', async () => {
    const prisma = new FakePrisma();
    seed(prisma, 'a', 1300);
    const service = new SalaryService(prisma as any);

    await runAsLastDay(service);
    expect(prisma.distributors.get('a').walletBalance.toNumber()).toBe(1300);

    // Simulate a retry where the pay row already exists for this month.
    prisma.forceDuplicatePay = true;
    prisma.distributors.get('a').currentLeadershipSalary = new Decimal(1300);
    await runAsLastDay(service);

    // Wallet untouched, duplicate skipped, pending still cleared.
    expect(prisma.distributors.get('a').walletBalance.toNumber()).toBe(1300);
    expect(prisma.ledger).toHaveLength(1);
    expect(prisma.payRecords).toHaveLength(1);
    expect(prisma.distributors.get('a').currentLeadershipSalary.toNumber()).toBe(0);
  });

  it('does nothing outside the last day of the month', async () => {
    const prisma = new FakePrisma();
    seed(prisma, 'a', 1300);
    const service = new SalaryService(prisma as any);

    await service.creditEndOfMonthSalary(new Date(2026, 8, 15, 23, 59, 0));

    expect(prisma.distributors.get('a').walletBalance.toNumber()).toBe(0);
    expect(prisma.ledger).toHaveLength(0);
    expect(prisma.payRecords).toHaveLength(0);
  });

  it('is atomic: a crash mid-credit leaves the wallet untouched', async () => {
    const prisma = new FakePrisma();
    seed(prisma, 'a', 1300);
    prisma.failLedgerWrite = true;
    const service = new SalaryService(prisma as any);

    await expect(runAsLastDay(service)).rejects.toThrow(/simulated crash/);
    expect(prisma.distributors.get('a').walletBalance.toNumber()).toBe(0);
    expect(prisma.distributors.get('a').currentLeadershipSalary.toNumber()).toBe(1300);
    expect(prisma.ledger).toHaveLength(0);
  });
});
