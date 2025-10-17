import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codearena';

async function seedSubmissions() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const submissionsCollection = db.collection('submissions');
    
    // Clear existing submissions
    await submissionsCollection.deleteMany({});
    console.log('Cleared existing submissions');
    
    // Sample submissions for testing
    const submissions = [
      {
        id: 1,
        problemId: 1,
        userId: "user1",
        code: "function reverseString(s) { return s.reverse(); }",
        language: "javascript",
        status: "completed",
        runtime: 1500,
        memory: 45,
        score: "100.00",
        feedback: "Excellent solution!",
        submittedAt: new Date("2025-01-15T10:30:00Z"),
        testResults: [
          { testCase: 1, passed: true, output: "olleh" },
          { testCase: 2, passed: true, output: "dlrow" }
        ]
      },
      {
        id: 2,
        problemId: 1,
        userId: "user2",
        code: "function reverseString(s) { return s.split('').reverse().join(''); }",
        language: "javascript",
        status: "completed",
        runtime: 1200,
        memory: 42,
        score: "100.00",
        feedback: "Good solution with proper string handling",
        submittedAt: new Date("2025-01-15T11:15:00Z"),
        testResults: [
          { testCase: 1, passed: true, output: "olleh" },
          { testCase: 2, passed: true, output: "dlrow" }
        ]
      },
      {
        id: 3,
        problemId: 2,
        userId: "user1",
        code: "function isValid(s) { return true; }",
        language: "javascript",
        status: "completed",
        runtime: 800,
        memory: 38,
        score: "50.00",
        feedback: "Partially correct, needs improvement",
        submittedAt: new Date("2025-01-15T12:00:00Z"),
        testResults: [
          { testCase: 1, passed: true, output: "true" },
          { testCase: 2, passed: false, output: "true" }
        ]
      },
      {
        id: 4,
        problemId: 2,
        userId: "user3",
        code: "function isValid(s) { /* incomplete */ }",
        language: "python",
        status: "in_progress",
        runtime: 500,
        memory: 35,
        score: "0.00",
        feedback: "Incomplete solution",
        submittedAt: new Date("2025-01-15T13:45:00Z"),
        testResults: [
          { testCase: 1, passed: false, output: "undefined" },
          { testCase: 2, passed: false, output: "undefined" }
        ]
      },
      {
        id: 5,
        problemId: 3,
        userId: "user2",
        code: "def reverseString(s): return s[::-1]",
        language: "python",
        status: "completed",
        runtime: 900,
        memory: 40,
        score: "100.00",
        feedback: "Perfect Python solution!",
        submittedAt: new Date("2025-01-15T14:20:00Z"),
        testResults: [
          { testCase: 1, passed: true, output: "olleh" },
          { testCase: 2, passed: true, output: "dlrow" }
        ]
      },
      {
        id: 6,
        problemId: 1,
        userId: "user3",
        code: "function reverseString(s) { /* wrong approach */ }",
        language: "javascript",
        status: "failed",
        runtime: 2000,
        memory: 50,
        score: "0.00",
        feedback: "Incorrect approach, try again",
        submittedAt: new Date("2025-01-15T15:10:00Z"),
        testResults: [
          { testCase: 1, passed: false, output: "error" },
          { testCase: 2, passed: false, output: "error" }
        ]
      },
      {
        id: 7,
        problemId: 2,
        userId: "user2",
        code: "function isValid(s) { const stack = []; for (let char of s) { if (char === '(' || char === '{' || char === '[') { stack.push(char); } else { const last = stack.pop(); if (!last || (char === ')' && last !== '(') || (char === '}' && last !== '{') || (char === ']' && last !== '[')) { return false; } } } return stack.length === 0; }",
        language: "javascript",
        status: "completed",
        runtime: 1100,
        memory: 44,
        score: "100.00",
        feedback: "Excellent implementation with proper stack usage!",
        submittedAt: new Date("2025-01-15T16:30:00Z"),
        testResults: [
          { testCase: 1, passed: true, output: "true" },
          { testCase: 2, passed: true, output: "false" }
        ]
      },
      {
        id: 8,
        problemId: 3,
        userId: "user1",
        code: "def reverseString(s): return ''.join(reversed(s))",
        language: "python",
        status: "completed",
        runtime: 850,
        memory: 39,
        score: "100.00",
        feedback: "Good alternative approach using reversed()",
        submittedAt: new Date("2025-01-15T17:45:00Z"),
        testResults: [
          { testCase: 1, passed: true, output: "olleh" },
          { testCase: 2, passed: true, output: "dlrow" }
        ]
      }
    ];
    
    // Insert submissions
    const result = await submissionsCollection.insertMany(submissions);
    console.log(`Inserted ${result.insertedCount} submissions`);
    
    console.log('Submissions seeded successfully!');
  } catch (error) {
    console.error('Error seeding submissions:', error);
  } finally {
    await client.close();
  }
}

seedSubmissions(); 