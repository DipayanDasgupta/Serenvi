import { CommissionService } from './commission.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * CommissionService tests use an in-memory fake Prisma client. This exercises
 * the real service logic (upline lookup, level rates, wallet + ledger writes,
 * idempotency) without requiring a live database.
 */
class FakePrisma {
  nodes: Array<{ ancestorId: string; descendantId: string; depth: number }> = [];
  distributors = new Map<string, Decimal>();
  commissions: Array<any> = [];
  ledger: Array<any> = [];
  saleCommissionSaleIds = new Set<string>();

  commission = {
    // The idempotency probe: any row for this sale means it was distributed.
    findFirst: async ({ where }: any): Promise<any> =>
      this.saleCommissionSaleIds.has(where.saleId) ? { id: 'c-existing' } : null,
    create: async ({ data }: any): Promise<any> => {
      // The real unique constraint is (saleId, level) — one row per level.
      if (this.commissions.some((c) => c.saleId === data.saleId && c.level === data.level)) {
        const err: any = new Error('unique constraint');
        err.code = 'P2002';
        throw err;
      }
      this.saleCommissionSaleIds.add(data.saleId);
      const row = { id: `c-${this.commissions.length + 1}`, ...data };
      this.commissions.push(row);
      return row;
    },
  };

  distributor = {
    update: async ({ where, data }: any) => {
      const current = this.distributors.get(where.id) ?? new Decimal(0);
      const next = data.walletBalance?.increment
        ? current.plus(data.walletBalance.increment)
        : data.walletBalance?.decrement
          ? current.minus(data.walletBalance.decrement)
          : current;
      this.distributors.set(where.id, next);
      return { id: where.id, walletBalance: next };
    },
  };

  walletTransaction = {
    create: async ({ data }: any) => {
      this.ledger.push(data);
      return data;
    },
  };

  mLMTreeNode = {
    // MLMTreeNode is a materialized path: rows for a descendant already list
    // every ancestor at its relative depth, so this is a direct filter.
    findMany: async ({ where }: any) =>
      this.nodes
        .filter(
          (n) => n.descendantId === where.descendantId && n.depth <= where.depth.lte,
        )
        .sort((a, b) => a.depth - b.depth),
  };
}

function makeService() {
  const prisma = new FakePrisma() as any;
  const service = new CommissionService(prisma);
  return { service, prisma };
}

// Materializes `levels` uplines for the seller: u1 = L1 ... uN = LN.
function seedChain(prisma: FakePrisma, levels: number) {
  for (let depth = 1; depth <= levels; depth++) {
    prisma.nodes.push({
      ancestorId: `u${depth}`,
      descendantId: 'seller',
      depth,
    });
  }
}

const SALE = new Decimal(10000);

describe('CommissionService', () => {
  describe('1-level upline', () => {
    it('pays exactly level 1 (25%) and nothing else', async () => {
      const { service, prisma } = makeService();
      seedChain(prisma, 1);

      await service.distributeCommission('sale-1', 'seller', SALE);

      expect(prisma.commissions).toHaveLength(1);
      expect(prisma.commissions[0].level).toBe(1);
      expect(prisma.commissions[0].distributorId).toBe('u1');
      expect(prisma.commissions[0].commissionAmount.toNumber()).toBe(2500);
      expect(prisma.commissions[0].commissionRate.toNumber()).toBe(25);
      expect(prisma.distributors.get('u1')?.toNumber()).toBe(2500);
      expect(prisma.ledger).toHaveLength(1);
      expect(prisma.ledger[0].type).toBe('MLM_COMMISSION');
      expect(prisma.ledger[0].referenceId).toBe('sale-1');
    });
  });

  describe('15-level upline', () => {
    it('pays all 15 levels at the documented rates', async () => {
      const { service, prisma } = makeService();
      seedChain(prisma, 15);

      await service.distributeCommission('sale-15', 'seller', SALE);

      const byLevel = new Map<number, number>(
        prisma.commissions.map((c: any) => [c.level, c.commissionAmount.toNumber()]),
      );
      const expected: Record<number, number> = {
        1: 2500, 2: 700, 3: 450, 4: 250, 5: 200, 6: 200, 7: 180,
        8: 160, 9: 140, 10: 120, 11: 100, 12: 100, 13: 100, 14: 100, 15: 100,
      };
      for (const [level, amount] of Object.entries(expected)) {
        expect(byLevel.get(Number(level))).toBe(amount);
      }
      expect(prisma.commissions).toHaveLength(15);

      // The approved table sums to 54% — docs and validation agree.
      const total = prisma.commissions.reduce(
        (sum: number, c: any) => sum + c.commissionAmount.toNumber(), 0,
      );
      expect(total).toBe(5400);
      expect(service.validateCommissionCalculations(SALE).toNumber()).toBe(5400);
    });

    it('caps the tree at depth 15 (deeper ancestors are ignored)', async () => {
      const { service, prisma } = makeService();
      seedChain(prisma, 20);

      await service.distributeCommission('sale-deep', 'seller', SALE);

      expect(prisma.commissions).toHaveLength(15);
      const levels = prisma.commissions.map((c: any) => c.level as number);
      expect(Math.max(...levels)).toBe(15);
    });
  });

  describe('missing uplines', () => {
    it('pays nobody when the seller has no upline', async () => {
      const { service, prisma } = makeService();

      await service.distributeCommission('sale-0', 'seller', SALE);

      expect(prisma.commissions).toHaveLength(0);
      expect(prisma.ledger).toHaveLength(0);
    });

    it('pays only the levels that exist, leaving gaps unpaid', async () => {
      const { service, prisma } = makeService();
      // L1 and L3 exist; L2 does not. L3 still gets its own rate.
      prisma.nodes.push({ ancestorId: 'u1', descendantId: 'seller', depth: 1 });
      prisma.nodes.push({ ancestorId: 'u3', descendantId: 'seller', depth: 3 });

      await service.distributeCommission('sale-gap', 'seller', SALE);

      const levels = prisma.commissions
        .map((c: any) => c.level as number)
        .sort((a: number, b: number) => a - b);
      expect(levels).toEqual([1, 3]);
      // L1 = 25% and L3 = 4.5% of the sale.
      expect(prisma.distributors.get('u1')?.toNumber()).toBe(2500);
      expect(prisma.distributors.get('u3')?.toNumber()).toBe(450);
    });
  });

  describe('idempotency', () => {
    it('never distributes the same sale twice', async () => {
      const { service, prisma } = makeService();
      seedChain(prisma, 3);

      await service.distributeCommission('sale-dup', 'seller', SALE);
      await service.distributeCommission('sale-dup', 'seller', SALE);
      await service.distributeCommission('sale-dup', 'seller', SALE);

      expect(prisma.commissions).toHaveLength(3);
      expect(prisma.ledger).toHaveLength(3);
      expect(prisma.distributors.get('u1')?.toNumber()).toBe(2500);
    });
  });
});
