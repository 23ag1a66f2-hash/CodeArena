// Reset progress for course 4
const { MongoClient } = require('mongodb');

async function resetProgress() {
  const client = new MongoClient(process.env.DATABASE_URL || 'mongodb://localhost:27017/codearena');
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('Clearing module progress for course 4...');
    await db.collection('moduleProgress').deleteMany({ courseId: 4 });
    
    console.log('Resetting enrollment progress...');
    await db.collection('courseEnrollments').updateMany(
      { courseId: 4 },
      { $set: { progress: 0, completedModules: [] } }
    );
    
    console.log('Reset completed successfully!');
  } finally {
    await client.close();
  }
}

resetProgress().catch(console.error);