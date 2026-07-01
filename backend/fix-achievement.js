const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAchievements() {
  try {
    // Get all distributors with level1Sales >= 50000 (new Influencer threshold)
    const distributors = await prisma.distributor.findMany({
      where: {
        level1Sales: { gte: 50000 }
      }
    });

    console.log('Found ' + distributors.length + ' distributors with sales >= 50k');

    for (const dist of distributors) {
      console.log('Checking ' + dist.name + ' with level1Sales: ₹' + dist.level1Sales);
      
      // Check if Influencer achievement exists
      const exists = await prisma.achievement.findUnique({
        where: {
          distributorId_rankName: {
            distributorId: dist.id,
            rankName: 'Influencer'
          }
        }
      });

      if (!exists) {
        console.log('Creating Influencer achievement for ' + dist.name);
        await prisma.achievement.create({
          data: {
            distributorId: dist.id,
            rankName: 'Influencer',
            salesTarget: 50000,
            rewardAmount: 6000,
            claimedAt: new Date()
          }
        });

        // Update distributor rank and wallet
        await prisma.distributor.update({
          where: { id: dist.id },
          data: {
            rank: 'Influencer',
            walletBalance: { increment: 6000 }
          }
        });

        // Log transaction
        await prisma.walletTransaction.create({
          data: {
            distributorId: dist.id,
            type: 'ACHIEVEMENT_REWARD',
            amount: 6000,
            description: 'Achievement reward: Influencer',
            referenceId: dist.id
          }
        });

        console.log('✓ ' + dist.name + ' awarded Influencer rank + ₹6,000');
      } else {
        console.log('✓ ' + dist.name + ' already has Influencer achievement');
      }
    }
    
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAchievements();
