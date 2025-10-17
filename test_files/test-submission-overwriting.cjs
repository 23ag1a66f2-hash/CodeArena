const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codearena';

async function testSubmissionOverwriting() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Import models
    const { Submission } = require('../server/models/Submission');
    const { ProblemSet } = require('../server/models/ProblemSet');

    // Test data
    const testUserId = "68492da8750063cc1c741a29";
    const testProblemId = 2;
    const testProblemInstanceId = "689f6790b23f7cb2a465017c";

    console.log('\n=== Testing Submission Overwriting Logic ===');
    console.log(`User ID: ${testUserId}`);
    console.log(`Problem ID: ${testProblemId}`);
    console.log(`Problem Instance ID: ${testProblemInstanceId}`);

    // Find the problem set that contains this problem instance
    console.log('\n1. Finding problem set for the problem instance...');
    const problemSet = await ProblemSet.findOne({
      'problemInstances._id': testProblemInstanceId
    });

    if (problemSet) {
      const problemSetId = problemSet.id || problemSet._id;
      console.log(`✅ Found problem set: ${problemSetId}`);
      console.log(`   Title: ${problemSet.title}`);
      console.log(`   Problem instances count: ${problemSet.problemInstances?.length || 0}`);

      // Find existing submissions for this user and problem
      console.log('\n2. Finding existing submissions...');
      const existingSubmissions = await Submission.find({
        userId: testUserId,
        problemId: testProblemId,
        $or: [
          { problemInstanceId: testProblemInstanceId },
          { problemSetId: problemSetId }
        ]
      });

      console.log(`Found ${existingSubmissions.length} existing submissions:`);
      existingSubmissions.forEach((sub, index) => {
        console.log(`   ${index + 1}. Submission ID: ${sub.id}`);
        console.log(`      Status: ${sub.status}`);
        console.log(`      Problem Set ID: ${sub.problemSetId || 'MISSING'}`);
        console.log(`      Problem Instance ID: ${sub.problemInstanceId}`);
        console.log(`      Submitted: ${sub.submittedAt}`);
        console.log(`      Score: ${sub.score}`);
      });

      // Test the query logic that the controller uses
      console.log('\n3. Testing query logic...');
      
      // Query 1: By problemInstanceId
      const instanceQuery = { userId: testUserId, problemId: testProblemId, problemInstanceId: testProblemInstanceId };
      const instanceSubmission = await Submission.findOne(instanceQuery);
      console.log(`Query 1 (problemInstanceId): ${instanceSubmission ? `Found submission ${instanceSubmission.id}` : 'No submission found'}`);

      // Query 2: By problemSetId
      const setQuery = { userId: testUserId, problemId: testProblemId, problemSetId: problemSetId };
      const setSubmission = await Submission.findOne(setQuery);
      console.log(`Query 2 (problemSetId): ${setSubmission ? `Found submission ${setSubmission.id}` : 'No submission found'}`);

      // Query 3: Combined search
      const combinedQuery = {
        userId: testUserId,
        problemId: testProblemId,
        $or: [
          { problemInstanceId: testProblemInstanceId },
          { problemSetId: problemSetId }
        ]
      };
      const combinedSubmissions = await Submission.find(combinedQuery);
      console.log(`Query 3 (combined): Found ${combinedSubmissions.length} submissions`);

    } else {
      console.log('❌ No problem set found for the given problem instance ID');
    }

    // Check for submissions missing problemSetId
    console.log('\n4. Checking for submissions missing problemSetId...');
    const submissionsMissingProblemSetId = await Submission.find({
      problemInstanceId: { $exists: true, $ne: null },
      $or: [
        { problemSetId: { $exists: false } },
        { problemSetId: null }
      ]
    });

    console.log(`Found ${submissionsMissingProblemSetId.length} submissions missing problemSetId`);
    if (submissionsMissingProblemSetId.length > 0) {
      console.log('First few examples:');
      submissionsMissingProblemSetId.slice(0, 3).forEach((sub, index) => {
        console.log(`   ${index + 1}. Submission ID: ${sub.id}, User: ${sub.userId}, Problem: ${sub.problemId}, Instance: ${sub.problemInstanceId}`);
      });
    }

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
testSubmissionOverwriting(); 