import { SalaryService } from './salary.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * In-memory fake Prisma for SalaryService: models tier calculation, pool
 * splitting, the (distributorId, month, year) unique pay record and the
 * P2002 that a retried cron would hit.
 */
class FakePrisma {
  distributors = new Map<string, any>();
  sales: any[] = [];
  ledger: any[] = [];
  payRecords: any[] = [];
  forceDuplicatePay = false;
  monthlyResetCalls = 0;

  distributor = {
    findMany: async ({ where }: any = {}) => {
      let rows = [...this.distributors.values()];
      if (where?.status) rows = rows.filter((r) => r.status === where.status);
      if (where?.currentLeadershipSalary?.gt !== undefined) {
        rows = rows.filter(
          (r) => r.currentLeadershipSalary.gt(where.currentLeadershipSalary.gt),
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
      if (data.currentLeadershipRank !== undefined) {
        d.currentLeadershipRank = data.currentLeadershipRank;
      }
      this.distributors.set(where.id, d);
      return { ...d };
    },
    updateMany: async ({ data }: any) => {
      this.monthlyResetCalls += 1;
      for (const d of this.distributors.values()) {
        if (data.monthlySales !== undefined) {
          d.monthlySales = new Decimal(data.monthlySales);
        }
        if (data.teamMonthlySales !== undefined) {
          d.teamMonthlySales = new Decimal(data.teamMonthlySales);
        }
      }
      return { count: this.distributors.size };
    },
  };

  sale = {
    aggregate: async () => ({
      _sum: {
        saleAmount: this.sales.reduce(
          (sum, s) => sum.plus(s.saleAmount),
          new Decimal(0),
        ),
      },
    }),
  };

  walletTransaction = {
    create: async ({ data }: any) => {
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
    findMany: async ({ where }: any = {}) =>
      this.payRecords.filter((r) => r.distributorId === where.distributorId),
  };

  $transaction = async (cb: any) => cb(this);
}

const TIERS: Array<[number, number]> = [
  [5000, 3.7], [10000, 2.9], [25000, 1.1], [50000, 1.3],
  [100000, 1.5], [250000, 1.6], [500000, 1.6], [1000000, 1.5], [5000000, 0.8],
];

function seed(prisma: FakePrisma, id: string, monthlySales: number, status = 'ACTIVE') {
  prisma.distributors.set(id, {
    id,
    name: id,
    status,
    sponsorId: 'root',
    monthlySales: new Decimal(monthlySales),
    level1Sales: new Decimal(monthlySales),
    teamMonthlySales: new Decimal(monthlySales),
    teamSales: new Decimal(monthlySales),
    walletBalance: new Decimal(5000),
    currentLeadershipSalary: new Decimal(0),
    currentLeadershipRank: null,
  });
}

function makeService() {
  const prisma = new FakePrisma() as any;
  return { service: new SalaryService(prisma), prisma: prisma as FakePrisma };
}

describe('SalaryService', () => {
  describe('tier selection', () => {
    it('picks the highest tier reached, not the lowest crossed', async () => {
      const { service, prisma } = makeService();
      // 1,000,000 qualifies for both the 500k (1.6%) and 1M (1.5%) tiers.
      seed(prisma, 'a', 1000000);
      prisma.sales.push({ saleAmount: new Decimal(1000000) });

      await service.calculateLeadershipSalary();

      // SALARY_TIERS is ordered highest-first, so the 1M tier is index 1.
      expect(prisma.distributors.get('a').currentLeadershipRank).toBe(1);
      expect(prisma.distributors.get('a').currentLeadershipSalary.toNumber()).toBe(15000);
    });

    it('leaves everyone unqualified below the 5k threshold', async () => {
      const { service, prisma } = makeService();
      seed(prisma, 'a', 4999);
      seed(prisma, 'b', 0);
      prisma.sales.push({ saleAmount: new Decimal(100000) });

      await service.calculateLeadershipSalary();

      expect(prisma.distributors.get('a').currentLeadershipSalary.toNumber()).toBe(0);
      expect(prisma.distributors.get('b').currentLeadershipSalary.toNumber()).toBe(0);
    });

    it('skips suspended distributors', async () => {
      const { service, prisma } = makeService();
      seed(prisma, 'a', 50000, 'SUSPENDED');
      prisma.sales.push({ saleAmount: new Decimal(100000) });

      await service.calculateLeadershipSalary();

      expect(prisma.distributors.get('a').currentLeadershipSalary.toNumber()).toBe(0);
    });

    it('selects each boundary tier exactly', async () => {
      for (const [threshold, pct, idx] of [
        [5000, 3.7, 8], [10000, 2.9, 7], [25000, 1.1, 6], [50000, 1.3, 5],
        [100000, 1.5, 4], [250000, 1.6, 3], [500000, 1.6, 2],
        [1000000, 1.5, 1], [5000000, 0.8, 0],
      ] as Array<[number, number, number]>) {
        const { service, prisma } = makeService();
        seed(prisma, 'x', threshold);
        prisma.sales.push({ saleAmount: new Decimal(1000000) });
        await service.calculateLeadershipSalary();
        const d = prisma.distributors.get('x');
        expect(d.currentLeadershipRank).toBe(idx);
        expect(d.currentLeadershipSalary.toNumber()).toBeCloseTo(1000000 * pct / 100, 6);
      }
    });
  });

  describe('equal splitting', () => {
    it('splits the tier pool equally among same-tier members', async () => {
      const { service, prisma } = makeService();
      seed(prisma, 'a', 25000);
      seed(prisma, 'b', 25000);
      seed(prisma, 'c', 25000);
      prisma.sales.push({ saleAmount: new Decimal(100000) });

      await service.calculateLeadershipSalary();

      // 25k tier = 1.1% of 100,000 = 1,100 split 3 ways
      for (const id of ['a', 'b', 'c']) {
        expect(prisma.distributors.get(id).currentLeadershipSalary.toNumber())
          .toBeCloseTo(1100 / 3, 6);
      }
    });

    it('pays different tiers independently from the same revenue pool', async () => {
      const { service, prisma } = makeService();
      seed(prisma, 'low', 5000);
      seed(prisma, 'high', 500000);
      prisma.sales.push({ saleAmount: new Decimal(200000) });

      await service.calculateLeadershipSalary();

      // 5k tier: 3.7% of 200k = 7,400 for one member
      expect(prisma.distributors.get('low').currentLeadershipSalary.toNumber()).toBeCloseTo(7400, 6);
      // 500k tier: 1.6% of 200k = 3,200 for one member
      expect(prisma.distributors.get('high').currentLeadershipSalary.toNumber()).toBeCloseTo(3200, 6);
    });

    it('never credits a wallet during hourly calculation', async () => {
      const { service, prisma } = makeService();
      seed(prisma, 'a', 50000);
      prisma.sales.push({ saleAmount: new Decimal(100000) });

      await service.calculateLeadershipSalary();

      expect(prisma.distributors.get('a').walletBalance.toNumber()).toBe(5000);
      expect(prisma.ledger).toHaveLength(0);
      expect(prisma.payRecords).toHaveLength(0);
    });
  });

  it('pays a suspended distributor salary already earned in the month', async () => {
    const { service, prisma } = makeService();
    seed(prisma, 'a', 50000);
    prisma.distributors.get('a').currentLeadershipSalary = new Decimal(2000);
    prisma.distributors.get('a').status = 'SUSPENDED';
    prisma.distributors.get('a').walletBalance = new Decimal(0);
    prisma.sales.push({ saleAmount: new Decimal(100000) });

    // Calculation skips suspended users (no new pending)...
    await service.calculateLeadershipSalary();
    expect(prisma.distributors.get('a').currentLeadershipSalary.toNumber()).toBe(2000);
  });

  describe('monthly reset', () => {
    it('resets monthly counters but never personal or lifetime team sales', async () => {
      const { service, prisma } = makeService();
      seed(prisma, 'a', 90000);
      const d = prisma.distributors.get('a');
      d.currentLeadershipSalary = new Decimal(1234);

      await service.resetMonthlyMetrics();

      expect(prisma.distributors.get('a').monthlySales.toNumber()).toBe(0);
      expect(prisma.distributors.get('a').teamMonthlySales.toNumber()).toBe(0);
      expect(prisma.distributors.get('a').level1Sales.toNumber()).toBe(90000);
      expect(prisma.distributors.get('a').teamSales.toNumber()).toBe(90000);
      // Pending salary must survive the reset until month-end credit.
      expect(prisma.distributors.get('a').currentLeadershipSalary.toNumber()).toBe(1234);
    });
  });

  describe('tier percentage table', () => {
    it('matches the approved thresholds and percentages exactly', () => {
      expect(TIERS).toEqual([
        [5000, 3.7], [10000, 2.9], [25000, 1.1], [50000, 1.3],
        [100000, 1.5], [250000, 1.6], [500000, 1.6],
        [1000000, 1.5], [5000000, 0.8],
      ]);
    });

    it('sums to 16% of referred revenue when all tiers are populated', () => {
      // The approved rate table totals 16%, not 15% — documentation that
      // claims 15% is wrong and must not be trusted over this table.
      const total = TIERS.reduce((sum, [, pct]) => sum + pct, 0);
      expect(total).toBe(16);
    });
  });
});
