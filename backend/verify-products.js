const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyProducts() {
  try {
    console.log('🔍 FULL PRODUCT VERIFICATION\n');
    console.log('='.repeat(80));

    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        gender: true,
        sizes: true,
        stockQuantity: true,
        category: true,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });

    console.log(`\n✅ Total products in database: ${allProducts.length}\n`);

    if (allProducts.length === 0) {
      console.log('⚠️  No products found!');
    } else {
      console.log('📋 ALL PRODUCTS:\n');
      allProducts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Price: ₹${product.price}`);
        console.log(`   Gender: ${product.gender}`);
        console.log(`   Sizes: ${product.sizes}`);
        console.log(`   Stock: ${product.stockQuantity}`);
        console.log(`   Category: ${product.category}`);
        console.log(`   Active: ${product.isActive}`);
        console.log('');
      });
    }

    // Summary stats
    console.log('='.repeat(80));
    console.log('\n📊 SUMMARY STATISTICS:\n');
    
    const genderGroups = {};
    allProducts.forEach(p => {
      genderGroups[p.gender] = (genderGroups[p.gender] || 0) + 1;
    });
    
    console.log('Products by Gender:');
    Object.entries(genderGroups).forEach(([gender, count]) => {
      console.log(`  ${gender}: ${count} products`);
    });

    const avgPrice = allProducts.length > 0 
      ? (allProducts.reduce((sum, p) => sum + Number(p.price), 0) / allProducts.length).toFixed(2)
      : 0;
    
    console.log(`\nAverage Price: ₹${avgPrice}`);
    console.log(`Highest Price: ₹${Math.max(...allProducts.map(p => Number(p.price)))}`);
    console.log(`Lowest Price: ₹${Math.min(...allProducts.map(p => Number(p.price)))}`);
    console.log(`Total Stock: ${allProducts.reduce((sum, p) => sum + p.stockQuantity, 0)} units`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyProducts();
