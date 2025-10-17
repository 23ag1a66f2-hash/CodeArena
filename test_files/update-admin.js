import { MongoClient } from 'mongodb';

async function updateUserRole() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/coding-platform');
  
  try {
    await client.connect();
    const db = client.db();
    
    const result = await db.collection('users').updateOne(
      { email: 'test@example.com' },
      { $set: { role: 'admin' } }
    );
    
    console.log('Updated user role:', result);
  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    await client.close();
  }
}

updateUserRole();