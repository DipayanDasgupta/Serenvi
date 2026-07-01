const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');
const prisma = new PrismaClient();

async function addProduct() {
  const product = await prisma.product.create({
    data: {
      name: 'Gladiadora Suction Phone Case (Silicone Anti-Slip Multipurpose Holder)',
      description: 'Silicone suction phone case with strong anti-slip grip that sticks to smooth surfaces like mirrors, tiles, and glass. Ideal for hands-free video recording, video calls, and content creation. Lightweight, reusable, washable, and compatible with most smartphones.',
      price: new Decimal(999),
      category: 'Electronics',
      type: 'PHYSICAL',
      imageUrl: 'https://m.media-amazon.com/images/I/61Xexample1.jpg,https://m.media-amazon.com/images/I/61Xexample2.jpg,https://m.media-amazon.com/images/I/61Xexample3.jpg',
      stockQuantity: 100,
      isActive: true,
    },
  });
  console.log('Created:', product.name, '| ID:', product.id);
  await prisma.$disconnect();
}

addProduct();
