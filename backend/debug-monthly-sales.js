const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function debugMonthlySales() {
  const testUser = await prisma.distributor.findFirst({
    where: { name: 'Test User' },
    include: {
      sales: {
        where: { orderStatus: 'COMPLETED' },
        select: { saleAmount: true, createdAt: true },
      },
    },
  });

  if (!testUser) {
    console.log('Test User not found');
    process.exit(0);
  }

  console.log('\n📊 TEST USER MONTHLY SALES DEBUG');
  console.log('================================');
  console.log(`Name: ${testUser.name}`);
  console.log(`Personal Sales (level1Sales - all-time): ₹${testUser.level1Sales}`);
  console.log(`Monthly Sales (current month): ₹${testUser.monthlySales}`);
  console.log(`Monthly Reset Date: ${testUser.monthlyResetDate || 'Never reset'}`);

  // Group sales by month
  const salesByMonth = {};
  testUser.sales.forEach(sale => {
    const month = new Date(sale.createdAt).toISOString().slice(0, 7); // YYYY-MM
    if (!salesByMonth[month]) salesByMonth[month] = 0;
    salesByMonth[month] += parseFloat(sale.saleAmount);
  });

  console.log('\nSales breakdown by month:');
  Object.entries(salesByMonth)
    .sort()
    .forEach(([month, amount]) => {
      console.log(`  ${month}: ₹${amount.toLocaleString('en-IN')}`);
    });

  console.log('\n💡 ANALYSIS:');
  console.log(`- If monthly sales (₹${testUser.monthlySales}) doesn't match April sales,`);
  console.log(`  the reset may not have run or sales before reset weren't cleared.`);

  process.exit(0);
}

debugMonthlySales().catch(console.error);
