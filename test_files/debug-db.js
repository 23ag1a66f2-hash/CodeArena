import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

async function debugDatabase() {
  const client = new MongoClient(process.env.MONGODB_URL);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('Connected to MongoDB');
    
    // Check problem sets
    const problemSets = await db.collection('problemSets').find({}).toArray();
    console.log('Problem sets found:', problemSets.length);
    
    for (const set of problemSets) {
      console.log(`Set: ${set.title} (${set.id})`);
      console.log(`Problem instances: ${set.problemInstances ? set.problemInstances.length : 0}`);
      if (set.problemInstances && set.problemInstances.length > 0) {
        console.log('Instances:', set.problemInstances.map(p => ({ id: p.id, title: p.title })));
      }
      console.log('---');
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await client.close();
  }
}

debugDatabase();