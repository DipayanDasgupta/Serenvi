const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugAllDistributors() {
  const distributors = await prisma.distributor.findMany({
    select: {
      id: true,
      name: true,
      level1Sales: true,
      monthlySales: true,
      walletBalance: true,
      monthlyResetDate: true,
    },
  });

  console.log('\n📊 ALL DISTRIBUTORS - MONTHLY SALES DEBUG');
  console.log('==========================================\n');

  distributors.forEach(d => {
    console.log(`👤 ${d.name}`);
    console.log(`   ID: ${d.id}`);
    console.log(`   Personal Sales (level1Sales): ₹${d.level1Sales}`);
    console.log(`   Monthly Sales: ₹${d.monthlySales}`);
    console.log(`   Wallet Balance: ₹${d.walletBalance}`);
    console.log(`   Monthly Reset: ${d.monthlyResetDate?.toISOString().slice(0, 10) || 'Never'}`);
    console.log('');
  });

  // Find which one matches the dashboard screenshot (165300, 165300, 45000, 68452.88)
  const matching = distributors.find(
    d => d.level1Sales === '165300' || parseFloat(d.level1Sales) === 165300
  );

  if (matching) {
    console.log(`✅ MATCHED DASHBOARD USER: ${matching.name}`);
    console.log(`   Personal Sales: ₹${matching.level1Sales}`);
    console.log(`   Monthly Sales: ₹${matching.monthlySales}`);
  }

  process.exit(0);
}

debugAllDistributors().catch(console.error);
