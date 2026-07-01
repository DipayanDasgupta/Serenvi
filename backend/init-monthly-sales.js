const { PrismaClient } = require('@prisma/client');
const { Decimal } = require('@prisma/client/runtime/library');
const prisma = new PrismaClient();

async function initializeMonthlySales() {
  try {
    console.log('Initializing monthly sales for all distributors...');

    // Get all distributors
    const distributors = await prisma.distributor.findMany();

    for (const distributor of distributors) {
      // Calculate monthly sales for current month (Level 1 downline sales from current month)
      const currentMonth = new Date();
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      // Get all sales made by Level 1 downline members this month
      const monthlySalesAmount = await prisma.sale.aggregate({
        _sum: { saleAmount: true },
        where: {
          seller: {
            sponsorId: distributor.id
          },
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          }
        }
      });

      const monthlySales = monthlySalesAmount._sum.saleAmount || new Decimal(0);

      await prisma.distributor.update({
        where: { id: distributor.id },
        data: {
          monthlySales: monthlySales,
          monthlyResetDate: monthStart
        }
      });

      console.log(`✓ ${distributor.name}: Monthly Sales = ₹${monthlySales}`);
    }

    console.log('✓ Monthly sales initialization complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initializeMonthlySales();
