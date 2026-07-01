const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');
const prisma = new PrismaClient();

async function compareNetworkStructures() {
  try {
    console.log('🔄 NETWORK STRUCTURE COMPARISON\n');
    console.log('='.repeat(100) + '\n');

    // LINEAR CHAIN SCENARIO
    console.log('SCENARIO 1: LINEAR CHAIN (1→2→3→...→260)\n');
    console.log('╔════════════════════════════════════════════════════════════════════════════════════╗\n');
    
    console.log('Structure:');
    console.log('  Person 1 (Organic)');
    console.log('    └─ Person 2 (Referred by 1)');
    console.log('       └─ Person 3 (Referred by 2)');
    console.log('          └─ Person 4 (Referred by 3)');
    console.log('             └─ ... (continues linearly)');
    console.log('                └─ Person 260 (Referred by 259)\n');

    console.log('Each person ONLY has:');
    console.log('  • 1 person in their downline (Level 1)');
    console.log('  • That person might have someone in THEIR downline (Level 2 for original person)');
    console.log('  • Most people DON\'T earn Level 2 commission\n');

    console.log('╚════════════════════════════════════════════════════════════════════════════════════╝\n');

    // LINEAR CALCULATION
    const linearUsers = 260;
    const avgSalesPerUser = new Decimal(100000);
    const totalLinearRevenue = new Decimal(linearUsers).mul(avgSalesPerUser);

    console.log('💰 LINEAR CHAIN PAYOUTS:\n');
    console.log(`Total Users: ${linearUsers}`);
    console.log(`Total Revenue: ₹${totalLinearRevenue.toNumber().toLocaleString()}\n`);

    // In linear chain, MLM commission is minimal
    // Only some people have Level 1 downline, even fewer have Level 2
    // Average: maybe 50% have Level 1, 25% have Level 2

    const linearLevel1Rate = new Decimal(50); // 50% of users can earn Level 1 commission
    const linearLevel1Earners = new Decimal(linearUsers).mul(0.5);
    const linearLevel1PerUser = avgSalesPerUser; // Each earner's downline = 1 person's sales
    const linearLevel1Commission = linearLevel1Earners.mul(linearLevel1PerUser).mul(new Decimal(25)).div(100);

    const linearLevel2Rate = new Decimal(25); // 25% of users can earn Level 2 commission
    const linearLevel2Earners = new Decimal(linearUsers).mul(0.25);
    const linearLevel2PerUser = avgSalesPerUser; // Level 2 downline = 1 person's sales
    const linearLevel2Commission = linearLevel2Earners.mul(linearLevel2PerUser).mul(new Decimal(7)).div(100);

    const linearTotalMlm = linearLevel1Commission.plus(linearLevel2Commission);

    console.log(`MLM Commission:`);
    console.log(`  Level 1 (50% of users earn 25% from 1 downline)`);
    console.log(`    Earners: ${linearLevel1Earners.toNumber()} users`);
    console.log(`    Per user level 1 downline sales: ₹${linearLevel1PerUser.toNumber().toLocaleString()}`);
    console.log(`    Rate: 25%`);
    console.log(`    Commission: ₹${linearLevel1Commission.toNumber().toLocaleString()}\n`);

    console.log(`  Level 2 (25% of users earn 7% from 1 downline's downline)`);
    console.log(`    Earners: ${linearLevel2Earners.toNumber()} users`);
    console.log(`    Per user level 2 downline sales: ₹${linearLevel2PerUser.toNumber().toLocaleString()}`);
    console.log(`    Rate: 7%`);
    console.log(`    Commission: ₹${linearLevel2Commission.toNumber().toLocaleString()}\n`);

    console.log(`  TOTAL MLM: ₹${linearTotalMlm.toNumber().toLocaleString()}\n`);

    // Leadership salary (linear also uses 15% of referred revenue)
    const linearLeadershipSalary = totalLinearRevenue.mul(new Decimal(15)).div(100);
    console.log(`Leadership Salary (15% of revenue): ₹${linearLeadershipSalary.toNumber().toLocaleString()}\n`);

    // Achievement (25% of users reach 150k target)
    const linearAchievementUsers = new Decimal(linearUsers).mul(0.25);
    const linearAchievementBonus = linearAchievementUsers.mul(new Decimal(10000));
    console.log(`Achievement Bonus (25% reach target): ₹${linearAchievementBonus.toNumber().toLocaleString()}\n`);

    const linearTotalPayout = linearTotalMlm.plus(linearLeadershipSalary).plus(linearAchievementBonus);
    const linearPayoutPct = totalLinearRevenue.gt(0)
      ? linearTotalPayout.div(totalLinearRevenue).mul(100).toNumber().toFixed(2)
      : 0;

    console.log(`${'─'.repeat(100)}`);
    console.log(`TOTAL LINEAR PAYOUT: ₹${linearTotalPayout.toNumber().toLocaleString()}`);
    console.log(`PAYOUT %: ${linearPayoutPct}%`);
    console.log(`COMPANY RETAINS: ${(100 - parseFloat(linearPayoutPct)).toFixed(2)}%\n\n`);

    // PYRAMID STRUCTURE SCENARIO
    console.log('='.repeat(100) + '\n');
    console.log('SCENARIO 2: PYRAMID STRUCTURE (Wider Downlines)\n');
    console.log('╔════════════════════════════════════════════════════════════════════════════════════╗\n');
    
    console.log('Structure:');
    console.log('  1 Organic User (Top)');
    console.log('    ├─ 10 Level 1 Users (referred by organic)');
    console.log('    │  ├─ Person A has 5 Level 2 downlines');
    console.log('    │  ├─ Person B has 5 Level 2 downlines');
    console.log('    │  └─ ... etc (50 total Level 2 users)\n');
    console.log('    ├─ 50 Level 2 Users');
    console.log('    │  └─ 200+ Level 3+ users (earn commission for Levels 1&2, not Level 3)\n');

    console.log('Each Level 1 person has:');
    console.log('  • ~5 people in their Level 1 downline');
    console.log('  • ~25 people in their Level 2 downline\n');

    console.log('╚════════════════════════════════════════════════════════════════════════════════════╝\n');

    // PYRAMID CALCULATION (from previous analysis)
    const pyramidUsers = 260;
    const pyramidRevenue = new Decimal(pyramidUsers).mul(avgSalesPerUser);

    // In pyramid, EVERY user has downlines in both levels
    // Level 1 commission is earned by all Level 1+ users on their downlines
    const pyramidLevel1Commission = pyramidRevenue.mul(new Decimal(25)).div(100);

    // Level 2 commission is earned by all Level 1+ users on second-level downlines
    const pyramidLevel2Commission = pyramidRevenue.mul(new Decimal(7)).div(100);

    const pyramidTotalMlm = pyramidLevel1Commission.plus(pyramidLevel2Commission);
    const pyramidLeadershipSalary = pyramidRevenue.mul(new Decimal(15)).div(100);
    const pyramidAchievementBonus = new Decimal(pyramidUsers).mul(0.5).mul(new Decimal(10000));

    const pyramidTotalPayout = pyramidTotalMlm.plus(pyramidLeadershipSalary).plus(pyramidAchievementBonus);
    const pyramidPayoutPct = pyramidRevenue.gt(0)
      ? pyramidTotalPayout.div(pyramidRevenue).mul(100).toNumber().toFixed(2)
      : 0;

    console.log('💰 PYRAMID STRUCTURE PAYOUTS:\n');
    console.log(`Total Users: ${pyramidUsers}`);
    console.log(`Total Revenue: ₹${pyramidRevenue.toNumber().toLocaleString()}\n`);
    console.log(`MLM Commission (32% rate applied to ALL): ₹${pyramidTotalMlm.toNumber().toLocaleString()}`);
    console.log(`Leadership Salary (15%): ₹${pyramidLeadershipSalary.toNumber().toLocaleString()}`);
    console.log(`Achievement Bonus: ₹${pyramidAchievementBonus.toNumber().toLocaleString()}\n`);

    console.log(`${'─'.repeat(100)}`);
    console.log(`TOTAL PYRAMID PAYOUT: ₹${pyramidTotalPayout.toNumber().toLocaleString()}`);
    console.log(`PAYOUT %: ${pyramidPayoutPct}%`);
    console.log(`COMPANY RETAINS: ${(100 - parseFloat(pyramidPayoutPct)).toFixed(2)}%\n\n`);

    // COMPARISON
    console.log('='.repeat(100) + '\n');
    console.log('📊 SIDE-BY-SIDE COMPARISON\n');

    console.log(`                        LINEAR CHAIN          PYRAMID STRUCTURE`);
    console.log(`${'─'.repeat(100)}`);
    console.log(`Users                   ${linearUsers}                  ${pyramidUsers}`);
    console.log(`Revenue                 ₹${totalLinearRevenue.toNumber().toLocaleString().padEnd(20)}  ₹${pyramidRevenue.toNumber().toLocaleString()}`);
    console.log(`\nMLM Commission          ₹${linearTotalMlm.toNumber().toLocaleString().padEnd(20)}  ₹${pyramidTotalMlm.toNumber().toLocaleString()}`);
    console.log(`Leadership Salary       ₹${linearLeadershipSalary.toNumber().toLocaleString().padEnd(20)}  ₹${pyramidLeadershipSalary.toNumber().toLocaleString()}`);
    console.log(`Achievement Bonus       ₹${linearAchievementBonus.toNumber().toLocaleString().padEnd(20)}  ₹${pyramidAchievementBonus.toNumber().toLocaleString()}`);
    console.log(`${'─'.repeat(100)}`);
    console.log(`TOTAL PAYOUT            ₹${linearTotalPayout.toNumber().toLocaleString().padEnd(20)}  ₹${pyramidTotalPayout.toNumber().toLocaleString()}`);
    console.log(`PAYOUT %                ${linearPayoutPct.padEnd(20)}  ${pyramidPayoutPct}%`);
    console.log(`COMPANY RETAINS         ${(100 - parseFloat(linearPayoutPct)).toFixed(2).padEnd(20)}%  ${(100 - parseFloat(pyramidPayoutPct)).toFixed(2)}%\n`);

    console.log('='.repeat(100) + '\n');
    console.log('💡 KEY DIFFERENCE:\n');

    const difference = pyramidTotalPayout.minus(linearTotalPayout);
    console.log(`Pyramid pays ${difference.toNumber().toLocaleString()} MORE than linear chain`);
    console.log(`That's ${difference.div(linearTotalPayout).mul(100).toNumber().toFixed(0)}% higher payout!\n`);

    console.log('WHY?');
    console.log(`  • Linear: Only 50% of people earn Level 1, only 25% earn Level 2`);
    console.log(`  • Pyramid: EVERYONE earns Level 1 and Level 2 commissions`);
    console.log(`  • Linear: Most people have 0 downlines → No commission`);
    console.log(`  • Pyramid: Everyone has multiple downlines → Full commission\n`);

    console.log('REAL WORLD:');
    console.log(`  Your current system (PYRAMID) is more profitable for participants`);
    console.log(`  But it's LESS sustainable for company (higher payouts)\n`);

    console.log('='.repeat(100) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

compareNetworkStructures();
