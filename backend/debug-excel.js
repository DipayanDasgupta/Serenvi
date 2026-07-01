const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'ajio_90pct_sale_with_gender.xlsx');

try {
  console.log('File exists:', fs.existsSync(filePath));
  console.log('File size:', fs.statSync(filePath).size);
  
  const workbook = XLSX.readFile(filePath);
  console.log('Sheet names:', workbook.SheetNames);
  
  if (workbook.SheetNames.length > 0) {
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log('Total rows:', data.length);
    console.log('First row:', JSON.stringify(data[0], null, 2));
    console.log('Column headers:', data.length > 0 ? Object.keys(data[0]) : []);
  }
} catch (error) {
  console.error('Error:', error.message);
}
