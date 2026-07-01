const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function correctLeadershipSalary() {
  const user = await prisma.distributor.findFirst({
    where: { name: 'Aryaman Mandal', monthlySales: { gte: 100000 } },
    select: {
      id: true,
      name: true,
      walletBalance: true,
      currentLeadershipSalary: true,
    },
  });

  const oldSalary = new Decimal(7679.2);
  const newSalary = new Decimal(user.currentLeadershipSalary);
  const difference = oldSalary.minus(newSalary);

  console.log('\n🔄 CORRECTING LEADERSHIP SALARY');
  console.log('================================\n');
  console.log(`User: ${user.name}`);
  console.log(`Current Wallet: ₹${user.walletBalance}`);
  console.log(`Old (incorrect) Salary: ₹${oldSalary}`);
  console.log(`New (correct) Salary: ₹${newSalary}`);
  console.log(`Adjustment: -₹${difference}\n`);

  // Create transactions atomically
  const result = await prisma.$transaction([
    // 1. Deduct old salary
    prisma.walletTransaction.create({
      data: {
        distributorId: user.id,
        type: 'LEADERSHIP_SALARY_REVERSAL',
        amount: oldSalary.mul(new Decimal(-1)),
        description: `Leadership salary reversal - incorrect tier calculation (was ₹${oldSalary})`,
      },
    }),
    // 2. Add new correct salary
    prisma.walletTransaction.create({
      data: {
        distributorId: user.id,
        type: 'LEADERSHIP_SALARY',
        amount: newSalary,
        description: `Leadership salary correction - correct tier calculation (₹${newSalary})`,
      },
    }),
    // 3. Update wallet balance
    prisma.distributor.update({
      where: { id: user.id },
      data: {
        walletBalance: user.walletBalance.sub(difference),
      },
    }),
  ]);

  const updatedUser = result[2];

  console.log(`✅ CORRECTED!\n`);
  console.log(`   Old wallet: ₹${user.walletBalance}`);
  console.log(`   New wallet: ₹${updatedUser.walletBalance}`);
  console.log(`   Net change: -₹${difference}\n`);
  console.log(`📋 Transactions created:`);
  console.log(`   1. REVERSAL: -₹${oldSalary}`);
  console.log(`   2. CORRECTION: +₹${newSalary}`);

  process.exit(0);
}

correctLeadershipSalary().catch(console.error);
