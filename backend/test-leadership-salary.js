const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');
const prisma = new PrismaClient();

// Copy of the salary distribution logic for manual testing
const SALARY_TIERS = [
  { monthlysSalesThreshold: 100000000, poolPercentage: 0.8 },
  { monthlysSalesThreshold: 5000000, poolPercentage: 1.5 },
  { monthlysSalesThreshold: 2500000, poolPercentage: 1.6 },
  { monthlysSalesThreshold: 1000000, poolPercentage: 1.6 },
  { monthlysSalesThreshold: 500000, poolPercentage: 1.5 },
  { monthlysSalesThreshold: 100000, poolPercentage: 1.3 },
  { monthlysSalesThreshold: 50000, poolPercentage: 1.1 },
  { monthlysSalesThreshold: 25000, poolPercentage: 2.9 },
  { monthlysSalesThreshold: 10000, poolPercentage: 3.7 },
];

const TOTAL_POOL_PERCENTAGE = 15; // 15% of referred user revenue

function findHighestTier(monthlySales) {
  for (let i = 0; i < SALARY_TIERS.length; i++) {
    if (new Decimal(monthlySales).gte(new Decimal(SALARY_TIERS[i].monthlysSalesThreshold))) {
      return i;
    }
  }
  return -1; // Not qualified
}

