const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('\n✅ VERIFICATION - CORRECTED BALANCES:\n');
  const users = await prisma.distributor.findMany({
    where: { name: { in: ['Aryaman Mandal', 'Test User'] } },
    select: { name: true, walletBalance: true },
  });

  users.forEach(u => console.log(u.name + ': ₹' + u.walletBalance));
  process.exit(0);
}

verify().catch(console.error);
