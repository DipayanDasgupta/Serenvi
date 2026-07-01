const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  try {
    const result = await prisma.leadershipSalary.deleteMany({
      where: { year: 2026, month: 4 }
    });
    console.log('Deleted ' + result.count + ' existing salary records');
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
