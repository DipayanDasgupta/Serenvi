const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function resetLeadershipSalaryAndRank() {
  console.log('\n🔄 RESETTING LEADERSHIP SALARY AND RANK');
  console.log('=====================================\n');

  // Get all users with pending salary or rank
  const usersToReset = await prisma.distributor.findMany({
    where: {
      OR: [
        { currentLeadershipSalary: { gt: new Decimal(0) } },
        { currentLeadershipRank: { not: null } },
      ],
    },
    select: {
      id: true,
      name: true,
      referralCode: true,
      currentLeadershipSalary: true,
      currentLeadershipRank: true,
    },
  });

  console.log(`Found ${usersToReset.length} users to reset\n`);

  usersToReset.forEach(user => {
    console.log(`👤 ${user.name} (${user.referralCode})`);
    console.log(`   Salary: ₹${user.currentLeadershipSalary} → ₹0`);
    console.log(`   Rank: ${user.currentLeadershipRank !== null ? `Tier ${user.currentLeadershipRank}` : 'None'} → None\n`);
  });

  console.log('🔄 Resetting...\n');

  // Reset all users
  const result = await prisma.distributor.updateMany({
    data: {
      currentLeadershipSalary: new Decimal(0),
      currentLeadershipRank: null,
    },
  });

  console.log(`✅ RESET COMPLETE!`);
  console.log(`   Users reset: ${result.count}`);
  console.log(`   All leadership salaries: ₹0`);
  console.log(`   All leadership ranks: None\n`);

  console.log('📊 System ready for fresh calculations!');

  process.exit(0);
}

resetLeadershipSalaryAndRank().catch(console.error);
