const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugMonthlySalesUpdate() {
  // Get the user
  const user = await prisma.distributor.findFirst({
    where: { name: 'Aryaman Mandal', level1Sales: { gte: 165000 } },
    select: { id: true, name: true, monthlySales: true, monthlyResetDate: true },
  });

  if (!user) {
    console.log('User not found');
    process.exit(0);
  }

  console.log('\n🔍 DEBUGGING MONTHLY SALES MISMATCH');
  console.log('====================================\n');
  console.log(`User: ${user.name}`);
  console.log(`Current monthlySales: ₹${user.monthlySales}`);
  console.log(`Monthly Reset Date: ${user.monthlyResetDate?.toISOString()}\n`);

  // Check all their sales
  const allSales = await prisma.sale.findMany({
    where: {
      seller: { id: user.id },
      orderStatus: 'COMPLETED',
    },
    select: { saleAmount: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log('📊 ALL SALES FOR THIS DISTRIBUTOR:');
  let total = 0;
  allSales.forEach(sale => {
    const date = new Date(sale.createdAt).toISOString();
    total += parseFloat(sale.saleAmount);
    console.log(`  ${date}: ₹${sale.saleAmount}`);
  });
  console.log(`Total: ₹${total}\n`);

  // Now check if they're a downline (have a sponsor) - these contribute to sponsor's monthlySales
  const asDownline = await prisma.sale.findMany({
    where: {
      seller: { id: user.id },
      orderStatus: 'COMPLETED',
      seller: { sponsorId: { not: null } },
    },
    select: { saleAmount: true, createdAt: true },
  });

  console.log('📊 THEIR DOWNLINE SALES (contribute to their commission):');
  asDownline.forEach(sale => {
    const date = new Date(sale.createdAt).toISOString();
    console.log(`  ${date}: ₹${sale.saleAmount}`);
  });

  // Check if they have downline sellers
  const downlineSellers = await prisma.distributor.findMany({
    where: { sponsorId: user.id },
    select: { id: true, name: true },
  });

  console.log(`\n👥 THEIR DOWNLINE (${downlineSellers.length} sellers):`);
  downlineSellers.forEach(d => console.log(`  - ${d.name}`));

  if (downlineSellers.length > 0) {
    // Get all sales from downline that happened on April 1st+
    const downlineSalesApril = await prisma.sale.aggregate({
      _sum: { saleAmount: true },
      where: {
        sellerId: { in: downlineSellers.map(d => d.id) },
        orderStatus: 'COMPLETED',
        createdAt: { gte: new Date('2026-04-01T00:00:00Z') },
      },
    });

    console.log(`\n📈 DOWNLINE SALES FROM APRIL 1ST ONWARDS:`);
    console.log(`  Total: ₹${downlineSalesApril._sum.saleAmount || 0}`);
    console.log(`  This should equal current monthlySales: ₹${user.monthlySales}`);
  }

  process.exit(0);
}

debugMonthlySalesUpdate().catch(console.error);
