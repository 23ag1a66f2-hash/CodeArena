import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codearena';

async function seedProblems() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const problemsCollection = db.collection('problems');
    
    // Clear existing problems
    await problemsCollection.deleteMany({});
    console.log('Cleared existing problems');
    
    // Sample problems that match the submissions
    const problems = [
      {
        id: 1,
        title: "Reverse String",
        description: "Write a function that reverses a string. The input string is given as an array of characters.",
        difficulty: "easy",
        tags: ["strings", "arrays"],
        constraints: "1 <= s.length <= 10^5",
        examples: [
          {
            input: '["h","e","l","l","o"]',
            output: '["o","l","l","e","h"]',
            explanation: "Reverse the array in-place"
          }
        ],
        testCases: [
          {
            input: '["h","e","l","l","o"]',
            expectedOutput: '["o","l","l","e","h"]',
            isHidden: false
          }
        ],
        starterCode: {
          javascript: 'function reverseString(s) {\n  // Your code here\n}',
          python: 'def reverseString(s):\n    # Your code here\n    pass',
          java: 'class Solution {\n    public void reverseString(char[] s) {\n        // Your code here\n    }\n}',
          cpp: 'class Solution {\npublic:\n    void reverseString(vector<char>& s) {\n        // Your code here\n    }\n};'
        },
        timeLimit: 1000,
        memoryLimit: 256,
        isPublic: true,
        createdBy: "admin",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 2,
        title: "Valid Parentheses",
        description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
        difficulty: "medium",
        tags: ["stack", "strings"],
        constraints: "1 <= s.length <= 10^4",
        examples: [
          {
            input: '()',
            output: 'true',
            explanation: "Simple valid parentheses"
          }
        ],
        testCases: [
          {
            input: '()',
            expectedOutput: 'true',
            isHidden: false
          }
        ],
        starterCode: {
          javascript: 'function isValid(s) {\n  // Your code here\n}',
          python: 'def isValid(s):\n    # Your code here\n    pass',
          java: 'class Solution {\n    public boolean isValid(String s) {\n        // Your code here\n    }\n}',
          cpp: 'class Solution {\npublic:\n    bool isValid(string s) {\n        // Your code here\n    }\n};'
        },
        timeLimit: 1000,
        memoryLimit: 256,
        isPublic: true,
        createdBy: "admin",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 3,
        title: "String Reversal",
        description: "Write a function that reverses a string using Python string slicing.",
        difficulty: "easy",
        tags: ["strings", "python"],
        constraints: "1 <= len(s) <= 10^5",
        examples: [
          {
            input: '"hello"',
            output: '"olleh"',
            explanation: "Reverse the string using slicing"
          }
        ],
        testCases: [
          {
            input: '"hello"',
            expectedOutput: '"olleh"',
            isHidden: false
          }
        ],
        starterCode: {
          python: 'def reverseString(s):\n    # Your code here\n    pass',
          javascript: 'function reverseString(s) {\n  // Your code here\n}',
          java: 'class Solution {\n    public String reverseString(String s) {\n        // Your code here\n    }\n}',
          cpp: 'class Solution {\npublic:\n    string reverseString(string s) {\n        // Your code here\n    }\n};'
        },
        timeLimit: 1000,
        memoryLimit: 256,
        isPublic: true,
        createdBy: "admin",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Insert problems
    const result = await problemsCollection.insertMany(problems);
    console.log(`Inserted ${result.insertedCount} problems`);
    
    console.log('Problems seeded successfully!');
  } catch (error) {
    console.error('Error seeding problems:', error);
  } finally {
    await client.close();
  }
}

seedProblems();