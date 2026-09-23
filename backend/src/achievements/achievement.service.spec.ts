import { AchievementService } from './achievement.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * In-memory fake Prisma for AchievementService: models the level1Sales
 * threshold check, the unique (distributorId, rankName) constraint and the
 * claimedAt null -> timestamp flip used for exactly-once claims.
 */
class FakePrisma {
  rows: Array<any> = [];
  ledger: Array<any> = [];
  distributors = new Map<string, any>();
  uniqueClaimRace = false;

  distributor = {
    findUnique: async ({ where }: any) => {
      const d = this.distributors.get(where.id);
      return d ? { ...d } : null;
    },
    update: async ({ where, data }: any) => {
      const d = this.distributors.get(where.id)!;
      if (data.walletBalance?.increment) {
        d.walletBalance = d.walletBalance.plus(data.walletBalance.increment);
      }
      if (data.rank) d.rank = data.rank;
      this.distributors.set(where.id, d);
      return { ...d };
    },
  };

  achievement = {
    findUnique: async ({ where }: any) => {
      const { distributorId, rankName } = where.distributorId_rankName;
      return this.rows.find(
        (r) => r.distributorId === distributorId && r.rankName === rankName,
      ) ?? null;
    },
    findUniqueOrThrow: async ({ where }: any) => {
      const { distributorId, rankName } = where.distributorId_rankName;
      const row = this.rows.find(
        (r) => r.distributorId === distributorId && r.rankName === rankName,
      );
      if (!row) throw new Error('Achievement not found');
      return row;
    },
    upsert: async ({ where, create }: any) => {
      const { distributorId, rankName } = where.distributorId_rankName;
      let row = this.rows.find(
        (r) => r.distributorId === distributorId && r.rankName === rankName,
      );
      if (row) return { ...row };
      const uniqueErr: any = new Error('unique');
      uniqueErr.code = 'P2002';
      if (this.uniqueClaimRace) throw uniqueErr;
      row = {
        id: `a-${this.rows.length + 1}`,
        ...create,
        createdAt: new Date(),
      };
      this.rows.push(row);
      return { ...row };
    },
    deleteMany: async ({ where }: any) => {
      const before = this.rows.length;
      this.rows = this.rows.filter(
        (r) =>
          !(
            r.distributorId === where.distributorId &&
            r.rankName === where.rankName &&
            r.claimedAt === null
          ),
      );
      return { count: before - this.rows.length };
    },
    updateMany: async ({ where, data }: any) => {
      if (this.uniqueClaimRace) {
        this.uniqueClaimRace = false;
        return { count: 0 }; // Another claimer won the race.
      }
      const row = this.rows.find(
        (r) =>
          r.distributorId === where.distributorId &&
          r.rankName === where.rankName &&
          r.claimedAt === where.claimedAt,
      );
      if (!row) return { count: 0 };
      row.claimedAt = data.claimedAt;
      return { count: 1 };
    },
  };

  walletTransaction = {
    create: async ({ data }: any) => {
      this.ledger.push(data);
      return data;
    },
  };

  $transaction = async (cb: any) => cb(this);
}

const MILESTONES: Array<[string, number, number]> = [
  ['Influencer', 50000, 5000],
  ['Master', 100000, 5000],
  ['Legend', 250000, 15000],
  ['Icon', 500000, 25000],
  ['Titan', 1000000, 50000],
  ['Global Leader', 2500000, 150000],
  ['World Leader', 5000000, 250000],
  ['Empire Leader', 10000000, 500000],
  ['Global Icon', 50000000, 6500000],
];

function makeService(personalSales: number, rank = 'Rookie') {
  const prisma = new FakePrisma() as any;
  prisma.distributors.set('d1', {
    id: 'd1',
    name: 'Tester',
    rank,
    level1Sales: new Decimal(personalSales),
    walletBalance: new Decimal(1000),
    createdAt: new Date(),
  });
  return { service: new AchievementService(prisma), prisma };
}

