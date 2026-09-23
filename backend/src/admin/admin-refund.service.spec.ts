import { AdminService } from './admin.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Refund reversal tests: a COMPLETED → REFUNDED transition must restore stock,
 * refund the buyer, reverse seller/sponsor/upline sales metrics, claw back
 * commissions, and be idempotent on retry.
 */
class FakePrisma {
  saleRow: any = null;
  sale = {
    findUnique: async (): Promise<any> => (this.saleRow ? { ...this.saleRow } : null),
    update: async ({ where, data }: any): Promise<any> => {
      this.saleRow = { ...this.saleRow, ...data, id: where.id };
      return { ...this.saleRow };
    },
  };
  product = { update: async () => ({}) };
  balances = new Map<string, Decimal>();
  totalSales = new Map<string, Decimal>();
  level1Sales = new Map<string, Decimal>();
  monthlySales = new Map<string, Decimal>();
  teamSales = new Map<string, Decimal>();
  teamMonthlySales = new Map<string, Decimal>();
  ledger: any[] = [];
  commissions: any[] = [];
  ancestors: Array<{ ancestorId: string; descendantId: string; depth: number }> = [];
  sponsorId: string | null = null;

  distributor = {
    findUnique: async ({ where, select }: any) => {
      if (select?.sponsorId !== undefined) {
        return { id: where.id, sponsorId: this.sponsorId };
      }
      return {
        id: where.id,
        walletBalance: this.balances.get(where.id) ?? new Decimal(0),
      };
    },
    update: async ({ where, data }: any) => {
      const id = where.id;
      if (data.walletBalance?.increment) {
        this.balances.set(id, (this.balances.get(id) ?? new Decimal(0)).plus(data.walletBalance.increment));
      }
      if (data.walletBalance?.decrement) {
        this.balances.set(id, (this.balances.get(id) ?? new Decimal(0)).minus(data.walletBalance.decrement));
      }
      const metrics: Record<string, Map<string, Decimal>> = {
        totalSales: this.totalSales,
        level1Sales: this.level1Sales,
        monthlySales: this.monthlySales,
        teamSales: this.teamSales,
        teamMonthlySales: this.teamMonthlySales,
      };
      for (const f of Object.keys(metrics)) {
        const bucket = metrics[f];
        if (data[f]?.increment) bucket.set(id, (bucket.get(id) ?? new Decimal(0)).plus(data[f].increment));
        if (data[f]?.decrement) bucket.set(id, (bucket.get(id) ?? new Decimal(0)).minus(data[f].decrement));
      }
      return { id };
    },
  };

  walletTransaction = {
    create: async ({ data }: any) => {
      this.ledger.push(data);
      return data;
    },
  };

  commission = {
    findMany: async ({ where }: any) =>
      this.commissions.filter((c) => c.saleId === where.saleId && !c.reversedAt),
    update: async ({ where, data }: any) => {
      const c = this.commissions.find((x) => x.id === where.id)!;
      Object.assign(c, data);
      return c;
    },
  };

  mLMTreeNode = {
    findMany: async ({ where }: any) =>
      this.ancestors.filter(
        (a) => a.descendantId === where.descendantId && a.depth <= where.depth.lte,
      ),
  };

  $transaction = async (cb: any) => cb(this);
}

function makeService() {
  // The fake IS the prisma client and the transaction client — exactly how
  // Prisma behaves (tx exposes the same model methods).
  const prisma = new FakePrisma();
  const achievements = { syncAchievements: async () => {} } as any;
  const salary = { recalculateAfterSale: async () => {} } as any;
  const service = new AdminService(prisma as any, achievements, salary);
  return { service, prisma };
}

