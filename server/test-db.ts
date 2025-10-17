import { connectToMongoDB, getDb, closeMongoDB } from './db.js';

const testDatabaseOperations = async () => {
  try {
    console.log('Starting database connection test...');
    
    // Test 1: Initial Connection
    console.log('\nTest 1: Establishing initial connection...');
    const db = await connectToMongoDB();
    console.log('Initial connection successful');

    // Test 2: Concurrent Operations
    console.log('\nTest 2: Testing concurrent operations...');
    const promises = Array(5).fill(null).map(async (_, i) => {
      try {
        const users = db.collection('users');
        const result = await users.findOne({});
        console.log(`Concurrent operation ${i + 1} successful`);
        return result;
      } catch (error) {
        console.error(`Concurrent operation ${i + 1} failed:`, error);
        throw error;
      }
    });

    await Promise.all(promises);
    console.log('All concurrent operations completed successfully');

    // Test 3: Connection Reuse
    console.log('\nTest 3: Testing connection reuse...');
    const db2 = await connectToMongoDB();
    console.log('Connection reuse successful');

    // Test 4: Database Operations
    console.log('\nTest 4: Testing database operations...');
    const testCollection = db.collection('test');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    console.log('Insert operation successful');
    
    const result = await testCollection.findOne({ test: true });
    console.log('Find operation successful:', result);
    
    await testCollection.deleteOne({ test: true });
    console.log('Delete operation successful');

    // Cleanup
    console.log('\nCleaning up...');
    await closeMongoDB();
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
};

// Run the test
testDatabaseOperations().catch(console.error); 