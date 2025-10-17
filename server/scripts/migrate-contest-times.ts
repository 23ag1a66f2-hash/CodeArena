import mongoose from 'mongoose';
import { Contest } from '../models/Contest.js';

async function migrateContestTimes() {
  try {
    console.log('🚀 Starting contest time fields migration...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URL || "mongodb+srv://CodeArena:raghavmail@codearena.vl1ishe.mongodb.net/?retryWrites=true&w=majority&appName=CodeArena";
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    // Find all contests that don't have startTime or endTime
    const contests = await Contest.find({
      $or: [
        { startTime: { $exists: false } },
        { endTime: { $exists: false } }
      ]
    }).lean();
    
    console.log(`📊 Found ${contests.length} contests that need time fields`);
    
    let updatedCount = 0;
    
    for (const contest of contests) {
      try {
        // Set default times based on creation date
        const createdAt = new Date(contest.createdAt);
        const defaultStartTime = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000); // 1 day after creation
        const defaultEndTime = new Date(defaultStartTime.getTime() + 120 * 60 * 1000); // 2 hours duration
        
        const updateData: any = {};
        
        if (!contest.startTime) {
          updateData.startTime = defaultStartTime;
          console.log(`⏰ Adding startTime to contest ${contest.id}: ${defaultStartTime.toISOString()}`);
        }
        
        if (!contest.endTime) {
          updateData.endTime = defaultEndTime;
          console.log(`⏰ Adding endTime to contest ${contest.id}: ${defaultEndTime.toISOString()}`);
        }
        
        if (!contest.duration) {
          updateData.duration = 120; // 2 hours default
          console.log(`⏰ Adding duration to contest ${contest.id}: 120 minutes`);
        }
        
        if (!contest.timeZone) {
          updateData.timeZone = 'UTC';
          console.log(`⏰ Adding timeZone to contest ${contest.id}: UTC`);
        }
        
        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date();
          
          await Contest.updateOne(
            { id: contest.id },
            { $set: updateData }
          );
          
          updatedCount++;
          console.log(`✅ Updated contest ${contest.id}`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to update contest ${contest.id}:`, error);
      }
    }
    
    console.log(`🎉 Migration completed! Updated ${updatedCount} contests`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateContestTimes()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateContestTimes }; 