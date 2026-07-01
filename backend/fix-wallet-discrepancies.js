const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

async function findAndFixDiscrepancies() {
  const distributors = await prisma.distributor.findMany({
    select: { id: true, name: true, walletBalance: true },
  });

  console.log('\n🔍 CHECKING ALL USERS FOR WALLET DISCREPANCIES');
  console.log('================================================\n');

  const discrepancies = [];

  for (const dist of distributors) {
    // Calculate correct balance from transactions
    const txs = await prisma.walletTransaction.findMany({
      where: { distributorId: dist.id },
    });

    let calculatedBalance = new Decimal(0);
    txs.forEach(tx => {
      calculatedBalance = calculatedBalance.plus(new Decimal(tx.amount));
    });

    const storedBalance = new Decimal(dist.walletBalance);
    const diff = storedBalance.minus(calculatedBalance);

    if (diff.toNumber() !== 0) {
      discrepancies.push({
        id: dist.id,
        name: dist.name,
        stored: storedBalance.toNumber(),
        calculated: calculatedBalance.toNumber(),
        difference: diff.toNumber(),
        transactionCount: txs.length,
      });

      console.log(`⚠️  ${dist.name}`);
      console.log(`    Stored Balance: ₹${storedBalance}`);
      console.log(`    Calculated Balance: ₹${calculatedBalance}`);
      console.log(`    Discrepancy: ₹${diff}`);
      console.log(`    Transactions: ${txs.length}\n`);
    }
  }

  if (discrepancies.length === 0) {
    console.log('✅ No discrepancies found! All wallets are correct.\n');
    process.exit(0);
  }

  console.log(`\n📊 FOUND ${discrepancies.length} USER(S) WITH DISCREPANCIES\n`);
  console.log('🔧 FIXING...\n');

  // Fix all discrepancies
  for (const disc of discrepancies) {
    await prisma.distributor.update({
      where: { id: disc.id },
      data: { walletBalance: new Decimal(disc.calculated) },
    });

    console.log(`✅ ${disc.name}`);
    console.log(`   Fixed: ₹${disc.stored} → ₹${disc.calculated}`);
    console.log(`   Saved: ₹${Math.abs(disc.difference).toLocaleString('en-IN')}\n`);
  }

  console.log(`✅ ALL WALLETS FIXED!`);
  process.exit(0);
}

findAndFixDiscrepancies().catch(console.error);
