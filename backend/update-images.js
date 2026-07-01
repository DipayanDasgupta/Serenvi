const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function update() {
  const result = await prisma.product.updateMany({
    data: {
      imageUrl: '/products/gladiadora-1.jpg,/products/gladiadora-2.jpg,/products/gladiadora-3.jpg',
    },
  });
  console.log('Updated', result.count, 'products');
  await prisma.$disconnect();
}

update();
