import { SalesService } from './sales.service';
import { CommissionService } from '../commission/commission.service';
import { AchievementService } from '../achievements/achievement.service';
import { SalaryService } from '../salary/salary.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Sale processing tests: duplicate-sale protection (idempotency key and
 * commission-level uniqueness), correct sales-metric propagation to the
 * sponsor and every upline, and non-WALLET rejection.
 */
class FakePrisma {
  balances = new Map<string, Decimal>();
  totalSales = new Map<string, Decimal>();
  level1Sales = new Map<string, Decimal>();
  monthlySales = new Map<string, Decimal>();
  teamSales = new Map<string, Decimal>();
  teamMonthlySales = new Map<string, Decimal>();
  sales: Array<any> = [];
  ledger: Array<any> = [];
  stock = new Map<string, number>();
  commissionSaleIds = new Set<string>();
  byIdempotencyKey = new Map<string, any>();
  sponsors: Record<string, string | null> = {};

  sale = {
    findUnique: async ({ where, include }: any) => {
      let row: any;
      if (where.idempotencyKey) {
        row = this.byIdempotencyKey.get(where.idempotencyKey) ?? null;
      } else {
        row = this.sales.find((s) => s.id === where.id) ?? null;
      }
      if (!row) return null;
      if (!include) return row;
      return {
        ...row,
        seller: { id: row.sellerId, name: row.sellerId },
        product: { id: row.productId, name: row.productId, price: new Decimal(100) },
      };
    },
    create: async ({ data }: any) => {
      const id = `sale-${this.sales.length + 1}`;
      const row = { id, createdAt: new Date(), ...data };
      this.sales.push(row);
      if (data.idempotencyKey) this.byIdempotencyKey.set(data.idempotencyKey, row);
      return row;
    },
  };

  distributor = {
    findUnique: async ({ where }: any) => {
      if (where.email) return this.userFor(where.email) ?? null;
      return {
        id: where.id,
        name: where.id,
        sponsorId: this.sponsors?.[where.id] ?? null,
        walletBalance: this.balances.get(where.id) ?? new Decimal(0),
      };
    },
    update: async ({ where, data }: any) => {
      const id = where.id;
      if (data.walletBalance?.decrement) {
        const cur = this.balances.get(id) ?? new Decimal(0);
        if (cur.lessThan(data.walletBalance.decrement)) {
          throw new Error('Insufficient wallet balance. Please deposit funds first.');
        }
        this.balances.set(id, cur.minus(data.walletBalance.decrement));
      }
      if (data.walletBalance?.increment) {
        const cur = this.balances.get(id) ?? new Decimal(0);
        this.balances.set(id, cur.plus(data.walletBalance.increment));
      }
      const metrics: Record<string, Map<string, Decimal>> = {
        totalSales: this.totalSales,
        level1Sales: this.level1Sales,
        monthlySales: this.monthlySales,
        teamSales: this.teamSales,
        teamMonthlySales: this.teamMonthlySales,
      };
      for (const field of Object.keys(metrics)) {
        const bucket = metrics[field];
        if (data[field]?.increment) {
          bucket.set(id, (bucket.get(id) ?? new Decimal(0)).plus(data[field].increment));
        }
      }
      return { id, walletBalance: this.balances.get(id) ?? new Decimal(0) };
    },
  };

  userFor(email: string) {
    const entry = Object.entries(this.sponsors).find(
      ([, sponsor]) => sponsor === `email:${email}`,
    );
    return entry ? { id: entry[0] } : null;
  }

  product = {
    findUnique: async ({ where }: any) => ({
      id: where.id,
      name: where.id,
      price: new Decimal(100),
      type: 'DIGITAL',
      stockQuantity: null,
      isActive: true,
    }),
    update: async () => ({}),
  };

  walletTransaction = {
    create: async ({ data }: any) => {
      this.ledger.push(data);
      return data;
    },
  };

  mLMTreeNode = {
    // MLMTreeNode is a materialized path: the rows for a descendant already
    // contain EVERY ancestor at its relative depth. Expand the sponsor map
    // into that shape so the fake matches production semantics.
    findMany: async ({ where }: any) => {
      const max = where.depth?.lte ?? 15;
      const rows: any[] = [];
      let cur = where.descendantId;
      let depth = 1;
      while (depth <= max) {
        const sponsor = this.sponsors[cur];
        if (!sponsor) break;
        rows.push({ ancestorId: sponsor, descendantId: where.descendantId, depth });
        cur = sponsor;
        depth += 1;
      }
      return rows;
    },
  };

  commission = {
    findFirst: async ({ where }: any) =>
      this.commissionSaleIds.has(where.saleId) ? { id: 'c1' } : null,
    create: async ({ data }: any) => {
      // Real unique constraint is (saleId, level).
      if (this.commissionRows.some((c: any) => c.saleId === data.saleId && c.level === data.level)) {
        const err: any = new Error('unique');
        err.code = 'P2002';
        throw err;
      }
      this.commissionSaleIds.add(data.saleId);
      const row = { id: `c-${this.commissionRows.length + 1}`, ...data };
      this.commissionRows.push(row);
      return row;
    },
  };
  commissionRows: Array<any> = [];

  $transaction = async (cb: any) => cb(this);
}

function makeService(sellers: Record<string, string | null>, balance = 100000) {
  const prisma = new FakePrisma();
  prisma.sponsors = { ...sellers };
  for (const id of Object.keys(sellers)) {
    prisma.balances.set(id, new Decimal(balance));
  }
  const db = prisma as any;
  const commission = new CommissionService(db);
  const achievements = { checkAndClaimAchievements: async () => {}, syncAchievements: async () => {} } as any;
  const salary = { recalculateAfterSale: async () => {} } as any;
  const service = new SalesService(db, commission, achievements, salary);
  return { service, prisma };
}

