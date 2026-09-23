import { WalletService } from './wallet.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Withdrawal tests: request-time reservation prevents two pending requests
 * from spending the same balance, and approve/reject are atomic + idempotent.
 */
class FakePrisma {
  distributors = new Map<string, any>();
  withdrawals = new Map<string, any>();
  ledger: any[] = [];
  balanceReadCount = 0;

  distributor = {
    findUnique: async ({ where }: any) => {
      if (where.id) {
        // Return the live record (like Prisma), not a snapshot copy — a stale
        // copy would hide a previous reservation from the pre-check.
        return this.distributors.get(where.id) ?? null;
      }
      if (where.referralCode) {
        return [...this.distributors.values()].find(
          (d) => d.referralCode === where.referralCode,
        ) ?? null;
      }
      return null;
    },
    // Conditional atomic update: only applies when the stored balance still
    // satisfies the `gte` guard — the same guarantee Prisma's updateMany gives.
    updateMany: async ({ where, data }: any) => {
      const d = this.distributors.get(where.id);
      if (!d) return { count: 0 };
      if (where.walletBalance?.gte !== undefined) {
        if (d.walletBalance.lt(where.walletBalance.gte)) return { count: 0 };
      }
      if (data.walletBalance?.decrement) {
        d.walletBalance = d.walletBalance.minus(data.walletBalance.decrement);
      }
      if (data.walletBalance?.increment) {
        d.walletBalance = d.walletBalance.plus(data.walletBalance.increment);
      }
      this.distributors.set(where.id, d);
      return { count: 1 };
    },
    update: async ({ where, data }: any) => {
      const d = this.distributors.get(where.id)!;
      if (data.walletBalance?.increment) {
        d.walletBalance = d.walletBalance.plus(data.walletBalance.increment);
      }
      if (data.walletBalance?.decrement) {
        d.walletBalance = d.walletBalance.minus(data.walletBalance.decrement);
      }
      this.distributors.set(where.id, d);
      return { ...d };
    },
  };

  withdrawalRequest = {
    findUnique: async ({ where }: any) => this.withdrawals.get(where.id) ?? null,
    findUniqueOrThrow: async ({ where }: any) => {
      const w = this.withdrawals.get(where.id);
      if (!w) throw new Error('Withdrawal not found');
      return { ...w };
    },
    create: async ({ data }: any) => {
      const row = { id: `w-${this.withdrawals.size + 1}`, ...data, requestedAt: new Date() };
      this.withdrawals.set(row.id, row);
      return row;
    },
    updateMany: async ({ where, data }: any) => {
      const w = this.withdrawals.get(where.id);
      if (!w || (where.status && w.status !== where.status)) return { count: 0 };
      Object.assign(w, data);
      return { count: 1 };
    },
    update: async ({ where, data }: any) => {
      const w = this.withdrawals.get(where.id)!;
      Object.assign(w, data);
      return { ...w };
    },
  };

  walletTransaction = {
    create: async ({ data }: any) => {
      this.ledger.push(data);
      return data;
    },
    findFirst: async ({ where }: any) =>
      this.ledger.find(
        (t) => t.referenceId === where.referenceId && t.type === where.type,
      ) ?? null,
  };

  // Real DB transactions are serialized: concurrent withdrawals cannot both
  // read the same pre-decrement balance. Model that with a promise chain.
  private queue: Promise<any> = Promise.resolve();
  $transaction = async (cb: any) => {
    const run = this.queue.then(() => cb(this));
    this.queue = run.catch(() => undefined);
    return run;
  };
}

function makeService(balance: number) {
  const prisma = new FakePrisma() as any;
  prisma.distributors.set('d1', {
    id: 'd1',
    name: 'Tester',
    email: 't@example.com',
    walletBalance: new Decimal(balance),
    bankAccount: '1234567890',
    bankIFSC: 'TEST0000001',
    bankAccountHolder: 'Tester',
    status: 'ACTIVE',
    tPin: null,
  });
  const service = new WalletService(prisma, { get: () => undefined } as any);
  return { service, prisma: prisma as FakePrisma };
}

const BANK = {
  bankAccount: '1234567890',
  bankIFSC: 'TEST0000001',
  accountHolder: 'Tester',
};

