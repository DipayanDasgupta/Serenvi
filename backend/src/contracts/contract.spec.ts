import { DistributorService } from '../distributors/distributor.service';
import { AchievementService } from '../achievements/achievement.service';
import { SalesService } from '../sales/sales.service';
import { WalletService } from '../wallet/wallet.service';
import { CommissionService } from '../commission/commission.service';
import { SalaryService } from '../salary/salary.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * API <-> UI contract tests.
 *
 * Several pages went blank because the backend response keys drifted from what
 * the frontend read (team analytics, achievement progress, sales history and
 * the wallet ledger). These tests call the REAL services against an in-memory
 * Prisma fake and assert the exact keys the frontend depends on, so a rename
 * breaks a test instead of a page.
 *
 * The frontend also normalises defensively (hooks/pages accept either key);
 * this file pins the server side of that contract.
 */

function fakePrisma() {
  const state: any = {
    distributors: new Map<string, any>(),
    nodes: [] as any[],
    sales: [] as any[],
    achievements: [] as any[],
    walletTx: [] as any[],
    deposits: [] as any[],
    withdrawals: [] as any[],
    transfers: [] as any[],
    commissions: [] as any[],
    salaries: [] as any[],
    leadership: new Map<string, any>(),
  };

  const dec = (v: any) => (v instanceof Decimal ? v : new Decimal(v ?? 0));

  const p: any = {
    $transaction: async (cb: any) => cb(p),
    distributor: {
      findUnique: async ({ where, select }: any) => {
        const d = state.distributors.get(where.id);
        if (!d) return null;
        if (select) {
          // Faithful projection: only the selected fields, Decimals preserved.
          const out: any = {};
          for (const key of Object.keys(select)) out[key] = d[key];
          return out;
        }
        return { ...d };
      },
      findMany: async ({ where }: any = {}) => {
        let rows = [...state.distributors.values()];
        if (where?.status) rows = rows.filter((r) => r.status === where.status);
        if (where?.currentLeadershipSalary?.gt !== undefined) {
          rows = rows.filter((r) =>
            dec(r.currentLeadershipSalary).gt(where.currentLeadershipSalary.gt),
          );
        }
        return rows.map((r) => ({ ...r }));
      },
      update: async ({ where, data }: any) => {
        const d = state.distributors.get(where.id);
        if (data.walletBalance?.increment) d.walletBalance = dec(d.walletBalance).plus(dec(data.walletBalance.increment));
        if (data.walletBalance?.decrement) d.walletBalance = dec(d.walletBalance).minus(dec(data.walletBalance.decrement));
        for (const f of ['monthlySales', 'teamMonthlySales', 'level1Sales', 'teamSales', 'totalSales', 'currentLeadershipSalary']) {
          if (data[f] !== undefined) d[f] = dec(data[f]);
        }
        if (data.currentLeadershipRank !== undefined) d.currentLeadershipRank = data.currentLeadershipRank;
        state.distributors.set(where.id, d);
        return { ...d };
      },
      updateMany: async ({ data }: any) => {
        for (const d of state.distributors.values()) {
          for (const f of ['monthlySales', 'teamMonthlySales']) {
            if (data[f] !== undefined) d[f] = dec(data[f]);
          }
        }
        return { count: state.distributors.size };
      },
    },
    mLMTreeNode: {
      // Mirrors Prisma's `include: { descendant: ... }`: the relation is
      // joined onto each row, which is what the team analytics reads.
      findMany: async ({ where }: any) =>
        state.nodes
          .filter(
            (n: any) =>
              (where.ancestorId === undefined || n.ancestorId === where.ancestorId) &&
              (where.descendantId === undefined || n.descendantId === where.descendantId) &&
              (where.depth?.lte === undefined || n.depth <= where.depth.lte) &&
              (where.depth?.gt === undefined || n.depth > where.depth.gt),
          )
          .sort((a: any, b: any) => a.depth - b.depth)
          .map((n: any) => ({
            ...n,
            descendant: state.distributors.get(n.descendantId) ?? null,
          })),
    },
    sale: {
      findUnique: async ({ where, include }: any) => {
        const row = state.sales.find((s: any) => s.id === where.id);
        if (!row) return null;
        return include ? { ...row, product: row.product } : { ...row };
      },
      update: async ({ where, data }: any) => {
        const row = state.sales.find((s: any) => s.id === where.id);
        Object.assign(row, data);
        return { ...row };
      },
      findMany: async ({ where, skip = 0, take = 50, orderBy }: any) => {
        let rows = [...state.sales];
        if (where?.sellerId) rows = rows.filter((s) => s.sellerId === where.sellerId);
        if (where?.orderStatus) rows = rows.filter((s) => s.orderStatus === where.orderStatus);
        rows.sort((a: any, b: any) => (orderBy?.createdAt === 'desc' ? b.createdAt - a.createdAt : 0));
        return rows.slice(skip, skip + take);
      },
      count: async ({ where }: any = {}) => {
        let rows = [...state.sales];
        if (where?.sellerId) rows = rows.filter((s) => s.sellerId === where.sellerId);
        return rows.length;
      },
      aggregate: async ({ where }: any = {}) => {
        let rows = [...state.sales];
        if (where?.orderStatus) rows = rows.filter((s) => s.orderStatus === where.orderStatus);
        if (where?.sellerId) rows = rows.filter((s) => s.sellerId === where.sellerId);
        return { _sum: { saleAmount: rows.reduce((s: Decimal, r: any) => s.plus(dec(r.saleAmount)), new Decimal(0)) } };
      },
    },
    achievement: {
      findMany: async ({ where }: any) =>
        state.achievements.filter((a: any) => a.distributorId === where.distributorId),
      findManyAll: async () => state.achievements,
    },
    walletTransaction: {
      findMany: async ({ where }: any) =>
        state.walletTx
          .filter((t: any) => t.distributorId === where.distributorId)
          .sort((a: any, b: any) => b.createdAt - a.createdAt)
          .slice(where.skip ?? 0, (where.skip ?? 0) + (where.take ?? 50)),
      count: async ({ where }: any) =>
        state.walletTx.filter((t: any) => t.distributorId === where.distributorId).length,
      groupBy: async ({ where, by }: any) => {
        const rows = state.walletTx.filter((t: any) => t.distributorId === where.distributorId);
        const map = new Map<string, Decimal>();
        for (const r of rows) map.set(r.type, (map.get(r.type) ?? new Decimal(0)).plus(dec(r.amount)));
        return [...map.entries()].map(([type, amount]) => ({ [by[0]]: type, _sum: { amount } }));
      },
      create: async ({ data }: any) => {
        const row = { id: `wt-${state.walletTx.length + 1}`, createdAt: Date.now(), ...data };
        state.walletTx.push(row);
        return row;
      },
    },
    leadershipSalary: {
      findMany: async ({ where }: any) =>
        state.salaries.filter((s: any) => s.distributorId === where.distributorId),
    },
    deposit: { findMany: async () => state.deposits },
    withdrawalRequest: { findMany: async () => state.withdrawals },
    walletTransfer: { findMany: async () => state.transfers },
    commission: { findMany: async () => state.commissions },
  };
  return { p, state, dec };
}

