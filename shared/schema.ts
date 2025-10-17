import { z } from "zod";

// MongoDB-compatible schemas using Zod for validation
export const insertUserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().url().optional(),
  role: z.string().default("student"),
});

export const testCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  explanation: z.string().optional(),
  isHidden: z.boolean().default(false),
  timeLimit: z.number().optional(),
  memoryLimit: z.number().optional(),
});

export const starterCodeSchema = z.object({
  python: z.string().optional(),
  javascript: z.string().optional(),
  java: z.string().optional(),
  cpp: z.string().optional(),
  c: z.string().optional(),
});

export const exampleSchema = z.object({
  input: z.string(),
  output: z.string(),
  explanation: z.string().optional(),
});

export const insertProblemSchema = z.object({
  title: z.string(),
  description: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.array(z.string()).optional(),
  constraints: z.string().optional(),
  inputFormat: z.string(),
  outputFormat: z.string(),
  examples: z.array(exampleSchema).min(1),
  testCases: z.array(testCaseSchema).min(1),
  timeLimit: z.number().default(10000), // milliseconds
  memoryLimit: z.number().default(1024), // MB
  starterCode: starterCodeSchema,
  isPublic: z.boolean().default(true),
  createdBy: z.string().optional(),
  solutionCode: starterCodeSchema.optional(),
  notes: z.string().optional(), // Admin notes about the problem
  difficulty_rating: z.number().min(1).max(5).optional(), // More granular difficulty rating
});

// Enhanced submission schema for contests
export const insertSubmissionSchema = z.object({
  problemId: z.number(),
  userId: z.string(),
  code: z.string(),
  language: z.string(),
  status: z.string(),
  runtime: z.number().optional(),
  memory: z.number().optional(),
  score: z.string().optional(),
  feedback: z.string().optional(),
  
  // Contest-specific fields
  contestId: z.string().optional(), // for contest submissions
  contestProblemId: z.string().optional(), // contest problem instance ID
  points: z.number().optional(), // points earned
  submissionTime: z.date().default(() => new Date()),
  penalty: z.number().default(0), // penalty points
  isContestSubmission: z.boolean().default(false),
});

// Contest participation tracking
export const contestParticipantSchema = z.object({
  contestId: z.string(),
  userId: z.string(),
  registrationTime: z.date().default(() => new Date()),
  startTime: z.date().optional(), // when user started the contest
  endTime: z.date().optional(), // when user finished/left the contest
  totalScore: z.number().default(0),
  totalPenalty: z.number().default(0),
  rank: z.number().optional(),
  submissions: z.array(z.string()).default([]), // submission IDs
  problemsAttempted: z.array(z.string()).default([]), // problem IDs attempted
  problemsSolved: z.array(z.string()).default([]), // problem IDs solved
  isDisqualified: z.boolean().default(false),
  disqualificationReason: z.string().optional(),
  contestEndMethod: z.enum(['manually_ended', 'time_expired']).nullable().optional(),
});

// Contest Q&A system
export const contestQuestionSchema = z.object({
  id: z.string(),
  contestId: z.string(),
  userId: z.string(),
  problemId: z.string().optional(), // specific problem question
  question: z.string(),
  answer: z.string().optional(),
  isPublic: z.boolean().default(false), // if answer should be visible to all
  timestamp: z.date().default(() => new Date()),
  answeredBy: z.string().optional(), // admin who answered
  answeredAt: z.date().optional(),
  status: z.enum(["pending", "answered", "rejected"]).default("pending"),
});

// Contest analytics and reporting
export const contestAnalyticsSchema = z.object({
  contestId: z.string(),
  totalParticipants: z.number().default(0),
  totalSubmissions: z.number().default(0),
  problemStatistics: z.array(z.object({
    problemId: z.string(),
    totalAttempts: z.number(),
    successfulSolutions: z.number(),
    averageAttempts: z.number(),
    averageTime: z.number(), // in minutes
    mostFailedTestCase: z.string().optional(),
  })).default([]),
  participantEngagement: z.object({
    averageTimeSpent: z.number(), // in minutes
    peakParticipationTime: z.string().optional(),
    dropoffRate: z.number(), // percentage of users who left early
  }).optional(),
  generatedAt: z.date().default(() => new Date()),
});

