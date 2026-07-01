const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const prisma = new PrismaClient();
  const email = 'theserenvicompany@gmail.com';
  const name = 'Aryaman';
  const phone = '8116969019';
  const password = 'Arya@2006';
  const normalizedEmail = email.toLowerCase().trim();

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { password: hashed, isAdmin: true },
    create: { email: normalizedEmail, password: hashed, isAdmin: true },
  });

  console.log('Admin user ready:', user.email, user.id);

  let distributor = await prisma.distributor.findUnique({ where: { userId: user.id } });
  if (!distributor) {
    let referralCode = 'ARYA' + Math.floor(1000 + Math.random() * 9000);
    while (await prisma.distributor.findUnique({ where: { referralCode } })) {
      referralCode = 'ARYA' + Math.floor(1000 + Math.random() * 9000);
    }
    const tPin = ('0000' + Math.floor(1000 + Math.random() * 9000)).slice(-4);
    distributor = await prisma.distributor.create({
      data: {
        userId: user.id,
        name,
        email: normalizedEmail,
        phone,
        referralCode,
        tPin,
        walletBalance: '0',
        carryForwardSales: '0',
      },
    });
    console.log('Created distributor:', distributor.id);
    console.log('Referral code:', distributor.referralCode);
    console.log('TPIN:', distributor.tPin);
  } else {
    await prisma.distributor.update({
      where: { id: distributor.id },
      data: { name, phone, email: normalizedEmail },
    });
    console.log('Updated distributor:', distributor.id);
  }

  await prisma['$disconnect']();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});