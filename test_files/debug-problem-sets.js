import { MongoClient } from 'mongodb';

async function debugProblemSets() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('codearena');
    const problemSets = await db.collection('problemSets').find({}).toArray();
    
    console.log('Found problem sets:');
    problemSets.forEach(ps => {
      console.log(`- ID: ${ps.id}, Title: ${ps.title}, Type: ${typeof ps.id}`);
    });
    
    // Check if there's a problem set with ID 6894
    const problemSet6894 = await db.collection('problemSets').findOne({ id: '6894' });
    if (problemSet6894) {
      console.log('Found problem set 6894:', problemSet6894);
    } else {
      console.log('Problem set 6894 not found');
    }
    
    // Check if there's a problem set with ID 6894 as number
    const problemSet6894Num = await db.collection('problemSets').findOne({ id: 6894 });
    if (problemSet6894Num) {
      console.log('Found problem set 6894 (numeric):', problemSet6894Num);
    } else {
      console.log('Problem set 6894 (numeric) not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

debugProblemSets(); 