// Contest problem with isolated modifications
export const contestProblemSchema = z.object({
  id: z.string(), // unique contest problem ID
  originalProblemId: z.number(), // reference to base problem
  title: z.string().optional(), // override title
  description: z.string().optional(), // override description
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  points: z.number().default(100), // custom points for this contest
  
  // Contest-specific overrides
  customTestCases: z.array(testCaseSchema).optional(),
  customExamples: z.array(exampleSchema).optional(),
  customStarterCode: starterCodeSchema.optional(),
  timeLimit: z.number().optional(), // override time limit
  memoryLimit: z.number().optional(), // override memory limit
  constraints: z.string().optional(),
  inputFormat: z.string().optional(),
  outputFormat: z.string().optional(),
  
  order: z.number().default(0), // position in contest
  maxSubmissions: z.number().optional(), // limit attempts
  partialScoring: z.boolean().default(false), // allow partial credit
});

// Enhanced contest schema with comprehensive features
export const insertContestSchema = z.object({
  // Basic Information
  title: z.string().min(1, "Contest title is required"),
  description: z.string().optional(),
  
  // Timing & Duration
  startTime: z.date(),
  endTime: z.date(),
  duration: z.number().optional(), // contest duration in minutes
  timeZone: z.string().default("UTC"),
  
  // Contest Type & Configuration
  type: z.enum(["coding", "algorithm", "competitive"]).default("coding"),
  visibility: z.enum(["public", "private", "unlisted"]).default("public"),
  accessControl: z.object({
    isPasswordProtected: z.boolean().default(false),
    password: z.string().optional(),
    inviteOnly: z.boolean().default(false),
    maxParticipants: z.number().optional(),
  }).default({}),
  
  // Problems & Scoring
  problems: z.array(contestProblemSchema).default([]),
  scoringMethod: z.enum(["maximum", "time_based", "partial", "acm_icpc"]).default("maximum"),
  tieBreakingRules: z.array(z.enum(["time", "submissions", "last_accepted"])).default(["time"]),
  
  // Penalties & Rules
  wrongSubmissionPenalty: z.number().default(0), // penalty per wrong submission
  timePenalty: z.boolean().default(false), // penalty based on submission time
  freezeLeaderboard: z.boolean().default(false),
  freezeTime: z.number().optional(), // minutes before end to freeze leaderboard
  
  // Security & Anti-Cheating
  securitySettings: z.object({
    disableInspect: z.boolean().default(true),
    disableCopyPaste: z.boolean().default(true),
    disableRightClick: z.boolean().default(true),
    disableExtensions: z.boolean().default(true),
    enablePlagiarismDetection: z.boolean().default(true),
    allowedLanguages: z.array(z.string()).default(["python", "javascript", "cpp", "java", "c"]),
  }).default({}),
  
  // Participant Management
  participants: z.array(z.string()).default([]),
  registrationOpen: z.boolean().default(true),
  registrationDeadline: z.date().optional(),
  allowLateRegistration: z.boolean().default(false),
  
  // Communication
  announcements: z.array(z.object({
    id: z.string(),
    message: z.string(),
    timestamp: z.date(),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    isGlobal: z.boolean().default(true), // visible to all participants
  })).default([]),
  enableQA: z.boolean().default(true),
  
  // Metadata
  createdBy: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  status: z.enum(["draft", "published", "active", "ended", "cancelled"]).default("draft"),
  
  // Rewards & Recognition
  prizePool: z.string().optional(),
  certificates: z.boolean().default(false),
  
  // Analytics
  enableAnalytics: z.boolean().default(true),
  allowReplay: z.boolean().default(true), // allow reviewing past contest
});

