const { MongoClient } = require('mongodb');

async function testAnalyticsFix() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('codearena');
    
    // Get individual problems count
    const individualProblems = await db.collection('problems').countDocuments();
    console.log(`Individual problems: ${individualProblems}`);
    
    // Get problem sets and calculate problems in sets
    const problemSets = await db.collection('problemSets').find({}).toArray();
    let totalProblemsInSets = 0;
    
    console.log(`\nProblem Sets Analysis:`);
    problemSets.forEach((problemSet, index) => {
      const problemCount = problemSet.problemInstances?.length || 
                          problemSet.problems?.length || 
                          problemSet.problemIds?.length || 
                          0;
      totalProblemsInSets += problemCount;
      
      console.log(`${index + 1}. ${problemSet.title}:`);
      console.log(`   - problemInstances: ${problemSet.problemInstances?.length || 0}`);
      console.log(`   - problems array: ${problemSet.problems?.length || 0}`);
      console.log(`   - problemIds: ${problemSet.problemIds?.length || 0}`);
      console.log(`   - Total in this set: ${problemCount}`);
    });
    
    const expectedTotalProblems = individualProblems + totalProblemsInSets;
    
    console.log(`\nSummary:`);
    console.log(`- Individual problems: ${individualProblems}`);
    console.log(`- Problems in problem sets: ${totalProblemsInSets}`);
    console.log(`- Expected total problems: ${expectedTotalProblems}`);
    
    // Test the analytics endpoint
    console.log(`\nTesting analytics endpoint...`);
    const response = await fetch('http://localhost:5000/api/admin/analytics/summary', {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const analytics = await response.json();
      console.log(`Analytics endpoint returned: ${analytics.totalProblems} total problems`);
      console.log(`Expected: ${expectedTotalProblems}`);
      console.log(`Match: ${analytics.totalProblems === expectedTotalProblems ? '✅' : '❌'}`);
      
      if (analytics.totalProblems !== expectedTotalProblems) {
        console.log(`\nDebug info:`);
        console.log(`- Analytics response:`, analytics);
        console.log(`- Individual problems in DB: ${individualProblems}`);
        console.log(`- Problem sets in DB: ${problemSets.length}`);
        console.log(`- Problems in sets: ${totalProblemsInSets}`);
      }
    } else {
      console.log(`Analytics endpoint failed: ${response.status}`);
      const errorText = await response.text();
      console.log(`Error: ${errorText}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testAnalyticsFix(); 