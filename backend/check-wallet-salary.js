const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function checkWalletAndFix() {
  const user = await prisma.distributor.findFirst({
    where: { name: 'Aryaman Mandal', monthlySales: { gte: 100000 } },
    select: {
      id: true,
      name: true,
      walletBalance: true,
      currentLeadershipSalary: true,
    },
  });

  const walletTransactions = await prisma.walletTransaction.findMany({
    where: { distributorId: user.id, type: 'LEADERSHIP_SALARY' },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log('\n💰 WALLET ANALYSIS');
  console.log('==================\n');
  console.log(`User: ${user.name}`);
  console.log(`Current Wallet Balance: ₹${user.walletBalance}`);
  console.log(`Current Leadership Salary (field): ₹${user.currentLeadershipSalary}\n`);

  console.log('📊 RECENT LEADERSHIP SALARY TRANSACTIONS:');
  walletTransactions.forEach(tx => {
    console.log(`   ${tx.createdAt.toISOString().slice(0, 10)}: ₹${tx.amount} (${tx.description})`);
  });

  // Check if there's a transaction with the old ₹7679.2 amount
  const oldTransaction = walletTransactions.find(
    tx => parseFloat(tx.amount) === 7679.2
  );

  if (oldTransaction) {
    console.log(`\n⚠️  ISSUE FOUND: Old salary transaction (₹7679.2) exists`);
    console.log(`   This was likely added from last month's distribution`);
    console.log(`\n   Current situation:`);
    console.log(`   - Old salary in wallet: ₹7679.2`);
    console.log(`   - Current field value: ₹${user.currentLeadershipSalary}`);
    console.log(`   - Difference: ₹${new Decimal(7679.2).minus(user.currentLeadershipSalary)}`);
    console.log(`\n   This will be corrected NEXT MONTH (May 1st) when:`);
    console.log(`   1. The old ₹7679.2 is deducted from wallet`);
    console.log(`   2. The new ₹${user.currentLeadershipSalary} is added`);
  } else {
    console.log(`\n✅ No old salary transaction found`);
  }

  process.exit(0);
}

checkWalletAndFix().catch(console.error);