// Contest leaderboard entry
export const contestLeaderboardEntrySchema = z.object({
  contestId: z.string(),
  userId: z.string(),
  username: z.string(),
  rank: z.number(),
  totalScore: z.number(),
  totalPenalty: z.number(),
  problemsSolved: z.number(),
  lastSubmissionTime: z.date().optional(),
  contestEndMethod: z.enum(['manually_ended', 'time_expired']).nullable().optional(),
  submissions: z.array(z.object({
    problemId: z.string(),
    points: z.number(),
    attempts: z.number(),
    timeToSolve: z.number().optional(), // minutes from contest start
    penalty: z.number().default(0),
  })).default([]),
});

export const insertCourseSchema = z.object({
  title: z.string().min(1, "Course title is required"),
  description: z.string().optional(),
  isPublic: z.boolean().default(true),
  enableMarkComplete: z.boolean().default(true),
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  estimatedHours: z.number().min(1).default(1),
  prerequisites: z.array(z.string()).default([]),
  learningObjectives: z.array(z.string()).default([]),
  modules: z.array(z.object({
    title: z.string().min(1, "Module title is required"),
    description: z.string(),
    order: z.number(),
    textContent: z.string().optional(),
    videoUrl: z.string().optional(),
    codeExample: z.string().optional(),
    language: z.string().optional(),
    expectedOutput: z.string().optional(),
  })).default([]),
  tags: z.array(z.string()).default([]),
  problems: z.array(z.number()).optional(),
  enrolledUsers: z.array(z.string()).optional(),
  createdBy: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  enrollmentCount: z.number().default(0),
  completionRate: z.number().min(0).max(100).default(0),
});

export const insertCourseModuleSchema = z.object({
  courseId: z.number(),
  title: z.string().min(1, "Module title is required"),
  description: z.string().optional(),
  order: z.number().min(0, "Order must be non-negative"),
  textContent: z.string().optional(),
  videoUrl: z.string().url().optional(),
  codeExample: z.string().optional(),
  language: z.string().optional(),
  expectedOutput: z.string().optional(),
});

export const insertCourseEnrollmentSchema = z.object({
  courseId: z.number(),
  userId: z.string(),
  enrolledAt: z.date().default(() => new Date()),
  progress: z.number().min(0).max(100).default(0),
  completedModules: z.array(z.number()).default([]),
});

// Problem instance within a problem set - allows isolated modifications
export const problemInstanceSchema = z.object({
  id: z.string(), // unique instance ID (problemSetId_problemId_timestamp)
  originalProblemId: z.number(), // reference to base problem
  title: z.string().optional(), // override title for this set
  description: z.string().optional(), // override description for this set
  difficulty: z.enum(["easy", "medium", "hard"]).optional(), // override difficulty
  customTestCases: z.array(testCaseSchema).optional(), // additional test cases
  customExamples: z.array(exampleSchema).optional(), // additional examples
  customStarterCode: starterCodeSchema.optional(), // set-specific starter code
  timeLimit: z.number().optional(), // override time limit
  memoryLimit: z.number().optional(), // override memory limit
  hints: z.array(z.string()).optional(), // set-specific hints
  constraints: z.string().optional(), // override constraints
  inputFormat: z.string().optional(), // override input format
  outputFormat: z.string().optional(), // override output format
  notes: z.string().optional(), // additional notes for this set
  order: z.number().default(0), // position within the problem set
  isCustomized: z.boolean().default(false), // true if modified from original
  lastModified: z.date().default(() => new Date()),
  modifiedBy: z.string().optional(),
});

export const insertProblemSetSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  problemIds: z.array(z.string()).default([]), // legacy support
  problemInstances: z.array(problemInstanceSchema).default([]), // new isolated approach
  isPublic: z.boolean().default(true),
  estimatedTime: z.number().optional(),
  createdBy: z.string().optional(),
});

