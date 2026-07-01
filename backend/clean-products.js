const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  const c = await prisma.commission.deleteMany({});
  console.log('Deleted', c.count, 'commissions');
  const ci = await prisma.cartItem.deleteMany({});
  console.log('Deleted', ci.count, 'cart items');
  const s = await prisma.sale.deleteMany({});
  console.log('Deleted', s.count, 'sales');
  const p = await prisma.product.deleteMany({});
  console.log('Deleted', p.count, 'products');
  console.log('All products and history cleared!');
  await prisma.$disconnect();
}

clean();
