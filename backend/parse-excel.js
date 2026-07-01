const XLSX = require('xlsx');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, '..', 'ajio_90pct_sale_with_gender.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Total products found:', data.length);
console.log('\nFirst 3 products:');
console.log(JSON.stringify(data.slice(0, 3), null, 2));

// Export data as JSON
const fs = require('fs');
fs.writeFileSync(
  path.join(__dirname, 'products-data.json'),
  JSON.stringify(data, null, 2)
);

console.log('\n✅ Data saved to products-data.json');
