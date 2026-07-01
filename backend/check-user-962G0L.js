const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function checkUserByCode() {
  const user = await prisma.distributor.findFirst({
    where: { referralCode: '962G0L' },
    select: {
      id: true,
      name: true,
      referralCode: true,
      walletBalance: true,
    },
  });

  if (!user) {
    console.log('User with code 962G0L not found');
    process.exit(0);
  }

  console.log('\n💰 USER WALLET ANALYSIS');
  console.log('=======================\n');
  console.log(`Name: ${user.name}`);
  console.log(`Referral Code: ${user.referralCode}`);
  console.log(`Current Wallet Balance: ₹${user.walletBalance}\n`);

  // Get all earnings by type
  const mlmCommission = await prisma.walletTransaction.aggregate({
    _sum: { amount: true },
    where: {
      distributorId: user.id,
      type: 'MLM_COMMISSION',
    },
  });

  const leadershipSalary = await prisma.walletTransaction.aggregate({
    _sum: { amount: true },
    where: {
      distributorId: user.id,
      type: 'LEADERSHIP_SALARY',
    },
  });

  const achievementBonus = await prisma.walletTransaction.aggregate({
    _sum: { amount: true },
    where: {
      distributorId: user.id,
      type: 'ACHIEVEMENT_REWARD',
    },
  });

  const leadershipReversal = await prisma.walletTransaction.aggregate({
    _sum: { amount: true },
    where: {
      distributorId: user.id,
      type: 'LEADERSHIP_SALARY_REVERSAL',
    },
  });

  const mlmAmount = new Decimal(mlmCommission._sum.amount || 0);
  const salaryAmount = new Decimal(leadershipSalary._sum.amount || 0);
  const bonusAmount = new Decimal(achievementBonus._sum.amount || 0);
  const reversalAmount = new Decimal(leadershipReversal._sum.amount || 0);

  console.log('📊 EARNINGS BREAKDOWN:');
  console.log(`   MLM Commission: ₹${mlmAmount}`);
  console.log(`   Leadership Salary: ₹${salaryAmount}`);
  console.log(`   Achievement Bonus: ₹${bonusAmount}`);
  console.log(`   Leadership Reversal: ₹${reversalAmount}`);

  // Calculate what wallet should be
  const expectedWallet = mlmAmount.plus(salaryAmount).plus(bonusAmount).plus(reversalAmount);

  console.log(`\n📈 CALCULATION:`);
  console.log(`   ${mlmAmount} + ${salaryAmount} + ${bonusAmount} + ${reversalAmount}`);
  console.log(`   = ₹${expectedWallet}`);

  const actualWallet = new Decimal(user.walletBalance);
  const difference = actualWallet.minus(expectedWallet);

  console.log(`\n💾 WALLET STATUS:`);
  console.log(`   Current Wallet: ₹${actualWallet}`);
  console.log(`   Expected Wallet: ₹${expectedWallet}`);
  console.log(`   Difference: ₹${difference}`);

  if (difference.toNumber() === 0) {
    console.log(`\n✅ Wallet is CORRECT!`);
  } else if (difference.toNumber() > 0) {
    console.log(`\n⚠️  Wallet has EXTRA: ₹${difference}`);
  } else {
    console.log(`\n❌ Wallet is SHORT by: ₹${difference.abs()}`);
  }

  // Get all transactions to understand the full picture
  const allTxs = await prisma.walletTransaction.findMany({
    where: { distributorId: user.id },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\n📋 ALL TRANSACTIONS (${allTxs.length} total):\n`);
  let runningBalance = new Decimal(0);
  allTxs.forEach((tx, idx) => {
    const amount = new Decimal(tx.amount);
    runningBalance = runningBalance.plus(amount);
    console.log(`${idx + 1}. ${tx.type}: ${amount >= 0 ? '+' : ''}₹${amount} | Running: ₹${runningBalance}`);
  });

  console.log(`\nFinal calculated balance: ₹${runningBalance}`);
  console.log(`Stored wallet balance: ₹${user.walletBalance}`);

  process.exit(0);
}

checkUserByCode().catch(console.error);
