const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Function to parse CSV file
function parseCSV(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n');
  
  // Skip header
  const products = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV with proper handling of quoted fields
    const fields = parseCSVLine(line);
    
    if (fields.length < 10) continue;
    
    const product = {
      name: fields[0] || 'Unknown',
      price: parseInt(fields[1]) || 0,
      category: fields[2] || 'Uncategorized',
      type: fields[3] || 'General',
      imageUrl: fields[4] || '',
      stockQuantity: parseInt(fields[5]) || 0,
      description: fields[6] || '',
      buyLink: fields[7] || '',
      variants: fields[8] || '',
      gender: fields[9] || 'Unisex'
    };
    
    products.push(product);
  }
  
  return products;
}

// Helper function to parse CSV line properly (handles quoted fields)
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  fields.push(current.trim());
  return fields;
}

// Function to generate sizes based on gender
function generateSizes(gender) {
  if (!gender) return 'S, M, L, XL';
  
  const normalizedGender = gender.toLowerCase();
  
  if (normalizedGender.includes('men') || normalizedGender === 'male') {
    return 'S, M, L, XL, XXL';
  }
  
  // Default for women, women's, female
  return 'S, M, L, XL';
}

// Function to normalize gender
function normalizeGender(gender) {
  if (!gender) return 'Female';
  
  const normalized = gender.toLowerCase();
  
  if (normalized.includes('men') || normalized === 'male') {
    return 'Male';
  }
  
  if (normalized.includes('women') || normalized.includes('female') || normalized === 'female') {
    return 'Female';
  }
  
  return 'Female';
}

async function seedDatabase() {
  try {
    console.log('🔄 Starting bulk import...\n');
    
    // Parse CSV file
    const csvPath = 'c:\\Users\\Aryaman Mandal\\Downloads\\ajio_90pct_sale_with_gender.csv';
    console.log(`📂 Parsing CSV from: ${csvPath}`);
    
    const parsedProducts = parseCSV(csvPath);
    console.log(`✅ Parsed ${parsedProducts.length} products\n`);
    
    // Display sample
    console.log('📋 Sample of imported products:');
    parsedProducts.slice(0, 5).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} | ₹${p.price} | ${p.gender} | Stock: ${p.stockQuantity}`);
    });
    console.log();
    
    // Delete previous cart items (foreign key constraint)
    console.log('🗑️  Deleting existing cart items...');
    const deletedCartItems = await prisma.cartItem.deleteMany({});
    console.log(`✅ Deleted ${deletedCartItems.count} cart items\n`);
    
    // Delete previous products
    console.log('🗑️  Deleting existing products...');
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`✅ Deleted ${deletedProducts.count} products\n`);
    
    // Transform products for insertion
    console.log('🔄 Transforming product data...');
    const productsToInsert = parsedProducts.map(p => {
      const normalizedGender = normalizeGender(p.gender);
      
      return {
        name: p.name,
        price: p.price,
        category: p.category,
        type: p.type,
        imageUrl: p.imageUrl,
        stockQuantity: p.stockQuantity,
        description: p.description,
        gender: normalizedGender,
        sizes: generateSizes(normalizedGender),
        isActive: true
      };
    });
    
    console.log(`✅ Transformed ${productsToInsert.length} products\n`);
    
    // Bulk insert with batching (to avoid exceeding max parameters)
    console.log('📥 Inserting products in batches...');
    const batchSize = 500;
    let totalInserted = 0;
    
    for (let i = 0; i < productsToInsert.length; i += batchSize) {
      const batch = productsToInsert.slice(i, i + batchSize);
      
      const result = await prisma.product.createMany({
        data: batch,
        skipDuplicates: true
      });
      
      totalInserted += result.count;
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(productsToInsert.length / batchSize);
      console.log(`  Batch ${batchNum}/${totalBatches}: ${result.count} products inserted`);
    }
    
    console.log(`\n✅ Successfully inserted ${totalInserted} products!\n`);
    
    // Verify and get statistics
    console.log('📊 Verifying database state...');
    const allProducts = await prisma.product.findMany();
    console.log(`✅ Total products in database: ${allProducts.length}\n`);
    
    // Gender distribution
    const femaleCount = allProducts.filter(p => p.gender === 'Female').length;
    const maleCount = allProducts.filter(p => p.gender === 'Male').length;
    
    console.log('👥 Gender Distribution:');
    console.log(`  Female: ${femaleCount} products`);
    console.log(`  Male: ${maleCount} products\n`);
    
    // Price statistics
    const prices = allProducts.map(p => p.price);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    
    console.log('💰 Price Statistics:');
    console.log(`  Average Price: ₹${avgPrice}`);
    console.log(`  Highest Price: ₹${maxPrice}`);
    console.log(`  Lowest Price: ₹${minPrice}`);
    
    // Stock statistics
    const totalStock = allProducts.reduce((sum, p) => sum + p.stockQuantity, 0);
    const avgStock = Math.round(totalStock / allProducts.length);
    
    console.log(`\n📦 Stock Statistics:`);
    console.log(`  Total Stock: ${totalStock} units`);
    console.log(`  Average Stock per Product: ${avgStock} units\n`);
    
    // Display first 20 products
    console.log('📋 First 20 products in database:');
    const first20 = allProducts.slice(0, 20);
    first20.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} | ₹${p.price} | ${p.gender} (${p.sizes}) | Stock: ${p.stockQuantity}`);
    });
    
    console.log(`\n✨ Import completed successfully! ✨\n`);
    
  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding
seedDatabase();
