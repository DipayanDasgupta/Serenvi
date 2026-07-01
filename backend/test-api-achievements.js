const axios = require('axios');

async function testAchievementAPI() {
  console.log('\n🔗 TESTING ACHIEVEMENT API ENDPOINTS');
  console.log('=====================================\n');

  try {
    // Test 1: Get milestones endpoint
    console.log('1️⃣  Testing GET /achievements/milestones...');
    try {
      const milestonesRes = await axios.get('http://localhost:3001/achievements/milestones');
      console.log('✅ Response:', JSON.stringify(milestonesRes.data.slice(0, 2), null, 2));
      console.log(`   Total milestones: ${milestonesRes.data.length}\n`);
    } catch (err) {
      console.log('❌ Error:', err.response?.status, err.message, '\n');
    }

    // Test 2: Need token for auth endpoints
    console.log('2️⃣  Testing GET /achievements/progress (requires auth)...');
    console.log('   ℹ️  This requires a valid JWT token\n');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAchievementAPI();
