const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');
const prisma = new PrismaClient();

async function getMlmBreakdown() {
  try {
    console.log('🔍 MLM COMMISSION BREAKDOWN\n');
    console.log('='.repeat(70) + '\n');

    // Get all users with their details
    const users = await prisma.distributor.findMany({
      select: {
        id: true,
        name: true,
        sponsorId: true,
        totalSales: true,
        walletBalance: true,
      },
    });

    console.log('📋 ALL USERS:');
    console.log('─'.repeat(70));
    for (const user of users) {
      console.log(`\n  • ${user.name}`);
      console.log(`    ├─ ID: ${user.id}`);
      console.log(`    ├─ Sponsor: ${user.sponsorId ? 'Yes' : 'No (Organic)'}`);
      console.log(`    ├─ Total Sales: ₹${new Decimal(user.totalSales).toNumber().toLocaleString()}`);
      console.log(`    └─ Wallet: ₹${new Decimal(user.walletBalance).toNumber().toLocaleString()}`);
    }

    console.log('\n' + '='.repeat(70) + '\n');

    // Get commission breakdown per user
    const commissionBreakdown = await prisma.walletTransaction.groupBy({
      by: ['distributorId'],
      where: { type: 'MLM_COMMISSION' },
      _sum: { amount: true },
      _count: true,
    });

    console.log('💳 MLM COMMISSION EARNED BY USER:');
    console.log('─'.repeat(70) + '\n');

    let totalCommission = new Decimal(0);
    for (const comm of commissionBreakdown) {
      const user = users.find(u => u.id === comm.distributorId);
      const amount = new Decimal(comm._sum.amount || 0);
      totalCommission = totalCommission.plus(amount);
      
      console.log(`  ${user?.name || comm.distributorId}`);
      console.log(`  ├─ Transactions: ${comm._count}`);
      console.log(`  └─ Total Commission: ₹${amount.toNumber().toLocaleString()}\n`);
    }

    console.log('─'.repeat(70));
    console.log(`  TOTAL: ₹${totalCommission.toNumber().toLocaleString()}\n`);

    // Get all sales with commission details
    console.log('='.repeat(70) + '\n');
    console.log('📊 SALES & COMMISSION DETAILS:');
    console.log('─'.repeat(70) + '\n');

    const sales = await prisma.sale.findMany({
      include: {
        seller: {
          select: {
            name: true,
            sponsorId: true,
          },
        },
        product: {
          select: {
            name: true,
            price: true,
          },
        },
        commissions: true,
      },
      where: { orderStatus: 'COMPLETED' },
    });

    for (const sale of sales) {
      console.log(`  Sale: ${sale.product.name} (₹${new Decimal(sale.product.price).toNumber()})`);
      console.log(`  ├─ Seller: ${sale.seller.name}`);
      console.log(`  ├─ Quantity: ${sale.quantity}`);
      console.log(`  ├─ Amount: ₹${new Decimal(sale.saleAmount).toNumber().toLocaleString()}`);
      
      if (sale.commissions.length > 0) {
        console.log(`  ├─ Commissions Generated: ${sale.commissions.length}`);
        for (const comm of sale.commissions) {
          console.log(`  │  ├─ Level ${comm.commissionLevel}: ₹${new Decimal(comm.commissionAmount).toNumber().toLocaleString()}`);
        }
      } else {
        console.log(`  ├─ Commissions: None`);
      }
      console.log();
    }

    // Total revenue calculation
    const totalRevenue = await prisma.sale.aggregate({
      _sum: { saleAmount: true },
      where: { orderStatus: 'COMPLETED' },
    });

    const revenue = new Decimal(totalRevenue._sum.saleAmount || 0);

    console.log('='.repeat(70));
    console.log(`\n📈 ANALYSIS:\n`);
    console.log(`  Total Revenue: ₹${revenue.toNumber().toLocaleString()}`);
    console.log(`  Total MLM Commission: ₹${totalCommission.toNumber().toLocaleString()}`);
    
    const commissionPercentage = revenue.gt(0) 
      ? totalCommission.div(revenue).mul(100).toNumber().toFixed(2)
      : 0;
    
    console.log(`  Commission as % of Revenue: ${commissionPercentage}%\n`);

    if (parseFloat(commissionPercentage) > 40) {
      console.log(`  ⚠️  WARNING: MLM commission ${commissionPercentage}% seems high for ${users.length} users`);
      console.log(`  This suggests either:`);
      console.log(`    1. Multi-level commission structure is very generous`);
      console.log(`    2. Each sale generates commissions for multiple upline levels`);
      console.log(`    3. Commission percentages are set too high\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getMlmBreakdown();
