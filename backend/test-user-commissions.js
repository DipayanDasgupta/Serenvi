const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');
const prisma = new PrismaClient();

async function getTestUserCommissions() {
  try {
    console.log('📊 TEST USER - COMMISSION BREAKDOWN BY LEVEL\n');
    console.log('='.repeat(70) + '\n');

    // Get Test User
    const testUser = await prisma.distributor.findFirst({
      where: { name: 'Test User' },
      select: {
        id: true,
        name: true,
        sponsorId: true,
        totalSales: true,
        walletBalance: true,
      },
    });

    if (!testUser) {
      console.log('❌ Test User not found');
      await prisma.$disconnect();
      return;
    }

    console.log(`👤 USER: ${testUser.name}`);
    console.log('─'.repeat(70));
    console.log(`  • ID: ${testUser.id}`);
    console.log(`  • Total Sales: ₹${new Decimal(testUser.totalSales).toNumber().toLocaleString()}`);
    console.log(`  • Wallet Balance: ₹${new Decimal(testUser.walletBalance).toNumber().toLocaleString()}\n`);

    // Get all commissions earned by Test User
    const commissions = await prisma.commission.findMany({
      where: {
        distributorId: testUser.id,
      },
      include: {
        sale: {
          include: {
            seller: {
              select: { name: true },
            },
            product: {
              select: { name: true, price: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log('💳 COMMISSIONS EARNED:\n');

    if (commissions.length === 0) {
      console.log('  No commissions found');
    } else {
      let levelTotals = {};
      let grandTotal = new Decimal(0);

      for (const comm of commissions) {
        const level = comm.level || 'Unknown';
        const amount = new Decimal(comm.commissionAmount);
        
        if (!levelTotals[level]) {
          levelTotals[level] = new Decimal(0);
        }
        levelTotals[level] = levelTotals[level].plus(amount);
        grandTotal = grandTotal.plus(amount);

        console.log(`  Sale: ${comm.sale.product.name}`);
        console.log(`  ├─ Product Price: ₹${new Decimal(comm.sale.product.price).toNumber().toLocaleString()}`);
        console.log(`  ├─ Sale Amount: ₹${new Decimal(comm.sale.saleAmount).toNumber().toLocaleString()}`);
        console.log(`  ├─ Sold by: ${comm.sale.seller.name}`);
        console.log(`  ├─ Commission Level: ${level}`);
        console.log(`  ├─ Commission Rate: ${comm.commissionRate}%`);
        console.log(`  └─ Commission Earned: ₹${amount.toNumber().toLocaleString()}\n`);
      }

      console.log('─'.repeat(70));
      console.log('\n📈 SUMMARY BY LEVEL:\n');

      const levels = Object.keys(levelTotals).sort();
      for (const level of levels) {
        const total = levelTotals[level];
        const pct = total.div(grandTotal).mul(100).toNumber().toFixed(2);
        console.log(`  Level ${level}: ₹${total.toNumber().toLocaleString()} (${pct}%)`);
      }

      console.log(`\n  ${'─'.repeat(70)}`);
      console.log(`  TOTAL COMMISSION: ₹${grandTotal.toNumber().toLocaleString()}`);
      
      const revenueShare = new Decimal(testUser.totalSales);
      const commissionPct = revenueShare.gt(0)
        ? grandTotal.div(revenueShare).mul(100).toNumber().toFixed(2)
        : 0;
      console.log(`  COMMISSION % of Own Sales: ${commissionPct}%\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getTestUserCommissions();
