const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  try {
    // Delete wallet transactions first
    const wtResult = await prisma.walletTransaction.deleteMany({
      where: { 
        type: 'LEADERSHIP_SALARY',
        createdAt: {
          gte: new Date('2026-04-01'),
          lte: new Date('2026-04-30')
        }
      }
    });
    console.log('Deleted ' + wtResult.count + ' wallet transactions');

    // Then delete salary records
    const result = await prisma.leadershipSalary.deleteMany({
      where: { year: 2026, month: 4 }
    });
    console.log('Deleted ' + result.count + ' salary records');
    
    await prisma.$disconnect();
  } catch(e) {
    console.error(e.message);
  }
}

cleanup();
