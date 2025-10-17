
import { MongoClient } from 'mongodb';

// MongoDB connection URL
const MONGODB_URL = process.env.MONGODB_URL || "mongodb+srv://bandarin29:meritcurve@meritcurve.73u7fr7.mongodb.net/test";

async function checkProblems() {
  const client = new MongoClient(MONGODB_URL);
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully');
    
    const db = client.db();
    
    console.log('Checking problems collection...');
    
    // Count total problems
    const problemCount = await db.collection('problems').countDocuments();
    console.log(`Total problems in database: ${problemCount}`);
    
    if (problemCount > 0) {
      // Show all problems
      const problems = await db.collection('problems').find({}).toArray();
      console.log('\nProblems in database:');
      problems.forEach(problem => {
        console.log(`- ID: ${problem.id}, Title: ${problem.title}, Difficulty: ${problem.difficulty}`);
      });
    } else {
      console.log('No problems found in database. Run seed-problems.js to populate.');
    }
    
  } catch (error) {
    console.error('Error checking problems:', error);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

checkProblems();