describe('SalesService purchase flow', () => {
  it('rejects non-WALLET payment methods', async () => {
    const { service } = makeService({ buyer: 'sponsor' });
    await expect(
      service.purchaseProduct('buyer', 'p1', 1, 'UPI'),
    ).rejects.toThrow(/wallet-only/i);
  });

  it('propagates personal sales to the sponsor and team sales to every upline', async () => {
    // buyer -> sponsor (L1) -> grand (L2) -> great (L3)
    const { service, prisma } = makeService({
      buyer: 'sponsor',
      sponsor: 'grand',
      grand: 'great',
      great: null,
    });

    await service.purchaseProduct('buyer', 'p1', 2, 'WALLET');

    // Seller's own/lifetime sales.
    expect(prisma.totalSales.get('buyer')?.toNumber()).toBe(200);
    // Sponsor personal (level1) + monthly.
    expect(prisma.level1Sales.get('sponsor')?.toNumber()).toBe(200);
    expect(prisma.monthlySales.get('sponsor')?.toNumber()).toBe(200);
    // Every upline's lifetime + monthly team metrics.
    for (const id of ['sponsor', 'grand', 'great']) {
      expect(prisma.teamSales.get(id)?.toNumber()).toBe(200);
      expect(prisma.teamMonthlySales.get(id)?.toNumber()).toBe(200);
    }
    // Team metrics must NOT be applied to the seller.
    expect(prisma.teamSales.get('buyer')).toBeUndefined();
  });

  it('caps team propagation at 15 levels', async () => {
    const sellers: Record<string, string | null> = { buyer: 'l1' };
    for (let i = 1; i <= 25; i++) sellers[`l${i}`] = i === 25 ? null : `l${i + 1}`;
    const { service, prisma } = makeService(sellers);

    await service.purchaseProduct('buyer', 'p1', 1, 'WALLET');

    const withTeam = [...prisma.teamSales.keys()];
    expect(withTeam).toHaveLength(15);
    expect(withTeam).toContain('l15');
    expect(withTeam).not.toContain('l16');
  });

  it('does not create leader-only team sales when the seller has no upline', async () => {
    const { service, prisma } = makeService({ buyer: null });
    await service.purchaseProduct('buyer', 'p1', 1, 'WALLET');
    expect(prisma.teamSales.size).toBe(0);
    expect(prisma.level1Sales.size).toBe(0);
    expect(prisma.totalSales.get('buyer')?.toNumber()).toBe(100);
  });

  it('debits the buyer and logs a negative purchase row', async () => {
    const { service, prisma } = makeService({ buyer: 'sponsor' });
    await service.purchaseProduct('buyer', 'p1', 3, 'WALLET');
    expect(prisma.balances.get('buyer')?.toNumber()).toBe(99700);
    const row = prisma.ledger.find((t) => t.type === 'PRODUCT_PURCHASE')!;
    expect(row.amount.toNumber()).toBe(-300);
  });

  it('rejects when the wallet cannot cover the purchase', async () => {
    const prisma = new FakePrisma();
    prisma.sponsors = { buyer: 'sponsor' };
    prisma.balances.set('buyer', new Decimal(50));
    const db = prisma as any;
    const service = new SalesService(
      db,
      new CommissionService(db),
      { checkAndClaimAchievements: async () => {} } as any,
      { recalculateAfterSale: async () => {} } as any,
    );
    await expect(service.purchaseProduct('buyer', 'p1', 1, 'WALLET')).rejects.toThrow(
      /Insufficient wallet balance/i,
    );
    expect(prisma.sales).toHaveLength(0);
  });

  describe('duplicate sale processing', () => {
    it('returns the original sale for a repeated idempotency key', async () => {
      const { service, prisma } = makeService({ buyer: 'sponsor' });

      const first = await service.purchaseProduct('buyer', 'p1', 1, 'WALLET', 'key-1');
      const second = await service.purchaseProduct('buyer', 'p1', 1, 'WALLET', 'key-1');

      expect(second.id).toBe(first.id);
      expect(prisma.sales).toHaveLength(1);
      // Charged once, commissioned once.
      expect(prisma.balances.get('buyer')?.toNumber()).toBe(99900);
      expect(prisma.commissionSaleIds.size).toBe(1);
      expect(prisma.totalSales.get('buyer')?.toNumber()).toBe(100);
    });

    it('never distributes commissions twice for one sale', async () => {
      const { service, prisma } = makeService({ buyer: 'sponsor', sponsor: 'grand', grand: null });
      const sponsorBefore = prisma.balances.get('sponsor')!.toNumber();
      const grandBefore = prisma.balances.get('grand')!.toNumber();

      await service.purchaseProduct('buyer', 'p1', 1, 'WALLET');
      const rowsAfterFirstRun = prisma.commissionRows.length;
      expect(rowsAfterFirstRun).toBe(2); // L1 sponsor + L2 grand

      // Force the commission call again for the same sale id.
      const saleId = prisma.sales[0].id;
      const commission = new CommissionService(prisma as any);
      await commission.distributeCommission(saleId, 'buyer', new Decimal(100));

      // No new rows and no additional wallet credit.
      expect(prisma.commissionRows).toHaveLength(rowsAfterFirstRun);
      expect(prisma.commissionSaleIds.size).toBe(1);
      expect(prisma.balances.get('sponsor')!.toNumber() - sponsorBefore).toBe(25);
      expect(prisma.balances.get('grand')!.toNumber() - grandBefore).toBe(7);
    });
  });
});
