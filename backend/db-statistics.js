const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');
const prisma = new PrismaClient();

async function getDetailedStats() {
  try {
    console.log('📊 DATABASE STATISTICS\n');
    console.log('='.repeat(60) + '\n');

    // Total earnings by type
    const salaryStats = await prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'LEADERSHIP_SALARY' }
    });

    const achievementStats = await prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'ACHIEVEMENT_REWARD' }
    });

    const commissionStats = await prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'MLM_COMMISSION' }
    });

    // Total products bought
    const totalRevenue = await prisma.sale.aggregate({
      _sum: { saleAmount: true },
      where: { orderStatus: 'COMPLETED' }
    });

    // Total referred users revenue
    const referredRevenue = await prisma.sale.aggregate({
      _sum: { saleAmount: true },
      where: {
        seller: { sponsorId: { not: null } },
        orderStatus: 'COMPLETED'
      }
    });

    // Total non-referred (organic) revenue
    const nonReferredRevenue = await prisma.sale.aggregate({
      _sum: { saleAmount: true },
      where: {
        seller: { sponsorId: null },
        orderStatus: 'COMPLETED'
      }
    });

    // User counts
    const totalUsers = await prisma.distributor.count();
    const referredUsers = await prisma.distributor.count({
      where: { sponsorId: { not: null } }
    });
    const organicUsers = await prisma.distributor.count({
      where: { sponsorId: null }
    });

    // Total sales transactions
    const totalTransactions = await prisma.sale.count({
      where: { orderStatus: 'COMPLETED' }
    });

    const referredTransactions = await prisma.sale.count({
      where: {
        seller: { sponsorId: { not: null } },
        orderStatus: 'COMPLETED'
      }
    });

    // Format amounts
    const salary = new Decimal(salaryStats._sum.amount || 0);
    const achievement = new Decimal(achievementStats._sum.amount || 0);
    const commission = new Decimal(commissionStats._sum.amount || 0);
    const totalEarned = salary.plus(achievement).plus(commission);
    
    const totalProducts = new Decimal(totalRevenue._sum.saleAmount || 0);
    const referredRev = new Decimal(referredRevenue._sum.saleAmount || 0);
    const nonReferredRev = new Decimal(nonReferredRevenue._sum.saleAmount || 0);

    // Display results
    console.log('💰 EARNINGS BY TYPE:');
    console.log('─'.repeat(60));
    console.log(`  • Leadership Salary:        ₹${salary.toNumber().toLocaleString()}`);
    console.log(`  • Achievement Rewards:      ₹${achievement.toNumber().toLocaleString()}`);
    console.log(`  • MLM Commission:           ₹${commission.toNumber().toLocaleString()}`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  • TOTAL EARNED:             ₹${totalEarned.toNumber().toLocaleString()}\n`);

    console.log('🛍️  PRODUCTS PURCHASED:');
    console.log('─'.repeat(60));
    console.log(`  • Total Revenue (All):      ₹${totalProducts.toNumber().toLocaleString()}`);
    console.log(`  • Referred Users Revenue:   ₹${referredRev.toNumber().toLocaleString()}`);
    console.log(`  • Organic Users Revenue:    ₹${nonReferredRev.toNumber().toLocaleString()}\n`);

    console.log('👥 USER STATISTICS:');
    console.log('─'.repeat(60));
    console.log(`  • Total Users:              ${totalUsers}`);
    console.log(`  • Referred Users:           ${referredUsers}`);
    console.log(`  • Organic Users:            ${organicUsers}\n`);

    console.log('📈 TRANSACTION STATISTICS:');
    console.log('─'.repeat(60));
    console.log(`  • Total Transactions:       ${totalTransactions}`);
    console.log(`  • Referred Transactions:    ${referredTransactions}\n`);

    console.log('💡 INSIGHTS:');
    console.log('─'.repeat(60));
    const earningPercentage = totalProducts.gt(0) 
      ? totalEarned.div(totalProducts).mul(100).toNumber().toFixed(2)
      : 0;
    console.log(`  • Earnings as % of Revenue: ${earningPercentage}%`);
    
    const referredPercentage = totalProducts.gt(0)
      ? referredRev.div(totalProducts).mul(100).toNumber().toFixed(2)
      : 0;
    console.log(`  • Referred Sales %:         ${referredPercentage}%`);
    
    const organicPercentage = totalProducts.gt(0)
      ? nonReferredRev.div(totalProducts).mul(100).toNumber().toFixed(2)
      : 0;
    console.log(`  • Organic Sales %:          ${organicPercentage}%\n`);

    // Breakdown of earnings
    if (totalEarned.gt(0)) {
      console.log('📊 EARNINGS BREAKDOWN:');
      console.log('─'.repeat(60));
      const salaryPct = salary.div(totalEarned).mul(100).toNumber().toFixed(2);
      const achievementPct = achievement.div(totalEarned).mul(100).toNumber().toFixed(2);
      const commissionPct = commission.div(totalEarned).mul(100).toNumber().toFixed(2);
      
      console.log(`  • Leadership Salary:        ${salaryPct}% (₹${salary.toNumber().toLocaleString()})`);
      console.log(`  • Achievement Rewards:      ${achievementPct}% (₹${achievement.toNumber().toLocaleString()})`);
      console.log(`  • MLM Commission:           ${commissionPct}% (₹${commission.toNumber().toLocaleString()})\n`);
    }

    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getDetailedStats();
