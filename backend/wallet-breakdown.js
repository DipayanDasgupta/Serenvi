const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function walletBreakdown() {
  const user = await prisma.distributor.findFirst({
    where: { name: 'Aryaman Mandal', monthlySales: { gte: 100000 } },
    select: {
      id: true,
      name: true,
      walletBalance: true,
    },
  });

  const transactions = await prisma.walletTransaction.findMany({
    where: { distributorId: user.id },
    orderBy: { createdAt: 'asc' },
  });

  console.log('\n💰 WALLET BREAKDOWN - COMPLETE TRANSACTION HISTORY');
  console.log('===================================================\n');
  console.log(`User: ${user.name}`);
  console.log(`Current Balance: ₹${user.walletBalance}\n`);

  // Group by transaction type
  const byType = {};
  let runningBalance = new Decimal(0);

  console.log('📋 ALL TRANSACTIONS (in chronological order):\n');

  transactions.forEach((tx, idx) => {
    const amount = new Decimal(tx.amount);
    runningBalance = runningBalance.plus(amount);

    const sign = amount.gte(0) ? '+' : '';
    const date = new Date(tx.createdAt).toISOString().slice(0, 10);
    const time = new Date(tx.createdAt).toLocaleTimeString('en-IN');

    console.log(`${idx + 1}. ${date} ${time}`);
    console.log(`   Type: ${tx.type}`);
    console.log(`   Amount: ${sign}₹${amount}`);
    console.log(`   Description: ${tx.description}`);
    console.log(`   Running Balance: ₹${runningBalance.toNumber().toLocaleString('en-IN')}`);
    console.log('');

    if (!byType[tx.type]) {
      byType[tx.type] = new Decimal(0);
    }
    byType[tx.type] = byType[tx.type].plus(amount);
  });

  console.log('\n📊 SUMMARY BY TRANSACTION TYPE:\n');
  Object.entries(byType).forEach(([type, total]) => {
    const totalNum = total.toNumber();
    const sign = totalNum >= 0 ? '+' : '';
    console.log(`  ${type}: ${sign}₹${totalNum.toLocaleString('en-IN')}`);
  });

  const grandTotal = Object.values(byType).reduce(
    (sum, val) => sum.plus(val),
    new Decimal(0)
  );

  console.log(`\n  TOTAL: ₹${grandTotal.toNumber().toLocaleString('en-IN')}`);
  console.log(`  CURRENT WALLET BALANCE: ₹${user.walletBalance.toLocaleString('en-IN')}`);

  process.exit(0);
}

walletBreakdown().catch(console.error);
