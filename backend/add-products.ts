import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function addProducts() {
  const products = [
    {
      name: 'Digital Marketing Course',
      description: 'Comprehensive digital marketing masterclass with 50+ modules',
      price: new Decimal(499),
      category: 'Education',
      type: 'DIGITAL',
      isActive: true,
    },
    {
      name: 'E-Book Bundle - Wealth Creation',
      description: '10 premium e-books on personal finance and wealth management',
      price: new Decimal(399),
      category: 'Books',
      type: 'DIGITAL',
      isActive: true,
    },
    {
      name: 'Business Automation Templates',
      description: '100+ ready-to-use business automation templates and workflows',
      price: new Decimal(599),
      category: 'Tools',
      type: 'DIGITAL',
      isActive: true,
    },
    {
      name: 'Video Production Software License',
      description: 'Annual license for professional video editing and production',
      price: new Decimal(1299),
      category: 'Software',
      type: 'DIGITAL',
      isActive: true,
    },
    {
      name: 'SEO Optimization Toolkit',
      description: 'Complete SEO toolkit with keyword research, analysis, and competitor tracking',
      price: new Decimal(799),
      category: 'Tools',
      type: 'DIGITAL',
      isActive: true,
    },
    {
      name: 'Leadership Development Program',
      description: '12-week leadership development with certification',
      price: new Decimal(1599),
      category: 'Education',
      type: 'DIGITAL',
      isActive: true,
    },
    {
      name: 'Mobile App Development Course',
      description: 'Learn to build iOS and Android apps from scratch',
      price: new Decimal(2199),
      category: 'Education',
      type: 'DIGITAL',
      isActive: true,
    },
    {
      name: 'AI & Machine Learning Bootcamp',
      description: '4-week intensive AI and ML training with live projects',
      price: new Decimal(2999),
      category: 'Education',
      type: 'DIGITAL',
      isActive: true,
    },
    {
      name: 'Social Media Marketing Masterclass',
      description: 'Complete guide to SMM with case studies and real-world strategies',
      price: new Decimal(699),
      category: 'Education',
      type: 'DIGITAL',
      isActive: true,
    },
    {
      name: 'Email Marketing Automation Suite',
      description: 'Advanced email marketing with automation and CRM integration',
      price: new Decimal(1099),
      category: 'Software',
      type: 'DIGITAL',
      isActive: true,
    },
    {
      name: 'Graphic Design Pro Package',
      description: '5000+ design templates for social media, print, and web',
      price: new Decimal(899),
      category: 'Tools',
      type: 'DIGITAL',
      isActive: true,
    },
    {
      name: 'Content Writing Toolkit',
      description: 'AI-powered content writing tools with 1000+ templates',
      price: new Decimal(549),
      category: 'Tools',
      type: 'DIGITAL',
      isActive: true,
    },
    {
      name: 'Web Development Complete Course',
      description: 'Full-stack web development from HTML to deployment',
      price: new Decimal(1799),
      category: 'Education',
      type: 'DIGITAL',
      isActive: true,
    },
    {
      name: 'Cloud Computing Essentials',
      description: 'AWS, Azure, and Google Cloud certification prep course',
      price: new Decimal(1399),
      category: 'Education',
      type: 'DIGITAL',
      isActive: true,
    },
    {
      name: 'Cybersecurity Masterclass',
      description: 'Advanced cybersecurity training with hands-on labs',
      price: new Decimal(2499),
      category: 'Education',
      type: 'DIGITAL',
      isActive: true,
    },
  ];

  try {
    for (const product of products) {
      const existing = await prisma.product.findFirst({
        where: { name: product.name },
      });

      if (!existing) {
        const created = await prisma.product.create({
          data: product,
        });
        console.log(`✅ Created: ${created.name} - ₹${created.price}`);
      } else {
        console.log(`⏭️  Already exists: ${product.name}`);
      }
    }

    console.log('\n✅ All products added successfully!');
    const total = await prisma.product.count();
    console.log(`📦 Total products in database: ${total}`);
  } catch (error) {
    console.error('❌ Error adding products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addProducts();
