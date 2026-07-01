const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function resetSalesData() {
  try {
    console.log('🔧 RESETTING SALES DATA\n');

    // Get all distributors
    const distributors = await prisma.distributor.findMany();

    for (const dist of distributors) {
      console.log(`\nProcessing: ${dist.name}`);
      
      // Get this distributor's personal sales (level1Sales stays as is)
      const personalSales = new Decimal(dist.level1Sales).toNumber();
      
      // Get all their downline members' personal sales
      const allDownlineMembers = await prisma.mLMTreeNode.findMany({
        where: { ancestorId: dist.id, depth: { gt: 0 } },
        include: {
          descendant: { select: { level1Sales: true } }
        }
      });

      const totalDownlineSales = allDownlineMembers.reduce((sum, node) => {
        return sum + new Decimal(node.descendant.level1Sales).toNumber();
      }, 0);

      const calculatedTotalSales = personalSales + totalDownlineSales;

      console.log(`  Personal Sales (level1Sales): ₹${personalSales.toLocaleString()}`);
      console.log(`  Downline Members: ${allDownlineMembers.length}`);
      console.log(`  Total Downline Sales: ₹${totalDownlineSales.toLocaleString()}`);
      console.log(`  Calculated Total: ₹${calculatedTotalSales.toLocaleString()}`);

      // Update totalSales to the calculated value
      if (new Decimal(dist.totalSales).toNumber() !== calculatedTotalSales) {
        console.log(`  ✅ Updating totalSales from ₹${new Decimal(dist.totalSales).toNumber().toLocaleString()} → ₹${calculatedTotalSales.toLocaleString()}`);
        
        await prisma.distributor.update({
          where: { id: dist.id },
          data: {
            totalSales: new Decimal(calculatedTotalSales)
          }
        });
      }
    }

    console.log('\n\n✅ FINAL STATE:');
    const finalDistributors = await prisma.distributor.findMany();
    for (const dist of finalDistributors) {
      const personal = new Decimal(dist.level1Sales).toNumber();
      const total = new Decimal(dist.totalSales).toNumber();
      console.log(`\n${dist.name}:`);
      console.log(`  Personal Sales: ₹${personal.toLocaleString()}`);
      console.log(`  Total Sales: ₹${total.toLocaleString()}`);
      console.log(`  Rank: ${dist.rank}`);
    }

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetSalesData();
