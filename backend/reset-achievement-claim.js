const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAchievements() {
  try {
    // Get the Aryaman Mandal distributor
    const distributor = await prisma.distributor.findFirst({
      where: { name: 'Aryaman Mandal' }
    });

    if (!distributor) {
      console.log('Distributor not found');
      return;
    }

    console.log('Found distributor: ' + distributor.name);
    console.log('Current wallet: ₹' + distributor.walletBalance);

    // Reset Influencer achievement to not claimed (claimedAt = null)
    const updated = await prisma.achievement.update({
      where: {
        distributorId_rankName: {
          distributorId: distributor.id,
          rankName: 'Influencer'
        }
      },
      data: {
        claimedAt: null  // Reset to unclaimed state
      }
    });
    
    console.log('✓ Achievement reset to unclaimed state');
    console.log('Achievement status: ' + (updated.claimedAt ? 'Claimed' : 'Ready to Claim'));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAchievements();
