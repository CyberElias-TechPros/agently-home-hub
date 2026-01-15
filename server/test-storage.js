const documentStorageService = require('./services/documentStorageService');

async function testStorage() {
  try {
    console.log('Testing document storage service...');

    // Test initialization
    await documentStorageService.initializeStorage();
    console.log('✅ Storage initialization successful');

    // Test storage type detection
    console.log(`📁 Storage type: ${documentStorageService.storageType}`);
    console.log(`📂 Storage path: ${documentStorageService.storagePath}`);

    if (documentStorageService.storageType === 's3') {
      console.log(`🪣 S3 Bucket: ${documentStorageService.bucketName}`);
      console.log('✅ S3 configuration loaded');
    } else {
      console.log('✅ Local storage configuration loaded');
    }

    console.log('🎉 Document storage service test completed successfully!');
  } catch (error) {
    console.error('❌ Storage test failed:', error.message);
    process.exit(1);
  }
}

testStorage();