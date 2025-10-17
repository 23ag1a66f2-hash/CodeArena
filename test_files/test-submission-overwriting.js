const fetch = require('node-fetch');

// Test submission overwriting for assignments
async function testSubmissionOverwriting() {
  const baseUrl = 'http://localhost:5000';
  
  // You'll need to replace these with actual values from your database
  const testData = {
    userId: "68492da8750063cc1c741a29", // From your example
    problemId: 2,
    problemInstanceId: "689f6790b23f7cb2a465017c", // From your example
    code: "def reverse_string(s):\n    return s[::-1]\n\ns = input().strip()\nresult = reverse_string(s)\nprint(result)",
    language: "python"
  };

  try {
    console.log('🧪 Testing submission overwriting for assignments...');
    console.log('Test data:', JSON.stringify(testData, null, 2));

    // First submission
    console.log('\n📝 Making first submission...');
    const response1 = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      },
      body: JSON.stringify(testData)
    });

    if (!response1.ok) {
      const error1 = await response1.json();
      console.error('❌ First submission failed:', error1);
      return;
    }

    const submission1 = await response1.json();
    console.log('✅ First submission successful:', {
      id: submission1.id,
      status: submission1.status,
      score: submission1.score
    });

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Second submission (should overwrite the first)
    console.log('\n📝 Making second submission (should overwrite first)...');
    const testData2 = {
      ...testData,
      code: "def reverse_string(s):\n    return s[::-1]  # Updated code\n\ns = input().strip()\nresult = reverse_string(s)\nprint(result)"
    };

    const response2 = await fetch(`${baseUrl}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      },
      body: JSON.stringify(testData2)
    });

    if (!response2.ok) {
      const error2 = await response2.json();
      console.error('❌ Second submission failed:', error2);
      return;
    }

    const submission2 = await response2.json();
    console.log('✅ Second submission successful:', {
      id: submission2.id,
      status: submission2.status,
      score: submission2.score,
      overwrote: submission2.id === submission1.id
    });

    if (submission2.id === submission1.id) {
      console.log('🎉 SUCCESS: Second submission overwrote the first one!');
    } else {
      console.log('❌ FAILED: Second submission created a new record instead of overwriting');
    }

    // Check if problemSetId was resolved
    if (submission2.problemSetId) {
      console.log('✅ problemSetId was resolved:', submission2.problemSetId);
    } else {
      console.log('❌ problemSetId was not resolved');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSubmissionOverwriting(); 