import { ObjectId, Collection, Filter, UpdateFilter } from 'mongodb';
import { getDb, connectToMongoDB } from './db.js';
import { Submission } from './models/Submission.js';

// Problem Instance interface for isolated problem management
export interface ProblemInstance {
  id?: string; // Unique instance ID
  originalProblemId: number; // Use consistent numeric problem ID
  title?: string;
  description?: string;
  difficulty?: "easy" | "medium" | "hard";
  customTestCases?: any[];
  customExamples?: any[];
  customStarterCode?: any;
  timeLimit?: number;
  memoryLimit?: number;
  hints?: string[];
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  notes?: string;
  order: number;
  isCustomized: boolean;
  lastModified: Date;
  modifiedBy?: string;
}

// MongoDB document interfaces
export interface User {
  _id?: ObjectId;
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Problem {
  _id?: ObjectId;
  id: number;
  title: string;
  description: string;
  difficulty: string;
  tags?: string[];
  constraints?: string;
  examples?: any;
  testCases?: any;
  timeLimit?: number;
  memoryLimit?: number;
  starterCode?: any;
  isPublic: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Submission {
  _id?: ObjectId;
  id: number;
  problemId: number;
  problemInstanceId?: string; // Track specific problem instance
  problemSetId?: string; // Track which problem set this submission belongs to
  userId: string;
  code: string;
  language: string;
  status: string;
  runtime?: number;
  memory?: number;
  score?: string;
  feedback?: string;
  submittedAt: Date;
}

export interface Course {
  _id?: ObjectId;
  id: number;
  title: string;
  description?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours?: number;
  prerequisites?: string[];
  learningObjectives?: string[];
  problems?: number[];
  modules?: number[];
  enrolledUsers?: string[];
  isPublic: boolean;
  enableMarkComplete?: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  rating?: number;
  enrollmentCount?: number;
  completionRate?: number;
}

export interface CourseModule {
  _id?: ObjectId;
  id: number;
  courseId: number;
  title: string;
  description: string;
  order: number;
  textContent?: string;
  videoUrl?: string;
  codeExample?: string;
  language?: string;
  expectedOutput?: string;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseEnrollment {
  _id?: ObjectId;
  id: number;
  courseId: number;
  userId: string;
  completedModules: number[];
  progress: number;
  enrolledAt: Date;
  lastAccessedAt: Date;
  enrolledBy?: string;
  enrollmentType?: string; // Optional enrollment type
}

export interface ProblemSetEnrollment {
  _id?: ObjectId;
  id: number;
  problemSetId: string;
  userId: string;
  enrolledAt: Date;
  progress: number;
  completedProblems: number[];
  totalSubmissions: number;
  correctSubmissions: number;
  enrollmentType?: string; // Optional enrollment type
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export interface ModuleProgress {
  _id?: ObjectId;
  id: number;
  moduleId: number;
  userId: string;
  courseId: number;
  isCompleted: boolean;
  timeSpent: number;
  completedAt?: Date;
  notes?: string;
  bookmarked: boolean;
}

// Simplified interface for essential operations
export interface ProblemSet {
  _id?: ObjectId;
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  category?: string;
  tags?: string[];
  problemIds: string[];
  problemInstances?: ProblemInstance[];
  isPublic: boolean;
  estimatedTime?: number;
  totalProblems: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // Assignment-specific fields
  deadline?: Date;
  maxAttempts?: number;
  autoGrade?: boolean;
  questions?: any[];
  // New enrollment system
  participants?: string[];
  problems?: any[]; // Custom problems array
}

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Partial<User>): Promise<User>;
  
  // Problem operations
  getProblems(): Promise<Problem[]>;
  getProblem(id: number): Promise<Problem | undefined>;
  createProblem(problem: Partial<Problem>): Promise<Problem>;
  updateProblem(id: number, problemData: Partial<Problem>): Promise<Problem | null>;
  deleteProblem(id: number): Promise<void>;
  
  // Submission operations
  getSubmissions(userId: string, problemId?: number): Promise<Submission[]>;
  createSubmission(submission: Partial<Submission>): Promise<Submission>;
  
  // Course operations
  getCourses(): Promise<Course[]>;
  getCourse(id: number): Promise<Course | undefined>;
  createCourse(course: Partial<Course>): Promise<Course>;
  updateCourse(id: number, courseData: Partial<Course>): Promise<Course | null>;
  deleteCourse(id: number): Promise<void>;
  
  // Course module operations
  getCourseModules(courseId: number): Promise<CourseModule[]>;
  getCourseModule(id: number): Promise<CourseModule | undefined>;
  createCourseModule(module: Partial<CourseModule>): Promise<CourseModule>;
  updateCourseModule(id: number, moduleData: Partial<CourseModule>): Promise<CourseModule | null>;
  deleteCourseModule(id: number): Promise<void>;
  
  // Course enrollment operations
  getCourseEnrollments(courseId?: number, userId?: string): Promise<CourseEnrollment[]>;
  enrollUserInCourse(userId: string, courseId: number): Promise<CourseEnrollment>;
  getUserCourseProgress(userId: string, courseId: number): Promise<ModuleProgress[]>;
  markModuleComplete(userId: string, moduleId: number, courseId: number, timeSpent: number, notes?: string): Promise<void>;
  bookmarkModule(userId: string, moduleId: number): Promise<void>;
  // New: reset user course progress
  resetUserCourseProgress(userId: string, courseId: number): Promise<void>;
  
  // Problem Set operations
  getProblemSets(): Promise<ProblemSet[]>;
  getProblemSet(id: string): Promise<ProblemSet | undefined>;
  createProblemSet(problemSet: Partial<ProblemSet>): Promise<ProblemSet>;
  updateProblemSet(id: string, problemSetData: Partial<ProblemSet>): Promise<ProblemSet | null>;
  deleteProblemSet(id: string): Promise<void>;
  
  // Problem Set enrollment operations
  getProblemSetEnrollments(problemSetId: string): Promise<ProblemSetEnrollment[]>;
  enrollUserInProblemSet(userId: string, problemSetId: string): Promise<ProblemSetEnrollment>;
  updateProblemSetEnrollment(id: number, enrollmentData: Partial<ProblemSetEnrollment>): Promise<ProblemSetEnrollment | null>;
  deleteProblemSetEnrollment(id: number): Promise<void>;
  deleteProblemSetEnrollmentByUser(userId: string, problemSetId: string): Promise<void>;
  getUserProblemSetEnrollments(userId: string): Promise<ProblemSetEnrollment[]>;
  
  // Analytics operations
  getCourseStats(): Promise<any>;
  getAdminAnalytics(): Promise<any>;
  getAllSubmissions(): Promise<Submission[]>;
  getSubmissionStats(): Promise<any>;
  getProblemAnalytics(problemId: number): Promise<any>;
  getUserProblemAnalytics(userId: string, problemId: number): Promise<any>;
}

export class MemStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const db = getDb();
    try {
      const user = await db.collection('users').findOne(
        { id: id },
        { projection: { password: 0 } } // Don't return password
      );
      return user as User || undefined;
    } catch (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }
  }

    async updateUserRole(userId: string, role: string): Promise<User | null> {
      const db = getDb();
      try {
        // Support finding by either Mongo _id or legacy id field
        let match: any = { _id: new ObjectId(userId) };
        try {
          match = { _id: new ObjectId(userId) };
        } catch {
          match = { id: userId };
        }

        const update = { $set: { role, updatedAt: new Date() } };

        const result = await db.collection('users').findOneAndUpdate(
          match,
          update,
          { returnDocument: 'after' }
        );

        return (result as any)?.value || null;
      } catch (error) {
        console.error('Error updating user role:', error);
        return null;
      }
    }

