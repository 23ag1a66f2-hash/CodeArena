import { MongoClient } from 'mongodb';

const MONGODB_URL = process.env.MONGODB_URL || "mongodb+srv://bandarin29:meritcurve@meritcurve.73u7fr7.mongodb.net/";

async function testConnection() {
  const client = new MongoClient(MONGODB_URL, {
    serverSelectionTimeoutMS: 5000, // 5 second timeout
    connectTimeoutMS: 10000, // 10 second timeout
  });

  try {
    console.log('Attempting to connect to MongoDB...');
    await client.connect();
    console.log('Successfully connected to MongoDB!');
    
    // Test database operations
    const db = client.db('meritcurve');
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    await client.close();
    console.log('Connection closed successfully');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  }
}

testConnection(); 