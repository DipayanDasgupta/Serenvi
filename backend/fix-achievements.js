const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

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

async function fixAndClaimAchievements() {
  try {
    console.log('🔧 FIXING LEVEL1 SALES AND CLAIMING ACHIEVEMENTS\n');

    const distributors = await prisma.distributor.findMany();

    for (const dist of distributors) {
      console.log(`\n📊 Processing: ${dist.name}`);
      
      // Set level1Sales = totalSales (since they're direct sales)
      const totalSalesNum = new Decimal(dist.totalSales).toNumber();
      const level1SalesNum = new Decimal(dist.level1Sales).toNumber();
      
      if (totalSalesNum > 0 && level1SalesNum === 0) {
        console.log(`  ⚠️  Updating level1Sales from ₹0 → ₹${totalSalesNum}`);
        
        await prisma.distributor.update({
          where: { id: dist.id },
          data: {
            level1Sales: dist.totalSales,
          },
        });
      }

      // Now check and claim achievements
      const updated = await prisma.distributor.findUnique({
        where: { id: dist.id },
      });

      console.log(`  💰 Level 1 Sales: ₹${updated.level1Sales}`);

      for (const milestone of ACHIEVEMENT_MILESTONES) {
        const level1SalesNum = new Decimal(updated.level1Sales).toNumber();
        const meetsTarget = level1SalesNum >= milestone.salesTarget;
        
        if (meetsTarget) {
          const alreadyClaimed = await prisma.achievement.findUnique({
            where: {
              distributorId_rankName: {
                distributorId: dist.id,
                rankName: milestone.rank,
              },
            },
          });

          if (!alreadyClaimed) {
            console.log(`    ✅ Claiming: ${milestone.rank} - ₹${milestone.reward}`);
            
            const rewardDecimal = new Decimal(milestone.reward);
            
            // Update distributor rank and wallet
            await prisma.distributor.update({
              where: { id: dist.id },
              data: {
                walletBalance: {
                  increment: rewardDecimal,
                },
                rank: milestone.rank,
              },
            });

            // Create achievement record
            await prisma.achievement.create({
              data: {
                distributorId: dist.id,
                rankName: milestone.rank,
                salesTarget: new Decimal(milestone.salesTarget),
                rewardAmount: rewardDecimal,
                claimedAt: new Date(),
              },
            });

            // Log wallet transaction
            await prisma.walletTransaction.create({
              data: {
                distributorId: dist.id,
                type: 'ACHIEVEMENT_REWARD',
                amount: rewardDecimal,
                description: `Achievement reward: ${milestone.rank}`,
                referenceId: dist.id,
              },
            });
          }
        }
      }
    }

    // Show final state
    console.log('\n\n📜 FINAL STATE:\n');
    const finalDistributors = await prisma.distributor.findMany();
    for (const dist of finalDistributors) {
      const achievements = await prisma.achievement.count({
        where: { distributorId: dist.id },
      });
      console.log(`${dist.name}:`);
      console.log(`  Level1 Sales: ₹${dist.level1Sales}`);
      console.log(`  Rank: ${dist.rank}`);
      console.log(`  Achievements Claimed: ${achievements}`);
      console.log(`  Wallet: ₹${dist.walletBalance}\n`);
    }

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAndClaimAchievements();
