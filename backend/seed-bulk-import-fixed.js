const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Function to parse CSV file with proper quoted field handling
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
    
    if (fields.length < 10) {
      console.warn(`⚠️  Line ${i} has only ${fields.length} fields, skipping`);
      continue;
    }
    
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

// Better CSV line parser that handles quoted fields properly
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}

// Function to generate sizes based on gender
function generateSizes(gender) {
  if (!gender) return 'S, M, L, XL';
  
  const normalizedGender = gender.toLowerCase().trim();
  
  if (normalizedGender === 'men' || normalizedGender === 'male') {
    return 'S, M, L, XL, XXL';
  }
  
  // Default for women, women's, female
  return 'S, M, L, XL';
}

// Function to normalize gender
function normalizeGender(gender) {
  if (!gender) return 'Female';
  
  const normalized = gender.toLowerCase().trim();
  
  if (normalized === 'men' || normalized === 'male') {
    return 'Male';
  }
  
  if (normalized === 'women' || normalized === 'female' || normalized === 'female') {
    return 'Female';
  }
  
  return 'Female';
}

async function seedDatabase() {
  try {
    console.log('🔄 Starting bulk import (FIXED GENDER PARSING)...\n');
    
    // Parse CSV file
    const csvPath = 'c:\\Users\\Aryaman Mandal\\Downloads\\ajio_90pct_sale_with_gender.csv';
    console.log(`📂 Parsing CSV from: ${csvPath}`);
    
    const parsedProducts = parseCSV(csvPath);
    console.log(`✅ Parsed ${parsedProducts.length} products\n`);
    
    // Display sample with gender verification
    console.log('📋 Sample of imported products (verifying gender):');
    parsedProducts.slice(0, 10).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} | ₹${p.price} | ${p.gender} | Stock: ${p.stockQuantity}`);
    });
    console.log();
    
    // Count genders in parsed data
    const femaleProducts = parsedProducts.filter(p => normalizeGender(p.gender) === 'Female');
    const maleProducts = parsedProducts.filter(p => normalizeGender(p.gender) === 'Male');
    
    console.log(`📊 Parsed Gender Distribution:`);
    console.log(`  Female: ${femaleProducts.length}`);
    console.log(`  Male: ${maleProducts.length}\n`);
    
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
    const dbFemaleCount = allProducts.filter(p => p.gender === 'Female').length;
    const dbMaleCount = allProducts.filter(p => p.gender === 'Male').length;
    
    console.log('👥 Gender Distribution in Database:');
    console.log(`  Female: ${dbFemaleCount} products`);
    console.log(`  Male: ${dbMaleCount} products\n`);
    
    // Price statistics
    const prices = allProducts.map(p => p.price).filter(p => p > 0);
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
    
    // Display male and female sample products
    console.log('👩 Sample Female Products:');
    const femaleProds = allProducts.filter(p => p.gender === 'Female').slice(0, 10);
    femaleProds.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} | ₹${p.price} | Sizes: ${p.sizes}`);
    });
    
    console.log('\n👨 Sample Male Products:');
    const maleProds = allProducts.filter(p => p.gender === 'Male').slice(0, 10);
    maleProds.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} | ₹${p.price} | Sizes: ${p.sizes}`);
    });
    
    console.log(`\n✨ Import completed successfully! ✨\n`);
    console.log(`🎉 Your store now has ${allProducts.length} products ready to sell!\n`);
    
  } catch (error) {
    console.error('❌ Error during import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding
seedDatabase();
