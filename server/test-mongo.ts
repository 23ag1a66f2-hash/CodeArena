import mongoose from 'mongoose';

const MONGODB_URL = process.env.MONGODB_URL || "mongodb+srv://bandarin29:meritcurve@meritcurve.73u7fr7.mongodb.net/meritcurve";

async function testMongoConnection() {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('Connection URL:', MONGODB_URL.replace(/:[^:/@]+@/, ':****@')); // Hide password in logs
    
    const connection = await mongoose.connect(MONGODB_URL);
    console.log('Successfully connected to MongoDB!');
    
    if (!connection.connection.db) {
      throw new Error('Database connection not established');
    }
    
    // Test database operations
    const collections = await connection.connection.db.listCollections().toArray();
    console.log('\nAvailable collections:', collections.map(c => c.name));
    
    // Test creating a temporary document
    const TestModel = mongoose.model('Test', new mongoose.Schema({
      test: String,
      timestamp: Date
    }));
    
    const testDoc = await TestModel.create({
      test: 'connection-test',
      timestamp: new Date()
    });
    console.log('\nSuccessfully created test document:', testDoc);
    
    // Clean up
    await TestModel.deleteOne({ _id: testDoc._id });
    console.log('Successfully deleted test document');
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
  } catch (err) {
    console.error('\nMongoDB Connection Test Failed!');
    const error = err as Error;
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
console.log('Starting MongoDB connection test...');
testMongoConnection().catch((err: unknown) => {
  console.error('Unhandled error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
}); 