export const insertProblemSetEnrollmentSchema = z.object({
  problemSetId: z.number(),
  userId: z.string(),
  enrolledAt: z.date().default(() => new Date()),
  progress: z.number().min(0).max(100).default(0),
  completedProblems: z.array(z.number()).default([]),
  totalSubmissions: z.number().default(0),
  correctSubmissions: z.number().default(0),
});

export const insertUserProgressSchema = z.object({
  userId: z.string(),
  moduleId: z.number(),
  completedAt: z.date().default(() => new Date()),
  progress: z.number().min(0).max(100).default(0),
});

export const mcqOptionSchema = z.object({
  text: z.string(),
  isCorrect: z.boolean(),
});

export const assignmentQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["coding", "mcq", "text"]),
  title: z.string(),
  description: z.string(),
  points: z.number().min(0),
  // For coding questions
  starterCode: starterCodeSchema.optional(),
  testCases: z.array(testCaseSchema).optional(),
  // For MCQ questions
  options: z.array(mcqOptionSchema).optional(),
  // For text questions
  expectedAnswer: z.string().optional(),
});

export const insertAssignmentSchema = z.object({
  title: z.string().min(1, "Assignment title is required"),
  description: z.string().optional(),
  questions: z.array(assignmentQuestionSchema).min(1, "At least one question is required"),
  dueDate: z.date(),
  groups: z.array(z.string()).optional(),
  isPublic: z.boolean().default(false),
  createdBy: z.string(),
  maxAttempts: z.number().min(1).default(3),
  timeLimit: z.number().optional(), // in minutes
});

export const questionSubmissionSchema = z.object({
  questionId: z.string(),
  answer: z.string(),
  score: z.number().min(0).max(100),
  isCorrect: z.boolean(),
});

export const insertAssignmentSubmissionSchema = z.object({
  assignmentId: z.number(),
  userId: z.string(),
  questionSubmissions: z.array(questionSubmissionSchema),
  overallScore: z.number().min(0).max(100),
  submittedAt: z.date().default(() => new Date()),
  attemptNumber: z.number().min(1),
});

export const insertGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  members: z.array(z.string()).default([]),
  createdBy: z.string(),
  isActive: z.boolean().default(true),
});

export const insertContestParticipantSchema = z.object({
  contestId: z.number(),
  userId: z.string(),
  joinedAt: z.date().default(() => new Date()),
  rank: z.number().optional(),
  score: z.number().default(0),
});

export const insertAnnouncementSchema = z.object({
  title: z.string().min(1, "Announcement title is required"),
  content: z.string().min(1, "Announcement content is required"),
  targetGroups: z.array(z.string()).optional(),
  isGlobal: z.boolean().default(false),
  createdBy: z.string(),
  expiresAt: z.date().optional(),
  isActive: z.boolean().default(true),
});

// Type exports
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type InsertContest = z.infer<typeof insertContestSchema>;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type InsertAssignmentSubmission = z.infer<typeof insertAssignmentSubmissionSchema>;
export type AssignmentQuestion = z.infer<typeof assignmentQuestionSchema>;
export type QuestionSubmission = z.infer<typeof questionSubmissionSchema>;
export type MCQOption = z.infer<typeof mcqOptionSchema>;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type InsertContestParticipant = z.infer<typeof insertContestParticipantSchema>;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

export type TestCase = z.infer<typeof testCaseSchema>;
export type StarterCode = z.infer<typeof starterCodeSchema>;
export type Example = z.infer<typeof exampleSchema>;
export type ProblemInstance = z.infer<typeof problemInstanceSchema>;
export type InsertProblemSet = z.infer<typeof insertProblemSetSchema>;

// Enhanced contest type definitions
export type Contest = z.infer<typeof insertContestSchema>;
export type ContestProblem = z.infer<typeof contestProblemSchema>;
export type ContestParticipant = z.infer<typeof contestParticipantSchema>;
export type ContestQuestion = z.infer<typeof contestQuestionSchema>;
export type ContestAnalytics = z.infer<typeof contestAnalyticsSchema>;
export type ContestLeaderboardEntry = z.infer<typeof contestLeaderboardEntrySchema>;