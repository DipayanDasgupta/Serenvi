const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllAryaman() {
  const users = await prisma.distributor.findMany({
    where: { name: 'Aryaman Mandal' },
    select: { id: true, monthlySales: true, currentLeadershipRank: true, currentLeadershipSalary: true },
  });

  console.log('\n📊 ALL ARYAMAN MANDAL USERS:\n');
  users.forEach(u => {
    console.log(`ID: ${u.id}`);
    console.log(`   Monthly Sales: ₹${u.monthlySales}`);
    console.log(`   Leadership Rank: ${u.currentLeadershipRank}`);
    console.log(`   Leadership Salary: ₹${u.currentLeadershipSalary}\n`);
  });

  const with7679 = users.find(u => parseFloat(u.currentLeadershipSalary) === 7679.2);
  if (with7679) {
    console.log(`\n❌ FOUND: ID ${with7679.id} still has ₹7679.2`);
  }

  process.exit(0);
}

checkAllAryaman().catch(console.error);
