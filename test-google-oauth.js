import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const API_KEY = 'GCMUDibV5a7WvyUNt9n3QztToSHZk7Uj';

async function testGoogleOAuth() {
  console.log('🧪 Testing Google OAuth Implementation...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data);
    console.log('');

    // Test 2: Google OAuth Configuration Test
    console.log('2️⃣ Testing Google OAuth Configuration...');
    const configResponse = await axios.get(
      `${BASE_URL}/api/v1/auth/google/test`,
      {
        headers: {
          'x-api-key': API_KEY,
        },
      },
    );
    console.log('✅ Google OAuth Config:', configResponse.data);
    console.log('');

    // Test 3: Google OAuth Failure Handler
    console.log('3️⃣ Testing Google OAuth Failure Handler...');
    const failureResponse = await axios.get(
      `${BASE_URL}/api/v1/auth/google/failure`,
      {
        headers: {
          'x-api-key': API_KEY,
        },
      },
    );
    console.log('✅ Failure Handler:', failureResponse.data);
    console.log('');

    console.log('🎉 All tests passed! Google OAuth is properly configured.');
    console.log('');
    console.log('📝 Next Steps:');
    console.log(
      '1. Make sure you have set up Google OAuth credentials in your .env file',
    );
    console.log('2. Test the full OAuth flow in your browser:');
    console.log(`   ${BASE_URL}/api/v1/auth/google/login`);
    console.log(
      '3. Import the Postman collection: addons/postman/Google_OAuth_Tests.postman_collection.json',
    );
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Make sure your server is running:');
      console.log('   npm run build && npm start');
    }
  }
}

// Run the tests
testGoogleOAuth();
