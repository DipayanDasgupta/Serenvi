const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function fixWalletToEarningsOnly() {
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

  // Calculate correct earnings-only balance
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

  const correctEarningsWallet = mlmAmount.plus(salaryAmount).plus(bonusAmount).plus(reversalAmount);
  const currentWallet = new Decimal(user.walletBalance);
  const difference = currentWallet.minus(correctEarningsWallet);

  console.log('\n💰 WALLET CORRECTION - EARNINGS ONLY');
  console.log('=====================================\n');
  console.log(`User: ${user.name} (${user.referralCode})\n`);

  console.log('📊 EARNINGS BREAKDOWN:');
  console.log(`   MLM Commission: ₹${mlmAmount}`);
  console.log(`   Leadership Salary: ₹${salaryAmount}`);
  console.log(`   Achievement Bonus: ₹${bonusAmount}`);
  console.log(`   Leadership Reversal: ₹${reversalAmount}`);
  console.log(`   ────────────────────────`);
  console.log(`   Total Earnings: ₹${correctEarningsWallet}\n`);

  console.log('💾 WALLET UPDATE:');
  console.log(`   Current Balance: ₹${currentWallet}`);
  console.log(`   Correct Balance: ₹${correctEarningsWallet}`);
  console.log(`   Removing: ₹${difference}\n`);

  // Update wallet and create transaction
  const result = await prisma.$transaction([
    // 1. Remove the extra amount
    prisma.walletTransaction.create({
      data: {
        distributorId: user.id,
        type: 'WALLET_ADJUSTMENT',
        amount: difference.mul(new Decimal(-1)),
        description: `Wallet correction - removed non-earnings balance (deposits/purchases) to set wallet to earnings only`,
      },
    }),
    // 2. Update wallet balance
    prisma.distributor.update({
      where: { id: user.id },
      data: {
        walletBalance: correctEarningsWallet,
      },
    }),
  ]);

  const updated = result[1];

  console.log(`✅ CORRECTED!\n`);
  console.log(`   Old Balance: ₹${currentWallet}`);
  console.log(`   New Balance: ₹${updated.walletBalance}`);
  console.log(`   Adjustment: -₹${difference}\n`);

  console.log(`Now wallet contains ONLY earnings:`);
  console.log(`   ✓ MLM Commission`);
  console.log(`   ✓ Leadership Salary`);
  console.log(`   ✓ Achievement Bonus`);

  process.exit(0);
}

fixWalletToEarningsOnly().catch(console.error);
