const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  try {
    console.log('📊 ALL DISTRIBUTORS:');
    const distributors = await prisma.distributor.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        rank: true,
        totalSales: true,
        level1Sales: true,
        walletBalance: true,
      },
    });

    distributors.forEach(d => {
      console.log(`\n  ${d.name}`);
      console.log(`    ID: ${d.id}`);
      console.log(`    Phone: ${d.phone}`);
      console.log(`    Rank: ${d.rank}`);
      console.log(`    Level1 Sales: ₹${d.level1Sales}`);
      console.log(`    Total Sales: ₹${d.totalSales}`);
      console.log(`    Wallet: ₹${d.walletBalance}`);
    });

    console.log('\n\n💳 ALL SALES:');
    const sales = await prisma.sale.findMany({
      include: {
        seller: { select: { name: true, id: true } },
        product: { select: { name: true } },
      },
    });

    if (sales.length === 0) {
      console.log('  No sales found');
    } else {
      sales.forEach(s => {
        console.log(`\n  ${s.product.name}`);
        console.log(`    Seller: ${s.seller.name} (${s.seller.id})`);
        console.log(`    Amount: ₹${s.saleAmount}`);
        console.log(`    Status: ${s.orderStatus}`);
      });
    }

    console.log('\n\n🏆 ALL ACHIEVEMENTS:');
    const achievements = await prisma.achievement.findMany({
      include: {
        distributor: { select: { name: true } },
      },
    });

    if (achievements.length === 0) {
      console.log('  No achievements found');
    } else {
      achievements.forEach(a => {
        console.log(`\n  ${a.distributor.name} → ${a.rankName}`);
        console.log(`    Reward: ₹${a.rewardAmount}`);
        console.log(`    Claimed: ${a.claimedAt}`);
      });
    }

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
