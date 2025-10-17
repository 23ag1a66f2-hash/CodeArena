import { MongoClient } from 'mongodb';
import { ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codearena';

async function testEnrollment() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Test 1: Check if the problem set exists
    console.log('\n=== Test 1: Check Problem Set ===');
    const problemSet = await db.collection('problemSets').findOne({ 
      $or: [
        { id: '6894bac9fa3207e8de2039f7' },
        { _id: new ObjectId('6894bac9fa3207e8de2039f7') }
      ]
    });
    
    if (problemSet) {
      console.log('✅ Problem set found:', {
        id: problemSet.id,
        _id: problemSet._id,
        title: problemSet.title,
        participants: problemSet.participants || []
      });
    } else {
      console.log('❌ Problem set not found');
    }
    
    // Test 2: Check all problem sets
    console.log('\n=== Test 2: All Problem Sets ===');
    const allProblemSets = await db.collection('problemSets').find({}).toArray();
    console.log(`Found ${allProblemSets.length} problem sets:`);
    allProblemSets.forEach(ps => {
      console.log(`- ID: ${ps.id}, _ID: ${ps._id}, Title: ${ps.title}, Participants: ${ps.participants?.length || 0}`);
    });
    
    // Test 3: Check users
    console.log('\n=== Test 3: Check Users ===');
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ID: ${user._id}, Email: ${user.email}, Role: ${user.role}`);
    });
    
    // Test 4: Check old enrollment system
    console.log('\n=== Test 4: Old Enrollment System ===');
    const oldEnrollments = await db.collection('problemSetEnrollments').find({}).toArray();
    console.log(`Found ${oldEnrollments.length} old enrollments:`);
    oldEnrollments.forEach(enrollment => {
      console.log(`- ProblemSetId: ${enrollment.problemSetId}, UserId: ${enrollment.userId}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testEnrollment(); 