    async deleteUser(userId: string): Promise<boolean> {
      const db = getDb();
      try {
        // Support deleting by either Mongo _id or legacy id field
        let deleteResult = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
        if (deleteResult.deletedCount === 0) {
          deleteResult = await db.collection('users').deleteOne({ id: userId });
        }
        return deleteResult.deletedCount > 0;
      } catch (error) {
        console.error('Error deleting user:', error);
        return false;
      }
    }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = getDb();
    try {
      const user = await db.collection('users').findOne({ email: email });
      return user as User || undefined;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return undefined;
    }
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const db = getDb();
    const newUser = {
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    try {
      const result = await db.collection('users').insertOne(newUser);
      return { ...newUser, _id: result.insertedId } as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  // Problem operations
  async getProblems(): Promise<Problem[]> {
    const db = getDb();
    try {
      const problems = await db.collection('problems')
        .find({ isPublic: true })
        .sort({ id: 1 })
        .toArray();
      
      if (problems.length === 0) {
        // Seed the database with fallback problems
        const fallbackProblems = this.getFallbackProblems();
        await db.collection('problems').insertMany(fallbackProblems);
        console.log('Seeded database with', fallbackProblems.length, 'problems');
        return fallbackProblems;
      }
      
      return problems as Problem[];
    } catch (error) {
      console.error('Error fetching problems:', error);
      return this.getFallbackProblems();
    }
  }

  private getFallbackProblems(): Problem[] {
    return [
      {
        id: 1,
        title: "Two Sum",
        description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        difficulty: "easy",
        tags: ["array", "hash-table"],
        timeLimit: 10000,
        memoryLimit: 1024,
        examples: [
          {
            input: "nums = [2,7,11,15], target = 9",
            output: "[0,1]",
            explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
          }
        ],
        testCases: [
          {
            input: "nums = [2,7,11,15], target = 9",
            expectedOutput: "[0,1]",
            isHidden: false
          }
        ],
        starterCode: {
          python: "def twoSum(nums, target):\n    # Your code here\n    pass",
          javascript: "function twoSum(nums, target) {\n    // Your code here\n}",
          java: "public int[] twoSum(int[] nums, int target) {\n    // Your code here\n    return new int[]{};\n}",
          cpp: "vector<int> twoSum(vector<int>& nums, int target) {\n    // Your code here\n    return {};\n}"
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: true
      },
      {
        id: 2,
        title: "Best Time to Buy and Sell Stock",
        description: "You are given an array prices where prices[i] is the price of a given stock on the ith day.",
        difficulty: "easy",
        tags: ["array", "dynamic-programming"],
        timeLimit: 10000,
        memoryLimit: 1024,
        examples: [
          {
            input: "prices = [7,1,5,3,6,4]",
            output: "5",
            explanation: "Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5."
          }
        ],
        testCases: [
          {
            input: "prices = [7,1,5,3,6,4]",
            expectedOutput: "5",
            isHidden: false
          }
        ],
        starterCode: {
          python: "def maxProfit(prices):\n    # Your code here\n    pass",
          javascript: "function maxProfit(prices) {\n    // Your code here\n}",
          java: "public int maxProfit(int[] prices) {\n    // Your code here\n    return 0;\n}",
          cpp: "int maxProfit(vector<int>& prices) {\n    // Your code here\n    return 0;\n}"
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: true
      },
      {
        id: 3,
        title: "Contains Duplicate",
        description: "Given an integer array nums, return true if any value appears at least twice in the array.",
        difficulty: "easy",
        tags: ["array", "hash-table"],
        timeLimit: 10000,
        memoryLimit: 256,
        examples: [
          {
            input: "nums = [1,2,3,1]",
            output: "true",
            explanation: "The element 1 occurs at indices 0 and 3."
          }
        ],
        testCases: [
          {
            input: "nums = [1,2,3,1]",
            expectedOutput: "true",
            isHidden: false
          }
        ],
        starterCode: {
          python: "def containsDuplicate(nums):\n    # Your code here\n    pass",
          javascript: "function containsDuplicate(nums) {\n    // Your code here\n}",
          java: "public boolean containsDuplicate(int[] nums) {\n    // Your code here\n    return false;\n}",
          cpp: "bool containsDuplicate(vector<int>& nums) {\n    // Your code here\n    return false;\n}"
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: true
      },
      {
        id: 4,
        title: "Valid Palindrome",
        description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.",
        difficulty: "easy",
        tags: ["two-pointers", "string"],
        timeLimit: 10000,
        memoryLimit: 1024,
        examples: [
          {
            input: "s = \"A man, a plan, a canal: Panama\"",
            output: "true",
            explanation: "\"amanaplanacanalpanama\" is a palindrome."
          }
        ],
        testCases: [
          {
            input: "s = \"A man, a plan, a canal: Panama\"",
            expectedOutput: "true",
            isHidden: false
          }
        ],
        starterCode: {
          python: "def isPalindrome(s):\n    # Your code here\n    pass",
          javascript: "function isPalindrome(s) {\n    // Your code here\n}",
          java: "public boolean isPalindrome(String s) {\n    // Your code here\n    return false;\n}",
          cpp: "bool isPalindrome(string s) {\n    // Your code here\n    return false;\n}"
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: true
      },
      {
        id: 5,
        title: "Container With Most Water",
        description: "You are given an integer array height of length n. Find two lines that together with the x-axis form a container that contains the most water.",
        difficulty: "medium",
        tags: ["array", "two-pointers"],
        timeLimit: 10000,
        memoryLimit: 1024,
        examples: [
          {
            input: "height = [1,8,6,2,5,4,8,3,7]",
            output: "49",
            explanation: "The max area of water the container can contain is 49."
          }
        ],
        testCases: [
          {
            input: "height = [1,8,6,2,5,4,8,3,7]",
            expectedOutput: "49",
            isHidden: false
          }
        ],
        starterCode: {
          python: "def maxArea(height):\n    # Your code here\n    pass",
          javascript: "function maxArea(height) {\n    // Your code here\n}",
          java: "public int maxArea(int[] height) {\n    // Your code here\n    return 0;\n}",
          cpp: "int maxArea(vector<int>& height) {\n    // Your code here\n    return 0;\n}"
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: true
      }
    ];
  }



  async getProblem(id: number): Promise<Problem | undefined> {
    const db = getDb();
    try {
      const problem = await db.collection('problems').findOne({ id: id });
      return problem as Problem || undefined;
    } catch (error) {
      console.error('Error fetching problem:', error);
      return undefined;
    }
  }

  async createProblem(problemData: Partial<Problem>): Promise<Problem> {
    const db = getDb();
    const newProblem = {
      id: Date.now(), // Simple ID generation
      createdAt: new Date(),
      updatedAt: new Date(),
      ...problemData,
    };
    
    try {
      const result = await db.collection('problems').insertOne(newProblem);
      return { ...newProblem, _id: result.insertedId } as Problem;
    } catch (error) {
      console.error('Error creating problem:', error);
      throw new Error('Failed to create problem');
    }
  }

  // Submission operations
  async getSubmissions(userId: string, problemId?: number): Promise<Submission[]> {
    const db = getDb();
    try {
      const filter: Filter<any> = { userId: userId };
      if (problemId) {
        filter.problemId = problemId;
      }
      
      const submissions = await db.collection('submissions')
        .find(filter)
        .sort({ submittedAt: -1 })
        .toArray();
      return submissions as Submission[];
    } catch (error) {
      console.error('Error fetching submissions:', error);
      return [];
    }
  }

  async createSubmission(submissionData: Partial<Submission>): Promise<Submission> {
    const db = getDb();
    const newSubmission = {
      id: Date.now(), // Simple ID generation
      ...submissionData,
      submittedAt: new Date(),
    };
    
    try {
      const result = await db.collection('submissions').insertOne(newSubmission);
      return { ...newSubmission, _id: result.insertedId } as Submission;
    } catch (error) {
      console.error('Error creating submission:', error);
      throw new Error('Failed to create submission');
    }
  }

  // Course operations
  async getCourses(): Promise<Course[]> {
    try {
      const db = await connectToMongoDB();
      const courses = await db.collection('courses')
        .find({})
        .sort({ id: 1 })
        .toArray();
      return courses as Course[];
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  }

  // New method to get courses visible to specific user based on enrollment
  async getCoursesForUser(userId: string, isAdmin: boolean = false): Promise<Course[]> {
    try {
      const db = await connectToMongoDB();
      
      if (isAdmin) {
        // Admin can see all courses (both public and private)
        const courses = await db.collection('courses')
          .aggregate([
            { $sort: { id: 1 } },
            {
              $lookup: {
                from: 'courseModules',
                localField: 'id',
                foreignField: 'courseId',
                as: 'modules'
              }
            },
            {
              $lookup: {
                from: 'courseEnrollments',
                localField: 'id',
                foreignField: 'courseId',
                as: 'enrollments'
              }
            },
            {
              $addFields: {
                moduleCount: { $size: { $ifNull: ['$modules', []] } },
                enrollmentCount: { $size: { $ifNull: ['$enrollments', []] } },
                estimatedHours: { $ifNull: ['$estimatedHours', { $sum: { $map: { input: { $ifNull: ['$modules', []] }, as: 'm', in: { $ifNull: ['$$m.estimatedHours', 0] } } } }] }
              }
            },
            { $project: { modules: 0, enrollments: 0 } }
          ])
          .toArray();
        return courses as Course[];
      }
      
      // For regular users, show ONLY enrolled PUBLIC courses
      // Private courses remain hidden even from enrolled users
      // Unenrolled users should not see any courses at all
      
      // Convert string userId to ObjectId for database lookup
      const userObjectId = new ObjectId(userId);
      
      // Get user's enrollments
      const enrollments = await db.collection('courseEnrollments')
        .find({ userId: userObjectId })
        .toArray();
      
      const enrolledCourseIds = enrollments.map((e: any) => e.courseId);
      
      // If user has no enrollments, return empty array
      if (enrolledCourseIds.length === 0) {
        return [];
      }
      
      // Show only enrolled courses that are PUBLIC (private courses remain hidden)
      const courses = await db.collection('courses')
        .aggregate([
          { $match: { id: { $in: enrolledCourseIds }, isPublic: true } },
          { $sort: { id: 1 } },
          {
            $lookup: {
              from: 'courseModules',
              localField: 'id',
              foreignField: 'courseId',
              as: 'modules'
            }
          },
          {
            $lookup: {
              from: 'courseEnrollments',
              localField: 'id',
              foreignField: 'courseId',
              as: 'enrollments'
            }
          },
          {
            $addFields: {
              moduleCount: { $size: { $ifNull: ['$modules', []] } },
              enrollmentCount: { $size: { $ifNull: ['$enrollments', []] } },
              estimatedHours: { $ifNull: ['$estimatedHours', { $sum: { $map: { input: { $ifNull: ['$modules', []] }, as: 'm', in: { $ifNull: ['$$m.estimatedHours', 0] } } } }] }
            }
          },
          { $project: { modules: 0, enrollments: 0 } }
        ])
        .toArray();
          
      return courses as Course[];
    } catch (error) {
      console.error('Error fetching courses for user:', error);
      return [];
    }
  }

  async createCourse(courseData: Partial<Course>): Promise<Course> {
    try {
      const db = await connectToMongoDB();
      const courseId = Date.now();
      
      // Extract modules from course data
      const { modules, ...courseOnlyData } = courseData as any;
      
      const newCourse = {
        id: courseId,
        ...courseOnlyData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log('Creating course with data:', newCourse);
      const result = await db.collection('courses').insertOne(newCourse);
      console.log('Course created successfully with ID:', result.insertedId);
      
      // Create separate module documents if modules exist
      if (modules && modules.length > 0) {
        console.log('Creating course modules:', modules);
        
        // Generate unique IDs using the same logic as createCourseModule
        const lastModule = await db.collection('coursemodules').findOne({}, { sort: { id: -1 } });
        let nextModuleId = (lastModule?.id || 0) + 1;
        
        const moduleDocuments = modules.map((module: any, index: number) => ({
          id: nextModuleId++, // Use consistent ID generation
          courseId: courseId,
          title: module.title,
          description: module.description,
          order: module.order || index + 1,
          textContent: module.textContent || '',
          videoUrl: module.videoUrl || '',
          codeExample: module.codeExample || '',
          language: module.language || '',
          expectedOutput: module.expectedOutput || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        
        await db.collection('coursemodules').insertMany(moduleDocuments);
        console.log('Course modules created successfully');
      }
      
      return { ...newCourse, _id: result.insertedId } as Course;
    } catch (error) {
      console.error('Error creating course:', error);
      throw new Error('Failed to create course');
    }
  }

  async getCourse(id: number): Promise<Course | undefined> {
    try {
      const db = await connectToMongoDB();
      const course = await db.collection('courses').findOne({ id: id });
      return course as Course | undefined;
    } catch (error) {
      console.error('Error fetching course:', error);
      return undefined;
    }
  }

  async getCourseModules(courseId: number): Promise<CourseModule[]> {
    try {
      const db = await connectToMongoDB();
      const modules = await db.collection('coursemodules')
        .find({ courseId: courseId })
        .sort({ order: 1 })
        .toArray();
      return modules as CourseModule[];
    } catch (error) {
      console.error('Error fetching course modules:', error);
      return [];
    }
  }

  // async getCourseEnrollments(courseId?: number, userId?: string): Promise<CourseEnrollment[]> {
  //   try {
  //     const db = getDb();
  //     let query: any = {};
      
  //     if (courseId !== undefined) {
  //       query.courseId = courseId;
  //     }
  //     if (userId !== undefined) {
  //       query.userId = userId;
  //     }
      
  //     console.log('[DEBUG] getCourseEnrollments query:', query);

  //     const enrollments = await db.collection('courseEnrollments')
  //     .find(query)
  //     .toArray();
  //     console.log('[DEBUG] Found enrollments:', enrollments);
      
  //     return enrollments as CourseEnrollment[];
  //   } catch (error) {
  //     console.error('Error fetching course enrollments:', error);
  //     return [];
  //   }
  // }


  async getCourseEnrollments(courseId?: number, userId?: string): Promise<CourseEnrollment[]> {

    try {
      const db = getDb();
      let query: any = {};
  
      if (courseId !== undefined) {
        query.courseId = courseId;
      }
  
      if (userId !== undefined) {
        // Convert string userId to ObjectId for database lookup
        query.userId = new ObjectId(userId);
      }
  
      console.log('[DEBUG] getCourseEnrollments query:', query);
  
      const populatedEnrollments = await db.collection('courseEnrollments').aggregate([
        // Match by courseId and/or userId (string match)
        { $match: query },
  
                // Lookup user by ObjectId (userId is already stored as ObjectId)
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              { $project: { firstName: 1, lastName: 1, email: 1 } }
            ]
          }
        },
  
        // Flatten the user array to a single object
        {
          $addFields: {
            user: { $arrayElemAt: ['$user', 0] }
          }
        },
  
        // Optionally remove the helper userIdObject field
        {
          $project: {
            userIdObject: 0
          }
        }
      ]).toArray();
  
      console.log('[DEBUG] Populated enrollments:', populatedEnrollments);
  
      return populatedEnrollments as CourseEnrollment[];
    } 
    catch (error) {
      console.error('Error fetching course enrollments:', error);
      return [];
    }
  }
  
  async updateCourse(id: number, courseData: Partial<Course>): Promise<Course | null> {
    const db = getDb();
    try {
      const result = await db.collection('courses').findOneAndUpdate(
        { id: id },
        { 
          $set: { 
            ...courseData, 
            updatedAt: new Date() 
          } 
        },
        { returnDocument: 'after' }
      );
      return result as Course | null;
    } catch (error) {
      console.error('Error updating course:', error);
      return null;
    }
  }

  // Stub methods for compatibility
  async getAdminAnalytics(): Promise<any> { 
    const db = getDb();
    try {
      const [users, problems, submissions, contests] = await Promise.all([
        db.collection('users').countDocuments(),
        db.collection('problems').countDocuments(),
        db.collection('submissions').countDocuments(),
        db.collection('contests').countDocuments()
      ]);

      // Get recent submissions with user details for activity feed
      const recentSubmissions = await db.collection('submissions')
        .aggregate([
          { $sort: { submittedAt: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: 'id',
              as: 'user'
            }
          },
          {
            $lookup: {
              from: 'problems',
              localField: 'problemId',
              foreignField: 'id',
              as: 'problem'
            }
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          { $unwind: { path: '$problem', preserveNullAndEmptyArrays: true } }
        ])
        .toArray();

      // Get submission stats by status
      const submissionStats = await db.collection('submissions')
        .aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ])
        .toArray();

      return {
        totalUsers: users,
        totalProblems: problems,
        totalSubmissions: submissions,
        activeContests: contests,
        submissionStats: submissionStats.reduce((acc: any, stat: any) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        recentActivity: recentSubmissions.map((sub: any) => ({
          id: sub.id,
          problemId: sub.problemId,
          problemTitle: sub.problem?.title || `Problem ${sub.problemId}`,
          userId: sub.userId,
          userName: sub.user ? `${sub.user.firstName} ${sub.user.lastName}` : 'Unknown User',
          language: sub.language,
          status: sub.status,
          timestamp: sub.submittedAt,
          runtime: sub.runtime,
          memory: sub.memory,
          score: sub.score
        }))
      };
    } catch (error) {
      console.error('Error fetching admin analytics:', error);
      return {
        totalUsers: 0,
        totalProblems: 0,
        totalSubmissions: 0,
        activeContests: 0,
        submissionStats: {},
        recentActivity: []
      };
    }
  }
  async getAllUsers(): Promise<User[]> { 
    const db = getDb();
    try {
      const users = await db.collection('users').find({}).toArray();
      return users.map(user => ({
        ...user,
        id: user._id.toString()
      })) as User[];
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }
  async getAssignments(): Promise<any[]> { 
    const db = getDb();
    try {
      // Get problem sets as assignments
      const problemSets = await db.collection('problemsets').find({}).toArray();
      
      // Transform problem sets to assignment format
      const assignments = problemSets.map((problemSet: any) => ({
        id: problemSet.id,
        title: problemSet.title,
        description: problemSet.description,
        courseTag: problemSet.category || 'General',
        deadline: problemSet.deadline,
        questions: problemSet.questions || [],
        maxAttempts: problemSet.maxAttempts || 3,
        isVisible: problemSet.isPublic,
        autoGrade: problemSet.autoGrade !== false,
        createdBy: problemSet.createdBy,
        createdAt: problemSet.createdAt,
        updatedAt: problemSet.updatedAt,
        // Add problem set specific fields
        difficulty: problemSet.difficulty,
        tags: problemSet.tags,
        // Recalculate totalProblems based on actual problem count
        totalProblems: problemSet.problemInstances?.length || 
                      problemSet.problems?.length || 
                      problemSet.problemIds?.length || 
                      0,
        estimatedTime: problemSet.estimatedTime,
        problemIds: problemSet.problemIds,
        problemInstances: problemSet.problemInstances,
        // Handle custom problems array
        problems: problemSet.problems,
        participants: problemSet.participants
      }));
      
      console.log('Transformed', assignments.length, 'problem sets to assignments');
      return assignments;
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  }
  async getGroups(): Promise<any[]> { 
    const db = getDb();
    try {
      const groups = await db.collection('groups').find({}).toArray();
      return groups;
    } catch (error) {
      console.error('Error fetching groups:', error);
      return [];
    }
  }
  async getAnnouncements(): Promise<any[]> { 
    const db = getDb();
    try {
      const announcements = await db.collection('announcements').find({}).toArray();
      return announcements;
    } catch (error) {
      console.error('Error fetching announcements:', error);
      return [];
    }
  }
  async getAllSubmissions(): Promise<Submission[]> {
    const db = getDb();
    try {
      const submissions = await db.collection('submissions')
        .aggregate([
          { $sort: { submittedAt: -1 } },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: 'id',
              as: 'user'
            }
          },
          {
            $lookup: {
              from: 'problems',
              localField: 'problemId',
              foreignField: 'id',
              as: 'problem'
            }
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          { $unwind: { path: '$problem', preserveNullAndEmptyArrays: true } }
        ])
        .toArray();

      return submissions.map((sub: any) => ({
        ...sub,
        userName: sub.user ? `${sub.user.firstName} ${sub.user.lastName}` : 'Unknown User',
        userEmail: sub.user?.email,
        problemTitle: sub.problem?.title || `Problem ${sub.problemId}`
      })) as Submission[];
    } catch (error) {
      console.error('Error fetching all submissions:', error);
      return [];
    }
  }

  async getSubmissionStats(): Promise<any> {
    const db = getDb();
    try {
      const stats = await db.collection('submissions')
        .aggregate([
          {
            $group: {
              _id: {
                status: '$status',
                language: '$language'
              },
              count: { $sum: 1 },
              avgRuntime: { $avg: '$runtime' },
              avgMemory: { $avg: '$memory' }
            }
          },
          {
            $group: {
              _id: '$_id.status',
              languages: {
                $push: {
                  language: '$_id.language',
                  count: '$count',
                  avgRuntime: '$avgRuntime',
                  avgMemory: '$avgMemory'
                }
              },
              totalCount: { $sum: '$count' }
            }
          }
        ])
        .toArray();

      return stats.reduce((acc: any, stat: any) => {
        acc[stat._id] = {
          count: stat.totalCount,
          languages: stat.languages
        };
        return acc;
      }, {});
    } catch (error) {
      console.error('Error fetching submission stats:', error);
      return {};
    }
  }

  async getProblemAnalytics(problemId: number): Promise<any> {
    const db = getDb();
    try {
      // Get all submissions for this problem with user details
      const submissions = await db.collection('submissions')
        .aggregate([
          { $match: { problemId: problemId } },
          {
          $addFields: {
            userIdObj: { $toObjectId: '$userId' }
          }
        },
          { $sort: { submittedAt: -1 } },
          {
            $lookup: {
              from: 'users',
              localField: 'userIdObj',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
        ])
        .toArray();

      // Get unique users who attempted this problem
      const userStats = submissions.reduce((acc: any, sub: any) => {
        console.log('Processing submission:', sub);
        const userId = sub.userIdObj;

        if (!acc[userId]) {
          acc[userId] = {
            userId: userId,
            userName: sub.user ? `${sub.user.firstName} ${sub.user.lastName}` : 'Unknown User',
            userEmail: sub.user?.email,
            totalAttempts: 0,
            passedAttempts: 0,
            failedAttempts: 0,
            bestScore: 0,
            lastAttempt: null,
            status: 'failed' // default to failed, will update if any passed
          };
        }
        
        acc[userId].totalAttempts++;
        if (sub.status === 'accepted') {
          acc[userId].passedAttempts++;
          acc[userId].status = 'passed';
        } else {
          acc[userId].failedAttempts++;
        }
        
        // Update best score and last attempt
        if (sub.score && parseFloat(sub.score) > acc[userId].bestScore) {
          acc[userId].bestScore = parseFloat(sub.score);
        }
        
        if (!acc[userId].lastAttempt || new Date(sub.submittedAt) > new Date(acc[userId].lastAttempt)) {
          acc[userId].lastAttempt = sub.submittedAt;
        }
        
        return acc;
      }, {});

      // Get problem details
      const problem = await db.collection('problems').findOne({ id: problemId });

      // Calculate overall stats
      const totalUsers = Object.keys(userStats).length;
      const passedUsers = Object.values(userStats).filter((user: any) => user.status === 'passed').length;
      const failedUsers = totalUsers - passedUsers;
      
      return {
        problemId,
        problemTitle: problem?.title || `Problem ${problemId}`,
        totalUsers,
        passedUsers,
        failedUsers,
        passRate: totalUsers > 0 ? Math.round((passedUsers / totalUsers) * 100) : 0,
        totalSubmissions: submissions.length,
        userStats: Object.values(userStats)
      };
    } catch (error) {
      console.error('Error fetching problem analytics:', error);
      return {
        problemId,
        problemTitle: `Problem ${problemId}`,
        totalUsers: 0,
        passedUsers: 0,
        failedUsers: 0,
        passRate: 0,
        totalSubmissions: 0,
        userStats: []
      };
    }
  };

  async getUserProblemAnalytics(userId: string, problemId: number): Promise<any> {
    const db = getDb();
    try {
      // Get all submissions for this user and problem
      const submissions = await db.collection('submissions')
        .find({ userId, problemId })
        .sort({ submittedAt: 1 }) // Chronological order
        .toArray();

      // Get user details
      const user = await db.collection('users').findOne({ id: userId });
      
      // Get problem details
      const problem = await db.collection('problems').findOne({ id: problemId });

      // Calculate analytics
      const totalAttempts = submissions.length;
      const passedAttempts = submissions.filter((sub: any) => sub.status === 'accepted').length;
      const failedAttempts = totalAttempts - passedAttempts;
      
      // Calculate best scores and performance
      const bestScore = submissions.reduce((max: number, sub: any) => {
        const score = parseFloat(sub.score || '0');
        return score > max ? score : max;
      }, 0);

      const averageRuntime = submissions
        .filter((sub: any) => sub.runtime)
        .reduce((sum: number, sub: any, _, arr: any[]) => {
          return sum + (sub.runtime / arr.length);
        }, 0);

      const averageMemory = submissions
        .filter((sub: any) => sub.memory)
        .reduce((sum: number, sub: any, _, arr: any[]) => {
          return sum + (sub.memory / arr.length);
        }, 0);

      // Track improvement over time
      const attempts = submissions.map((sub: any, index: number) => ({
        attemptNumber: index + 1,
        submittedAt: sub.submittedAt,
        status: sub.status,
        runtime: sub.runtime,
        memory: sub.memory,
        language: sub.language,
        score: sub.score,
        testCasesPassed: sub.feedback?.testCasesPassed || 0,
        totalTestCases: sub.feedback?.totalTestCases || 0
      }));

      return {
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
        userEmail: user?.email,
        problemId,
        problemTitle: problem?.title || `Problem ${problemId}`,
        totalAttempts,
        passedAttempts,
        failedAttempts,
        successRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
        bestScore,
        averageRuntime: Math.round(averageRuntime),
        averageMemory: Math.round(averageMemory),
        firstAttempt: submissions[0]?.submittedAt,
        lastAttempt: submissions[submissions.length - 1]?.submittedAt,
        attempts
      };
    } catch (error) {
      console.error('Error fetching user problem analytics:', error);
      return {
        userId,
        problemId,
        totalAttempts: 0,
        passedAttempts: 0,
        failedAttempts: 0,
        successRate: 0,
        attempts: []
      };
    }
  }

  // async getProblemAnalytics(problemId: number): Promise<any> {
  //   const db = getDb();
  //   try {
  //     // Get all submissions for this problem with user details
  //     const submissions = await db.collection('submissions')
  //       .aggregate([
  //         { $match: { problemId: problemId } },
  //         { $sort: { submittedAt: -1 } },
  //         {
  //           $lookup: {
  //             from: 'users',
  //             localField: 'userId',
  //             foreignField: 'id',
  //             as: 'user'
  //           }
  //         },
  //         { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
  //       ])
  //       .toArray();

  //     // Get unique users who attempted this problem
  //     const userStats = submissions.reduce((acc: any, sub: any) => {
  //       const userId = sub.userId;
  //       if (!acc[userId]) {
  //         acc[userId] = {
  //           userId: userId,
  //           userName: sub.user ? `${sub.user.firstName} ${sub.user.lastName}` : 'Unknown User',
  //           userEmail: sub.user?.email,
  //           totalAttempts: 0,
  //           passedAttempts: 0,
  //           failedAttempts: 0,
  //           bestScore: 0,
  //           lastAttempt: null,
  //           status: 'failed' // default to failed, will update if any passed
  //         };
  //       }
        
  //       acc[userId].totalAttempts++;
  //       if (sub.status === 'accepted') {
  //         acc[userId].passedAttempts++;
  //         acc[userId].status = 'passed';
  //       } else {
  //         acc[userId].failedAttempts++;
  //       }
        
  //       // Update best score and last attempt
  //       if (sub.score && parseFloat(sub.score) > acc[userId].bestScore) {
  //         acc[userId].bestScore = parseFloat(sub.score);
  //       }
        
  //       if (!acc[userId].lastAttempt || new Date(sub.submittedAt) > new Date(acc[userId].lastAttempt)) {
  //         acc[userId].lastAttempt = sub.submittedAt;
  //       }
        
  //       return acc;
  //     }, {});

  //     // Get problem details
  //     const problem = await db.collection('problems').findOne({ id: problemId });

  //     // Calculate overall stats
  //     const totalUsers = Object.keys(userStats).length;
  //     const passedUsers = Object.values(userStats).filter((user: any) => user.status === 'passed').length;
  //     const failedUsers = totalUsers - passedUsers;
      
  //     return {
  //       problemId,
  //       problemTitle: problem?.title || `Problem ${problemId}`,
  //       totalUsers,
  //       passedUsers,
  //       failedUsers,
  //       passRate: totalUsers > 0 ? Math.round((passedUsers / totalUsers) * 100) : 0,
  //       totalSubmissions: submissions.length,
  //       userStats: Object.values(userStats)
  //     };
  //   } catch (error) {
  //     console.error('Error fetching problem analytics:', error);
  //     return {
  //       problemId,
  //       problemTitle: `Problem ${problemId}`,
  //       totalUsers: 0,
  //       passedUsers: 0,
  //       failedUsers: 0,
  //       passRate: 0,
  //       totalSubmissions: 0,
  //       userStats: []
  //     };
  //   }
  // }



  async updateProblem(id: number, problemData: Partial<Problem>): Promise<Problem | null> {
    const db = getDb();
    try {
      const updateData = {
        ...problemData,
        updatedAt: new Date()
      };
      
      const result = await db.collection('problems').findOneAndUpdate(
        { id: id },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      return result as Problem || null;
    } catch (error) {
      console.error('Error updating problem:', error);
      return null;
    }
  }
  async deleteProblem(id: number): Promise<void> {
    const db = getDb();
    try {
      const result = await db.collection('problems').deleteOne({ id: id });
      if (result.deletedCount === 0) {
        throw new Error('Problem not found');
      }
      console.log(`[DEBUG] Problem ${id} deleted successfully`);
    } catch (error) {
      console.error('Error deleting problem:', error);
      throw error;
    }
  }
  async getUserSubmissionStats(userId?: string): Promise<any> {
    const db = getDb();
    if (!userId) return { total: 0, activeDays: 0, maxStreak: 0, byDate: {} };
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const base = await db.collection('submissions')
      .find({ userId: String(userId), submittedAt: { $gte: oneYearAgo }, status: 'accepted' })
      .project({ submittedAt: 1 })
      .toArray();
    const contests = await db.collection('contest_submissions')
      .find({ userId: String(userId), submissionTime: { $gte: oneYearAgo }, status: { $in: ['accepted', 'Accepted'] } })
      .project({ submissionTime: 1 })
      .toArray();
    const assignments = await db.collection('assignmentSubmissions')
      .find({ userId: String(userId), createdAt: { $gte: oneYearAgo }, status: 'accepted' })
      .project({ createdAt: 1 })
      .toArray();
    const submissions = [
      ...base.map((s:any)=>({ ts: s.submittedAt })),
      ...contests.map((s:any)=>({ ts: s.submissionTime })),
      ...assignments.map((s:any)=>({ ts: s.createdAt })),
    ];
    const byDate: Record<string, number> = {};
    for (const s of submissions) {
      const d = new Date((s as any).ts || new Date());
      const key = d.toISOString().slice(0,10);
      byDate[key] = (byDate[key] || 0) + 1;
    }
    const days = Object.keys(byDate).sort();
    // Compute streaks
    let maxStreak = 0; let currentStreak = 0; let prev: Date | null = null;
    for (const key of days) {
      const d = new Date(key + 'T00:00:00Z');
      if (prev) {
        const diff = (d.getTime() - prev.getTime()) / (1000*60*60*24);
        if (diff === 1) {
          currentStreak += 1;
        } else if (diff > 1) {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      maxStreak = Math.max(maxStreak, currentStreak);
      prev = d;
    }
    return {
      total: submissions.length,
      activeDays: days.length,
      maxStreak,
      byDate,
    };
  }
  async getContests(): Promise<any[]> { return []; }
  async getContest(): Promise<any> { return null; }
  async createContest(): Promise<any> { return null; }

  async deleteCourseModule(id: number): Promise<void> {
    try {
      const db = await connectToMongoDB();
      const result = await db.collection('coursemodules').deleteOne({ id: id });
      if (result.deletedCount === 0) {
        throw new Error('Module not found');
      }
      console.log(`Course module with id ${id} deleted successfully`);
    } catch (error) {
      console.error('Error deleting course module:', error);
      throw error;
    }
  }
  async deleteCourseEnrollment(): Promise<void> { }
  async deleteCourse(): Promise<void> { }
  async getCourseModule(id: number): Promise<CourseModule | undefined> {
    try {
      const db = await connectToMongoDB();
      const module = await db.collection('coursemodules').findOne({ id: id });
      return module as CourseModule || undefined;
    } catch (error) {
      console.error('Error fetching course module:', error);
      return undefined;
    }
  }
  async createCourseModule(moduleData: Partial<CourseModule>): Promise<CourseModule> {
    try {
      const db = await connectToMongoDB();
      
      // Generate unique ID using the same logic as course creation
      const lastModule = await db.collection('coursemodules').findOne({}, { sort: { id: -1 } });
      const nextId = (lastModule?.id || 0) + 1;
      
      const newModule = {
        id: nextId,
        ...moduleData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log('Creating course module with data:', newModule);
      const result = await db.collection('coursemodules').insertOne(newModule);
      console.log('Course module created successfully with ID:', result.insertedId);
      
      // Verify the module was created by fetching it
      const createdModule = await db.collection('coursemodules').findOne({ _id: result.insertedId });
      console.log('Verified created module:', createdModule);
      
      return { ...newModule, _id: result.insertedId } as CourseModule;
    } catch (error) {
      console.error('Error creating course module:', error);
      throw new Error('Failed to create course module');
    }
  }
  async updateCourseModule(id: number, moduleData: Partial<CourseModule>): Promise<CourseModule | null> {
    try {
      const db = await connectToMongoDB();
      const updateData = {
        ...moduleData,
        updatedAt: new Date(),
      };
      
      const result = await db.collection('coursemodules').findOneAndUpdate(
        { id: id },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      return result as CourseModule || null;
    } catch (error) {
      console.error('Error updating course module:', error);
      return null;
    }
  }
  // Course enrollment - Support both admin and self-enrollment
  async enrollUserInCourse(userId: string, courseId: number, enrolledBy?: string): Promise<CourseEnrollment> {
    try {
      const db = getDb();
      
      // Convert string userId to ObjectId for database storage
      const userObjectId = new ObjectId(userId);
      console.log('[DEBUG] Converting userId to ObjectId for DB storage:', userObjectId);
      
      // Check if already enrolled
      const existingEnrollment = await db.collection('courseEnrollments')
        .findOne({ courseId: courseId, userId: userObjectId });
      
      if (existingEnrollment) {
        console.log('[DEBUG] User already enrolled, returning existing enrollment');
        // Convert userId back to string for frontend compatibility
        return { 
          ...existingEnrollment, 
          userId: existingEnrollment.userId.toString() 
        } as CourseEnrollment;
      }
      
      // Create new enrollment with ObjectId in database
      const enrollmentData = {
        id: Date.now(),
        courseId: courseId,
        userId: userObjectId,
        completedModules: [],
        progress: 0,
        enrolledAt: new Date(),
        lastAccessedAt: new Date(),
        enrolledBy: enrolledBy,
        enrollmentType: enrolledBy ? 'admin' : 'qr' // Set enrollment type based on who enrolled
      };
      
      console.log('[DEBUG] Creating new enrollment with ObjectId:', enrollmentData);
      
      const result = await db.collection('courseEnrollments').insertOne(enrollmentData);
      console.log('[DEBUG] Enrollment created with ID:', result.insertedId);
      
      // Return with userId as string for frontend compatibility
      return { 
        ...enrollmentData, 
        _id: result.insertedId,
        userId: enrollmentData.userId.toString()
      } as CourseEnrollment;
    } catch (error) {
      console.error('Error enrolling user in course:', error);
      throw new Error('Failed to enroll user in course');
    }
  }

  // Check if user is enrolled in a course
  async isUserEnrolledInCourse(courseId: number, userId: string): Promise<boolean> {
    try {
      const db = await connectToMongoDB();
      // Convert string userId to ObjectId for database lookup
      const userObjectId = new ObjectId(userId);
      const enrollment = await db.collection('courseEnrollments')
        .findOne({ courseId: courseId, userId: userObjectId });
      return !!enrollment;
    } catch (error) {
      console.error('Error checking course enrollment:', error);
      return false;
    }
  }

  // Check if user can access a course (enrolled users can access any course they're enrolled in)
  async canUserAccessCourse(courseId: number, userId: string, isAdmin: boolean = false): Promise<boolean> {
    try {
      if (isAdmin) {
        return true; // Admin can access all courses
      }
      
      const db = await connectToMongoDB();
      
      // Check if user is enrolled - enrolled users can access both public and private courses
      // Convert string userId to ObjectId for database lookup
      const userObjectId = new ObjectId(userId);
      const enrollment = await db.collection('courseEnrollments')
        .findOne({ courseId: courseId, userId: userObjectId });
      
      if (enrollment) {
        return true; // User is enrolled, can access course
      }
      
      // If not enrolled, check if course is public for browsing
      const course = await db.collection('courses').findOne({ id: courseId });
      return course?.isPublic === true;
    } catch (error) {
      console.error('Error checking course access:', error);
      return false;
    }
  }

  // Remove user from course enrollment
  async removeUserFromCourse(courseId: number, userId: string): Promise<boolean> {
    try {
      const db = getDb();
      console.log('[DEBUG] Removing enrollment for courseId:', courseId, 'userId:', userId);
      
      // Convert string userId to ObjectId for database lookup
      const userObjectId = new ObjectId(userId);
      
      // Delete the enrollment record
      const enrollmentDelete = await db.collection('courseEnrollments')
        .deleteOne({ courseId: courseId, userId: userObjectId });
      
      // Also purge all module progress for this user in this course
      const progressDelete = await db.collection('moduleProgress')
        .deleteMany({ courseId: courseId, userId: userObjectId });
      
      console.log('[DEBUG] Enrollment deleted:', enrollmentDelete.deletedCount, 'Module progress deleted:', progressDelete.deletedCount);
      return (enrollmentDelete.deletedCount ?? 0) > 0;
    } catch (error) {
      console.error('Error removing user from course:', error);
      return false;
    }
  }
  async getUserCourseProgress(userId: string, courseId: number): Promise<ModuleProgress[]> {
    try {
      const db = getDb();
      // Convert string userId to ObjectId for database lookup
      const userObjectId = new ObjectId(userId);
      const progress = await db.collection('moduleProgress')
        .find({ courseId: courseId, userId: userObjectId })
        .toArray();
      return progress as ModuleProgress[];
    } catch (error) {
      console.error('Error fetching user course progress:', error);
      return [];
    }
  }

  async markModuleComplete(userId: string, moduleId: number, courseId: number, timeSpent: number = 0, notes?: string): Promise<void> {
    try {
      const db = getDb();
      
      console.log(`[DEBUG] markModuleComplete called - userId: ${userId}, moduleId: ${moduleId}, courseId: ${courseId}`);
      
      // Convert string userId to ObjectId for database storage
      const userObjectId = new ObjectId(userId);
      
      // Check if progress already exists for this specific user and module
      const existingProgress = await db.collection('moduleProgress')
        .findOne({ moduleId: moduleId, userId: userObjectId, courseId: courseId });
      
      if (existingProgress) {
        // Update existing progress for THIS USER ONLY - only if not already completed
        if (!existingProgress.isCompleted) {
          await db.collection('moduleProgress').updateOne(
            { moduleId: moduleId, userId: userObjectId, courseId: courseId },
            {
              $set: {
                isCompleted: true,
                timeSpent: (existingProgress.timeSpent || 0) + timeSpent,
                completedAt: new Date(),
                notes: notes || existingProgress.notes
              }
            }
          );
          console.log(`[DEBUG] Updated existing progress for user ${userId} on module ${moduleId}`);
          
          // Update enrollment progress for THIS USER ONLY after completing this module
          await this.updateUserCourseProgress(userId, courseId);
        } else {
          console.log(`[DEBUG] Module ${moduleId} already completed for user ${userId}`);
        }
      } else {
        // Create new progress record for THIS USER ONLY
        await db.collection('moduleProgress').insertOne({
          id: Date.now(),
          moduleId: moduleId,
          userId: userObjectId,
          courseId: courseId,
          isCompleted: true,
          timeSpent: timeSpent || 0,
          completedAt: new Date(),
          notes: notes || '',
          bookmarked: false
        });
        console.log(`[DEBUG] Created new progress record for user ${userId} on module ${moduleId}`);
        
        // Update enrollment progress for THIS USER ONLY after completing this module
        await this.updateUserCourseProgress(userId, courseId);
      }
    } catch (error) {
      console.error('Error marking module complete:', error);
      throw error;
    }
  }

  async updateUserCourseProgress(userId: string, courseId: number): Promise<void> {
    try {
      const db = getDb();
      
      // Ensure we query using ObjectId since userId is stored as ObjectId in DB
      const userObjectId = new ObjectId(userId);
      
      const enrollment = await db.collection('courseEnrollments')
        .findOne({ courseId: courseId, userId: userObjectId });
      
      if (enrollment) {
        // Get all modules for this course
        const courseModules = await db.collection('coursemodules')
          .find({ courseId: courseId }).toArray();
        
        // Get completed modules for THIS USER ONLY
        const completedModules = await db.collection('moduleProgress')
          .find({ courseId: courseId, userId: userObjectId, isCompleted: true }).toArray();
        
        const progressPercentage = courseModules.length > 0 
          ? Math.min(100, Math.round((completedModules.length / courseModules.length) * 100))
          : 0;
        
        // Get unique completed module IDs to prevent duplicates
        const uniqueCompletedModuleIds = [...new Set(completedModules.map(m => m.moduleId))];
        
        await db.collection('courseEnrollments').updateOne(
          { courseId: courseId, userId: userObjectId },
          {
            $set: {
              progress: progressPercentage,
              lastAccessedAt: new Date(),
              completedModules: uniqueCompletedModuleIds
            }
          }
        );
        console.log(`[DEBUG] Updated enrollment progress for user ${userId}: ${progressPercentage}% (${completedModules.length}/${courseModules.length} modules)`);
      }
    } catch (error) {
      console.error('Error updating user course progress:', error);
      throw error;
    }
  }
  async bookmarkModule(userId: string, moduleId: number): Promise<void> { }
  async getCourseStats(): Promise<any> { return {}; }
  async getLeaderboard(): Promise<any[]> { return []; }
  async getAssignment(id: number): Promise<any> { 
    try {
      console.log('Getting assignment by ID:', id);
      
      // Try to find by string ID first
      let problemSet = await this.getProblemSet(id.toString());
      
      // If not found, try to find by numeric ID
      if (!problemSet) {
        const problemSets = await this.getProblemSets();
        problemSet = problemSets.find(ps => ps.id === id.toString());
      }
      
      if (problemSet) {
        // Transform problem set to assignment format
        const assignment = {
          id: problemSet.id,
          title: problemSet.title,
          description: problemSet.description,
          courseTag: problemSet.category || 'General',
          deadline: problemSet.deadline,
          questions: problemSet.questions || [],
          maxAttempts: problemSet.maxAttempts || 3,
          isVisible: problemSet.isPublic,
          autoGrade: problemSet.autoGrade !== false,
          createdBy: problemSet.createdBy,
          createdAt: problemSet.createdAt,
          updatedAt: problemSet.updatedAt,
          // Add problem set specific fields
          difficulty: problemSet.difficulty,
          tags: problemSet.tags,
          // Recalculate totalProblems based on actual problem count
          totalProblems: problemSet.problemInstances?.length || 
                        problemSet.problems?.length || 
                        problemSet.problemIds?.length || 
                        0,
          estimatedTime: problemSet.estimatedTime,
          problemIds: problemSet.problemIds,
          problemInstances: problemSet.problemInstances
        };
        
        console.log('Found assignment:', assignment.title);
        return assignment;
      }
      
      console.log('Assignment not found');
      return null;
    } catch (error) {
      console.error('Error getting assignment:', error);
      return null;
    }
  }
  async createAssignment(assignmentData: any): Promise<any> { 
    try {
      console.log('Creating assignment as problem set:', assignmentData);
      
      // Transform assignment data to problem set format
      const problemSetData = {
        title: assignmentData.title,
        description: assignmentData.description,
        difficulty: assignmentData.difficulty || 'easy',
        category: assignmentData.courseTag || 'General',
        tags: assignmentData.tags || [],
        problemIds: [], // Will be populated when problems are added
        isPublic: assignmentData.isVisible !== false,
        estimatedTime: assignmentData.estimatedTime,
        totalProblems: 0,
        createdBy: assignmentData.createdBy,
        // Add assignment-specific fields
        deadline: assignmentData.deadline,
        maxAttempts: assignmentData.maxAttempts,
        autoGrade: assignmentData.autoGrade,
        questions: assignmentData.questions
      };
      
      const problemSet = await this.createProblemSet(problemSetData);
      console.log('Assignment created as problem set:', problemSet);
      return problemSet;
    } catch (error) {
      console.error('Error creating assignment:', error);
      throw error;
    }
  }
  async updateAssignment(): Promise<any> { return null; }
  async deleteAssignment(): Promise<void> { }
  async getAssignmentsByCourseTag(): Promise<any[]> { return []; }
  async getAssignmentSubmissions(assignmentId?: number, userId?: string): Promise<any[]> {
    const db = getDb();
    try {
      console.log(`[Storage] Fetching submissions for assignment ${assignmentId}, user ${userId}`);
      
      const query: any = {};
      
      // Map assignmentId to problemIds from problem set
      if (typeof assignmentId === 'number') {
        // Get the problem set to find all problem IDs for this assignment - try multiple approaches
        let problemSet = await db.collection('problemsets').findOne({ id: assignmentId.toString() });
        
        // If not found by string ID, try finding by position
        if (!problemSet) {
          const allProblemSets = await db.collection('problemsets').find().toArray();
          
          // Try to find by position (assignmentId - 1 for 0-based index)
          if (allProblemSets.length > 0 && assignmentId > 0 && assignmentId <= allProblemSets.length) {
            problemSet = allProblemSets[assignmentId - 1];
          }
        }
        if (problemSet && problemSet.problemInstances) {
          const problemIds = problemSet.problemInstances.map((pi: any) => pi.problemId);
          query.problemId = { $in: problemIds };
        } else {
          // Fallback to direct assignmentId mapping
          query.problemId = assignmentId;
        }
      }
      if (typeof userId === 'string') {
        query.userId = userId;
      }

      console.log(`[Storage] Query:`, query);

      // Use Mongoose Submission model with population
      const submissions = await Submission.find(query)
        .populate('problemId', 'title difficulty') // Populate problem details
        .populate('userId', 'firstName lastName email') // Populate user details
        .sort({ submittedAt: -1 })
        .lean(); // Convert to plain JavaScript objects for better performance

      console.log(`[Storage] Found ${submissions.length} submissions using Mongoose`);

      // Transform to match expected assignment submission format
      return submissions.map((sub: any) => {
        const problemInfo = sub.problemId ? {
          title: sub.problemId.title || `Problem ${sub.problemId._id}`,
          difficulty: sub.problemId.difficulty || 'medium'
        } : { 
          title: `Problem ${sub.problemId}`, 
          difficulty: 'medium' 
        };

        const userInfo = sub.userId ? {
          name: `${sub.userId.firstName || ''} ${sub.userId.lastName || ''}`.trim() || sub.userId.email || sub.userId._id,
          email: sub.userId.email
        } : {
          name: sub.userId || 'Unknown User',
          email: 'N/A'
        };

        return {
          id: sub._id || sub.id,
          assignmentId: parseInt(sub.problemId?.toString() || '0'),
          userId: userInfo.name,
          userEmail: userInfo.email,
          problemId: sub.problemId?._id || sub.problemId,
          problemTitle: problemInfo.title,
          problemDifficulty: problemInfo.difficulty,
          totalScore: parseFloat(sub.score || '0'),
          maxScore: 100, // Default max score
          status: sub.status === 'completed' ? 'completed' : 'in_progress',
          updatedAt: sub.submittedAt,
          createdAt: sub.submittedAt,
          // Additional fields from submission
          code: sub.code,
          language: sub.language,
          runtime: sub.runtime,
          memory: sub.memory,
          feedback: sub.feedback,
          testResults: sub.testResults
        };
      }) as any[];
    } catch (error) {
      console.error('Error fetching assignment submissions:', error);
      return [];
    }
  }

  async getUserAssignmentSubmission(assignmentId?: number, userId?: string): Promise<any> {
    const db = getDb();
    try {
      if (typeof assignmentId !== 'number' || typeof userId !== 'string') return null;
      const submission = await db.collection('assignmentSubmissions').findOne({ assignmentId, userId });
      return submission || null;
    } catch (error) {
      console.error('Error fetching user assignment submission:', error);
      return null;
    }
  }

  async updateAssignmentSubmission(id?: number, update?: Partial<any>): Promise<any> {
    const db = getDb();
    try {
      if (typeof id !== 'number') return null;

      const updateData = {
        ...(update || {}),
        updatedAt: new Date()
      };

      const result = await db.collection('assignmentSubmissions').findOneAndUpdate(
        { id },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      const updated = result as any;

      // Best-effort progress update
      try {
        if (updated?.assignmentId && updated?.userId) {
          await this.updateProblemSetEnrollmentProgress(String(updated.userId), Number(updated.assignmentId));
        }
      } catch (progressError) {
        console.error('[Storage] Failed to update enrollment progress after submission update:', progressError);
      }

      return updated || null;
    } catch (error) {
      console.error('Error updating assignment submission:', error);
      return null;
    }
  }

  async createAssignmentSubmission(data?: Partial<any>): Promise<any> {
    const db = getDb();
    try {
      if (!data) return null;

      // Generate next numeric ID
      const last = await db.collection('assignmentSubmissions').findOne({}, { sort: { id: -1 } });
      const nextId = ((last as any)?.id || 0) + 1;

      const submission = {
        id: nextId,
        assignmentId: Number(data.assignmentId),
        userId: String(data.userId),
        questionSubmissions: Array.isArray(data.questionSubmissions) ? data.questionSubmissions : [],
        totalScore: Number(data.totalScore || 0),
        maxScore: Number(data.maxScore || 0),
        status: data.status || 'in_progress',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.collection('assignmentSubmissions').insertOne(submission as any);

      // Best-effort progress update
      try {
        await this.updateProblemSetEnrollmentProgress(submission.userId, submission.assignmentId);
      } catch (progressError) {
        console.error('[Storage] Failed to update enrollment progress after submission create:', progressError);
      }

      return submission;
    } catch (error) {
      console.error('Error creating assignment submission:', error);
      return null;
    }
  }

  private async updateProblemSetEnrollmentProgress(userId: string, assignmentId: number): Promise<void> {
    const db = getDb();
    try {
      // Determine total questions for this assignment (problem set)
      let problemSet: any = await db.collection('problemsets').findOne({ id: assignmentId });
      if (!problemSet) {
        problemSet = await db.collection('problemsets').findOne({ id: String(assignmentId) });
      }
      if (!problemSet) return; // Cannot compute without assignment metadata

      const totalQuestions: number = Array.isArray(problemSet.questions)
        ? problemSet.questions.length
        : (problemSet.problemInstances?.length || 
           problemSet.problems?.length || 
           problemSet.problemIds?.length || 
           0);
      if (totalQuestions <= 0) return;

      // Get latest submission for this user/assignment
      const latest = await db.collection('assignmentSubmissions')
        .find({ assignmentId, userId })
        .sort({ updatedAt: -1 })
        .limit(1)
        .toArray();
      const latestSubmission = latest[0];
      if (!latestSubmission) return;

      const submissionsArray: any[] = Array.isArray(latestSubmission.questionSubmissions)
        ? latestSubmission.questionSubmissions
        : [];

      const answeredCount = submissionsArray.filter((q: any) => {
        return q && (q.answer !== undefined && q.answer !== null && String(q.answer).length > 0);
      }).length;

      const correctCount = submissionsArray.filter((q: any) => q && q.isCorrect === true).length;

      // Heuristic: if submitted/graded, use correctness ratio; else use answered ratio
      const isFinal = latestSubmission.status === 'submitted' || latestSubmission.status === 'graded';
      const ratio = isFinal ? (correctCount / totalQuestions) : (answeredCount / totalQuestions);
      const progress = Math.max(0, Math.min(100, Math.round(ratio * 100)));

      // Ensure an enrollment record exists in the fallback collection and update progress
      // Store userId as ObjectId for consistency
      const userObjectId = new ObjectId(userId);

      // Try match by string or numeric problemSetId
      const match: any = {
        userId: userObjectId,
        $or: [
          { problemSetId: assignmentId },
          { problemSetId: String(assignmentId) }
        ]
      };

      const existing = await db.collection('problemsetenrollments').findOne(match);
      if (existing) {
        await db.collection('problemsetenrollments').updateOne(
          { _id: existing._id },
          { $set: { progress, updatedAt: new Date() } }
        );
      } else {
        // Create an enrollment document if not present
        const lastEnrollment = await db.collection('problemsetenrollments').findOne({}, { sort: { id: -1 } });
        const nextEnrollmentId = ((lastEnrollment as any)?.id || 0) + 1;
        await db.collection('problemsetenrollments').insertOne({
          id: nextEnrollmentId,
          problemSetId: problemSet.id ?? assignmentId,
          userId: userObjectId,
          enrolledAt: new Date(),
          progress,
          completedProblems: [],
          totalSubmissions: 0,
          correctSubmissions: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('[Storage] Error updating problem set enrollment progress:', error);
    }
  }
  async getUserGroups(): Promise<any[]> { return []; }
  async createGroup(): Promise<any> { return null; }
  async getUserAnnouncements(): Promise<any[]> { return []; }
  async createAnnouncement(): Promise<any> { return null; }
  async registerForContest(): Promise<any> { return null; }
  async getContestParticipants(): Promise<any[]> { return []; }
  // removed duplicate stub updateUserRole (implemented above)

  // Problem Set operations
  async getProblemSets(): Promise<ProblemSet[]> {
    const db = getDb();
    try {
      // Get all problem sets, not just public ones
      const problemSets = await db.collection('problemsets')
        .find({})
        .sort({ createdAt: -1 })
        .toArray();
      
      if (problemSets.length === 0) {
        // Seed the database with fallback problem sets
        const fallbackSets = this.getFallbackProblemSets();
        await db.collection('problemsets').insertMany(fallbackSets);
        console.log('Seeded database with', fallbackSets.length, 'problem sets');
        return fallbackSets;
      }
      
      // Recalculate totalProblems for each problem set based on actual problem count
      const updatedProblemSets = problemSets.map((problemSet: any) => {
        const actualProblemCount = problemSet.problemInstances?.length || 
                                  problemSet.problems?.length || 
                                  problemSet.problemIds?.length || 
                                  0;
        
        return {
          ...problemSet,
          totalProblems: actualProblemCount
        };
      });
      
      console.log('Found', updatedProblemSets.length, 'problem sets in database');
      return updatedProblemSets as ProblemSet[];
    } catch (error) {
      console.error('Error fetching problem sets:', error);
      return [];
    }
  }

  async getProblemSet(id: string): Promise<ProblemSet | undefined> {
    const db = getDb();
    try {
      console.log('Looking for problem set with ID:', id);
      
      // Try to find by id field first (as string)
      let problemSet = await db.collection('problemsets').findOne({ id: id });
      
      // If not found, try to find by id field as number (for old problem sets)
      if (!problemSet) {
        console.log('Not found by string id, trying numeric id...');
        const numericId = parseInt(id);
        if (!isNaN(numericId)) {
          problemSet = await db.collection('problemsets').findOne({ id: numericId });
        }
      }
      
      // If not found, try to find by _id (MongoDB ObjectId)
      if (!problemSet) {
        console.log('Not found by id field, trying _id...');
        try {
          const { ObjectId } = require('mongodb');
          const objectId = new ObjectId(id);
          problemSet = await db.collection('problemsets').findOne({ _id: objectId });
        } catch (objectIdError: any) {
          console.log('Invalid ObjectId format:', objectIdError.message);
        }
      }
      
      if (problemSet) {
        console.log('Found problem set:', problemSet.title, 'with id:', problemSet.id, 'type:', typeof problemSet.id);
        console.log('Problem set structure:', Object.keys(problemSet));
        
        // Transform the database document to match our ProblemSet interface
        const transformedProblemSet: ProblemSet = {
          _id: problemSet._id,
          id: problemSet.id,
          title: problemSet.title,
          description: problemSet.description,
          difficulty: problemSet.difficulty,
          category: problemSet.category,
          tags: problemSet.tags || [],
          // Handle different problem structures
          problemIds: problemSet.problemIds || [],
          problemInstances: problemSet.problemInstances || [],
          isPublic: problemSet.isPublic !== false,
          estimatedTime: problemSet.estimatedTime,
          // Recalculate totalProblems based on actual problem count
          totalProblems: problemSet.problemInstances?.length || 
                        problemSet.problems?.length || 
                        problemSet.problemIds?.length || 
                        0,
          createdBy: problemSet.createdBy || '',
          createdAt: problemSet.createdAt,
          updatedAt: problemSet.updatedAt,
          // Assignment-specific fields
          deadline: problemSet.deadline,
          maxAttempts: problemSet.maxAttempts,
          autoGrade: problemSet.autoGrade,
          questions: problemSet.questions,
          // New enrollment system
          participants: problemSet.participants || [],
          problems: problemSet.problems || [],
          // Handle custom problems array if it exists
          ...(problemSet.problems && {
            problemInstances: problemSet.problems.map((problem: any, index: number) => ({
              id: problem.id || `instance_${index}`,
              originalProblemId: parseInt(problem.selectedProblemId) || 0,
              title: problem.title,
              description: problem.description,
              difficulty: problem.difficulty,
              constraints: problem.constraints,
              inputFormat: problem.inputFormat,
              outputFormat: problem.outputFormat,
              timeLimit: problem.timeLimit,
              memoryLimit: problem.memoryLimit,
              hints: [],
              notes: problem.setNotes,
              order: index,
              isCustomized: problem.status === 'customized',
              lastModified: new Date(problem.lastModified),
              modifiedBy: problem.modifiedBy,
              // Add custom fields
              customTestCases: problem.testCases,
              customExamples: [],
              customStarterCode: problem.starterCode
            }))
          })
        };
        
        console.log('Transformed problem set:', {
          id: transformedProblemSet.id,
          title: transformedProblemSet.title,
          problemInstances: transformedProblemSet.problemInstances?.length || 0
        });
        
        return transformedProblemSet;
      } else {
        console.log('Problem set not found with any ID format');
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching problem set:', error);
      return undefined;
    }
  }

  async createProblemSet(problemSetData: Partial<ProblemSet>): Promise<ProblemSet> {
    try {
      const db = getDb();
      const collection = db.collection<ProblemSet>('problemSets');
      
      const problemSet: ProblemSet = {
        id: `ps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: problemSetData.title || '',
        description: problemSetData.description,
        difficulty: problemSetData.difficulty || 'easy',
        category: problemSetData.category,
        tags: problemSetData.tags || [],
        problemIds: problemSetData.problemIds || [],
        problemInstances: problemSetData.problemInstances || [],
        isPublic: problemSetData.isPublic !== false,
        estimatedTime: problemSetData.estimatedTime,
        totalProblems: problemSetData.problemIds?.length || 0,
        createdBy: problemSetData.createdBy || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        // Assignment-specific fields
        deadline: problemSetData.deadline,
        maxAttempts: problemSetData.maxAttempts,
        autoGrade: problemSetData.autoGrade,
        questions: problemSetData.questions
      };
      
      console.log('Creating problem set with ID:', problemSet.id);
      
      await collection.insertOne(problemSet);
      return problemSet;
    } catch (error) {
      console.error('Error creating problem set:', error);
      throw error;
    }
  }

  async updateProblemSet(id: string, problemSetData: Partial<ProblemSet>): Promise<ProblemSet | null> {
    try {
      const db = getDb();
      const collection = db.collection<ProblemSet>('problemSets');
      
      console.log('Updating problem set:', id, 'with data:', {
        ...problemSetData,
        problemInstances: problemSetData.problemInstances ? `${problemSetData.problemInstances.length} instances` : 'no instances'
      });
      
      // First check if the document exists
      const existingDoc = await collection.findOne({ id: id });
      if (!existingDoc) {
        console.error('Problem set not found for update:', id);
        return null;
      }
      
      const updateData = {
        ...problemSetData,
        updatedAt: new Date()
      };
      
      console.log('Updating with data:', JSON.stringify(updateData, null, 2));
      
      const updateResult = await collection.updateOne(
        { id: id },
        { $set: updateData }
      );
      
      console.log('MongoDB update result:', updateResult.matchedCount, 'matched,', updateResult.modifiedCount, 'modified');
      
      if (updateResult.matchedCount === 0) {
        console.error('No document matched for update');
        return null;
      }
      
      // Get the updated document
      const result = await collection.findOne({ id: id });
      
      console.log('Problem set update result:', result ? 'success' : 'failed', result?.problemInstances?.length || 0, 'instances');
      
      // Verify the update worked by re-fetching
      const verifyDoc = await collection.findOne({ id: id });
      console.log('Verification - problem instances after update:', verifyDoc?.problemInstances?.length || 0);
      
      return result || null;
    } catch (error) {
      console.error('Error updating problem set:', error);
      return null;
    }
  }

  async deleteProblemSet(id: string): Promise<void> {
    const db = getDb();
    try {
      const result = await db.collection('problemsets').deleteOne({ id: id });
      if (result.deletedCount === 0) {
        throw new Error(`Problem set with id ${id} not found`);
      }
    } catch (error) {
      console.error('Error deleting problem set:', error);
      throw new Error('Failed to delete problem set');
    }
  }

  // Problem Set Enrollment operations
  async getProblemSetEnrollments(problemSetId: string): Promise<ProblemSetEnrollment[]> {
    const db = getDb();
    try {
      console.log('Fetching enrollments for problem set:', problemSetId);
      
      // First try to find enrollments in the problem set document itself (new system)
      const problemSet = await db.collection('problemsets').findOne({ 
        $or: [
          { id: problemSetId },
          { _id: new ObjectId(problemSetId) }
        ]
      });
      
      if (problemSet && problemSet.participants && problemSet.participants.length > 0) {
        console.log('Found participants in problem set document:', problemSet.participants.length);
        
        // Transform participants to enrollment format
        const enrollments = await Promise.all(problemSet.participants.map(async (participantId: string) => {
          const user = await db.collection('users').findOne({ _id: new ObjectId(participantId) });
          return {
            id: 0, // Use 0 for participants array enrollments
            problemSetId: problemSetId,
            userId: participantId,
            enrolledAt: new Date(),
            progress: 0,
            completedProblems: [],
            totalSubmissions: 0,
            correctSubmissions: 0,
            enrollmentType: problemSet.enrollmentType,
            user: user ? {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email
            } : undefined
          };
        }));
        
        return enrollments as ProblemSetEnrollment[];
      }
      
      // Fallback to old system (separate collection)
      const enrollments = await db.collection('problemsetenrollments')
        .aggregate([
          { 
            $match: { 
              $or: [
                { problemSetId: problemSetId },
                { problemSetId: parseInt(problemSetId) }
              ]
            } 
          },
          {
            $addFields: {
              userIdObject: { $toObjectId: '$userId' }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'userIdObject',
              foreignField: '_id',
              as: 'user',
              pipeline: [
                { $project: { firstName: 1, lastName: 1, email: 1 } }
              ]
            }
          },
          {
            $addFields: {
              user: { $arrayElemAt: ['$user', 0] }
            }
          }
        ])
        .toArray();
      
      console.log('Found enrollments in separate collection:', enrollments.map(e => ({ userId: e.userId, user: e.user })));
      return enrollments as ProblemSetEnrollment[];
    } catch (error) {
      console.error('Error fetching problem set enrollments:', error);
      return [];
    }
  }

  async enrollUserInProblemSet(userId: string, problemSetId: string): Promise<ProblemSetEnrollment> {
    const db = getDb();
    try {
      console.log('enrollUserInProblemSet called with:', { userId, problemSetId, userIdType: typeof userId });
      
      // Convert string userId to ObjectId for database storage
      const userObjectId = new ObjectId(userId);
      console.log('Converted userId to ObjectId for DB storage:', userObjectId);
      
       // First try to enroll in the problem set document itself (new system)
       console.log('Looking for problem set with ID:', problemSetId);
       
       // Try to find the problem set by string ID first (most common case)
       let problemSet = await db.collection('problemsets').findOne({ id: problemSetId });
       
       // If not found by string ID, try by ObjectId
       if (!problemSet) {
         console.log('Not found by string ID, trying ObjectId...');
         try {
           problemSet = await db.collection('problemsets').findOne({ _id: new ObjectId(problemSetId) });
         } catch (error) {
           console.log('ObjectId conversion failed, problemSetId is not a valid ObjectId');
         }
       }
      
      console.log('Problem set lookup result:', {
        found: !!problemSet,
        problemSetId: problemSet?.id,
        problemSetMongoId: problemSet?._id,
        currentParticipants: problemSet?.participants
      });
      
      if (problemSet) {
        console.log('Found problem set, checking for participants array');
        
        // Check if user is already enrolled in participants array
        const isAlreadyEnrolled = problemSet.participants && 
          problemSet.participants.includes(userId);
        
        if (isAlreadyEnrolled) {
          console.log('User already enrolled in participants array');
          return {
            id: 0,
            problemSetId: problemSetId,
            userId: userId,
            enrolledAt: new Date(),
            progress: 0,
            completedProblems: [],
            totalSubmissions: 0,
            correctSubmissions: 0,
            enrollmentType: problemSet.enrollmentType
          } as ProblemSetEnrollment;
        }
        
        // Add user to participants array
        console.log('Attempting to update problem set participants array:', {
          problemSetId: problemSet._id,
          userId: userId,
          currentParticipants: problemSet.participants
        });
        
         // Use the most reliable update method - updateOne with string ID
         console.log('Attempting to update participants array using updateOne...');
         const updateResult = await db.collection('problemsets').updateOne(
           { id: problemSet.id },
           { 
             $addToSet: { participants: userId },
             $set: { updatedAt: new Date() }
           }
         );
         
         console.log('Update result:', {
           matchedCount: updateResult.matchedCount,
           modifiedCount: updateResult.modifiedCount,
           acknowledged: updateResult.acknowledged
         });
         
         if (updateResult.modifiedCount === 0) {
           console.error('No documents were modified during update');
           throw new Error('Failed to update problem set participants array');
         }
         
         // Fetch the updated document to verify
         const updatedProblemSet = await db.collection('problemsets').findOne({ id: problemSet.id });
        
        console.log('Updated document verification:', {
          success: !!updatedProblemSet,
          updatedParticipants: updatedProblemSet?.participants,
          userId: userId
        });
        
        if (!updatedProblemSet) {
          throw new Error('Failed to fetch updated problem set after enrollment');
        }
        
        console.log('Successfully enrolled user in participants array');
        
        // Verify the enrollment by querying the database
        const verificationQuery = await db.collection('problemsets').findOne({ id: problemSet.id });
        console.log('Verification query result:', {
          found: !!verificationQuery,
          participants: verificationQuery?.participants,
          userId: userId,
          isUserInParticipants: verificationQuery?.participants?.includes(userId)
        });
        
        return {
          id: 0,
          problemSetId: problemSetId,
          userId: userId,
          enrolledAt: new Date(),
          progress: 0,
          completedProblems: [],
          totalSubmissions: 0,
          correctSubmissions: 0,
          enrollmentType: problemSet.enrollmentType
        } as ProblemSetEnrollment;
      }
      
      // Fallback to old system (separate collection)
      console.log('Using fallback enrollment system');
      
      // Check if user is already enrolled
      const existingEnrollment = await db.collection('problemsetenrollments')
        .findOne({ 
          userId: userObjectId, 
          $or: [
            { problemSetId: problemSetId },
            { problemSetId: parseInt(problemSetId) }
          ]
        });
      
      if (existingEnrollment) {
        // Convert userId back to string for frontend compatibility
        return { 
          ...existingEnrollment, 
          userId: existingEnrollment.userId.toString() 
        } as ProblemSetEnrollment;
      }

      // Get next ID
      const lastEnrollment = await db.collection('problemsetenrollments')
        .findOne({}, { sort: { id: -1 } });
      const nextId = (lastEnrollment?.id || 0) + 1;

      // Store userId as ObjectId in database
      const enrollment = {
        id: nextId,
        problemSetId: problemSetId,
        userId: userObjectId,
        enrolledAt: new Date(),
        progress: 0,
        completedProblems: [],
        totalSubmissions: 0,
        correctSubmissions: 0,
        enrollmentType: 'admin' // Set enrollment type as admin
      };

      const result = await db.collection('problemsetenrollments').insertOne(enrollment);
      
      // Return with userId as string for frontend compatibility
      return { 
        ...enrollment, 
        _id: result.insertedId,
        userId: enrollment.userId.toString()
      } as ProblemSetEnrollment;
    } catch (error) {
      console.error('Error enrolling user in problem set:', error);
      throw new Error('Failed to enroll user in problem set');
    }
  }

  async updateProblemSetEnrollment(id: number, enrollmentData: Partial<ProblemSetEnrollment>): Promise<ProblemSetEnrollment | null> {
    const db = getDb();
    try {
      const result = await db.collection('problemsetenrollments').findOneAndUpdate(
        { id: id },
        { 
          $set: {
            ...enrollmentData,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );
      
      return result as ProblemSetEnrollment || null;
    } catch (error) {
      console.error('Error updating problem set enrollment:', error);
      throw new Error('Failed to update problem set enrollment');
    }
  }

  async deleteProblemSetEnrollment(id: number): Promise<void> {
    const db = getDb();
    try {
      console.log('Deleting problem set enrollment with ID:', id);
      
      // First try to delete from the legacy collection
      const result = await db.collection('problemsetenrollments').deleteOne({ id: id });
      if (result.deletedCount > 0) {
        console.log('Successfully deleted enrollment from legacy collection');
        return;
      }
      
      // If not found in legacy collection, it might be in the participants array
      // We need to find which problem set has this enrollment and remove the user
      // Since participants array enrollments have id: 0, we need a different approach
      if (id === 0) {
        console.log('Cannot delete participants array enrollment by ID 0 - need userId and problemSetId');
        throw new Error('Cannot delete participants array enrollment without additional context');
      }
      
      throw new Error(`Problem set enrollment with id ${id} not found`);
    } catch (error) {
      console.error('Error deleting problem set enrollment:', error);
      throw new Error('Failed to delete problem set enrollment');
    }
  }

  async deleteProblemSetEnrollmentByUser(userId: string, problemSetId: string): Promise<void> {
    const db = getDb();
    try {
      console.log('Deleting enrollment for user:', userId, 'from problem set:', problemSetId);
      
      // First try to remove from participants array (new system)
      const problemSet = await db.collection('problemSets').findOne({ 
        $or: [
          { id: problemSetId },
          { _id: new ObjectId(problemSetId) }
        ]
      });
      
      if (problemSet && problemSet.participants && problemSet.participants.includes(userId)) {
        await db.collection('problemSets').updateOne(
          { _id: problemSet._id },
          { 
            $pull: { participants: userId } as any,
            $set: { updatedAt: new Date() }
          }
        );
        console.log('Successfully removed user from participants array');
        return;
      }
      
      // Fallback to legacy collection
      const userObjectId = new ObjectId(userId);
      const result = await db.collection('problemsetenrollments').deleteOne({ 
        userId: userObjectId,
        $or: [
          { problemSetId: problemSetId },
          { problemSetId: parseInt(problemSetId) }
        ]
      });
      
      if (result.deletedCount > 0) {
        console.log('Successfully deleted enrollment from legacy collection');
        return;
      }
      
      throw new Error(`Enrollment not found for user ${userId} in problem set ${problemSetId}`);
    } catch (error) {
      console.error('Error deleting problem set enrollment by user:', error);
      throw new Error('Failed to delete problem set enrollment');
    }
  }

  async getUserProblemSetEnrollments(userId: string): Promise<ProblemSetEnrollment[]> {
    const db = getDb();
    try {
      const enrollments = await db.collection('problemsetenrollments')
        .find({ userId: userId })
        .toArray();
      
      return enrollments as ProblemSetEnrollment[];
    } catch (error) {
      console.error('Error fetching user problem set enrollments:', error);
      return [];
    }
  }

  private getFallbackProblemSets(): ProblemSet[] {
    return [
    {
      id: "ps_1",
      title: "Array Fundamentals",
      description: "Master basic array operations, traversal, and simple algorithms",
      difficulty: "easy",
      category: "Data Structures & Algorithms",
      tags: ["arrays", "loops", "basic", "traversal"],
      problemIds: ["1", "2", "3"],
      isPublic: true,
      estimatedTime: 90,
      totalProblems: 5,
      createdBy: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      maxAttempts: 3,
      autoGrade: true,
      questions: []
    },
    {
      id: "ps_2", 
      title: "Array Two Pointers",
      description: "Learn the two-pointer technique for efficient array processing",
      difficulty: "medium",
      category: "Data Structures & Algorithms",
      tags: ["arrays", "two-pointers", "optimization"],
      problemIds: ["4", "5"],
      isPublic: true,
      estimatedTime: 120,
      totalProblems: 2,
      createdBy: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      maxAttempts: 3,
      autoGrade: true,
      questions: []
    },
    {
      id: "ps_3",
      title: "String Processing",
      description: "Master string manipulation and validation techniques",
      difficulty: "easy",
      category: "Data Structures & Algorithms", 
      tags: ["strings", "validation", "processing"],
      problemIds: ["3"],
      isPublic: true,
      estimatedTime: 60,
      totalProblems: 1,
      createdBy: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      maxAttempts: 3,
      autoGrade: true,
      questions: []
    },
    {
      id: "ps_4",
      title: "Mixed Fundamentals",
      description: "A collection of fundamental programming problems",
      difficulty: "easy",
      category: "Data Structures & Algorithms",
      tags: ["arrays", "fundamentals", "beginner"],
      problemIds: ["1", "2"],
      isPublic: true,
      estimatedTime: 90,
      totalProblems: 2,
      createdBy: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      maxAttempts: 3,
      autoGrade: true,
      questions: []
    },
    {
      id: "ps_5",
      title: "Advanced Problems",
      description: "Challenge yourself with these medium-level problems",
      difficulty: "medium",
      category: "Data Structures & Algorithms",
      tags: ["arrays", "optimization", "algorithms"],
      problemIds: ["5"],
      isPublic: true,
      estimatedTime: 120,
      totalProblems: 1,
      createdBy: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      maxAttempts: 3,
      autoGrade: true,
      questions: []
    },
    {
      id: "ps_6",
      title: "Complete Fundamentals",
      description: "Master all fundamental problems in this comprehensive set",
      difficulty: "easy",
      category: "Data Structures & Algorithms",
      tags: ["arrays", "strings", "fundamentals", "complete"],
      problemIds: ["1", "2", "3", "4", "5"],
      isPublic: true,
      estimatedTime: 300,
      totalProblems: 5,
      createdBy: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      maxAttempts: 3,
      autoGrade: true,
      questions: []
    }
    ];
  }

  async resetUserCourseProgress(userId: string, courseId: number): Promise<void> {
    try {
      const db = getDb();
      const userObjectId = new ObjectId(userId);

      // Delete all module progress docs for this user in this course
      await db.collection('moduleProgress').deleteMany({ courseId, userId: userObjectId });

      // Reset enrollment progress and completedModules
      await db.collection('courseEnrollments').updateOne(
        { courseId, userId: userObjectId },
        { $set: { progress: 0, completedModules: [], lastAccessedAt: new Date() } }
      );

      console.log(`[DEBUG] Reset progress for user ${userId} in course ${courseId}`);
    } catch (error) {
      console.error('Error resetting user course progress:', error);
      throw error;
    }
  }
}

export const storage = new MemStorage();
