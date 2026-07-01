const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// All products from the user's data
const PRODUCTS = [
  { name: 'Penti Strappy Round-Neck Camisole', price: 1899, category: 'Clothing', type: 'Camisoles & Slips', imageUrl: 'https://assets.ajio.com/medias/sys_master/root/20221010/0vSN/634433f5f997ddfdbd1804bc/penti_black_strappy_round-neck_camisole.jpg', stockQuantity: 267, description: 'Comfortable camisole with a sleek design — perfect for layering or wearing solo.', gender: 'Female', sizes: 'S, M, L, XL' },
  { name: 'Y-LONDON Floral Print Sheath Dress', price: 2299, category: 'Clothing', type: 'Dresses', imageUrl: 'https://assets.ajio.com/medias/sys_master/root/20230719/VPSu/64b7f748eebac147fc7acd5c/y-london_blue_floral_print_sheath_dress.jpg', stockQuantity: 277, description: 'Elegant dress with a flattering silhouette — perfect for any occasion.', gender: 'Female', sizes: 'S, M, L, XL' },
  { name: 'Y-LONDON Round-Neck Top with Lace Sleeves', price: 1299, category: 'Clothing', type: 'Tops', imageUrl: 'https://assets.ajio.com/medias/sys_master/root/20221116/pzyX/6373def0aeb269659c8fede3/y-london_petrol_blue_round-neck_top_with_lace_sleeves.jpg', stockQuantity: 392, description: 'Trendy top with a chic design — pairs well with jeans, skirts, or palazzos.', gender: 'Female', sizes: 'S, M, L, XL' },
  { name: 'TRENDYOL Leaf Print Sheath Dress with Frills', price: 1799, category: 'Clothing', type: 'Dresses', imageUrl: 'https://assets.ajio.com/medias/sys_master/root/20221125/4pqQ/6380ebc6aeb269659cb64059/trendyol_pink_leaf_print_sheath_dress_with_frills.jpg', stockQuantity: 388, description: 'Elegant dress with a flattering silhouette — perfect for any occasion.', gender: 'Female', sizes: 'S, M, L, XL' },
  { name: 'Oxxo Mid-Rise Palazzo with Waist Tie-Up', price: 1899, category: 'Clothing', type: 'Trousers & Pants', imageUrl: 'https://assets.ajio.com/medias/sys_master/root/20230518/qSBt/64665844d55b7d0c63c46107/oxxo_black_mid-rise_palazzo_with_waist_tie-up.jpg', stockQuantity: 223, description: 'Well-tailored trousers with a clean finish — ideal for formal and semi-formal occasions.', gender: 'Female', sizes: 'S, M, L, XL' },
  { name: 'Barrels And Oil Placement Print Cropped Sweatshirt', price: 1499, category: 'Clothing', type: 'Sweatshirt & Hoodies', imageUrl: 'https://assets.ajio.com/medias/sys_master/root/20221226/5KRq/63a94318f997ddfdbdf6916e/barrels_and_oil_blue_placement_print_cropped_sweatshirt.jpg', stockQuantity: 325, description: 'Comfortable everyday tee with relaxed fit and soft breathable fabric — perfect for casual wear.', gender: 'Male', sizes: 'S, M, L, XL, XXL' },
  { name: 'Barrels And Oil Washed Jacket with Buttoned Flap Pockets', price: 3299, category: 'Clothing', type: 'Jackets & Coats', imageUrl: 'https://assets.ajio.com/medias/sys_master/root/20211126/PXU5/61a0fb46f997ddf8f11d2de6/barrels_and_oil_blue_washed_jacket_with_buttoned_flap_pockets.jpg', stockQuantity: 345, description: 'Stylish jacket with a modern cut — adds an instant edge to any outfit.', gender: 'Female', sizes: 'S, M, L, XL' },
  { name: 'TALLY WEiJL Ribbed Square-Neck Bodycon Dress', price: 1699, category: 'Clothing', type: 'Dresses', imageUrl: 'https://assets.ajio.com/medias/sys_master/root/20240613/ovTA/666cf5d61d763220fab9b906/tally_weijl_black_ribbed_square-neck_bodycon_dress.jpg', stockQuantity: 393, description: 'Elegant dress with a flattering silhouette — perfect for any occasion.', gender: 'Female', sizes: 'S, M, L, XL' },
  { name: 'Mavi Men Typographic Print Regular Fit Crew-Neck T-Shirt', price: 1499, category: 'Clothing', type: 'Tshirts', imageUrl: 'https://assets.ajio.com/medias/sys_master/root/20240305/pl5F/65e72ec905ac7d77bb98961a/mavi_navy_blue_men_typographic_print_regular_fit_crew-neck_t-shirt.jpg', stockQuantity: 323, description: 'Comfortable everyday tee with relaxed fit and soft breathable fabric — perfect for casual wear.', gender: 'Male', sizes: 'S, M, L, XL, XXL' },
  { name: 'Barrels And Oil Round-Neck Top with Chain Accent', price: 1399, category: 'Clothing', type: 'Tops', imageUrl: 'https://assets.ajio.com/medias/sys_master/root/20230103/NmP6/63b44eb0aeb269659c21c05d/barrels_and_oil_purple_round-neck_top_with_chain_accent.jpg', stockQuantity: 309, description: 'Trendy top with a chic design — pairs well with jeans, skirts, or palazzos.', gender: 'Female', sizes: 'S, M, L, XL' },
];

async function bulkSeedProducts() {
  try {
    console.log('🗑️  Deleting cart items that reference products...');
    const deleteCartResult = await prisma.cartItem.deleteMany({});
    console.log(`✅ Deleted ${deleteCartResult.count} cart items\n`);

    console.log('🗑️  Deleting existing products...');
    const deleteResult = await prisma.product.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.count} products\n`);

    console.log('📥 Bulk inserting products from AJIO data...');
    const createdProducts = await prisma.product.createMany({
      data: PRODUCTS.map(p => ({
        name: p.name,
        price: p.price,
        category: p.category,
        type: p.type,
        imageUrl: p.imageUrl,
        stockQuantity: p.stockQuantity,
        description: p.description,
        gender: p.gender,
        sizes: p.sizes,
        isActive: true
      }))
    });
    console.log(`✅ Inserted ${createdProducts.count} products\n`);

    console.log('🔍 Verifying products in database...');
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        gender: true,
        sizes: true,
        imageUrl: true,
        stockQuantity: true
      },
      orderBy: { name: 'asc' }
    });

    console.log(`\n✅ Total products in database: ${allProducts.length}\n`);
    console.log('📊 Product Summary:\n');
    
    // Group by gender
    const byGender = {};
    allProducts.forEach(p => {
      byGender[p.gender] = (byGender[p.gender] || 0) + 1;
    });
    
    console.log('Products by Gender:');
    Object.entries(byGender).forEach(([gender, count]) => {
      console.log(`  ${gender}: ${count} products`);
    });

    console.log('\nFirst 10 Products:');
    allProducts.slice(0, 10).forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Price: ₹${product.price} | Gender: ${product.gender} | Sizes: ${product.sizes}`);
      console.log(`   Stock: ${product.stockQuantity}`);
    });

    if (allProducts.length > 10) {
      console.log(`\n... and ${allProducts.length - 10} more products`);
    }

    console.log('\n✅ DATABASE SEEDING COMPLETE!');
    console.log('\n📝 NOTE: Image URLs are from AJIO CDN and should load directly.');
    console.log('   If images not showing, check:');
    console.log('   1. Network connection and CDN access');
    console.log('   2. Image URL format in database');
    console.log('   3. Frontend image component implementation');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

bulkSeedProducts();