/** Services read SMTP/JWT settings in their constructor; stub the lookups. */
const configStub = { get: (_key: string) => undefined } as any;

function seedDistributor(state: any, id: string, over: any = {}) {
  state.distributors.set(id, {
    id,
    name: id,
    email: `${id}@example.com`,
    status: 'ACTIVE',
    rank: 'Rookie',
    sponsorId: null,
    referralCode: id.toUpperCase().slice(0, 6),
    totalSales: new Decimal(0),
    level1Sales: new Decimal(0),
    monthlySales: new Decimal(0),
    teamSales: new Decimal(0),
    teamMonthlySales: new Decimal(0),
    walletBalance: new Decimal(0),
    currentLeadershipRank: null,
    currentLeadershipSalary: new Decimal(0),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });
}

describe('GET /distributors/:id/team contract', () => {
  it('returns the keys the Team Analytics page reads', async () => {
    const { p, state } = fakePrisma();
    seedDistributor(state, 'root', { teamSales: new Decimal(6248), teamMonthlySales: new Decimal(6248) });
    seedDistributor(state, 'm1', { totalSales: new Decimal(1000), teamSales: new Decimal(500) });
    seedDistributor(state, 'm2', { totalSales: new Decimal(2000), teamSales: new Decimal(0) });
    seedDistributor(state, 'm3', { totalSales: new Decimal(0), teamSales: new Decimal(0) });
    // Materialized path: every ancestor of a descendant gets a row, with the
    // distance from THAT descendant. m3 is 2 levels below root.
    state.nodes.push(
      { ancestorId: 'root', descendantId: 'm1', depth: 1 },
      { ancestorId: 'root', descendantId: 'm2', depth: 1 },
      { ancestorId: 'root', descendantId: 'm3', depth: 2 },
    );

    const svc = new DistributorService(p, configStub);
    const res: any = await svc.getTeamAnalytics('root');

    expect(res.totalTeamSize).toBe(3);
    expect(res.activeMembers).toBe(3);
    expect(res.totalTeamSales).toBe(6248);
    expect(res.monthlyTeamSales).toBe(6248);
    expect(res.salesByLevel).toEqual([
      { level: 1, sales: 3500, members: 2 },
      { level: 2, sales: 0, members: 1 },
    ]);
    // Legacy aliases retained for older clients.
    expect(res.teamSize).toBe(3);
    expect(res.directDownline).toBe(2);
    expect(res.members).toHaveLength(2);
  });

  it('never returns salesByLevel entries beyond level 15', async () => {
    const { p, state } = fakePrisma();
    seedDistributor(state, 'root');
    for (let d = 1; d <= 20; d++) {
      seedDistributor(state, `x${d}`);
      state.nodes.push({ ancestorId: 'root', descendantId: `x${d}`, depth: d });
    }
    const svc = new DistributorService(p, configStub);
    const res: any = await svc.getTeamAnalytics('root');
    expect(Math.max(...res.salesByLevel.map((r: any) => r.level))).toBe(15);
  });
});

