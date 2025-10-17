const fetch = require('node-fetch');

async function testProblems() {
  try {
    const response = await fetch('http://localhost:5000/api/admin/problems', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch problems:', response.status);
      return;
    }
    
    const problems = await response.json();
    console.log('First 3 problems:');
    problems.slice(0, 3).forEach((problem, index) => {
      console.log(`${index + 1}. ID: ${problem.id} (${typeof problem.id}), Title: ${problem.title}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

testProblems(); 