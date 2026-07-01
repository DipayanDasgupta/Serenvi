// Seed products script for SERENVI Platform
// This script adds the product catalog to the database

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedProducts() {
  try {
    console.log('🚀 Starting product seeding...\n');

    // Clear existing products (optional - comment out to preserve existing data)
    const deletedCount = await prisma.product.deleteMany({});
    console.log(`✓ Cleared ${deletedCount.count} old products\n`);

    const products = [
      // Footwear Products
      {
        name: 'RED TAPE Men Lace-Up Walking Shoes',
        description: 'Comfortable walking shoes for everyday use with breathable material',
        price: 1245,
        category: 'Footwear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        stockQuantity: 150
      },
      {
        name: 'RED TAPE Men Sneakers with PU Upper',
        description: 'Durable sneakers with PU upper material and comfortable fit',
        price: 1005,
        category: 'Footwear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&q=80',
        stockQuantity: 180
      },
      {
        name: 'NEW BALANCE Men CT300 Low-Top Sneakers',
        description: 'Premium New Balance sneakers with modern design and comfort technology',
        price: 1950,
        category: 'Footwear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        stockQuantity: 120
      },
      {
        name: 'Puma Men F1 Gaviid 2.0 IN Sneakers',
        description: 'Premium Puma sneakers with modern F1 inspired design',
        price: 2000,
        category: 'Footwear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        stockQuantity: 100
      },
      {
        name: 'RED TAPE Men Sports Shoes With Men Upper',
        description: 'Professional sports shoes with advanced cushioning technology',
        price: 1340,
        category: 'Footwear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        stockQuantity: 140
      },
      {
        name: 'RED TAPE Men Knitted Running Sports Shoes',
        description: 'Lightweight running shoes with knitted upper for breathability',
        price: 799,
        category: 'Footwear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        stockQuantity: 200
      },

      // Clothing - Shirts
      {
        name: 'ZIVAWA Men Casual Shirts',
        description: 'Stylish casual shirts perfect for any occasion, multiple colors',
        price: 899,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
        stockQuantity: 250
      },
      {
        name: 'ZIVAWA Men Regular Fit Shirt',
        description: 'Classic regular fit shirt for formal and casual wear',
        price: 325,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
        stockQuantity: 200
      },
      {
        name: 'NEOBAM Men Regular Fit Collar Black',
        description: 'Regular fit collar shirt in black with premium fabric',
        price: 654,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
        stockQuantity: 180
      },
      {
        name: 'Bude Jeans Co Men Regular Fit Shirt with Patch Pocket',
        description: 'Classic fit shirt with stylish patch pockets',
        price: 283,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
        stockQuantity: 160
      },
      {
        name: 'The Indian Garage Co Men Striped Shirt F1 Shirt',
        description: 'Designer striped shirt by The Indian Garage Co',
        price: 490,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
        stockQuantity: 140
      },
      {
        name: 'Truem Men Forron Transport Inspired Regular Fit Shirt - White',
        description: 'White casual shirt with modern transport-inspired design',
        price: 527,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
        stockQuantity: 120
      },

      // Clothing - T-Shirts
      {
        name: 'Bude Jeans Co Men Striped Regular Fit Polo T-Shirt',
        description: 'Comfortable striped polo with regular fit design',
        price: 695,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1625910513413-5fc9b58917e6?w=400&q=80',
        stockQuantity: 220
      },
      {
        name: 'Meck Jersey Men Regular Fit Polo T-Shirt',
        description: 'Quality polo shirt for comfortable daily wear',
        price: 250,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1625910513413-5fc9b58917e6?w=400&q=80',
        stockQuantity: 300
      },
      {
        name: 'Spark Respect Men Regular Cotton Pado T-Shirt',
        description: 'Cotton T-shirt for casual styling and everyday comfort',
        price: 249,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80',
        stockQuantity: 350
      },

      // Clothing - Jeans & Pants
      {
        name: 'Bude Jeans Co Men Light Rise Straight Jeans',
        description: 'Comfortable light-rise straight cut jeans',
        price: 994,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80',
        stockQuantity: 180
      },
      {
        name: 'Bude Jeans Co Men Mid-Rise Straight FE Shirts',
        description: 'Mid-rise straight fit pants',
        price: 782,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
        stockQuantity: 150
      },
      {
        name: 'Bude Jeans Co Men Mid-Rise Tapered Jeans',
        description: 'Modern tapered fit jeans for contemporary look',
        price: 525,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80',
        stockQuantity: 120
      },

      // Clothing - Casual Wear
      {
        name: 'NEOBAM Men Regular Fit Cargo Shorts',
        description: 'Durable cargo shorts with multiple pockets',
        price: 456,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1555062045-2c9de50f9b0d?w=400&q=80',
        stockQuantity: 200
      },
      {
        name: 'NEOBAM Men Regular Fit Tracked with FI',
        description: 'Comfortable track pants with modern design',
        price: 354,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80',
        stockQuantity: 180
      },
      {
        name: 'Hill Men Co Men Casual Full Fit Lounge Pants',
        description: 'Casual lounge pants for maximum comfort',
        price: 994,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80',
        stockQuantity: 160
      },
      {
        name: 'NEOBAM Men Lightweight Shadowed IT',
        description: 'Lightweight casual wear for everyday styling',
        price: 187,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
        stockQuantity: 220
      },
      {
        name: 'Teamspirit Men Hemingbone Cargo Joggers',
        description: 'Comfortable cargo joggers with premium hemingbone pattern',
        price: 225,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80',
        stockQuantity: 240
      },
      {
        name: 'ZIVAWA Men Printed Joggers In Striped Regular Fit',
        description: 'Stylish printed joggers with striped pattern design',
        price: 567,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80',
        stockQuantity: 140
      },
      {
        name: 'Bude Jeans Co Men Mid-Rise Straight Track',
        description: 'Modern straight track pants with mid-rise fit',
        price: 324,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80',
        stockQuantity: 180
      },
      {
        name: 'Bude Jeans Co Men Graphic Ombre Tahari',
        description: 'Graphic design casual wear with ombre effect',
        price: 745,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
        stockQuantity: 100
      },
      {
        name: 'Bude Jeans Co Men Regular Fit Shirt with Patch',
        description: 'Quality classic shirt with patch details',
        price: 945,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
        stockQuantity: 130
      },
      {
        name: 'Fashion King Yeth Men Blended Regular Fit Casualwear',
        description: 'Blended fabric casual wear by Fashion King Yeth',
        price: 480,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
        stockQuantity: 150
      },
      {
        name: 'Bude Jeans Co Men Blended Fit Cloth Fashion',
        description: 'Blended fabric fashion piece for modern styling',
        price: 250,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
        stockQuantity: 200
      },
      {
        name: 'The Indian Garage Co Men Striped Shirt F1',
        description: 'Premium designer striped shirt collection',
        price: 990,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
        stockQuantity: 110
      },

      // Ethnic Wear
      {
        name: 'Colorblocked X AG Men Patterned Regular Fit Kurtas',
        description: 'Traditional patterned kurta with modern design',
        price: 200,
        category: 'Ethnic Wear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1605833950111-10a01f35a4b2?w=400&q=80',
        stockQuantity: 80
      },

      // More Footwear & Casual Shoes
      {
        name: 'RED TAPE Men Casual Shoes with Leather Upper Casual Shoes',
        description: 'Casual shoes with genuine leather for durability',
        price: 1440,
        category: 'Footwear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        stockQuantity: 95
      },
      {
        name: 'RED TAPE Colorblock Long Cap Glow Striped Shoes',
        description: 'Trendy striped shoes with colorblock design',
        price: 1445,
        category: 'Footwear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        stockQuantity: 85
      },
      {
        name: 'RED TAPE Colorblock Long Casual Shoes with PU Upper',
        description: 'Casual shoes with stylish colorblock design',
        price: 1440,
        category: 'Footwear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        stockQuantity: 90
      },
      {
        name: 'RED TAPE Men Round Toe Striped Shoes',
        description: 'Classic round toe shoes with striped pattern',
        price: 1350,
        category: 'Footwear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        stockQuantity: 110
      },
      {
        name: 'RED TAPE Men Casual Shoes with PU Upper Casual Shoes',
        description: 'Stylish PU casual shoes for everyday wear',
        price: 1440,
        category: 'Footwear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        stockQuantity: 100
      },
      {
        name: 'RED TAPE Men Sports Shoes With Men Upper',
        description: 'Athletic sports shoes with advanced cushioning',
        price: 1230,
        category: 'Footwear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        stockQuantity: 130
      },
      {
        name: 'Truem Men Casual Shoes with White',
        description: 'White casual shoes for everyday wear',
        price: 946,
        category: 'Footwear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        stockQuantity: 95
      },
      {
        name: 'Truem Men Casual Shoes with Glow',
        description: 'Casual shoes with glow finish for modern look',
        price: 216,
        category: 'Footwear',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        stockQuantity: 75
      },
      {
        name: 'Include Men Regular Fit Cargo Shorts',
        description: 'Durable cargo shorts with multiple functional pockets',
        price: 216,
        category: 'Clothing',
        type: 'PHYSICAL',
        imageUrl: 'https://images.unsplash.com/photo-1555062045-2c9de50f9b0d?w=400&q=80',
        stockQuantity: 150
      }
    ];
    ];

    // Create products in database
    let createdCount = 0;
    for (const product of products) {
      try {
        await prisma.product.create({
          data: {
            name: product.name,
            description: product.description,
            price: parseFloat(product.price.toString()),
            category: product.category,
            type: product.type,
            imageUrl: product.imageUrl,
            stockQuantity: product.stockQuantity,
            isActive: true
          }
        });
        createdCount++;
        console.log(`✓ Added: ${product.name}`);
      } catch (error) {
        console.error(`✗ Failed to add ${product.name}: ${error.message}`);
      }
    }

    console.log(`\n✅ Successfully seeded ${createdCount} products!\n`);

    // Show summary
    const totalProducts = await prisma.product.count();
    const activeProducts = await prisma.product.count({ where: { isActive: true } });
    
    console.log('📊 Database Summary:');
    console.log(`   Total Products: ${totalProducts}`);
    console.log(`   Active Products: ${activeProducts}`);
    
    return createdCount;

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedProducts()
  .then((count) => {
    console.log(`\n🎉 Seeding completed successfully! Added ${count} products.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
