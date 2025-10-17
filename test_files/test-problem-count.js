const { MongoClient } = require('mongodb');

async function testProblemCount() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('codearena');
    const problemSets = await db.collection('problemSets').find({}).toArray();

    console.log(`Found ${problemSets.length} problem sets:`);

    problemSets.forEach((problemSet, index) => {
      const actualProblemCount = problemSet.problemInstances?.length || 
                                problemSet.problems?.length || 
                                problemSet.problemIds?.length || 
                                0;
      
      console.log(`\n${index + 1}. ${problemSet.title} (ID: ${problemSet.id})`);
      console.log(`   - Stored totalProblems: ${problemSet.totalProblems || 0}`);
      console.log(`   - Actual problemInstances: ${problemSet.problemInstances?.length || 0}`);
      console.log(`   - Actual problems array: ${problemSet.problems?.length || 0}`);
      console.log(`   - Actual problemIds: ${problemSet.problemIds?.length || 0}`);
      console.log(`   - Calculated total: ${actualProblemCount}`);
      console.log(`   - Match: ${(problemSet.totalProblems || 0) === actualProblemCount ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testProblemCount(); 