describe('GET /achievements/progress contract', () => {
  it('returns a row for every milestone with unlocked/claimed flags', async () => {
    const { p, state } = fakePrisma();
    seedDistributor(state, 'd1', { level1Sales: new Decimal(6248), rank: 'Rookie' });

    const svc = new AchievementService(p);
    const res: any = await svc.getAchievementProgress('d1');

    expect(res.currentSales).toBe(6248);
    expect(res.personalSales).toBe(6248);
    expect(res.currentRank).toBe('Rookie');
    // Every one of the 9 milestones must be present, including locked ones —
    // this is what previously made the page render nothing.
    expect(res.achievements).toHaveLength(9);
    const influencer = res.achievements.find((a: any) => a.rankName === 'Influencer');
    expect(influencer.isUnlocked).toBe(false);
    expect(influencer.isClaimed).toBe(false);
    expect(influencer.progressPercent).toBe(12);
    expect(res.nextMilestone.rankName).toBe('Influencer');
    expect(res.nextMilestone.targetAmount).toBe(50000);
    // Legacy field kept.
    expect(res.progress).toHaveLength(9);
  });

  it('flags a reached-but-unclaimed milestone as unlocked and gives it an id', async () => {
    const { p, state } = fakePrisma();
    // ₹120,000 passes Influencer (50k) and Master (100k); Legend needs 250k.
    seedDistributor(state, 'd1', { level1Sales: new Decimal(120000), rank: 'Influencer' });
    state.achievements.push({
      id: 'a-1',
      distributorId: 'd1',
      rankName: 'Influencer',
      salesTarget: new Decimal(50000),
      rewardAmount: new Decimal(5000),
      claimedAt: null,
      createdAt: new Date(),
    });

    const svc = new AchievementService(p);
    const res: any = await svc.getAchievementProgress('d1');
    const influencer = res.achievements.find((a: any) => a.rankName === 'Influencer');
    expect(influencer.isUnlocked).toBe(true);
    expect(influencer.isClaimed).toBe(false);
    expect(influencer.id).toBe('a-1');
    // next milestone is the first one NOT yet reached, never an already-passed rank.
    expect(res.nextMilestone.rankName).toBe('Legend');
  });

  it('marks a claimed milestone', async () => {
    const { p, state } = fakePrisma();
    seedDistributor(state, 'd1', { level1Sales: new Decimal(60000) });
    state.achievements.push({
      id: 'a-1',
      distributorId: 'd1',
      rankName: 'Influencer',
      salesTarget: new Decimal(50000),
      rewardAmount: new Decimal(5000),
      claimedAt: new Date(),
      createdAt: new Date(),
    });
    const svc = new AchievementService(p);
    const res: any = await svc.getAchievementProgress('d1');
    const influencer = res.achievements.find((a: any) => a.rankName === 'Influencer');
    expect(influencer.isClaimed).toBe(true);
  });
});

