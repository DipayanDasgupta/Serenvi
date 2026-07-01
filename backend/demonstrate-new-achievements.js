const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function demonstrateNewAchievementSystem() {
  console.log('\n🏆 NEW ACHIEVEMENT REWARD SCHEME');
  console.log('================================\n');

  console.log('📋 Achievement Ranks (Based on Personal Sales Only):\n');

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

  ACHIEVEMENT_MILESTONES.forEach((milestone, index) => {
    const rewardPercent = ((milestone.reward / milestone.salesTarget) * 100).toFixed(1);
    console.log(
      `${(index + 1).toString().padStart(2, ' ')}. ${milestone.rank.padEnd(15)} | Target: ₹${
        milestone.salesTarget.toLocaleString().padStart(10)
      } | Reward: ₹${milestone.reward.toLocaleString().padStart(10)} (${rewardPercent}%)`,
    );
  });

  console.log('\n✨ Key Features:\n');
  console.log('  ✓ All rewards = 12% of sales target');
  console.log('  ✓ Based on PERSONAL SALES ONLY (not referred revenue)');
  console.log('  ✓ Unlocked when personal sales ≥ target amount');
  console.log('  ✓ Users manually claim rewards after unlocking');
  console.log('  ✓ 9 total achievement ranks\n');

  // Show examples of progression
  console.log('📈 Example User Progression:\n');

  const userExamples = [
    { personalSales: 60000, nextMilestone: 'Master (₹100,000)' },
    { personalSales: 280000, nextMilestone: 'Icon (₹500,000)' },
    { personalSales: 1200000, nextMilestone: 'Global Leader (₹2,500,000)' },
    { personalSales: 6000000, nextMilestone: 'World Leader (₹5,000,000)' },
  ];

  userExamples.forEach((example) => {
    const unlocked = ACHIEVEMENT_MILESTONES.filter((m) => example.personalSales >= m.salesTarget);
    const nextMilestone = ACHIEVEMENT_MILESTONES.find((m) => example.personalSales < m.salesTarget)
      ?.rank;

    console.log(`Personal Sales: ₹${example.personalSales.toLocaleString()}`);
    console.log(`  ✅ Unlocked: ${unlocked.length} achievement(s)`);
    if (unlocked.length > 0) {
      console.log(`     ${unlocked.map((u) => u.rank).join(', ')}`);
    }
    console.log(`  ⏳ Next: ${nextMilestone || 'All achievements unlocked!'}`);
    console.log();
  });

  console.log(
    '💡 Note: Achievement rewards are NOT part of wallet balance until manually claimed.\n',
  );

  process.exit(0);
}

demonstrateNewAchievementSystem().catch(console.error);
