const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllUsers() {
  console.log('\n🗑️  DELETING ALL USERS AND RELATED DATA');
  console.log('======================================\n');

  try {
    // Delete in order of foreign key dependencies
    const userCount = await prisma.distributor.count();
    console.log(`📊 Found ${userCount} users to delete\n`);

    // Delete commissions first (references sales)
    console.log('🗑️  Deleting commissions...');
    const commissionsDeleted = await prisma.commission.deleteMany({});
    console.log(`   ✓ Commissions deleted: ${commissionsDeleted.count}`);

    // Delete sales (references distributors)
    console.log('🗑️  Deleting sales...');
    const salesDeleted = await prisma.sale.deleteMany({});
    console.log(`   ✓ Sales deleted: ${salesDeleted.count}`);

    // Delete wallet transactions
    console.log('🗑️  Deleting wallet transactions...');
    const txDeleted = await prisma.walletTransaction.deleteMany({});
    console.log(`   ✓ Transactions deleted: ${txDeleted.count}`);

    // Delete leadership salary records
    console.log('🗑️  Deleting leadership salary records...');
    const salaryDeleted = await prisma.leadershipSalary.deleteMany({});
    console.log(`   ✓ Leadership salaries deleted: ${salaryDeleted.count}`);

    // Delete achievements
    console.log('🗑️  Deleting achievements...');
    const achievementsDeleted = await prisma.achievement.deleteMany({});
    console.log(`   ✓ Achievements deleted: ${achievementsDeleted.count}`);

    // Finally delete distributors
    console.log('🗑️  Deleting distributors...');
    const result = await prisma.distributor.deleteMany({});
    console.log(`   ✓ Distributors deleted: ${result.count}`);

    console.log(`\n✅ DELETION COMPLETE!`);
    console.log(`\n🎯 All user IDs and related data cleared!`);
    console.log(`   Ready to create new users\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting users:', error.message);
    process.exit(1);
  }
}

deleteAllUsers();
