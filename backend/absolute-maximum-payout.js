const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');
const prisma = new PrismaClient();

async function maximumPayoutScenario() {
  try {
    console.log('🔥 ABSOLUTE MAXIMUM PAYOUT SCENARIO\n');
    console.log('='.repeat(90) + '\n');

    console.log('📝 ASSUMPTIONS FOR MAXIMUM PAYOUT:\n');
    console.log('╔══════════════════════════════════════════════════════════════════════════════════╗\n');

    console.log('SCENARIO: Large, Deep MLM Network at Peak Performance\n');
    
    console.log('Network Structure:');
    console.log('  ├─ 1 Organic User (Top Sponsor)');
    console.log('  ├─ Level 1 Downline: 10 Referred Users');
    console.log('  ├─ Level 2 Downline: 50 Referred Users');
    console.log('  ├─ Level 3+ Downline: 200+ Referred Users (only 2 levels earn commission)\n');

    console.log('Individual User Stats:');
    console.log('  ├─ Each user makes average sales: ₹1,00,000/month');
    console.log('  ├─ Referral rate: Everyone registered with referral code (except top)');
    console.log('  ├─ Achievement unlocked by: Multiple users (reaching sales targets)\n');

    console.log('╚══════════════════════════════════════════════════════════════════════════════════╝\n');

    // Calculate maximum scenario
    console.log('─'.repeat(90) + '\n');
    console.log('💰 PAYOUT CALCULATION:\n');

    // Base parameters
    const usersInNetwork = 261; // 1 organic + 10 + 50 + 200
    const avgSalesPerUser = new Decimal(100000);
    const totalRevenue = new Decimal(usersInNetwork).mul(avgSalesPerUser);

    const referredUsers = usersInNetwork - 1; // Everyone except top sponsor
    const referredRevenue = new Decimal(referredUsers).mul(avgSalesPerUser);

    console.log(`Total Users in Network: ${usersInNetwork}`);
    console.log(`Referred Users: ${referredUsers}`);
    console.log(`Avg Sales per User: ₹${avgSalesPerUser.toNumber().toLocaleString()}`);
    console.log(`Total Monthly Revenue: ₹${totalRevenue.toNumber().toLocaleString()}`);
    console.log(`Referred User Revenue: ₹${referredRevenue.toNumber().toLocaleString()}\n`);

    // MLM Commission
    console.log('─'.repeat(90));
    console.log('\n1️⃣  MLM COMMISSION (32% of referred revenue)\n');

    // Level 1: 25% - earned by immediate sponsors
    const level1CommissionRate = new Decimal(25);
    const level1Commission = referredRevenue.mul(level1CommissionRate).div(100);

    console.log(`   Level 1 Commission (Immediate Sponsors):`);
    console.log(`   ├─ Applicable to: All downline sales`);
    console.log(`   ├─ Rate: 25%`);
    console.log(`   ├─ Base: ₹${referredRevenue.toNumber().toLocaleString()}`);
    console.log(`   └─ Amount: ₹${level1Commission.toNumber().toLocaleString()}\n`);

    // Level 2: 7% - earned by second-level sponsors
    const level2CommissionRate = new Decimal(7);
    const level2Commission = referredRevenue.mul(level2CommissionRate).div(100);

    console.log(`   Level 2 Commission (2nd Level Sponsors):`);
    console.log(`   ├─ Applicable to: 2nd level downline sales`);
    console.log(`   ├─ Rate: 7%`);
    console.log(`   ├─ Base: ₹${referredRevenue.toNumber().toLocaleString()}`);
    console.log(`   └─ Amount: ₹${level2Commission.toNumber().toLocaleString()}\n`);

    const totalMlmCommission = level1Commission.plus(level2Commission);
    console.log(`   📊 TOTAL MLM COMMISSION: ₹${totalMlmCommission.toNumber().toLocaleString()}\n`);

    // Leadership Salary
    console.log('─'.repeat(90));
    console.log('\n2️⃣  LEADERSHIP SALARY (15% of referred revenue)\n');

    const leadershipSalaryRate = new Decimal(15);
    const leadershipPool = referredRevenue.mul(leadershipSalaryRate).div(100);

    console.log(`   Leadership Pool Calculation:`);
    console.log(`   ├─ Base: Referred User Revenue = ₹${referredRevenue.toNumber().toLocaleString()}`);
    console.log(`   ├─ Pool %: 15%`);
    console.log(`   └─ Pool Amount: ₹${leadershipPool.toNumber().toLocaleString()}\n`);

    console.log(`   Scenario: Average distribution across 260 referred users`);
    const leadershipPerUser = leadershipPool.div(new Decimal(referredUsers));
    console.log(`   ├─ Per User Average: ₹${leadershipPerUser.toNumber().toLocaleString()}`);
    console.log(`   └─ Total: ₹${leadershipPool.toNumber().toLocaleString()}\n`);

    // Achievement Bonus
    console.log('─'.repeat(90));
    console.log('\n3️⃣  ACHIEVEMENT BONUS (Per achiever)\n');

    const achievementReward = new Decimal(10000); // Influencer rank
    
    // Estimate how many users reach achievement target
    const achievementTarget = new Decimal(150000); // ₹1,50,000 sales target
    const usersReachingTarget = new Decimal(usersInNetwork).div(2); // Assume 50% reach target
    
    const totalAchievementBonus = achievementReward.mul(usersReachingTarget);

    console.log(`   Achievement Configuration:`);
    console.log(`   ├─ Rank: Influencer`);
    console.log(`   ├─ Sales Target: ₹${achievementTarget.toNumber().toLocaleString()}`);
    console.log(`   ├─ Reward per User: ₹${achievementReward.toNumber().toLocaleString()}\n`);

    console.log(`   Scenario: ${usersReachingTarget.toNumber()} users reach target (50% of network)`);
    console.log(`   └─ Total Achievement Bonus: ₹${totalAchievementBonus.toNumber().toLocaleString()}\n`);

    // TOTAL
    console.log('─'.repeat(90));
    console.log('\n💎 TOTAL MAXIMUM PAYOUT:\n');

    const totalPayout = totalMlmCommission.plus(leadershipPool).plus(totalAchievementBonus);
    const payoutPercentage = totalRevenue.gt(0)
      ? totalPayout.div(totalRevenue).mul(100).toNumber().toFixed(2)
      : 0;

    const retained = new Decimal(100).minus(new Decimal(payoutPercentage));

    console.log(`   MLM Commission:        ₹${totalMlmCommission.toNumber().toLocaleString()}`);
    console.log(`   Leadership Salary:     ₹${leadershipPool.toNumber().toLocaleString()}`);
    console.log(`   Achievement Bonus:     ₹${totalAchievementBonus.toNumber().toLocaleString()}`);
    console.log(`   ──────────────────────────────────────`);
    console.log(`   TOTAL PAYOUT:          ₹${totalPayout.toNumber().toLocaleString()}\n`);

    console.log(`   📊 PAYOUT as % of Revenue: ${payoutPercentage}%`);
    console.log(`   📊 Company Retains: ${retained}%\n`);

    // Breakdown
    console.log('─'.repeat(90));
    console.log('\n📈 BREAKDOWN OF PAYOUT:\n');

    const mlmPct = totalMlmCommission.div(totalPayout).mul(100).toNumber().toFixed(2);
    const salaryPct = leadershipPool.div(totalPayout).mul(100).toNumber().toFixed(2);
    const achievementPct = totalAchievementBonus.div(totalPayout).mul(100).toNumber().toFixed(2);

    console.log(`   MLM Commission:        ${mlmPct}% (₹${totalMlmCommission.toNumber().toLocaleString()})`);
    console.log(`   Leadership Salary:     ${salaryPct}% (₹${leadershipPool.toNumber().toLocaleString()})`);
    console.log(`   Achievement Bonus:     ${achievementPct}% (₹${totalAchievementBonus.toNumber().toLocaleString()})\n`);

    // Risk analysis
    console.log('='.repeat(90) + '\n');
    console.log('⚠️  RISK ANALYSIS:\n');

    console.log(`1. At This Payout Rate (${payoutPercentage}%):`);
    console.log(`   ✓ Operating costs must be < ${retained}%`);
    console.log(`   ✗ High risk if operating costs > 10%\n`);

    console.log(`2. Worst Case (Even Higher Payout):`);
    const worstCasePercentage = new Decimal(payoutPercentage).plus(5); // +5% if more users reach achievements
    console.log(`   • If more users unlock achievements: ~${worstCasePercentage}% payout\n`);

    console.log(`3. Revenue Concentration Risk:`);
    console.log(`   • Heavy reliance on Level 1 commission (${level1CommissionRate}%)`);
    console.log(`   • Even small reduction saves significant amount\n`);

    // Optimization
    console.log('─'.repeat(90));
    console.log('\n💡 OPTIMIZATION STRATEGIES:\n');

    console.log('To Reduce Payout from ' + payoutPercentage + '%:\n');

    const scenarios = [
      {
        name: 'Reduce L1 Commission from 25% → 20%',
        savings: referredRevenue.mul(new Decimal(5)).div(100),
      },
      {
        name: 'Reduce L2 Commission from 7% → 5%',
        savings: referredRevenue.mul(new Decimal(2)).div(100),
      },
      {
        name: 'Reduce Leadership Salary from 15% → 12%',
        savings: referredRevenue.mul(new Decimal(3)).div(100),
      },
      {
        name: 'Reduce both L1 & L2 by 3% each',
        savings: referredRevenue.mul(new Decimal(6)).div(100),
      },
    ];

    for (const scenario of scenarios) {
      const newPayout = totalPayout.minus(scenario.savings);
      const newPercentage = totalRevenue.gt(0)
        ? newPayout.div(totalRevenue).mul(100).toNumber().toFixed(2)
        : 0;
      
      console.log(`  • ${scenario.name}`);
      console.log(`    Savings: ₹${scenario.savings.toNumber().toLocaleString()}`);
      console.log(`    New Payout Rate: ${newPercentage}%`);
      console.log(`    Retained: ${(100 - parseFloat(newPercentage)).toFixed(2)}%\n`);
    }

    console.log('='.repeat(90) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

maximumPayoutScenario();
