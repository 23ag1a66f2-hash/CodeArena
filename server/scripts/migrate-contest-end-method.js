const mongoose = require('mongoose');
const { Contest } = require('../models/Contest');
const { ContestParticipant } = require('../models/ContestParticipant');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codearena', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function migrateContestEndMethod() {
  try {
    console.log('Starting migration of contest end method...');
    
    // Get all contests
    const contests = await Contest.find({}).lean();
    console.log(`Found ${contests.length} contests`);
    
    let updatedParticipants = 0;
    
    for (const contest of contests) {
      console.log(`Processing contest: ${contest.title} (${contest.id})`);
      
      // Check if contest has ended by time
      const now = new Date();
      const contestEndTime = new Date(contest.endTime);
      const hasEndedByTime = now > contestEndTime;
      
      // Determine end method
      let endMethod = null;
      if (contest.contestEndMethod) {
        endMethod = contest.contestEndMethod;
      } else if (hasEndedByTime) {
        endMethod = 'time_expired';
      }
      
      if (endMethod) {
        // Update all participants for this contest
        const result = await ContestParticipant.updateMany(
          { contestId: contest.id },
          { 
            $set: { 
              contestEndMethod: endMethod,
              updatedAt: new Date()
            }
          }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`  Updated ${result.modifiedCount} participants with end method: ${endMethod}`);
          updatedParticipants += result.modifiedCount;
        }
        
        // Also update the contest if it doesn't have contestEndMethod set
        if (!contest.contestEndMethod && endMethod === 'time_expired') {
          await Contest.updateOne(
            { id: contest.id },
            { 
              $set: { 
                contestEndMethod: endMethod,
                updatedAt: new Date()
              }
            }
          );
          console.log(`  Updated contest with end method: ${endMethod}`);
        }
      } else {
        console.log(`  Contest is still active, no end method to set`);
      }
    }
    
    console.log(`\nMigration completed!`);
    console.log(`Total participants updated: ${updatedParticipants}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run migration
migrateContestEndMethod(); 