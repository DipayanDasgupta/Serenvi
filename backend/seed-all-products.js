const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// All products from user data
const PRODUCTS = [
  { name: "Penti Strappy Round-Neck Camisole", price: 1899, category: "Clothing", type: "Camisoles & Slips", imageUrl: "https://assets.ajio.com/medias/sys_master/root/20221010/0vSN/634433f5f997ddfdbd1804bc/penti_black_strappy_round-neck_camisole.jpg", stockQuantity: 267, description: "Comfortable camisole with a sleek design — perfect for layering or wearing solo.", gender: "Women", color: "black" },
  { name: "Y-LONDON Floral Print Sheath Dress", price: 2299, category: "Clothing", type: "Dresses", imageUrl: "https://assets.ajio.com/medias/sys_master/root/20230719/VPSu/64b7f748eebac147fc7acd5c/y-london_blue_floral_print_sheath_dress.jpg", stockQuantity: 277, description: "Elegant dress with a flattering silhouette — perfect for any occasion.", gender: "Women", color: "blue" },
  { name: "Y-LONDON Round-Neck Top with Lace Sleeves", price: 1299, category: "Clothing", type: "Tops", imageUrl: "https://assets.ajio.com/medias/sys_master/root/20221116/pzyX/6373def0aeb269659c8fede3/y-london_petrol_blue_round-neck_top_with_lace_sleeves.jpg", stockQuantity: 392, description: "Trendy top with a chic design — pairs well with jeans, skirts, or palazzos.", gender: "Women", color: "petrol" },
  { name: "TRENDYOL Leaf Print Sheath Dress with Frills", price: 1799, category: "Clothing", type: "Dresses", imageUrl: "https://assets.ajio.com/medias/sys_master/root/20221125/4pqQ/6380ebc6aeb269659cb64059/trendyol_pink_leaf_print_sheath_dress_with_frills.jpg", stockQuantity: 388, description: "Elegant dress with a flattering silhouette — perfect for any occasion.", gender: "Women", color: "pink" },
  { name: "Oxxo Mid-Rise Palazzo with Waist Tie-Up", price: 1899, category: "Clothing", type: "Trousers & Pants", imageUrl: "https://assets.ajio.com/medias/sys_master/root/20230518/qSBt/64665844d55b7d0c63c46107/oxxo_black_mid-rise_palazzo_with_waist_tie-up.jpg", stockQuantity: 223, description: "Well-tailored trousers with a clean finish — ideal for formal and semi-formal occasions.", gender: "Women", color: "black" },
  { name: "Barrels And Oil Placement Print Cropped Sweatshirt", price: 1499, category: "Clothing", type: "Sweatshirt & Hoodies", imageUrl: "https://assets.ajio.com/medias/sys_master/root/20221226/5KRq/63a94318f997ddfdbdf6916e/barrels_and_oil_blue_placement_print_cropped_sweatshirt.jpg", stockQuantity: 325, description: "Comfortable everyday tee with relaxed fit and soft breathable fabric — perfect for casual wear.", gender: "Men", color: "blue" },
  { name: "Barrels And Oil Washed Jacket with Buttoned Flap Pockets", price: 3299, category: "Clothing", type: "Jackets & Coats", imageUrl: "https://assets.ajio.com/medias/sys_master/root/20211126/PXU5/61a0fb46f997ddf8f11d2de6/barrels_and_oil_blue_washed_jacket_with_buttoned_flap_pockets.jpg", stockQuantity: 345, description: "Stylish jacket with a modern cut — adds an instant edge to any outfit.", gender: "Women", color: "blue" },
  { name: "TALLY WEiJL Ribbed Square-Neck Bodycon Dress", price: 1699, category: "Clothing", type: "Dresses", imageUrl: "https://assets.ajio.com/medias/sys_master/root/20240613/ovTA/666cf5d61d763220fab9b906/tally_weijl_black_ribbed_square-neck_bodycon_dress.jpg", stockQuantity: 393, description: "Elegant dress with a flattering silhouette — perfect for any occasion.", gender: "Women", color: "black" },
  { name: "Mavi Men Typographic Print Regular Fit Crew-Neck T-Shirt", price: 1499, category: "Clothing", type: "Tshirts", imageUrl: "https://assets.ajio.com/medias/sys_master/root/20240305/pl5F/65e72ec905ac7d77bb98961a/mavi_navy_blue_men_typographic_print_regular_fit_crew-neck_t-shirt.jpg", stockQuantity: 323, description: "Comfortable everyday tee with relaxed fit and soft breathable fabric — perfect for casual wear.", gender: "Men", color: "navy" },
  { name: "Barrels And Oil Round-Neck Top with Chain Accent", price: 1399, category: "Clothing", type: "Tops", imageUrl: "https://assets.ajio.com/medias/sys_master/root/20230103/NmP6/63b44eb0aeb269659c21c05d/barrels_and_oil_purple_round-neck_top_with_chain_accent.jpg", stockQuantity: 309, description: "Trendy top with a chic design — pairs well with jeans, skirts, or palazzos.", gender: "Women", color: "purple" },
];