async function testLeadershipSalary() {
  try {
    console.log('✓ Manual Leadership Salary Distribution Test\n');

    // Use current month (for testing)
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    console.log(`📅 Testing for month: ${month}/${year}\n`);

    // Check if already distributed
    const existing = await prisma.leadershipSalary.findFirst({
      where: { month, year },
    });

    if (existing) {
      console.log(`⚠️  Salary already distributed for ${month}/${year}`);
      console.log('🔄 Deleting previous records for re-testing...\n');
      await prisma.leadershipSalary.deleteMany({
        where: { month, year },
      });
    }

    // Get month range
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    console.log(`📊 Calculating revenue from referred users...`);
    console.log(`   Period: ${monthStart.toDateString()} to ${monthEnd.toDateString()}\n`);

    // Get revenue from referred users only (those with sponsorId = not null)
    const referredUserRevenue = await prisma.sale.aggregate({
      _sum: { saleAmount: true },
      where: {
        seller: {
          sponsorId: { not: null }, // Only users who were referred
        },
        createdAt: { gte: monthStart, lte: monthEnd },
        orderStatus: 'COMPLETED',
      },
    });

    const totalReferredRevenue = new Decimal(referredUserRevenue._sum.saleAmount || 0);

    console.log(`💰 Total Referred User Revenue: ₹${totalReferredRevenue.toNumber().toLocaleString()}\n`);

    // Get all referred users
    const referredUsers = await prisma.distributor.findMany({
      where: {
        sponsorId: { not: null },
        status: 'ACTIVE',
      },
    });

    console.log(`👥 Total referred users: ${referredUsers.length}\n`);

    // Group users by their highest qualifying tier
    const usersByTier = {};
    for (const user of referredUsers) {
      const tierIndex = findHighestTier(user.monthlySales);
      if (tierIndex >= 0) {
        if (!usersByTier[tierIndex]) {
          usersByTier[tierIndex] = [];
        }
        usersByTier[tierIndex].push({
          id: user.id,
          name: user.name,
          monthlySales: user.monthlySales,
          currentRank: user.currentLeadershipRank,
          currentSalary: user.currentLeadershipSalary,
        });
      }
    }

    console.log(`📋 Salary Distribution by Tier:\n`);

    let totalDistributed = new Decimal(0);
    const updateOperations = [];

    // Distribute by tiers - apply tier % directly to total revenue
    for (const tierIndexStr of Object.keys(usersByTier).map(Number).sort((a, b) => a - b)) {
      const tier = SALARY_TIERS[tierIndexStr];
      const tierUsers = usersByTier[tierIndexStr];

      const tierPool = totalReferredRevenue
        .mul(new Decimal(tier.poolPercentage))
        .div(100);

      const salaryPerUser = tierPool.div(new Decimal(tierUsers.length));

      console.log(`   Tier ≥₹${tier.monthlysSalesThreshold.toLocaleString()} (${tier.poolPercentage}%)`);
      console.log(`   ├─ Eligible users: ${tierUsers.length}`);
      console.log(`   ├─ Pool amount: ₹${tierPool.toNumber().toLocaleString()}`);
      console.log(`   └─ Per user: ₹${salaryPerUser.toNumber().toLocaleString()}\n`);

      for (const user of tierUsers) {
        totalDistributed = totalDistributed.plus(salaryPerUser);
        updateOperations.push({
          userId: user.id,
          tierIndex: tierIndexStr,
          newSalary: salaryPerUser,
          userData: user,
        });
      }
    }

    // Process rank changes and wallet updates
    console.log(`\n🔄 Processing Rank Changes:\n`);
    const userSalaries = {};

    for (const op of updateOperations) {
      const user = op.userData;
      const oldRank = user.currentRank;
      const oldSalary = user.currentSalary ? new Decimal(user.currentSalary) : new Decimal(0);

      op.oldSalary = oldSalary;
      const rankChanged = oldRank !== op.tierIndex;

      let walletUpdate = new Decimal(0);

      if (rankChanged && oldSalary.gt(0)) {
        walletUpdate = walletUpdate.minus(oldSalary);
        console.log(`   ${user.name}: Deducted previous salary ₹${oldSalary.toNumber().toLocaleString()}`);
      }

      walletUpdate = walletUpdate.plus(op.newSalary);

      // Update user with new tier and salary
      await prisma.distributor.update({
        where: { id: op.userId },
        data: {
          walletBalance: {
            increment: walletUpdate,
          },
          currentLeadershipRank: op.tierIndex,
          currentLeadershipSalary: op.newSalary,
        },
      });

      // Record salary
      await prisma.leadershipSalary.create({
        data: {
          distributorId: op.userId,
          rank: `Tier_${SALARY_TIERS[op.tierIndex].monthlysSalesThreshold}`,
          salaryAmount: op.newSalary,
          poolPercentage: new Decimal(SALARY_TIERS[op.tierIndex].poolPercentage),
          month,
          year,
        },
      });

      // Log transactions
      await prisma.walletTransaction.create({
        data: {
          distributorId: op.userId,
          type: 'LEADERSHIP_SALARY',
          amount: op.newSalary,
          description: `Leadership salary - Tier ≥₹${SALARY_TIERS[op.tierIndex].monthlysSalesThreshold} (${month}/${year})`,
          referenceId: op.userId,
        },
      });

      if (rankChanged && oldSalary.gt(0)) {
        await prisma.walletTransaction.create({
          data: {
            distributorId: op.userId,
            type: 'LEADERSHIP_SALARY',
            amount: oldSalary.negated(),
            description: `Rank adjustment: Removed previous tier salary (₹${oldSalary.toNumber()})`,
            referenceId: op.userId,
          },
        });
      }

      userSalaries[op.userId] = op.newSalary;
    }

    console.log(`\n✅ Distribution completed!`);
    console.log(`💸 Total distributed: ₹${totalDistributed.toNumber().toLocaleString()}\n`);

    // Show updated balances
    console.log(`📱 Updated Wallet Balances:\n`);
    const updatedUsers = await prisma.distributor.findMany({
      where: {
        sponsorId: { not: null },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        monthlySales: true,
        walletBalance: true,
        currentLeadershipRank: true,
        currentLeadershipSalary: true,
      },
    });

    for (const user of updatedUsers) {
      if (userSalaries[user.id]) {
        const tierName = user.currentLeadershipRank !== null 
          ? `≥₹${SALARY_TIERS[user.currentLeadershipRank].monthlysSalesThreshold.toLocaleString()}`
          : 'None';
        
        console.log(`   ${user.name}`);
        console.log(`   ├─ Monthly Sales: ₹${new Decimal(user.monthlySales).toNumber().toLocaleString()}`);
        console.log(`   ├─ Leadership Tier: ${tierName}`);
        console.log(`   ├─ Leadership Salary (This Month): ₹${new Decimal(user.currentLeadershipSalary).toNumber().toLocaleString()}`);
        console.log(`   └─ Wallet: ₹${new Decimal(user.walletBalance).toNumber().toLocaleString()}\n`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testLeadershipSalary();
