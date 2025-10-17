import { MongoClient } from 'mongodb';

const MONGODB_URL = process.env.MONGODB_URL || "mongodb+srv://bandarin29:meritcurve@meritcurve.73u7fr7.mongodb.net/?retryWrites=true&w=majority";

async function testConnection() {
  const client = new MongoClient(MONGODB_URL, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });

  try {
    console.log('Connection URL:', MONGODB_URL.replace(/:[^:/@]+@/, ':****@')); // Hide password in logs
    console.log('Attempting to connect to MongoDB...');
    
    await client.connect();
    console.log('Successfully connected to MongoDB!');
    
    const admin = client.db().admin();
    
    // Test 1: Check server status
    console.log('\nTest 1: Checking server status...');
    const serverStatus = await admin.serverStatus();
    console.log('Server version:', serverStatus.version);
    console.log('Server uptime:', serverStatus.uptime, 'seconds');
    
    // Test 2: List databases
    console.log('\nTest 2: Listing databases...');
    const dbs = await admin.listDatabases();
    console.log('Available databases:', dbs.databases.map(db => db.name));
    
    // Test 3: Test write operation
    console.log('\nTest 3: Testing write operation...');
    const testDb = client.db('meritcurve');
    const testCollection = testDb.collection('connection_test');
    const testDoc = { test: true, timestamp: new Date() };
    await testCollection.insertOne(testDoc);
    console.log('Successfully wrote test document');
    
    // Test 4: Test read operation
    console.log('\nTest 4: Testing read operation...');
    const foundDoc = await testCollection.findOne({ test: true });
    console.log('Successfully read test document:', foundDoc);
    
    // Cleanup
    await testCollection.deleteOne({ test: true });
    console.log('\nCleanup: Removed test document');
    
    await client.close();
    console.log('\nConnection closed successfully');
  } catch (error) {
    console.error('\nConnection test failed!');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.stack) console.error('Stack trace:', error.stack);
    
    // Additional error details for specific MongoDB errors
    if (error.name === 'MongoServerSelectionError') {
      console.error('\nServer Selection Error Details:');
      console.error('Topology Description:', error.topology?.description);
      console.error('Server Descriptions:', error.topology?.servers);
    }
    
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testConnection().catch(console.error); 