describe('AdminService refund reversal', () => {
  function seed(prisma: FakePrisma) {
    prisma.saleRow = {
      id: 'sale-1',
      sellerId: 'buyer',
      productId: 'p1',
      quantity: 2,
      saleAmount: new Decimal(200),
      orderStatus: 'COMPLETED',
      product: { id: 'p1', type: 'PHYSICAL' },
    };
    prisma.sponsorId = 'sponsor';
    prisma.balances.set('buyer', new Decimal(0));
    prisma.balances.set('sponsor', new Decimal(60)); // 25% L1 commission held
    prisma.totalSales.set('buyer', new Decimal(200));
    prisma.level1Sales.set('sponsor', new Decimal(200));
    prisma.monthlySales.set('sponsor', new Decimal(200));
    prisma.teamSales.set('sponsor', new Decimal(200));
    prisma.teamMonthlySales.set('sponsor', new Decimal(200));
    prisma.teamSales.set('grand', new Decimal(200));
    prisma.teamMonthlySales.set('grand', new Decimal(200));
    prisma.ancestors = [
      { ancestorId: 'sponsor', descendantId: 'buyer', depth: 1 },
      { ancestorId: 'grand', descendantId: 'buyer', depth: 2 },
    ];
    prisma.commissions = [
      { id: 'c1', saleId: 'sale-1', distributorId: 'sponsor', level: 1, commissionAmount: new Decimal(50), reversedAt: null },
    ];
  }

  it('reverses everything atomically', async () => {
    const { service, prisma } = makeService();
    seed(prisma);

    await service.updateOrderStatus('sale-1', 'REFUNDED');

    expect(prisma.saleRow.orderStatus).toBe('REFUNDED');
    // Buyer refunded the full amount.
    expect(prisma.balances.get('buyer')?.toNumber()).toBe(200);
    // Commission clawed back from the sponsor.
    expect(prisma.balances.get('sponsor')?.toNumber()).toBe(10);
    expect(prisma.commissions[0].reversedAt).not.toBeNull();
    // Metrics reversed.
    expect(prisma.totalSales.get('buyer')?.toNumber()).toBe(0);
    expect(prisma.level1Sales.get('sponsor')?.toNumber()).toBe(0);
    expect(prisma.monthlySales.get('sponsor')?.toNumber()).toBe(0);
    expect(prisma.teamSales.get('sponsor')?.toNumber()).toBe(0);
    expect(prisma.teamSales.get('grand')?.toNumber()).toBe(0);
    // Compensating ledger rows exist; nothing deleted.
    const types = prisma.ledger.map((l) => l.type);
    expect(types).toContain('REFUND');
    expect(prisma.commissions).toHaveLength(1);
  });

  it('is idempotent on retry', async () => {
    const { service, prisma } = makeService();
    seed(prisma);

    await service.updateOrderStatus('sale-1', 'REFUNDED');
    const afterFirst = prisma.balances.get('buyer')!.toNumber();
    const ledgerAfterFirst = prisma.ledger.length;

    await service.updateOrderStatus('sale-1', 'REFUNDED');
    expect(prisma.balances.get('buyer')?.toNumber()).toBe(afterFirst);
    expect(prisma.ledger.length).toBe(ledgerAfterFirst);
  });

  it('refuses to refund a non-COMPLETED sale', async () => {
    const { service, prisma } = makeService();
    seed(prisma);
    prisma.saleRow.orderStatus = 'PENDING';
    await expect(service.updateOrderStatus('sale-1', 'REFUNDED')).rejects.toThrow(
      /Only COMPLETED/i,
    );
  });

  it('rejects an unknown status', async () => {
    const { service, prisma } = makeService();
    seed(prisma);
    await expect(service.updateOrderStatus('sale-1', 'HACKED')).rejects.toThrow(
      /Invalid order status/i,
    );
  });

  it('marks the commission reversed without debiting when funds are short', async () => {
    const { service, prisma } = makeService();
    seed(prisma);
    prisma.balances.set('sponsor', new Decimal(5)); // already spent the commission
    await service.updateOrderStatus('sale-1', 'REFUNDED');
    expect(prisma.balances.get('sponsor')?.toNumber()).toBe(5);
    expect(prisma.commissions[0].reversedAt).not.toBeNull();
  });

  it('handles non-refund status changes without touching money', async () => {
    const { service, prisma } = makeService();
    seed(prisma);
    await service.updateOrderStatus('sale-1', 'SHIPPED');
    expect(prisma.saleRow.orderStatus).toBe('SHIPPED');
    expect(prisma.balances.get('buyer')?.toNumber()).toBe(0);
    expect(prisma.ledger).toHaveLength(0);
  });
});
