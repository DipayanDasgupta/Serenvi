const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

// Set the correct database URL for the running docker container
// Set DATABASE_URL in .env file - do not hardcode credentials
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const prisma = new PrismaClient();

async function addPentiCamisole() {
  try {
    const product = await prisma.product.create({
      data: {
        name: 'Penti Strappy Round-Neck Camisole',
        description: 'Comfortable camisole with a sleek design — perfect for layering or wearing solo.',
        price: new Decimal('216.00'),
        category: 'Clothing',
        type: 'Camisoles & Slips',
        imageUrl: 'https://assets.ajio.com/medias/sys_master/root/20221010/0vSN/634433f5f997ddfdbd1804bc/penti_black_strappy_round-neck_camisole.jpg',
        stockQuantity: 267,
        gender: 'Female',
        sizes: 'S, M, L, XL',
        isActive: true,
      },
    });
    console.log('✓ Product Added Successfully!');
    console.log('  Name:', product.name);
    console.log('  ID:', product.id);
    console.log('  Price: ₹', product.price.toString());
    console.log('  Stock:', product.stockQuantity);
    console.log('  Category:', product.category);
    console.log('  Gender:', product.gender);
    console.log('  Sizes:', product.sizes);
  } catch (error) {
    console.error('✗ Error adding product:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addPentiCamisole();
