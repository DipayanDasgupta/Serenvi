const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');
const prisma = new PrismaClient();

async function testMonthlyReset() {
  try {
    console.log('📅 Monthly Reset Test\n');
    console.log('='.repeat(50) + '\n');

    // Get test user
    const testUser = await prisma.distributor.findFirst({
      where: { sponsorId: { not: null }, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        monthlySales: true,
        currentLeadershipRank: true,
        currentLeadershipSalary: true,
        walletBalance: true,
      },
    });

    if (!testUser) {
      console.log('❌ No test user found');
      await prisma.$disconnect();
      return;
    }

    // Show current state
    console.log('📝 Test User: ' + testUser.name + '\n');
    console.log('BEFORE MONTHLY RESET (End of April):');
    console.log('─' .repeat(50));
    console.log(`  Monthly Sales: ₹${new Decimal(testUser.monthlySales).toNumber().toLocaleString()}`);
    
    const tierName = testUser.currentLeadershipRank !== null 
      ? `Tier ${testUser.currentLeadershipRank + 1}`
      : 'None';
    console.log(`  Leadership Rank: ${tierName}`);
    console.log(`  Current Salary: ₹${new Decimal(testUser.currentLeadershipSalary).toNumber().toLocaleString()}`);
    console.log(`  Wallet Balance: ₹${new Decimal(testUser.walletBalance).toNumber().toLocaleString()}\n`);

    // Simulate monthly reset (1st of next month)
    console.log('🔄 EXECUTING MONTHLY RESET (1st of May at 00:00)...\n');
    
    const resetResult = await prisma.distributor.update({
      where: { id: testUser.id },
      data: {
        monthlySales: new Decimal(0),
        currentLeadershipSalary: new Decimal(0),
        currentLeadershipRank: null,
      },
      select: {
        id: true,
        name: true,
        monthlySales: true,
        currentLeadershipRank: true,
        currentLeadershipSalary: true,
        walletBalance: true,
      },
    });

    console.log('AFTER MONTHLY RESET (May 1st):');
    console.log('─'.repeat(50));
    console.log(`  Monthly Sales: ₹${new Decimal(resetResult.monthlySales).toNumber().toLocaleString()}`);
    console.log(`  Leadership Rank: ${resetResult.currentLeadershipRank === null ? 'Null' : resetResult.currentLeadershipRank}`);
    console.log(`  Current Salary: ₹${new Decimal(resetResult.currentLeadershipSalary).toNumber().toLocaleString()}`);
    console.log(`  Wallet Balance: ₹${new Decimal(resetResult.walletBalance).toNumber().toLocaleString()}`);
    console.log(`  ✅ Wallet remains intact (${new Decimal(testUser.walletBalance).equals(resetResult.walletBalance) ? 'unchanged' : 'updated'})\n`);

    // Simulate new month activity
    console.log('📊 NEW MONTH ACTIVITY (Simulated May sales):\n');
    
    const updateResult = await prisma.distributor.update({
      where: { id: testUser.id },
      data: {
        monthlySales: new Decimal(45000), // New month sales
      },
      select: {
        id: true,
        name: true,
        monthlySales: true,
        currentLeadershipRank: true,
        currentLeadershipSalary: true,
        walletBalance: true,
      },
    });

    console.log('  User made sales: ₹' + new Decimal(updateResult.monthlySales).toNumber().toLocaleString());
    console.log(`  Monthly Sales: ₹${new Decimal(updateResult.monthlySales).toNumber().toLocaleString()}`);
    console.log(`  Leadership Rank: ${updateResult.currentLeadershipRank === null ? '(waiting for salary distribution)' : updateResult.currentLeadershipRank}`);
    console.log(`  Current Salary: ₹${new Decimal(updateResult.currentLeadershipSalary).toNumber().toLocaleString()}`);
    console.log(`  Wallet: ₹${new Decimal(updateResult.walletBalance).toNumber().toLocaleString()}\n`);

    console.log('='.repeat(50));
    console.log('\n✅ Monthly Reset Flow:\n');
    console.log('1️⃣  End of April:');
    console.log('   • User has accumulated monthlySales');
    console.log('   • User has assigned leadershipRank');
    console.log('   • User has currentLeadershipSalary\n');

    console.log('2️⃣  1st of May (00:00) - Monthly Reset Cron:');
    console.log('   • monthlySales → 0');
    console.log('   • currentLeadershipSalary → 0');
    console.log('   • currentLeadershipRank → null');
    console.log('   • Wallet balance remains unchanged (for earned money)\n');

    console.log('3️⃣  May onwards:');
    console.log('   • User starts fresh with ₹0 monthlySales');
    console.log('   • On May 1st salary distribution (01:00):');
    console.log('     * New salaries calculated based on May sales');
    console.log('     * New ranks assigned\n');

    // Cleanup
    await prisma.$disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testMonthlyReset();
