const mongoose = require('mongoose');
const { Contest } = require('../models/Contest');
const { ContestParticipant } = require('../models/ContestParticipant');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codearena', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function populateContestParticipants() {
  try {
    console.log('Starting population of contest participants...');
    
    // Get all contests
    const contests = await Contest.find({}).lean();
    console.log(`Found ${contests.length} contests`);
    
    let updatedContests = 0;
    
    for (const contest of contests) {
      console.log(`Processing contest: ${contest.title} (${contest.id})`);
      
      // Get all participants for this contest
      const participants = await ContestParticipant.find({ contestId: contest.id }).lean();
      console.log(`  Found ${participants.length} participants`);
      
      if (participants.length > 0) {
        // Extract user IDs from participants
        const userIds = participants.map(p => p.userId);
        
        // Update the contest with the participants array
        const result = await Contest.updateOne(
          { id: contest.id },
          { 
            $set: { 
              participants: userIds,
              updatedAt: new Date()
            }
          }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`  ✅ Updated contest with ${userIds.length} participants`);
          updatedContests++;
        } else {
          console.log(`  ⚠️  Contest already had participants or no changes needed`);
        }
      } else {
        console.log(`  ℹ️  No participants found for this contest`);
      }
    }
    
    console.log(`\nPopulation completed!`);
    console.log(`Total contests updated: ${updatedContests}`);
    
  } catch (error) {
    console.error('Population failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run population
populateContestParticipants(); 