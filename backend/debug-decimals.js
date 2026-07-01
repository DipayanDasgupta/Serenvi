const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function debug() {
  try {
    const dist = await prisma.distributor.findFirst({
      where: { totalSales: { gt: '0' } },
    });

    if (dist) {
      console.log('Found distributor with sales:');
      console.log(`  Name: ${dist.name}`);
      console.log(`  totalSales: ${dist.totalSales} (type: ${typeof dist.totalSales}, constructor: ${dist.totalSales.constructor.name})`);
      console.log(`  level1Sales: ${dist.level1Sales} (type: ${typeof dist.level1Sales}, constructor: ${dist.level1Sales.constructor ? dist.level1Sales.constructor.name : 'undefined'})`);
      
      console.log('\n  Testing comparison:');
      console.log(`    dist.totalSales > 0: ${dist.totalSales > 0}`);
      console.log(`    dist.level1Sales === 0: ${dist.level1Sales === 0}`);
      console.log(`    new Decimal(dist.level1Sales).isZero(): ${new Decimal(dist.level1Sales).isZero()}`);
      console.log(`    new Decimal(dist.totalSales).toNumber(): ${new Decimal(dist.totalSales).toNumber()}`);

      // Try updating
      console.log('\n  Attempting update...');
      const updated = await prisma.distributor.update({
        where: { id: dist.id },
        data: {
          level1Sales: dist.totalSales,
        },
      });

      console.log(`  ✓ Updated! New level1Sales: ${updated.level1Sales}`);
    }

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
