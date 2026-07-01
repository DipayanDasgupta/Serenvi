const fs = require('fs');

const filePath = 'c:\\Users\\Aryaman Mandal\\Downloads\\ajio_90pct_sale_with_gender.csv';
const fileContent = fs.readFileSync(filePath, 'utf-8');
const lines = fileContent.split('\n');

console.log('CSV Gender Distribution:\n');

// Sample first 10 lines
console.log('First 10 products:');
for (let i = 1; i <= 10 && i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  // Find last comma to get gender
  const parts = line.split(',');
  const lastPart = parts[parts.length - 2]?.trim() || 'NONE';
  
  console.log(`Line ${i}: Gender = "${lastPart}"`);
}

// Count genders
let womenCount = 0, menCount = 0, otherCount = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const parts = line.split(',');
  const gender = parts[parts.length - 2]?.trim() || '';
  
  if (gender === 'Women') womenCount++;
  else if (gender === 'Men') menCount++;
  else otherCount++;
}

console.log(`\n📊 Total Gender Count:`);
console.log(`  Women: ${womenCount}`);
console.log(`  Men: ${menCount}`);
console.log(`  Other/Unknown: ${otherCount}`);