describe('WalletService withdrawals', () => {
  describe('request-time reservation', () => {
    it('reserves the amount immediately so it cannot back two requests', async () => {
      const { service, prisma } = makeService(1000);

      // ₹600 leaves ₹400 available — below the ₹500 minimum, so the next
      // request must be refused against the reserved balance.
      await service.requestWithdrawal('d1', 600, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder);
      expect(prisma.distributors.get('d1').walletBalance.toNumber()).toBe(400);

      await expect(
        service.requestWithdrawal('d1', 500, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder),
      ).rejects.toThrow(/Insufficient/i);
      expect(prisma.distributors.get('d1').walletBalance.toNumber()).toBe(400);
    });

    it('allows a second request when the balance genuinely covers it', async () => {
      const { service, prisma } = makeService(1000);

      await service.requestWithdrawal('d1', 500, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder);
      await service.requestWithdrawal('d1', 500, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder);

      expect(prisma.distributors.get('d1').walletBalance.toNumber()).toBe(0);
      expect(prisma.withdrawals.size).toBe(2);
    });

    it('logs a negative reservation row for the audit trail', async () => {
      const { service, prisma } = makeService(1000);
      await service.requestWithdrawal('d1', 600, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder);

      const row = prisma.ledger.find((t) => t.type === 'WITHDRAWAL')!;
      expect(row.amount.toNumber()).toBe(-600);
    });

    it('enforces the ₹500 minimum', async () => {
      const { service } = makeService(5000);
      await expect(
        service.requestWithdrawal('d1', 499, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder),
      ).rejects.toThrow(/Minimum/i);
    });

    it('calculates fee as max(2%, ₹20) and net as amount - fee', async () => {
      const { service, prisma } = makeService(5000);
      const result = await service.requestWithdrawal(
        'd1', 1000, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder,
      );
      expect(result.fee).toBe(20); // 2% = 20 → ₹20
      expect(result.netAmount).toBe(980);

      const big = await service.requestWithdrawal(
        'd1', 2000, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder,
      );
      expect(big.fee).toBe(40); // 2% of 2000 = 40 > ₹20
      expect(big.netAmount).toBe(1960);
    });

    it('requires verified bank details', async () => {
      const { service, prisma } = makeService(5000);
      prisma.distributors.get('d1').bankAccount = null;
      await expect(
        service.requestWithdrawal('d1', 500, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder),
      ).rejects.toThrow(/bank details/i);
    });
  });

  describe('approval', () => {
    it('is idempotent — approving twice pays once', async () => {
      const { service, prisma } = makeService(1000);
      await service.requestWithdrawal('d1', 500, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder);
      const id = [...prisma.withdrawals.keys()][0];

      await service.approveWithdrawal(id);
      await service.approveWithdrawal(id);
      await service.approveWithdrawal(id);

      // Reserved at request (1000 → 500). Approval must not debit again.
      expect(prisma.distributors.get('d1').walletBalance.toNumber()).toBe(500);
      expect(prisma.ledger.filter((t) => t.type === 'WITHDRAWAL')).toHaveLength(1);
    });

    it('debits a legacy PENDING row that was never reserved', async () => {
      const { service, prisma } = makeService(1000);
      prisma.withdrawals.set('legacy', {
        id: 'legacy',
        distributorId: 'd1',
        amount: new Decimal(500),
        fee: new Decimal(20),
        bankAccount: '1',
        bankIFSC: 'T',
        accountHolder: 'T',
        status: 'PENDING',
        requestedAt: new Date(),
      });

      await service.approveWithdrawal('legacy');
      expect(prisma.distributors.get('d1').walletBalance.toNumber()).toBe(500);
      expect(prisma.ledger.filter((t) => t.type === 'WITHDRAWAL')).toHaveLength(1);
    });

    it('rejects approving an already-rejected request', async () => {
      const { service, prisma } = makeService(1000);
      await service.requestWithdrawal('d1', 500, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder);
      const id = [...prisma.withdrawals.keys()][0];
      await service.rejectWithdrawal(id, 'bank issue');
      await expect(service.approveWithdrawal(id)).rejects.toThrow(/Cannot approve/i);
    });
  });

  describe('rejection', () => {
    it('releases the reservation exactly once', async () => {
      const { service, prisma } = makeService(1000);
      await service.requestWithdrawal('d1', 500, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder);
      const id = [...prisma.withdrawals.keys()][0];

      await service.rejectWithdrawal(id, 'wrong IFSC');
      expect(prisma.distributors.get('d1').walletBalance.toNumber()).toBe(1000);

      // Retry must not credit twice.
      await service.rejectWithdrawal(id, 'wrong IFSC');
      expect(prisma.distributors.get('d1').walletBalance.toNumber()).toBe(1000);
    });

    it('re-releases are blocked by status', async () => {
      const { service, prisma } = makeService(1000);
      await service.requestWithdrawal('d1', 500, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder);
      const id = [...prisma.withdrawals.keys()][0];
      await service.approveWithdrawal(id);
      await expect(service.rejectWithdrawal(id, 'late')).rejects.toThrow(/Cannot reject/i);
      expect(prisma.distributors.get('d1').walletBalance.toNumber()).toBe(500);
    });
  });

  describe('concurrent requests (race)', () => {
    it('cannot both reserve the same ₹700 from a ₹1000 balance', async () => {
      const { service, prisma } = makeService(1000);

      const attempts = await Promise.allSettled([
        service.requestWithdrawal('d1', 700, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder),
        service.requestWithdrawal('d1', 700, BANK.bankAccount, BANK.bankIFSC, BANK.accountHolder),
      ]);

      const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
      expect(fulfilled).toHaveLength(1);
      expect(prisma.distributors.get('d1').walletBalance.toNumber()).toBe(300);
      expect(prisma.withdrawals.size).toBe(1);
    });
  });
});