// Helper function to generate sizes based on gender
function generateSizes(gender) {
  if (gender === "Men") {
    return "S, M, L, XL, XXL";
  } else if (gender === "Women") {
    return "S, M, L, XL";
  } else {
    return "S, M, L";
  }
}

// Normalize gender
function normalizeGender(gender) {
  const g = gender?.trim().toLowerCase() || "women";
  if (g.includes("men")) return "Men";
  if (g.includes("women")) return "Women";
  if (g.includes("kids")) return "Kids";
  return "Women";
}

async function seedProducts() {
  try {
    console.log("🗑️  Deleting cart items that reference products...");
    const deletedCartItems = await prisma.cartItem.deleteMany({});
    console.log(`✅ Deleted ${deletedCartItems.count} cart items\n`);

    console.log("🗑️  Deleting existing products...");
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`✅ Deleted ${deletedProducts.count} products\n`);

    console.log("📥 Bulk inserting products...");
    
    // Transform products with proper gender and sizes
    const productsToInsert = PRODUCTS.map(p => ({
      name: p.name,
      price: p.price,
      category: p.category,
      type: p.type,
      imageUrl: p.imageUrl,
      stockQuantity: p.stockQuantity,
      description: p.description,
      gender: normalizeGender(p.gender),
      sizes: generateSizes(normalizeGender(p.gender)),
      isActive: true,
    }));

    const result = await prisma.product.createMany({
      data: productsToInsert,
    });

    console.log(`✅ Inserted ${result.count} products\n`);

    // Verify insertion
    console.log("🔍 Verifying products in database...\n");
    const allProducts = await prisma.product.findMany();
    
    console.log(`✅ Total products in database: ${allProducts.length}\n`);

    // Statistics
    const maleCount = allProducts.filter(p => p.gender === "Men").length;
    const femaleCount = allProducts.filter(p => p.gender === "Women").length;
    const kidsCount = allProducts.filter(p => p.gender === "Kids").length;

    console.log("📊 Product Summary:\n");
    console.log("Products by Gender:");
    if (maleCount > 0) console.log(`  Men: ${maleCount} products`);
    if (femaleCount > 0) console.log(`  Women: ${femaleCount} products`);
    if (kidsCount > 0) console.log(`  Kids: ${kidsCount} products`);

    console.log("\n📋 First 10 Products:");
    allProducts.slice(0, 10).forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Price: ₹${product.price} | Gender: ${product.gender} | Sizes: ${product.sizes}`);
      console.log(`   Stock: ${product.stockQuantity}`);
    });

    // Calculate statistics
    const totalPrice = allProducts.reduce((sum, p) => sum + p.price, 0);
    const avgPrice = totalPrice / allProducts.length;
    const maxPrice = Math.max(...allProducts.map(p => p.price));
    const minPrice = Math.min(...allProducts.map(p => p.price));
    const totalStock = allProducts.reduce((sum, p) => sum + p.stockQuantity, 0);

    console.log(`\n📈 Stock Statistics:`);
    console.log(`  Average Price: ₹${avgPrice.toFixed(2)}`);
    console.log(`  Highest Price: ₹${maxPrice}`);
    console.log(`  Lowest Price: ₹${minPrice}`);
    console.log(`  Total Stock: ${totalStock} units`);

    console.log("\n✅ DATABASE SEEDING COMPLETE!");
    console.log("\n📝 NOTE: Image URLs are from AJIO CDN and should load directly.");
    console.log("   If images not showing, check:");
    console.log("   1. Network connection and CDN access");
    console.log("   2. Image URL format in database");
    console.log("   3. Frontend image component implementation");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedProducts().catch((error) => {
  console.error(error);
  process.exit(1);
});
