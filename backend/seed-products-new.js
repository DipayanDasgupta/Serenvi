const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  try {
    // Clear existing products
    await prisma.product.deleteMany({});
    console.log('Cleared existing products');

    const products = [
      // From the spreadsheet data
      {
        name: 'RED TAPE Men Lace-Up Walking Shoes',
        description: 'Comfortable walking shoes for everyday use',
        price: 1245,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'ZIVAWA Men Casual Shirts',
        description: 'Stylish casual shirt perfect for any occasion',
        price: 899,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      },
      {
        name: 'RED TAPE Men Sneakers with PU Upper',
        description: 'Durable sneakers with PU upper material',
        price: 1005,
        fileUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&q=80'
      },
      {
        name: 'ZIVAWA Men Regular Fit Shirt',
        description: 'Classic regular fit shirt for formal and casual wear',
        price: 325,
        fileUrl: 'https://images.unsplash.com/photo-1582287470884-44d71e15a300?w=400&q=80'
      },
      {
        name: 'Bude Jeans Co Men Light Rise Straight Jeans',
        description: 'Comfortable straight cut jeans',
        price: 994,
        fileUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80'
      },
      {
        name: 'Puma Men F1 Gaviid 2.0 IN Sneakers',
        description: 'Premium Puma sneakers with modern design',
        price: 2000,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'Bude Jeans Co Men Mid-Rise Straight FE Shirts',
        description: 'Mid-rise straight fit shirts',
        price: 782,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      },
      {
        name: 'NEW BALANCE Men CT300 Low-Top Sneakers',
        description: 'Stylish low-top New Balance sneakers',
        price: 1950,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'NEOBAM Men Regular Fit Collar Black',
        description: 'Regular fit collar shirt in black',
        price: 654,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      },
      {
        name: 'ZIVAWA Men Casual Shirts',
        description: 'Casual wear shirts for everyday styling',
        price: 987,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      },
      {
        name: 'RED TAPE Men Sneakers with PU Upper',
        description: 'Premium sneakers with durable PU material',
        price: 1275,
        fileUrl: 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&q=80'
      },
      {
        name: 'RED TAPE Men Shoes For Men Upper',
        description: 'Quality shoes with upper material',
        price: 1275,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'Bude Jeans Co Men Mid-Rise Tapered Jeans',
        description: 'Tapered fit jeans for a modern look',
        price: 525,
        fileUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80'
      },
      {
        name: 'Bude Jeans Co Men Graphic Ombre Tahari',
        description: 'Graphic design casual wear',
        price: 745,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      },
      {
        name: 'NEOBAM Men Regular Fit Cargo Shorts',
        description: 'Comfortable cargo shorts with multiple pockets',
        price: 456,
        fileUrl: 'https://images.unsplash.com/photo-1555062045-2c9de50f9b0d?w=400&q=80'
      },
      {
        name: 'NEOBAM Men Regular Fit Tracked with FI',
        description: 'Track pants with comfortable fit',
        price: 354,
        fileUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80'
      },
      {
        name: 'Bude Jeans Co Men Regular Fit Shirt with Patch Pocket',
        description: 'Classic fit shirt with patch pockets',
        price: 283,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      },
      {
        name: 'Bude Jeans Co Men Striped Regular Fit Polo T-Shirt',
        description: 'Striped polo with comfortable regular fit',
        price: 695,
        fileUrl: 'https://images.unsplash.com/photo-1625910513413-5fc9b58917e6?w=400&q=80'
      },
      {
        name: 'RED TAPE Men Knitted Running Sports Shoes',
        description: 'Lightweight running shoes with knitted upper',
        price: 799,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'Hill Men Co Men Casual Full Fit Lounge Pants',
        description: 'Casual lounge pants for comfort',
        price: 994,
        fileUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80'
      },
      {
        name: 'RED TAPE Men Sports Shoes With Men Upper',
        description: 'Professional sports shoes',
        price: 1340,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'RED TAPE Men Casual Shoes with Leather Upper Casual Shoes',
        description: 'Casual shoes with genuine leather',
        price: 1440,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'Include Men Regular Fit Cargo Shorts',
        description: 'Durable cargo shorts with many pockets',
        price: 216,
        fileUrl: 'https://images.unsplash.com/photo-1555062045-2c9de50f9b0d?w=400&q=80'
      },
      {
        name: 'NEOBAM Men Regular Fit Tracked in IT',
        description: 'Modern track pants',
        price: 216,
        fileUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80'
      },
      {
        name: 'Bude Jeans Co Men Regular Fit Shirt with Patch Pocket',
        description: 'Quality shirt with patch details',
        price: 378,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      },
      {
        name: 'Meck Jersey Men Regular Fit Polo T-Shirt',
        description: 'Comfortable polo for daily wear',
        price: 250,
        fileUrl: 'https://images.unsplash.com/photo-1625910513413-5fc9b58917e6?w=400&q=80'
      },
      {
        name: 'Spark Respect Men Regular In Cotton Pado T-Shirt',
        description: 'Cotton T-shirt for casual styling',
        price: 249,
        fileUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80'
      },
      {
        name: 'RED TAPE Men Sports Shoes With Men Upper',
        description: 'Athletic sports shoes',
        price: 1230,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'Bude Jeans Co Men Mid-Rise Straight Track',
        description: 'Modern straight track pants',
        price: 324,
        fileUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80'
      },
      {
        name: 'Bude Jeans Co Men Regular Fit Shirt with Patch',
        description: 'Classic shirt design',
        price: 945,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      },
      {
        name: 'RED TAPE Colorblock Long Cap Glow Striped Shoes',
        description: 'Trendy striped shoes with colorblock design',
        price: 1445,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'RED TAPE Colorblock Long Casual Shoes with PU Upper',
        description: 'Casual shoes with stylish colorblock',
        price: 1440,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'Truem Men Casual Shoes with White',
        description: 'White casual shoes for everyday wear',
        price: 946,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'Truem Men Casual Shoes with Glow',
        description: 'Casual shoes with glow finish',
        price: 216,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'Colorblocked X AG Men Patterned Regular Fit Kurtas',
        description: 'Traditional patterned kurta',
        price: 200,
        fileUrl: 'https://images.unsplash.com/photo-1605833950111-10a01f35a4b2?w=400&q=80'
      },
      {
        name: 'NEOBAM Men Lightweight Shadowed IT',
        description: 'Lightweight casual wear',
        price: 187,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      },
      {
        name: 'Truem Men Forron Transport Inspired Regular Fit Shirt - White',
        description: 'White casual shirt',
        price: 527,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      },
      {
        name: 'Bude Jeans Co Men Striped Regular Fit Polo T-Shirt',
        description: 'Striped polo shirt',
        price: 432,
        fileUrl: 'https://images.unsplash.com/photo-1625910513413-5fc9b58917e6?w=400&q=80'
      },
      {
        name: 'RED TAPE Men Sports Shoes With Men Upper',
        description: 'Professional sports footwear',
        price: 1730,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'RED TAPE Men Round Toe Striped Shoes',
        description: 'Classic striped round toe shoes',
        price: 1350,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'RED TAPE Men Casual Shoes with PU Upper Casual Shoes',
        description: 'Durable casual shoes',
        price: 1440,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'The Indian Garage Co Men Striped Shirt F1 Shirt',
        description: 'Striped shirt by Indian Garage',
        price: 490,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      },
      {
        name: 'Fashion King Yeth Men Blended Regular Fit Casualwear',
        description: 'Blended fabric casual wear',
        price: 480,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      },
      {
        name: 'RED TAPE Men Casual Shoes with PU Upper Casual Shoes',
        description: 'Stylish PU casual shoes',
        price: 1440,
        fileUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'
      },
      {
        name: 'The Indian Garage Co Men Striped Shirt F1 Shirt',
        description: 'Designer striped shirt',
        price: 990,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      },
      {
        name: 'Teamspirit Men Hemingbone Cargo Joggers',
        description: 'Comfortable cargo joggers',
        price: 225,
        fileUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80'
      },
      {
        name: 'ZIVAWA Men Printed Joggers In Striped Regular Fit',
        description: 'Printed joggers with striped pattern',
        price: 567,
        fileUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80'
      },
      {
        name: 'Bude Jeans Co Men Blended Fit Cloth Fashion',
        description: 'Blended fabric fashion piece',
        price: 250,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      },
      {
        name: 'with Somoni Collor',
        description: 'Fashion forward design',
        price: 432,
        fileUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80'
      }
    ];

    // Create products
    for (const product of products) {
      await prisma.product.create({
        data: {
          name: product.name,
          description: product.description,
          price: product.price,
          fileUrl: product.fileUrl,
          isActive: true
        }
      });
    }

    console.log(`Successfully created ${products.length} products`);
  } catch (error) {
    console.error('Error seeding products:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
