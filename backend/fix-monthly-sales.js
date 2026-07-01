const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function fixMonthlySales() {
  // Get the user
  const user = await prisma.distributor.findFirst({
    where: { name: 'Aryaman Mandal', level1Sales: { gte: 165000 } },
  });

  // Get downline members
  const downlineMembers = await prisma.distributor.findMany({
    where: { sponsorId: user.id },
    select: { id: true },
  });

  const downlineIds = downlineMembers.map(d => d.id);

  // Get the correct monthlySales from downline sales April 1st+
  const correctMonthlySales = await prisma.sale.aggregate({
    _sum: { saleAmount: true },
    where: {
      sellerId: { in: downlineIds },
      orderStatus: 'COMPLETED',
      createdAt: { gte: new Date('2026-04-01T00:00:00Z') },
    },
  });

  const correctAmount = correctMonthlySales._sum.saleAmount || new Decimal(0);

  console.log('\n🔧 FIXING MONTHLY SALES');
  console.log('=======================\n');
  console.log(`User: ${user.name}`);
  console.log(`Current monthlySales: ₹${user.monthlySales}`);
  console.log(`Correct monthlySales: ₹${correctAmount}\n`);

  if (correctAmount.toString() === user.monthlySales.toString()) {
    console.log('✅ Monthly sales is already correct. No fix needed.');
  } else {
    console.log(`❌ Mismatch detected!`);
    console.log(`   Current: ₹${user.monthlySales}`);
    console.log(`   Should be: ₹${correctAmount}\n`);
    
    console.log('🔄 Applying fix...\n');
    const updated = await prisma.distributor.update({
      where: { id: user.id },
      data: { monthlySales: correctAmount },
    });

    console.log(`✅ FIXED! Monthly sales updated to ₹${updated.monthlySales}`);
  }

  process.exit(0);
}

fixMonthlySales().catch(console.error);
