const mongoose = require('mongoose');
const { Contest } = require('../models/Contest');
const { ContestParticipant } = require('../models/ContestParticipant');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codearena', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testParticipantRegistration() {
  try {
    console.log('Testing participant registration...');
    
    // Get a contest to test with
    const contest = await Contest.findOne({}).lean();
    if (!contest) {
      console.log('No contests found to test with');
      return;
    }
    
    console.log(`Testing with contest: ${contest.title} (${contest.id})`);
    console.log(`Current participants:`, contest.participants || []);
    
    // Test user ID (you can change this)
    const testUserId = 'test_user_123';
    
    // Check if user is already a participant
    const existingParticipant = await ContestParticipant.findOne({ 
      contestId: contest.id, 
      userId: testUserId 
    }).lean();
    
    if (existingParticipant) {
      console.log(`User ${testUserId} is already a participant`);
      console.log(`Participant data:`, existingParticipant);
    } else {
      console.log(`User ${testUserId} is not a participant yet`);
    }
    
    // Check current contest state
    const currentContest = await Contest.findOne({ id: contest.id }).lean();
    console.log(`Current contest participants:`, currentContest.participants || []);
    
    // Test adding a participant manually
    console.log('\n--- Testing manual participant addition ---');
    
    // Method 1: Try $addToSet
    try {
      const addResult = await Contest.updateOne(
        { id: contest.id },
        { 
          $addToSet: { participants: testUserId },
          $set: { updatedAt: new Date() }
        }
      );
      console.log(`$addToSet result:`, {
        matchedCount: addResult.matchedCount,
        modifiedCount: addResult.modifiedCount
      });
    } catch (error) {
      console.error(`$addToSet error:`, error.message);
    }
    
    // Method 2: Try $set with array
    try {
      const setResult = await Contest.updateOne(
        { id: contest.id },
        { 
          $set: { 
            participants: [testUserId],
            updatedAt: new Date() 
          }
        }
      );
      console.log(`$set result:`, {
        matchedCount: setResult.matchedCount,
        modifiedCount: setResult.modifiedCount
      });
    } catch (error) {
      console.error(`$set error:`, error.message);
    }
    
    // Check final state
    const finalContest = await Contest.findOne({ id: contest.id }).lean();
    console.log(`\nFinal contest participants:`, finalContest.participants || []);
    
    // Check if the field was added
    console.log(`\nContest document keys:`, Object.keys(finalContest));
    console.log(`Has participants field:`, 'participants' in finalContest);
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run test
testParticipantRegistration(); 