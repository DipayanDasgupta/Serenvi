const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSalesByDate() {
  // Find Aryaman Mandal with ₹165300 personal sales
  const user = await prisma.distributor.findFirst({
    where: { name: 'Aryaman Mandal', level1Sales: { gte: 165000 } },
    include: {
      ancestorNodes: {
        where: { depth: 1 },
        include: {
          descendant: {
            include: {
              sales: {
                where: { orderStatus: 'COMPLETED' },
                select: { saleAmount: true, createdAt: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    console.log('User not found');
    process.exit(0);
  }

  console.log('\n📊 SALES BREAKDOWN BY DATE - April 2026');
  console.log('=====================================\n');
  console.log(`User: ${user.name}`);
  console.log(`Current Monthly Sales: ₹${user.monthlySales}`);
  console.log(`Total Personal Sales: ₹${user.level1Sales}\n`);

  // Collect all sales from level 1 downline
  const salesByDate = {};
  
  user.ancestorNodes.forEach(node => {
    node.descendant.sales.forEach(sale => {
      const date = new Date(sale.createdAt).toISOString().slice(0, 10); // YYYY-MM-DD
      if (!salesByDate[date]) salesByDate[date] = [];
      salesByDate[date].push({
        seller: node.descendant.name,
        amount: parseFloat(sale.saleAmount),
        time: new Date(sale.createdAt).toLocaleTimeString('en-IN'),
      });
    });
  });

  // Sort and display
  Object.keys(salesByDate)
    .sort()
    .forEach(date => {
      const sales = salesByDate[date];
      const total = sales.reduce((sum, s) => sum + s.amount, 0);
      console.log(`📅 ${date}: ₹${total.toLocaleString('en-IN')} total`);
      sales.forEach(s => {
        console.log(`   └─ ${s.seller}: ₹${s.amount.toLocaleString('en-IN')} @ ${s.time}`);
      });
    });

  const april1Sales = salesByDate['2026-04-01']?.reduce((sum, s) => sum + s.amount, 0) || 0;
  const april2Sales = salesByDate['2026-04-02']?.reduce((sum, s) => sum + s.amount, 0) || 0;
  const total = april1Sales + april2Sales;

  console.log(`\n💡 ANALYSIS:`);
  console.log(`  April 1st sales: ₹${april1Sales.toLocaleString('en-IN')}`);
  console.log(`  April 2nd sales: ₹${april2Sales.toLocaleString('en-IN')}`);
  console.log(`  Total April: ₹${total.toLocaleString('en-IN')}`);
  console.log(`  Current monthlySales field: ₹${user.monthlySales}`);
  
  if (april1Sales === parseFloat(user.level1Sales)) {
    console.log(`\n❌ ISSUE FOUND: All ₹${user.level1Sales} sales happened on April 1st!`);
    console.log(`   But monthlySales is showing ₹${user.monthlySales}`);
    console.log(`   This means the monthly reset didn't capture April 1st sales properly.`);
  }

  process.exit(0);
}

debugSalesByDate().catch(console.error);
