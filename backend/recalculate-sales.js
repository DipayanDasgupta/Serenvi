const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function recalculateSalesCorrectly() {
  try {
    console.log('🔧 RECALCULATING SALES WITH CORRECT LOGIC\n');
    console.log('Personal Sales = Level 1 downline sales ONLY');
    console.log('Total Sales = Personal Sales + Deeper downline sales\n');

    // Reset all level1Sales to 0 first
    const distributors = await prisma.distributor.findMany();
    
    console.log('Step 1: Resetting all Personal Sales to 0...');
    for (const dist of distributors) {
      await prisma.distributor.update({
        where: { id: dist.id },
        data: { level1Sales: new Decimal(0) }
      });
    }

    // Get all sales and trace them up the tree
    const allSales = await prisma.sale.findMany({
      include: {
        seller: { select: { id: true, name: true, sponsorId: true } },
        product: { select: { name: true } }
      }
    });

    console.log(`\nStep 2: Processing ${allSales.length} sales...\n`);

    for (const sale of allSales) {
      const saleAmount = new Decimal(sale.saleAmount);
      
      if (sale.seller.sponsorId) {
        // If the seller has a sponsor, increment sponsor's level1Sales
        console.log(`\n📊 Sale: ${sale.product.name} - ₹${saleAmount}`);
        console.log(`   Seller: ${sale.seller.name}`);
        console.log(`   Adding to sponsor's Personal Sales...`);
        
        let currentSponsorId = sale.seller.sponsorId;
        
        await prisma.distributor.update({
          where: { id: currentSponsorId },
          data: {
            level1Sales: { increment: saleAmount }
          }
        });
        
        const sponsor = await prisma.distributor.findUnique({
          where: { id: currentSponsorId },
          select: { name: true }
        });
        
        console.log(`   → ${sponsor.name}'s Personal Sales +₹${saleAmount}`);
      }
    }

    // Display final state
    console.log('\n\n✅ FINAL STATE:\n');
    const finalDist = await prisma.distributor.findMany();
    
    for (const dist of finalDist) {
      const personalSales = new Decimal(dist.level1Sales).toNumber();
      
      // Calculate total sales (personal + deeper downline)
      const deeperDownline = await prisma.mLMTreeNode.findMany({
        where: { ancestorId: dist.id, depth: { gt: 1 } },
        include: {
          descendant: { 
            select: { level1Sales: true }
          }
        }
      });

      const deeperTotal = deeperDownline.reduce((sum, node) => {
        return sum + new Decimal(node.descendant.level1Sales).toNumber();
      }, 0);

      const totalSales = personalSales + deeperTotal;

      // Get direct downline count
      const level1Count = await prisma.mLMTreeNode.count({
        where: { ancestorId: dist.id, depth: 1 }
      });

      console.log(`${dist.name}:`);
      console.log(`  Personal Sales (Level 1 downline): ₹${personalSales.toLocaleString()}`);
      console.log(`  Deeper Downline Sales: ₹${deeperTotal.toLocaleString()}`);
      console.log(`  Total Sales: ₹${totalSales.toLocaleString()}`);
      console.log(`  Direct Downline: ${level1Count}`);
      console.log(`  Rank: ${dist.rank}\n`);
    }

  } catch (e) {
    console.error('Error:', e.message);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateSalesCorrectly();
