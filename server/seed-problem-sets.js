import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codearena';

async function seedProblemSets() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const problemSetsCollection = db.collection('problemSets');
    
    // Clear existing problem sets
    await problemSetsCollection.deleteMany({});
    console.log('Cleared existing problem sets');
    
    // Sample problem sets that match the UI images
    const problemSets = [
      {
        id: new ObjectId().toString(),
        title: 'Array Two Pointers',
        description: 'Learn the two-pointer technique for efficient array processing',
        difficulty: 'medium',
        category: 'Data Structures & Algorithms',
        estimatedTime: 120,
        tags: ['arrays', 'two-pointers', 'optimization'],
        problems: [
          {
            id: new ObjectId().toString(),
            title: 'Reverse String',
            description: 'Write a function that reverses a string. The input string is given as an array of characters.',
            difficulty: 'easy',
            status: 'customized',
            basedOn: 'Reverse String',
            lastModified: '2025-06-30',
            points: 100,
            timeLimit: 1000,
            memoryLimit: 256,
            examples: [
              {
                input: '["h","e","l","l","o"]',
                output: '["o","l","l","e","h"]',
                explanation: 'Reverse the array in-place'
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
            }
          },
          {
            id: new ObjectId().toString(),
            title: 'Praneethh_HOD',
            description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
            difficulty: 'medium',
            status: 'customized',
            basedOn: 'Valid Parentheses',
            lastModified: '2025-07-23',
            points: 150,
            timeLimit: 1000,
            memoryLimit: 256,
            examples: [
              {
                input: '()',
                output: 'true',
                explanation: 'Simple valid parentheses'
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
            }
          },
          {
            id: new ObjectId().toString(),
            title: 'Problemm',
            description: 'Write a function that reverses a string. The input string is given as an array of characters.',
            difficulty: 'easy',
            status: 'customized',
            basedOn: 'Reverse String',
            lastModified: '2025-07-31',
            points: 100,
            timeLimit: 1000,
            memoryLimit: 256,
            examples: [
              {
                input: '["h","e","l","l","o"]',
                output: '["o","l","l","e","h"]',
                explanation: 'Reverse the array in-place'
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
            }
          },
          {
            id: new ObjectId().toString(),
            title: 'Probbbbbb',
            description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
            difficulty: 'easy',
            status: 'customized',
            basedOn: 'Two Sum123',
            lastModified: '2025-07-31',
            points: 100,
            timeLimit: 1000,
            memoryLimit: 256,
            examples: [
              {
                input: 'nums = [2,7,11,15], target = 9',
                output: '[0,1]',
                explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
              }
            ],
            testCases: [
              {
                input: '[2,7,11,15]\n9',
                expectedOutput: '[0,1]',
                isHidden: false
              }
            ],
            starterCode: {
              javascript: 'function twoSum(nums, target) {\n  // Your code here\n}',
              python: 'def twoSum(nums, target):\n    # Your code here\n    pass',
              java: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n    }\n}',
              cpp: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your code here\n    }\n};'
            }
          },
          {
            id: new ObjectId().toString(),
            title: 'sdfs',
            description: 'edrfghb',
            difficulty: 'easy',
            status: 'customized',
            basedOn: 'Reverse String',
            lastModified: '2025-08-03',
            setNotes: 'gh',
            points: 100,
            timeLimit: 1000,
            memoryLimit: 256,
            examples: [
              {
                input: '["h","e","l","l","o"]',
                output: '["o","l","l","e","h"]',
                explanation: 'Reverse the array in-place'
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
            }
          }
        ],
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: new ObjectId().toString(),
        title: 'String Processing',
        description: 'Master string manipulation and validation techniques',
        difficulty: 'easy',
        category: 'Data Structures & Algorithms',
        estimatedTime: 60,
        tags: ['strings', 'validation', 'processing'],
        problems: [
          {
            id: new ObjectId().toString(),
            title: 'Valid Palindrome',
            description: 'Given a string s, return true if it is a palindrome, or false otherwise.',
            difficulty: 'easy',
            status: 'customized',
            basedOn: 'Valid Palindrome',
            lastModified: '2025-07-15',
            points: 100,
            timeLimit: 1000,
            memoryLimit: 256,
            examples: [
              {
                input: '"A man, a plan, a canal: Panama"',
                output: 'true',
                explanation: '"amanaplanacanalpanama" is a palindrome.'
              }
            ],
            testCases: [
              {
                input: '"A man, a plan, a canal: Panama"',
                expectedOutput: 'true',
                isHidden: false
              }
            ],
            starterCode: {
              javascript: 'function isPalindrome(s) {\n  // Your code here\n}',
              python: 'def isPalindrome(s):\n    # Your code here\n    pass',
              java: 'class Solution {\n    public boolean isPalindrome(String s) {\n        // Your code here\n    }\n}',
              cpp: 'class Solution {\npublic:\n    bool isPalindrome(string s) {\n        // Your code here\n    }\n};'
            }
          }
        ],
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: new ObjectId().toString(),
        title: 'Mixed Fundamentals',
        description: 'A collection of fundamental programming problems',
        difficulty: 'easy',
        category: 'Data Structures & Algorithms',
        estimatedTime: 90,
        tags: ['arrays', 'fundamentals', 'beginner'],
        problems: [],
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: new ObjectId().toString(),
        title: 'Advanced Problems',
        description: 'Challenge yourself with these medium-level problems',
        difficulty: 'medium',
        category: 'Data Structures & Algorithms',
        estimatedTime: 120,
        tags: ['arrays', 'optimization', 'algorithms'],
        problems: [
          {
            id: new ObjectId().toString(),
            title: 'Container With Most Water',
            description: 'Given n non-negative integers height where each represents a point at coordinate (i, height[i]), find two lines that together with the x-axis form a container that would hold the maximum amount of water.',
            difficulty: 'medium',
            status: 'customized',
            basedOn: 'Container With Most Water',
            lastModified: '2025-07-20',
            points: 200,
            timeLimit: 1000,
            memoryLimit: 256,
            examples: [
              {
                input: '[1,8,6,2,5,4,8,3,7]',
                output: '49',
                explanation: 'The maximum area is obtained by choosing height[1] = 8 and height[8] = 7'
              }
            ],
            testCases: [
              {
                input: '[1,8,6,2,5,4,8,3,7]',
                expectedOutput: '49',
                isHidden: false
              }
            ],
            starterCode: {
              javascript: 'function maxArea(height) {\n  // Your code here\n}',
              python: 'def maxArea(height):\n    # Your code here\n    pass',
              java: 'class Solution {\n    public int maxArea(int[] height) {\n        // Your code here\n    }\n}',
              cpp: 'class Solution {\npublic:\n    int maxArea(vector<int>& height) {\n        // Your code here\n    }\n};'
            }
          }
        ],
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: new ObjectId().toString(),
        title: 'Complete Fundamentals',
        description: 'Master all fundamental problems in this comprehensive set',
        difficulty: 'easy',
        category: 'Data Structures & Algorithms',
        estimatedTime: 300,
        tags: ['arrays', 'strings', 'fundamentals'],
        problems: [
          {
            id: new ObjectId().toString(),
            title: 'Two Sum',
            description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
            difficulty: 'easy',
            status: 'customized',
            basedOn: 'Two Sum',
            lastModified: '2025-07-10',
            points: 100,
            timeLimit: 1000,
            memoryLimit: 256,
            examples: [
              {
                input: 'nums = [2,7,11,15], target = 9',
                output: '[0,1]',
                explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
              }
            ],
            testCases: [
              {
                input: '[2,7,11,15]\n9',
                expectedOutput: '[0,1]',
                isHidden: false
              }
            ],
            starterCode: {
              javascript: 'function twoSum(nums, target) {\n  // Your code here\n}',
              python: 'def twoSum(nums, target):\n    # Your code here\n    pass',
              java: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n    }\n}',
              cpp: 'class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Your code here\n    }\n};'
            }
          },
          {
            id: new ObjectId().toString(),
            title: 'Valid Parentheses',
            description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.',
            difficulty: 'easy',
            status: 'customized',
            basedOn: 'Valid Parentheses',
            lastModified: '2025-07-12',
            points: 100,
            timeLimit: 1000,
            memoryLimit: 256,
            examples: [
              {
                input: '()',
                output: 'true',
                explanation: 'Simple valid parentheses'
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
            }
          },
          {
            id: new ObjectId().toString(),
            title: 'Palindrome Number',
            description: 'Given an integer x, return true if x is a palindrome, and false otherwise.',
            difficulty: 'easy',
            status: 'customized',
            basedOn: 'Palindrome Number',
            lastModified: '2025-07-14',
            points: 100,
            timeLimit: 1000,
            memoryLimit: 256,
            examples: [
              {
                input: '121',
                output: 'true',
                explanation: '121 reads as 121 from left to right and from right to left.'
              }
            ],
            testCases: [
              {
                input: '121',
                expectedOutput: 'true',
                isHidden: false
              }
            ],
            starterCode: {
              javascript: 'function isPalindrome(x) {\n  // Your code here\n}',
              python: 'def isPalindrome(x):\n    # Your code here\n    pass',
              java: 'class Solution {\n    public boolean isPalindrome(int x) {\n        // Your code here\n    }\n}',
              cpp: 'class Solution {\npublic:\n    bool isPalindrome(int x) {\n        // Your code here\n    }\n};'
            }
          }
        ],
        participants: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Insert problem sets
    const result = await problemSetsCollection.insertMany(problemSets);
    console.log(`Inserted ${result.insertedCount} problem sets`);
    
    console.log('Problem sets seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding problem sets:', error);
  } finally {
    await client.close();
  }
}

// Run the seed function
seedProblemSets(); 