describe('AchievementService', () => {
  describe('exact threshold detection', () => {
    it('unlocks every milestone whose target is exactly reached', async () => {
      const { service, prisma } = makeService(500000);
      await service.syncAchievements('d1');

      const unlocked = prisma.rows.map((r: any) => r.rankName).sort();
      expect(unlocked).toEqual(['Icon', 'Influencer', 'Legend', 'Master']);
      expect(prisma.rows).toHaveLength(4);
      expect(prisma.rows.every((r: any) => r.claimedAt === null)).toBe(true);
    });

    it('does not unlock the next milestone below its target', async () => {
      const { service, prisma } = makeService(250000);
      await service.syncAchievements('d1');
      expect(prisma.rows.map((r: any) => r.rankName).sort()).toEqual([
        'Influencer', 'Legend', 'Master',
      ]);
    });

    it('unlocks nothing one paisa below the first threshold', async () => {
      const { service, prisma } = makeService(49999.99);
      await service.syncAchievements('d1');
      expect(prisma.rows).toHaveLength(0);
    });

    it('uses personal sales only (team volume is irrelevant)', async () => {
      const { service, prisma } = makeService(0);
      prisma.distributors.get('d1').teamSales = new Decimal(99999999);
      await service.syncAchievements('d1');
      expect(prisma.rows).toHaveLength(0);
    });

    it('does not create duplicates on repeated checks', async () => {
      const { service, prisma } = makeService(100000);
      await service.syncAchievements('d1');
      await service.syncAchievements('d1');
      await service.syncAchievements('d1');
      expect(prisma.rows).toHaveLength(2); // Influencer + Master
    });

    it('drops unclaimed progress when a refund lowers personal sales', async () => {
      const { service, prisma } = makeService(500000);
      await service.syncAchievements('d1');
      expect(prisma.rows).toHaveLength(4);

      prisma.distributors.get('d1').level1Sales = new Decimal(0);
      await service.syncAchievements('d1');
      expect(prisma.rows).toHaveLength(0);
    });

    it('keeps claimed rewards even after a refund lowers personal sales', async () => {
      const { service, prisma } = makeService(50000);
      await service.syncAchievements('d1');
      await service.claimAchievementReward('d1', 'Influencer');

      prisma.distributors.get('d1').level1Sales = new Decimal(0);
      await service.syncAchievements('d1');

      // The claim is financial history — it is never deleted.
      expect(prisma.rows).toHaveLength(1);
      expect(prisma.rows[0].rankName).toBe('Influencer');
      expect(prisma.rows[0].claimedAt).not.toBeNull();
    });
  });

  describe('claiming', () => {
    async function setupClaimable(personalSales: number, rank = 'Rookie') {
      const { service, prisma } = makeService(personalSales, rank);
      await service.syncAchievements('d1');
      return { service, prisma };
    }

    it('credits the reward exactly once', async () => {
      const { service, prisma } = await setupClaimable(50000);
      const before = prisma.distributors.get('d1').walletBalance.toNumber();

      const result = await service.claimAchievementReward('d1', 'Influencer');

      expect(result.reward).toBe(5000);
      expect(prisma.distributors.get('d1').walletBalance.toNumber()).toBe(before + 5000);
      expect(prisma.ledger).toHaveLength(1);
      expect(prisma.ledger[0].type).toBe('ACHIEVEMENT_REWARD');
      expect(prisma.ledger[0].amount.toNumber()).toBe(5000);
    });

    it('rejects a duplicate claim', async () => {
      const { service, prisma } = await setupClaimable(50000);
      await service.claimAchievementReward('d1', 'Influencer');
      const afterFirst = prisma.distributors.get('d1').walletBalance.toNumber();

      await expect(service.claimAchievementReward('d1', 'Influencer')).rejects.toThrow(
        /already claimed/i,
      );
      expect(prisma.distributors.get('d1').walletBalance.toNumber()).toBe(afterFirst);
      expect(prisma.ledger).toHaveLength(1);
    });

    it('loses a concurrent race without double-paying', async () => {
      const { service, prisma } = await setupClaimable(50000);
      prisma.uniqueClaimRace = true;
      await expect(service.claimAchievementReward('d1', 'Influencer')).rejects.toThrow(
        /already claimed/i,
      );
      expect(prisma.ledger).toHaveLength(0);
    });

    it('rejects a claim when the target is no longer reached', async () => {
      const { service, prisma } = await setupClaimable(50000);
      prisma.distributors.get('d1').level1Sales = new Decimal(1000);
      await expect(service.claimAchievementReward('d1', 'Influencer')).rejects.toThrow(
        /not met/i,
      );
      expect(prisma.ledger).toHaveLength(0);
    });

    it('rejects a claim for an unknown rank', async () => {
      const { service } = await setupClaimable(50000);
      await expect(service.claimAchievementReward('d1', 'Supreme Leader')).rejects.toThrow(
        /not found/i,
      );
    });

    it('never moves the rank backward', async () => {
      const { service, prisma } = await setupClaimable(250000, 'Master');
      const result = await service.claimAchievementReward('d1', 'Influencer');
      expect(result.newRank).toBe('Master');
      expect(prisma.distributors.get('d1').rank).toBe('Master');
    });

    it('moves the rank forward when a higher rank is claimed', async () => {
      const { service, prisma } = await setupClaimable(250000, 'Rookie');
      const result = await service.claimAchievementReward('d1', 'Legend');
      expect(result.newRank).toBe('Legend');
      expect(prisma.distributors.get('d1').rank).toBe('Legend');
    });
  });

  describe('milestone table', () => {
    it('matches the approved 9-rank reward structure', () => {
      expect(MILESTONES).toHaveLength(9);
      expect(MILESTONES[0]).toEqual(['Influencer', 50000, 5000]);
      expect(MILESTONES[8]).toEqual(['Global Icon', 50000000, 6500000]);
    });
  });
});
