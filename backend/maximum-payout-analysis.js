const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');
const prisma = new PrismaClient();

async function analyzeMaximumPayout() {
  try {
    console.log('🎯 MAXIMUM PAYOUT SCENARIO ANALYSIS\n');
    console.log('='.repeat(80) + '\n');

    // Get all achievement bonuses to understand the structure
    const achievements = await prisma.achievement.findMany({
      select: {
        id: true,
        rankName: true,
        salesTarget: true,
        rewardAmount: true,
      },
      distinct: ['rankName', 'rewardAmount'],
    });

    console.log('📊 ACHIEVEMENT BONUS STRUCTURE:\n');
    if (achievements.length > 0) {
      for (const ach of achievements) {
        console.log(`  • ${ach.rankName}`);
        console.log(`    ├─ Sales Target: ₹${new Decimal(ach.salesTarget).toNumber().toLocaleString()}`);
        console.log(`    └─ Reward: ₹${new Decimal(ach.rewardAmount).toNumber().toLocaleString()}\n`);
      }
    } else {
      console.log('  No achievements configured\n');
    }

    // Get MLM commission structure
    console.log('─'.repeat(80) + '\n');
    console.log('💳 MLM COMMISSION STRUCTURE:\n');

    const commissions = await prisma.commission.findMany({
      select: {
        level: true,
        commissionRate: true,
      },
      distinct: ['level', 'commissionRate'],
      orderBy: { level: 'asc' },
    });

    if (commissions.length > 0) {
      let totalCommissionRate = new Decimal(0);
      for (const comm of commissions) {
        console.log(`  • Level ${comm.level}: ${comm.commissionRate}% of downline sales`);
        totalCommissionRate = totalCommissionRate.plus(new Decimal(comm.commissionRate));
      }
      console.log(`  Total per transaction: ${totalCommissionRate}%\n`);
    }

    // Leadership salary tiers
    const SALARY_TIERS = [
      { monthlysSalesThreshold: 100000000, poolPercentage: 0.8 },
      { monthlysSalesThreshold: 5000000, poolPercentage: 1.5 },
      { monthlysSalesThreshold: 2500000, poolPercentage: 1.6 },
      { monthlysSalesThreshold: 1000000, poolPercentage: 1.6 },
      { monthlysSalesThreshold: 500000, poolPercentage: 1.5 },
      { monthlysSalesThreshold: 100000, poolPercentage: 1.3 },
      { monthlysSalesThreshold: 50000, poolPercentage: 1.1 },
      { monthlysSalesThreshold: 25000, poolPercentage: 2.9 },
      { monthlysSalesThreshold: 10000, poolPercentage: 3.7 },
    ];

    console.log('─'.repeat(80) + '\n');
    console.log('🏆 LEADERSHIP SALARY TIERS (15% of referred revenue):\n');
    
    let totalSalaryPercentage = new Decimal(0);
    for (const tier of SALARY_TIERS) {
      console.log(`  • ≥₹${tier.monthlysSalesThreshold.toLocaleString()}: ${tier.poolPercentage}%`);
      totalSalaryPercentage = totalSalaryPercentage.plus(new Decimal(tier.poolPercentage));
    }
    console.log(`  Total: ${totalSalaryPercentage}%\n`);

    console.log('='.repeat(80) + '\n');
    console.log('🎬 MAXIMUM PAYOUT SCENARIO ANALYSIS\n');
    console.log('─'.repeat(80) + '\n');

    // Scenario 1: Base case - no sales
    console.log('SCENARIO 1: MINIMUM PAYOUT (No Sales)\n');
    console.log('  • Total Revenue: ₹0');
    console.log('  • MLM Commission: ₹0');
    console.log('  • Leadership Salary: ₹0');
    console.log('  • Achievement Bonus: ₹0');
    console.log('  • TOTAL PAYOUT: ₹0\n');

    // Scenario 2: Configuration for maximum payout
    console.log('─'.repeat(80) + '\n');
    console.log('SCENARIO 2: MAXIMUM PAYOUT (Optimal Structure)\n');

    const baseRevenue = new Decimal(1000000); // ₹10 lakh = 1000000

    console.log(`  Base Monthly Revenue: ₹${baseRevenue.toNumber().toLocaleString()}\n`);

    // MLM Commission calculation
    const mlmCommissionRate = new Decimal(32); // Level 1 (25%) + Level 2 (7%)
    const mlmCommission = baseRevenue.mul(mlmCommissionRate).div(100);

    console.log(`  📊 MLM COMMISSION CALCULATION:`);
    console.log(`     Revenue: ₹${baseRevenue.toNumber().toLocaleString()}`);
    console.log(`     Rate: ${mlmCommissionRate}% (Level 1: 25% + Level 2: 7%)`);
    console.log(`     → MLM Commission: ₹${mlmCommission.toNumber().toLocaleString()}\n`);

    // Leadership Salary calculation (15% of referred revenue)
    const leadershipSalary = baseRevenue.mul(new Decimal(15)).div(100);

    console.log(`  📊 LEADERSHIP SALARY CALCULATION:`);
    console.log(`     Referred Revenue: ₹${baseRevenue.toNumber().toLocaleString()}`);
    console.log(`     Rate: 15% of referred revenue`);
    console.log(`     → Leadership Salary Pool: ₹${leadershipSalary.toNumber().toLocaleString()}\n`);

    // Achievement bonus - assume all achievements unlocked
    let totalAchievementBonus = new Decimal(0);
    if (achievements.length > 0) {
      for (const ach of achievements) {
        totalAchievementBonus = totalAchievementBonus.plus(new Decimal(ach.rewardAmount));
      }
      console.log(`  📊 ACHIEVEMENT BONUS CALCULATION:`);
      console.log(`     Rank Tiers Unlocked: ${achievements.length}`);
      for (const ach of achievements) {
        console.log(`       • ${ach.rankName}: ₹${new Decimal(ach.rewardAmount).toNumber().toLocaleString()}`);
      }
      console.log(`     → Achievement Bonus Total: ₹${totalAchievementBonus.toNumber().toLocaleString()}\n`);
    }

    // Total payout
    const totalPayout = mlmCommission.plus(leadershipSalary).plus(totalAchievementBonus);
    const payoutPercentage = baseRevenue.gt(0)
      ? totalPayout.div(baseRevenue).mul(100).toNumber().toFixed(2)
      : 0;

    console.log('─'.repeat(80));
    console.log(`\n  💰 TOTAL PAYOUT: ₹${totalPayout.toNumber().toLocaleString()}`);
    console.log(`  📈 PAYOUT as % of Revenue: ${payoutPercentage}%\n`);

    // Scenario 3: Extreme case - larger network
    console.log('─'.repeat(80) + '\n');
    console.log('SCENARIO 3: EXTREME CASE (₹1 CRORE = ₹1,00,00,000)\n');

    const extremeRevenue = new Decimal(10000000); // 1 crore

    const extremeMlmCommission = extremeRevenue.mul(mlmCommissionRate).div(100);
    const extremeLeadershipSalary = extremeRevenue.mul(new Decimal(15)).div(100);
    const extremeAchievementBonus = totalAchievementBonus.mul(10); // Assume 10x unlocks

    const extremeTotalPayout = extremeMlmCommission.plus(extremeLeadershipSalary).plus(extremeAchievementBonus);
    const extremePayoutPercentage = extremeRevenue.gt(0)
      ? extremeTotalPayout.div(extremeRevenue).mul(100).toNumber().toFixed(2)
      : 0;

    console.log(`  Base Revenue: ₹${extremeRevenue.toNumber().toLocaleString()}\n`);
    console.log(`  MLM Commission (32%): ₹${extremeMlmCommission.toNumber().toLocaleString()}`);
    console.log(`  Leadership Salary (15%): ₹${extremeLeadershipSalary.toNumber().toLocaleString()}`);
    console.log(`  Achievement Bonus (10x): ₹${extremeAchievementBonus.toNumber().toLocaleString()}\n`);
    console.log(`  💰 TOTAL PAYOUT: ₹${extremeTotalPayout.toNumber().toLocaleString()}`);
    console.log(`  📈 PAYOUT as % of Revenue: ${extremePayoutPercentage}%\n`);

    // Scenario 4: Analysis of revenue distribution at different levels
    console.log('='.repeat(80) + '\n');
    console.log('SCENARIO 4: REVENUE DISTRIBUTION AT DIFFERENT SCALES\n');
    console.log('─'.repeat(80) + '\n');

    const scales = [
      { name: '₹10,000', value: new Decimal(10000) },
      { name: '₹1,00,000', value: new Decimal(100000) },
      { name: '₹10,00,000', value: new Decimal(1000000) },
      { name: '₹1,00,00,000', value: new Decimal(10000000) },
      { name: '₹10,00,00,000', value: new Decimal(100000000) },
    ];

    console.log('Revenue\t\t\tMLM (32%)\t\tSalary (15%)\t\tTotal (47%)\n');
    console.log('─'.repeat(80));

    for (const scale of scales) {
      const mlm = scale.value.mul(mlmCommissionRate).div(100);
      const salary = scale.value.mul(new Decimal(15)).div(100);
      const total = mlm.plus(salary);

      console.log(
        `${scale.name.padEnd(20)}\t` +
        `₹${mlm.toNumber().toLocaleString().padEnd(20)}\t` +
        `₹${salary.toNumber().toLocaleString().padEnd(20)}\t` +
        `₹${total.toNumber().toLocaleString()}`
      );
    }

    // Final analysis
    console.log('\n' + '='.repeat(80) + '\n');
    console.log('💡 KEY FINDINGS:\n');
    console.log('1. PAYOUT RATE: Maximum 47% of revenue goes to payouts');
    console.log('   • MLM Commission: Up to 32% (Level 1: 25% + Level 2: 7%)');
    console.log('   • Leadership Salary: Up to 15% (all 9 tiers max)');
    console.log('   • Achievement Bonus: Additional (varies with unlocks)\n');

    console.log('2. MAXIMUM SCENARIO BREAKDOWN (at ₹1 crore):');
    console.log(`   • MLM Commission: ₹${extremeMlmCommission.toNumber().toLocaleString()} (32%)`);
    console.log(`   • Leadership Salary: ₹${extremeLeadershipSalary.toNumber().toLocaleString()} (15%)`);
    console.log(`   • Achievement Bonus: ₹${extremeAchievementBonus.toNumber().toLocaleString()}`);
    console.log(`   • TOTAL: ₹${extremeTotalPayout.toNumber().toLocaleString()} (${extremePayoutPercentage}%)\n`);

    console.log('3. COMPANY RETAINS: ' + (100 - parseFloat(extremePayoutPercentage)).toFixed(2) + '%\n');

    console.log('4. SCALING PATTERN:');
    console.log('   • Payout is linear with revenue (47% baseline)');
    console.log('   • Achievement bonuses scale with number of unlocks');
    console.log('   • Larger networks = More leadership salary earners\n');

    console.log('5. COST CONTROL LEVERS:');
    console.log('   • Reduce MLM commission rates (default: 32% total)');
    console.log('   • Reduce leadership salary tiers or pool percentage (default: 15%)');
    console.log('   • Limit achievement bonus frequency or amounts');
    console.log('   • Cap commission levels (currently 2 levels)\n');

    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeMaximumPayout();
