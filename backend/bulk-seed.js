const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Sample products based on AJIO catalog with 90% off pricing and gender
const SAMPLE_PRODUCTS = [
  {
    name: 'Penti Strappy Round-Neck Camisole',
    price: 216,
    category: 'Clothing',
    type: 'PHYSICAL',
    gender: 'Female',
    sizes: 'S, M, L, XL'
  },
  {
    name: 'I Saw It First Polka-Dots Print Off-Shoulder Dress',
    price: 272,
    category: 'Clothing',
    type: 'PHYSICAL',
    gender: 'Female',
    sizes: 'S, M, L, XL'
  },
  {
    name: 'Tommy Hilfiger Men Solid Casual Shirt',
    price: 1099,
    category: 'Clothing',
    type: 'PHYSICAL',
    gender: 'Male',
    sizes: 'S, M, L, XL, XXL'
  },
  {
    name: 'Marks & Spencer Women Cotton Vest',
    price: 299,
    category: 'Clothing',
    type: 'PHYSICAL',
    gender: 'Female',
    sizes: 'S, M, L, XL'
  },
  {
    name: 'H&M Men Colorblock T-Shirt',
    price: 449,
    category: 'Clothing',
    type: 'PHYSICAL',
    gender: 'Male',
    sizes: 'S, M, L, XL, XXL'
  },
  {
    name: 'Forever 21 Women Denim Shorts',
    price: 599,
    category: 'Clothing',
    type: 'PHYSICAL',
    gender: 'Female',
    sizes: 'S, M, L, XL'
  },
  {
    name: 'AJIO Men Solid Casual Track Pants',
    price: 549,
    category: 'Clothing',
    type: 'PHYSICAL',
    gender: 'Male',
    sizes: 'S, M, L, XL, XXL'
  },
  {
    name: 'Roadster Women Striped Casual Kurti',
    price: 389,
    category: 'Clothing',
    type: 'PHYSICAL',
    gender: 'Female',
    sizes: 'S, M, L, XL'
  },
  {
    name: 'WROGN Men Cotton Polo T-Shirt',
    price: 799,
    category: 'Clothing',
    type: 'PHYSICAL',
    gender: 'Male',
    sizes: 'S, M, L, XL, XXL'
  },
  {
    name: 'AND Women Casual Printed Dress',
    price: 679,
    category: 'Clothing',
    type: 'PHYSICAL',
    gender: 'Female',
    sizes: 'S, M, L, XL'
  }
];

async function main() {
  try {
    console.log('🗑️  Deleting cart items that reference products...');
    const deleteCartResult = await prisma.cartItem.deleteMany({});
    console.log(`✅ Deleted ${deleteCartResult.count} cart items\n`);

    console.log('🗑️  Deleting existing products...');
    const deleteResult = await prisma.product.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.count} products\n`);

    console.log('📥 Bulk inserting new products...');
    const createdProducts = await prisma.product.createMany({
      data: SAMPLE_PRODUCTS.map(p => ({
        ...p,
        stockQuantity: 100,
        description: `${p.name} - 90% off sale`,
        imageUrl: 'https://via.placeholder.com/300x300?text=' + encodeURIComponent(p.name.substring(0, 15)),
        isActive: true
      }))
    });
    console.log(`✅ Inserted ${createdProducts.count} products\n`);

    console.log('🔍 Verifying products in database...');
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        gender: true,
        sizes: true,
        stockQuantity: true
      }
    });

    console.log(`\n✅ Total products in database: ${allProducts.length}\n`);
    console.log('Sample products:');
    allProducts.slice(0, 5).forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Price: ₹${product.price}`);
      console.log(`   Gender: ${product.gender}`);
      console.log(`   Sizes: ${product.sizes}`);
      console.log(`   Stock: ${product.stockQuantity}\n`);
    });

    if (allProducts.length > 5) {
      console.log(`... and ${allProducts.length - 5} more products`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