describe('GET /sales/history contract', () => {
  it('returns the array under data and includes amount/status aliases', async () => {
    const { p, state } = fakePrisma();
    state.sales.push({
      id: 's1',
      sellerId: 'd1',
      productId: 'p1',
      quantity: 2,
      saleAmount: new Decimal(289),
      orderStatus: 'SHIPPED',
      paymentMethod: 'WALLET',
      createdAt: new Date(),
      product: { name: 'Shirt', price: new Decimal(289) },
      commissions: [],
    });

    const svc = new SalesService(p, {} as any, {} as any, {} as any);
    const res: any = await svc.getSalesHistory('d1', 0, 20);

    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.total).toBe(1);
    const order = res.data[0];
    expect(order.amount).toBe(289);
    expect(order.saleAmount).toBe(289);
    expect(order.status).toBe('SHIPPED');
    expect(order.orderStatus).toBe('SHIPPED');
    expect(typeof order.amount).toBe('number');
  });
});

describe('GET /wallet/history contract', () => {
  it('returns the ledger only, with history/transactions/data aliases', async () => {
    const { p, state } = fakePrisma();
    state.deposits.push({ id: 'd', distributorId: 'd1', amount: new Decimal(1000), status: 'COMPLETED', createdAt: new Date() });
    state.sales.push({
      id: 's1', sellerId: 'd1', productId: 'p1', quantity: 1,
      saleAmount: new Decimal(130), orderStatus: 'COMPLETED', createdAt: new Date(),
      product: { name: 'Tee', price: new Decimal(130) },
    });
    // The ledger row for the purchase. A merged implementation would ALSO
    // derive a PURCHASE row from the Sale and deposit rows — duplicating them.
    state.walletTx.push({
      id: 'w1', distributorId: 'd1', type: 'PRODUCT_PURCHASE', amount: new Decimal(-130),
      description: 'Purchased 1x Tee', referenceId: 's1', createdAt: new Date(),
    });
    state.walletTx.push({
      id: 'w2', distributorId: 'd1', type: 'DEPOSIT', amount: new Decimal(1000),
      description: 'Wallet topup', referenceId: null, createdAt: new Date(),
    });

    const svc = new WalletService(p, configStub);
    const res: any = await svc.getCompleteWalletHistory('d1', 0, 50);

    expect(res.total).toBe(2);
    expect(res.history).toHaveLength(2);
    expect(res.transactions).toBe(res.history);
    expect(res.data).toBe(res.history);
    // Exactly one row per money movement — no duplicate purchase entry.
    expect(res.history.filter((h: any) => h.description.includes('Purchased'))).toHaveLength(1);
    expect(res.purchases).toBe(1);
    expect(res.deposits).toBe(1);
    const purchase = res.history.find((h: any) => h.type === 'PRODUCT_PURCHASE');
    expect(purchase.date).toBeTruthy();
    expect(purchase.amount).toBe(-130);
  });

  it('uses only real ledger type names', async () => {
    const { p, state } = fakePrisma();
    state.walletTx.push({
      id: 'w1', distributorId: 'd1', type: 'MLM_COMMISSION', amount: new Decimal(25),
      description: 'Level 1 commission', referenceId: 's1', createdAt: new Date(),
    });
    const svc = new WalletService(p, configStub);
    const res: any = await svc.getCompleteWalletHistory('d1', 0, 50);
    expect(['MLM_COMMISSION', 'ACHIEVEMENT_REWARD', 'LEADERSHIP_SALARY', 'PRODUCT_PURCHASE', 'WITHDRAWAL', 'DEPOSIT', 'WALLET_TRANSFER_IN', 'WALLET_TRANSFER_OUT', 'REFUND']).toContain(res.history[0].type);
  });
});

