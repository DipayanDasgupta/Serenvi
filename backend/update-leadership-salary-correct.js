const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();

const SALARY_TIERS = [
  { monthlysSalesThreshold: 10000, percentage: 3.7, name: '₹10k' },
  { monthlysSalesThreshold: 25000, percentage: 2.9, name: '₹25k' },
  { monthlysSalesThreshold: 50000, percentage: 1.1, name: '₹50k' },
  { monthlysSalesThreshold: 100000, percentage: 1.3, name: '₹100k' },
  { monthlysSalesThreshold: 250000, percentage: 1.5, name: '₹250k' },
  { monthlysSalesThreshold: 500000, percentage: 1.6, name: '₹500k' },
  { monthlysSalesThreshold: 1000000, percentage: 1.6, name: '₹1M' },
  { monthlysSalesThreshold: 2500000, percentage: 1.5, name: '₹2.5M' },
  { monthlysSalesThreshold: 5000000, percentage: 0.8, name: '₹5M' },
];

function findHighestTier(monthlySales) {
  for (let i = SALARY_TIERS.length - 1; i >= 0; i--) {
    if (new Decimal(monthlySales).gte(new Decimal(SALARY_TIERS[i].monthlysSalesThreshold))) {
      return i;
    }
  }
  return -1;
}

async function updateLeadershipSalaryCorrect() {
  const user = await prisma.distributor.findFirst({
    where: { name: 'Aryaman Mandal', level1Sales: { gte: 165000 } },
    select: {
      id: true,
      name: true,
      monthlySales: true,
      currentLeadershipRank: true,
      currentLeadershipSalary: true,
    },
  });

  if (!user) {
    console.log('User not found');
    process.exit(0);
  }

  const tierIndex = findHighestTier(user.monthlySales);
  const tier = tierIndex >= 0 ? SALARY_TIERS[tierIndex] : null;

  console.log('\n💰 LEADERSHIP SALARY RECALCULATION (CORRECT)');
  console.log('==========================================\n');
  console.log(`User: ${user.name}`);
  console.log(`Updated monthlySales: ₹${user.monthlySales}`);
  console.log(`Current tier: ${user.currentLeadershipRank !== null ? `Tier ${user.currentLeadershipRank} (${SALARY_TIERS[user.currentLeadershipRank].name})` : 'None'}`);
  console.log(`Current salary: ₹${user.currentLeadershipSalary}\n`);

  if (!tier) {
    console.log('❌ User does not qualify for any leadership tier');
    process.exit(0);
  }

  console.log(`✅ New tier: Tier ${tierIndex} (${tier.name})`);
  console.log(`   Percentage: ${tier.percentage}%\n`);

  // Get TOTAL referred revenue (NOT 15% pool)
  const referredRevenueUsers = await prisma.distributor.findMany({
    where: { sponsorId: { not: null } },
    select: { id: true },
  });

  const referredRevenueData = await prisma.sale.aggregate({
    _sum: { saleAmount: true },
    where: {
      sellerId: { in: referredRevenueUsers.map(u => u.id) },
      orderStatus: 'COMPLETED',
    },
  });

  const totalReferredRevenue = referredRevenueData._sum.saleAmount || new Decimal(0);
  
  // Apply tier percentage DIRECTLY to total referred revenue
  const newSalary = totalReferredRevenue.mul(new Decimal(tier.percentage)).div(new Decimal(100));

  console.log(`📊 CORRECT SALARY CALCULATION:`);
  console.log(`   Total Referred Revenue: ₹${totalReferredRevenue}`);
  console.log(`   ${tier.percentage}% of Total Revenue: ₹${newSalary}\n`);

  if (user.currentLeadershipRank === tierIndex) {
    console.log(`ℹ️  Same tier - only amount changed`);
  } else if (user.currentLeadershipRank !== null && user.currentLeadershipRank !== tierIndex) {
    console.log(`⬆️  TIER CHANGE: ${SALARY_TIERS[user.currentLeadershipRank].name} → ${tier.name}`);
  } else {
    console.log(`✨ NEW TIER: User now qualifies for ${tier.name}`);
  }

  console.log(`\n🔄 Updating database...\n`);

  const updated = await prisma.distributor.update({
    where: { id: user.id },
    data: {
      currentLeadershipRank: tierIndex,
      currentLeadershipSalary: newSalary,
    },
  });

  console.log(`✅ UPDATED!`);
  console.log(`   New Rank: Tier ${updated.currentLeadershipRank} (${SALARY_TIERS[updated.currentLeadershipRank].name})`);
  console.log(`   New Salary: ₹${updated.currentLeadershipSalary}`);

  process.exit(0);
}

updateLeadershipSalaryCorrect().catch(console.error);
