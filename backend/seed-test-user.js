const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function seed() {
  try {
    // Create User first
    const user = await prisma.user.create({
      data: {
        email: 'testuser@serenvi.com',
        password: await bcrypt.hash('password123', 10),
      }
    });
    console.log('✓ User created:', user.id);
    
    // Create Distributor linked to User
    const dist = await prisma.distributor.create({
      data: {
        id: 'cmnd3n13o00021xvxjzvk0s75',
        userId: user.id,
        phone: '9999999999',
        name: 'Test User',
        email: 'testuser@serenvi.com',
        referralCode: 'ABC123',
        level1Sales: 0,
        totalSales: 0,
        walletBalance: 50000,
        carryForwardSales: 0,
      }
    });
    console.log('✓ Distributor created:', dist.id);
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
