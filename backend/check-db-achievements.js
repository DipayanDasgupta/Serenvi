const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAchievementData() {
  console.log('\n🔍 CHECKING ACHIEVEMENT DATA IN DATABASE');
  console.log('=========================================\n');

  try {
    // Check all achievements in database
    const achievements = await prisma.achievement.findMany({
      include: {
        distributor: {
          select: { name: true }
        }
      }
    });

    console.log(`Total achievements in DB: ${achievements.length}\n`);

    if (achievements.length > 0) {
      console.log('Existing Achievement Records:');
      achievements.forEach((ach, idx) => {
        console.log(`${idx + 1}. ${ach.distributor?.name || 'Unknown'} - ${ach.rankName}`);
        console.log(`   Target: ₹${ach.salesTarget}`);
        console.log(`   Reward: ₹${ach.rewardAmount}`);
        console.log();
      });
    }

    // Check distributor data
    const distributors = await prisma.distributor.findMany({
      select: {
        id: true,
        name: true,
        level1Sales: true,
        rank: true,
        achievements: true
      }
    });

    console.log(`\nTotal distributors: ${distributors.length}`);
    distributors.forEach((dist) => {
      console.log(`- ${dist.name}: Sales ₹${dist.level1Sales}, Rank: ${dist.rank}, Achievements: ${dist.achievements.length}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAchievementData();
