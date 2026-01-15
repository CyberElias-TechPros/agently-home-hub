const { testConnection } = require('./db');

async function testDatabase() {
  console.log('Testing database connection...');
  const connected = await testConnection();
  if (connected) {
    console.log('✅ Database test passed!');
    process.exit(0);
  } else {
    console.log('❌ Database test failed!');
    process.exit(1);
  }
}

testDatabase();