describe('monthly sales reset contract', () => {
  it('resets monthly counters but never personal or lifetime sales', async () => {
    const { p, state } = fakePrisma();
    seedDistributor(state, 'd1', {
      monthlySales: new Decimal(90000),
      teamMonthlySales: new Decimal(120000),
      level1Sales: new Decimal(50000),
      teamSales: new Decimal(300000),
      currentLeadershipSalary: new Decimal(1500),
    });
    const svc = new SalaryService(p);
    await svc.resetMonthlyMetrics();
    const d = state.distributors.get('d1');
    expect(d.monthlySales.toNumber()).toBe(0);
    expect(d.teamMonthlySales.toNumber()).toBe(0);
    expect(d.level1Sales.toNumber()).toBe(50000);
    expect(d.teamSales.toNumber()).toBe(300000);
    // Pending salary must survive until month-end credit.
    expect(d.currentLeadershipSalary.toNumber()).toBe(1500);
  });

  it('resets suspended distributors too (stale volume must not leak into the new month)', async () => {
    const { p, state } = fakePrisma();
    seedDistributor(state, 'd1', { status: 'SUSPENDED', monthlySales: new Decimal(70000), teamMonthlySales: new Decimal(70000) });
    const svc = new SalaryService(p);
    await svc.resetMonthlyMetrics();
    expect(state.distributors.get('d1').monthlySales.toNumber()).toBe(0);
    expect(state.distributors.get('d1').teamMonthlySales.toNumber()).toBe(0);
  });
});

describe('admin order status contract', () => {
  it('accepts the full fulfilment flow and rejects unknown statuses', async () => {
    const { p, state } = fakePrisma();
    const { AdminService } = require('../admin/admin.service');
    const svc = new AdminService(p, { syncAchievements: async () => {} } as any, { recalculateAfterSale: async () => {} } as any);

    for (const status of ['PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED']) {
      state.sales.push({
        id: `s-${status}`, sellerId: 'd1', productId: 'p1', quantity: 1,
        saleAmount: new Decimal(100), orderStatus: 'COMPLETED', createdAt: new Date(),
        product: { id: 'p1', type: 'DIGITAL' },
      });
      const res: any = await svc.updateOrderStatus(`s-${status}`, status);
      expect(res.orderStatus).toBe(status);
    }

    state.sales.push({ id: 's-bad', sellerId: 'd1', productId: 'p1', quantity: 1, saleAmount: new Decimal(1), orderStatus: 'COMPLETED', createdAt: new Date(), product: { id: 'p1', type: 'DIGITAL' } });
    await expect(svc.updateOrderStatus('s-bad', 'NONSENSE')).rejects.toThrow(/Invalid order status/);
  });
});
