const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function checkAndClaimAchievements(distributorId) {
  const ACHIEVEMENT_MILESTONES = [
    { rank: 'Influencer', salesTarget: 50000, reward: 6000 },
    { rank: 'Master', salesTarget: 100000, reward: 12000 },
    { rank: 'Legend', salesTarget: 250000, reward: 30000 },
    { rank: 'Icon', salesTarget: 500000, reward: 60000 },
    { rank: 'Titan', salesTarget: 1000000, reward: 120000 },
    { rank: 'Global Leader', salesTarget: 2500000, reward: 300000 },
    { rank: 'World Leader', salesTarget: 5000000, reward: 600000 },
    { rank: 'Empire Leader', salesTarget: 10000000, reward: 1200000 },
    { rank: 'Global Icon', salesTarget: 50000000, reward: 6000000 },
  ];

  try {
    const distributor = await prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      console.error(`Distributor not found: ${distributorId}`);
      return;
    }

    console.log(`\n📊 Distributor: ${distributor.name}`);
    console.log(`💰 Level 1 Sales: ₹${distributor.level1Sales.toString()}`);
    console.log(`💵 Total Sales: ₹${distributor.totalSales.toString()}`);
    console.log(`🎯 Current Rank: ${distributor.rank}\n`);

    // Check each milestone
    for (const milestone of ACHIEVEMENT_MILESTONES) {
      const level1SalesNum = new Decimal(distributor.level1Sales).toNumber();
      const meetsTarget = level1SalesNum >= milestone.salesTarget;
      
      console.log(`${meetsTarget ? '✓' : '✗'} ${milestone.rank}: ₹${milestone.salesTarget} (Current: ₹${level1SalesNum.toLocaleString()})`);
      
      if (meetsTarget) {
        const alreadyClaimed = await prisma.achievement.findUnique({
          where: {
            distributorId_rankName: {
              distributorId,
              rankName: milestone.rank,
            },
          },
        });

        if (alreadyClaimed) {
          console.log(`  ✓ Already claimed on ${alreadyClaimed.claimedAt}`);
        } else {
          console.log(`  ⚠️  NOT CLAIMED YET - AUTO-CLAIMING NOW...`);
          
          // Award bonus and create achievement
          const rewardDecimal = new Decimal(milestone.reward);
          
          await prisma.distributor.update({
            where: { id: distributorId },
            data: {
              walletBalance: {
                increment: rewardDecimal,
              },
              rank: milestone.rank,
            },
          });

          await prisma.achievement.create({
            data: {
              distributorId,
              rankName: milestone.rank,
              salesTarget: new Decimal(milestone.salesTarget),
              rewardAmount: rewardDecimal,
              claimedAt: new Date(),
            },
          });

          await prisma.walletTransaction.create({
            data: {
              distributorId,
              type: 'ACHIEVEMENT_REWARD',
              amount: rewardDecimal,
              description: `Achievement reward: ${milestone.rank}`,
              referenceId: distributorId,
            },
          });

          console.log(`  ✅ Claimed! +₹${milestone.reward}`);
        }
      }
    }

    // Show updated achievements
    const achievements = await prisma.achievement.findMany({
      where: { distributorId },
      orderBy: { claimedAt: 'asc' },
    });

    console.log(`\n📜 Total Achievements Claimed: ${achievements.length}`);
    achievements.forEach(a => {
      console.log(`  • ${a.rankName}: ₹${a.rewardAmount.toString()} (Claimed: ${a.claimedAt.toDateString()})`);
    });

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run for test distributor
checkAndClaimAchievements('cmnd3n13o00021xvxjzvk0s75');
