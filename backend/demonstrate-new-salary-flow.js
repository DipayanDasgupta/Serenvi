const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function demonstrateNewSalaryFlow() {
  console.log('\n🎯 NEW LEADERSHIP SALARY FLOW (Credited at 23:59 on last day of month)');
  console.log('================================================================\n');

  console.log('📋 HOW IT WORKS:\n');
  console.log('1️⃣  Throughout the month (hourly)');
  console.log('   ✓ Calculate salary based on monthly sales');
  console.log('   ✓ Store in currentLeadershipSalary field');
  console.log('   ✓ Update currentLeadershipRank based on tier');
  console.log('   ✗ DO NOT add to wallet yet\n');

  console.log('2️⃣  At 23:59 on LAST DAY of month');
  console.log('   ✓ Get all users with currentLeadershipSalary > 0');
  console.log('   ✓ Add salary to wallet');
  console.log('   ✓ Create wallet transaction entry');
  console.log('   ✓ Create leadershipSalary record');
  console.log('   ✓ Reset currentLeadershipSalary to 0\n');

  console.log('3️⃣  At 00:00 on 1st of NEXT month');
  console.log('   ✓ Reset monthlySales to 0');
  console.log('   ✓ Keep currentLeadershipRank for next month calculation\n');

  console.log('================================================================\n');

  // Check current month's pending salaries
  const usersWithPendingSalary = await prisma.distributor.findMany({
    where: {
      currentLeadershipSalary: { gt: new Decimal(0) },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      referralCode: true,
      monthlySales: true,
      currentLeadershipRank: true,
      currentLeadershipSalary: true,
      walletBalance: true,
    },
  });

  const SALARY_TIERS = [
    { threshold: 100000000, pct: 0.8, name: '₹100M+' },
    { threshold: 5000000, pct: 1.5, name: '₹5M+' },
    { threshold: 2500000, pct: 1.6, name: '₹2.5M+' },
    { threshold: 1000000, pct: 1.6, name: '₹1M+' },
    { threshold: 500000, pct: 1.5, name: '₹500k+' },
    { threshold: 100000, pct: 1.3, name: '₹100k+' },
    { threshold: 50000, pct: 1.1, name: '₹50k+' },
    { threshold: 25000, pct: 2.9, name: '₹25k+' },
    { threshold: 10000, pct: 3.7, name: '₹10k+' },
  ];

  console.log(`📊 PENDING SALARIES (to be credited at 23:59 on last day of month):\n`);

  let totalPending = new Decimal(0);

  usersWithPendingSalary.forEach(user => {
    const tierIndex = user.currentLeadershipRank || 0;
    const tier = SALARY_TIERS[tierIndex];
    const salary = new Decimal(user.currentLeadershipSalary);
    totalPending = totalPending.plus(salary);

    console.log(`👤 ${user.name} (${user.referralCode})`);
    console.log(`   Monthly Sales: ₹${user.monthlySales}`);
    console.log(`   Tier: ${tier ? tier.name : 'Not qualified'}`);
    console.log(`   ⏳ Pending Salary: ₹${salary.toNumber().toLocaleString('en-IN')}`);
    console.log(`   Current Wallet: ₹${user.walletBalance}\n`);
  });

  console.log(`📈 SUMMARY:`);
  console.log(`   Total users with pending salary: ${usersWithPendingSalary.length}`);
  console.log(`   Total pending to be credited: ₹${totalPending.toNumber().toLocaleString('en-IN')}\n`);

  console.log('⏰ CRON SCHEDULE:');
  console.log('   Hourly (every hour): Calculate salary based on current month sales');
  console.log('   23:59 daily: Check if last day of month → Credit pending salaries');
  console.log('   00:00 on 1st: Reset monthlySales to 0\n');

  process.exit(0);
}

demonstrateNewSalaryFlow().catch(console.error);
