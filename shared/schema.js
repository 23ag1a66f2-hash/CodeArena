"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertAnnouncementSchema = exports.insertContestParticipantSchema = exports.insertGroupSchema = exports.insertAssignmentSubmissionSchema = exports.questionSubmissionSchema = exports.insertAssignmentSchema = exports.assignmentQuestionSchema = exports.mcqOptionSchema = exports.insertUserProgressSchema = exports.insertProblemSetEnrollmentSchema = exports.insertProblemSetSchema = exports.problemInstanceSchema = exports.insertCourseEnrollmentSchema = exports.insertCourseModuleSchema = exports.insertCourseSchema = exports.contestLeaderboardEntrySchema = exports.insertContestSchema = exports.contestProblemSchema = exports.contestAnalyticsSchema = exports.contestQuestionSchema = exports.contestParticipantSchema = exports.insertSubmissionSchema = exports.insertProblemSchema = exports.exampleSchema = exports.starterCodeSchema = exports.testCaseSchema = exports.insertUserSchema = void 0;
const zod_1 = require("zod");
// MongoDB-compatible schemas using Zod for validation
exports.insertUserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email().optional(),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    profileImageUrl: zod_1.z.string().url().optional(),
    role: zod_1.z.string().default("student"),
});
exports.testCaseSchema = zod_1.z.object({
    input: zod_1.z.string(),
    expectedOutput: zod_1.z.string(),
    explanation: zod_1.z.string().optional(),
    isHidden: zod_1.z.boolean().default(false),
    timeLimit: zod_1.z.number().optional(),
    memoryLimit: zod_1.z.number().optional(),
});
exports.starterCodeSchema = zod_1.z.object({
    python: zod_1.z.string().optional(),
    javascript: zod_1.z.string().optional(),
    java: zod_1.z.string().optional(),
    cpp: zod_1.z.string().optional(),
    c: zod_1.z.string().optional(),
});
exports.exampleSchema = zod_1.z.object({
    input: zod_1.z.string(),
    output: zod_1.z.string(),
    explanation: zod_1.z.string().optional(),
});
exports.insertProblemSchema = zod_1.z.object({
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    difficulty: zod_1.z.enum(["easy", "medium", "hard"]),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    constraints: zod_1.z.string().optional(),
    inputFormat: zod_1.z.string(),
    outputFormat: zod_1.z.string(),
    examples: zod_1.z.array(exports.exampleSchema).min(1),
    testCases: zod_1.z.array(exports.testCaseSchema).min(1),
    timeLimit: zod_1.z.number().default(10000), // milliseconds
    memoryLimit: zod_1.z.number().default(1024), // MB
    starterCode: exports.starterCodeSchema,
    isPublic: zod_1.z.boolean().default(true),
    createdBy: zod_1.z.string().optional(),
    solutionCode: exports.starterCodeSchema.optional(),
    notes: zod_1.z.string().optional(), // Admin notes about the problem
    difficulty_rating: zod_1.z.number().min(1).max(5).optional(), // More granular difficulty rating
});
// Enhanced submission schema for contests
exports.insertSubmissionSchema = zod_1.z.object({
    problemId: zod_1.z.number(),
    userId: zod_1.z.string(),
    code: zod_1.z.string(),
    language: zod_1.z.string(),
    status: zod_1.z.string(),
    runtime: zod_1.z.number().optional(),
    memory: zod_1.z.number().optional(),
    score: zod_1.z.string().optional(),
    feedback: zod_1.z.string().optional(),
    // Contest-specific fields
    contestId: zod_1.z.string().optional(), // for contest submissions
    contestProblemId: zod_1.z.string().optional(), // contest problem instance ID
    points: zod_1.z.number().optional(), // points earned
    submissionTime: zod_1.z.date().default(() => new Date()),
    penalty: zod_1.z.number().default(0), // penalty points
    isContestSubmission: zod_1.z.boolean().default(false),
});
// Contest participation tracking
exports.contestParticipantSchema = zod_1.z.object({
    contestId: zod_1.z.string(),
    userId: zod_1.z.string(),
    registrationTime: zod_1.z.date().default(() => new Date()),
    startTime: zod_1.z.date().optional(), // when user started the contest
    endTime: zod_1.z.date().optional(), // when user finished/left the contest
    totalScore: zod_1.z.number().default(0),
    totalPenalty: zod_1.z.number().default(0),
    rank: zod_1.z.number().optional(),
    submissions: zod_1.z.array(zod_1.z.string()).default([]), // submission IDs
    problemsAttempted: zod_1.z.array(zod_1.z.string()).default([]), // problem IDs attempted
    problemsSolved: zod_1.z.array(zod_1.z.string()).default([]), // problem IDs solved
    isDisqualified: zod_1.z.boolean().default(false),
    disqualificationReason: zod_1.z.string().optional(),
});
// Contest Q&A system
exports.contestQuestionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    contestId: zod_1.z.string(),
    userId: zod_1.z.string(),
    problemId: zod_1.z.string().optional(), // specific problem question
    question: zod_1.z.string(),
    answer: zod_1.z.string().optional(),
    isPublic: zod_1.z.boolean().default(false), // if answer should be visible to all
    timestamp: zod_1.z.date().default(() => new Date()),
    answeredBy: zod_1.z.string().optional(), // admin who answered
    answeredAt: zod_1.z.date().optional(),
    status: zod_1.z.enum(["pending", "answered", "rejected"]).default("pending"),
});
// Contest analytics and reporting
exports.contestAnalyticsSchema = zod_1.z.object({
    contestId: zod_1.z.string(),
    totalParticipants: zod_1.z.number().default(0),
    totalSubmissions: zod_1.z.number().default(0),
    problemStatistics: zod_1.z.array(zod_1.z.object({
        problemId: zod_1.z.string(),
        totalAttempts: zod_1.z.number(),
        successfulSolutions: zod_1.z.number(),
        averageAttempts: zod_1.z.number(),
        averageTime: zod_1.z.number(), // in minutes
        mostFailedTestCase: zod_1.z.string().optional(),
    })).default([]),
    participantEngagement: zod_1.z.object({
        averageTimeSpent: zod_1.z.number(), // in minutes
        peakParticipationTime: zod_1.z.string().optional(),
        dropoffRate: zod_1.z.number(), // percentage of users who left early
    }).optional(),
    generatedAt: zod_1.z.date().default(() => new Date()),
});
// Contest problem with isolated modifications
exports.contestProblemSchema = zod_1.z.object({
    id: zod_1.z.string(), // unique contest problem ID
    originalProblemId: zod_1.z.number(), // reference to base problem
    title: zod_1.z.string().optional(), // override title
    description: zod_1.z.string().optional(), // override description
    difficulty: zod_1.z.enum(["easy", "medium", "hard"]).optional(),
    points: zod_1.z.number().default(100), // custom points for this contest
    // Contest-specific overrides
    customTestCases: zod_1.z.array(exports.testCaseSchema).optional(),
    customExamples: zod_1.z.array(exports.exampleSchema).optional(),
    customStarterCode: exports.starterCodeSchema.optional(),
    timeLimit: zod_1.z.number().optional(), // override time limit
    memoryLimit: zod_1.z.number().optional(), // override memory limit
    constraints: zod_1.z.string().optional(),
    inputFormat: zod_1.z.string().optional(),
    outputFormat: zod_1.z.string().optional(),
    order: zod_1.z.number().default(0), // position in contest
    maxSubmissions: zod_1.z.number().optional(), // limit attempts
    partialScoring: zod_1.z.boolean().default(false), // allow partial credit
});
// Enhanced contest schema with comprehensive features
exports.insertContestSchema = zod_1.z.object({
    // Basic Information
    title: zod_1.z.string().min(1, "Contest title is required"),
    description: zod_1.z.string().optional(),
    // Timing & Duration
    startTime: zod_1.z.date(),
    endTime: zod_1.z.date(),
    duration: zod_1.z.number().optional(), // contest duration in minutes
    timeZone: zod_1.z.string().default("UTC"),
    // Contest Type & Configuration
    type: zod_1.z.enum(["coding", "algorithm", "competitive"]).default("coding"),
    visibility: zod_1.z.enum(["public", "private", "unlisted"]).default("public"),
    accessControl: zod_1.z.object({
        isPasswordProtected: zod_1.z.boolean().default(false),
        password: zod_1.z.string().optional(),
        inviteOnly: zod_1.z.boolean().default(false),
        maxParticipants: zod_1.z.number().optional(),
    }).default({}),
    // Problems & Scoring
    problems: zod_1.z.array(exports.contestProblemSchema).default([]),
    scoringMethod: zod_1.z.enum(["maximum", "time_based", "partial", "acm_icpc"]).default("maximum"),
    tieBreakingRules: zod_1.z.array(zod_1.z.enum(["time", "submissions", "last_accepted"])).default(["time"]),
    // Penalties & Rules
    wrongSubmissionPenalty: zod_1.z.number().default(0), // penalty per wrong submission
    timePenalty: zod_1.z.boolean().default(false), // penalty based on submission time
    freezeLeaderboard: zod_1.z.boolean().default(false),
    freezeTime: zod_1.z.number().optional(), // minutes before end to freeze leaderboard
    // Security & Anti-Cheating
    securitySettings: zod_1.z.object({
        disableInspect: zod_1.z.boolean().default(true),
        disableCopyPaste: zod_1.z.boolean().default(true),
        disableRightClick: zod_1.z.boolean().default(true),
        disableExtensions: zod_1.z.boolean().default(true),
        enablePlagiarismDetection: zod_1.z.boolean().default(true),
        allowedLanguages: zod_1.z.array(zod_1.z.string()).default(["python", "javascript", "cpp", "java", "c"]),
    }).default({}),
    // Participant Management
    participants: zod_1.z.array(zod_1.z.string()).default([]),
    registrationOpen: zod_1.z.boolean().default(true),
    registrationDeadline: zod_1.z.date().optional(),
    allowLateRegistration: zod_1.z.boolean().default(false),
    // Communication
    announcements: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        message: zod_1.z.string(),
        timestamp: zod_1.z.date(),
        priority: zod_1.z.enum(["low", "medium", "high"]).default("medium"),
        isGlobal: zod_1.z.boolean().default(true), // visible to all participants
    })).default([]),
    enableQA: zod_1.z.boolean().default(true),
    // Metadata
    createdBy: zod_1.z.string().optional(),
    createdAt: zod_1.z.date().default(() => new Date()),
    updatedAt: zod_1.z.date().default(() => new Date()),
    status: zod_1.z.enum(["draft", "published", "active", "ended", "cancelled"]).default("draft"),
    // Rewards & Recognition
    prizePool: zod_1.z.string().optional(),
    certificates: zod_1.z.boolean().default(false),
    // Analytics
    enableAnalytics: zod_1.z.boolean().default(true),
    allowReplay: zod_1.z.boolean().default(true), // allow reviewing past contest
});
// Contest leaderboard entry
exports.contestLeaderboardEntrySchema = zod_1.z.object({
    contestId: zod_1.z.string(),
    userId: zod_1.z.string(),
    username: zod_1.z.string(),
    rank: zod_1.z.number(),
    totalScore: zod_1.z.number(),
    totalPenalty: zod_1.z.number(),
    problemsSolved: zod_1.z.number(),
    lastSubmissionTime: zod_1.z.date().optional(),
    submissions: zod_1.z.array(zod_1.z.object({
        problemId: zod_1.z.string(),
        points: zod_1.z.number(),
        attempts: zod_1.z.number(),
        timeToSolve: zod_1.z.number().optional(), // minutes from contest start
        penalty: zod_1.z.number().default(0),
    })).default([]),
});
exports.insertCourseSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Course title is required"),
    description: zod_1.z.string().optional(),
    isPublic: zod_1.z.boolean().default(true),
    enableMarkComplete: zod_1.z.boolean().default(true),
    category: zod_1.z.string().optional(),
    difficulty: zod_1.z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
    estimatedHours: zod_1.z.number().min(1).default(1),
    prerequisites: zod_1.z.array(zod_1.z.string()).default([]),
    learningObjectives: zod_1.z.array(zod_1.z.string()).default([]),
    modules: zod_1.z.array(zod_1.z.object({
        title: zod_1.z.string().min(1, "Module title is required"),
        description: zod_1.z.string(),
        order: zod_1.z.number(),
        textContent: zod_1.z.string().optional(),
        videoUrl: zod_1.z.string().optional(),
        codeExample: zod_1.z.string().optional(),
        language: zod_1.z.string().optional(),
        expectedOutput: zod_1.z.string().optional(),
    })).default([]),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    problems: zod_1.z.array(zod_1.z.number()).optional(),
    enrolledUsers: zod_1.z.array(zod_1.z.string()).optional(),
    createdBy: zod_1.z.string().optional(),
    rating: zod_1.z.number().min(0).max(5).optional(),
    enrollmentCount: zod_1.z.number().default(0),
    completionRate: zod_1.z.number().min(0).max(100).default(0),
});
exports.insertCourseModuleSchema = zod_1.z.object({
    courseId: zod_1.z.number(),
    title: zod_1.z.string().min(1, "Module title is required"),
    description: zod_1.z.string().optional(),
    order: zod_1.z.number().min(0, "Order must be non-negative"),
    textContent: zod_1.z.string().optional(),
    videoUrl: zod_1.z.string().url().optional(),
    codeExample: zod_1.z.string().optional(),
    language: zod_1.z.string().optional(),
    expectedOutput: zod_1.z.string().optional(),
});
exports.insertCourseEnrollmentSchema = zod_1.z.object({
    courseId: zod_1.z.number(),
    userId: zod_1.z.string(),
    enrolledAt: zod_1.z.date().default(() => new Date()),
    progress: zod_1.z.number().min(0).max(100).default(0),
    completedModules: zod_1.z.array(zod_1.z.number()).default([]),
});
// Problem instance within a problem set - allows isolated modifications
exports.problemInstanceSchema = zod_1.z.object({
    id: zod_1.z.string(), // unique instance ID (problemSetId_problemId_timestamp)
    originalProblemId: zod_1.z.number(), // reference to base problem
    title: zod_1.z.string().optional(), // override title for this set
    description: zod_1.z.string().optional(), // override description for this set
    difficulty: zod_1.z.enum(["easy", "medium", "hard"]).optional(), // override difficulty
    customTestCases: zod_1.z.array(exports.testCaseSchema).optional(), // additional test cases
    customExamples: zod_1.z.array(exports.exampleSchema).optional(), // additional examples
    customStarterCode: exports.starterCodeSchema.optional(), // set-specific starter code
    timeLimit: zod_1.z.number().optional(), // override time limit
    memoryLimit: zod_1.z.number().optional(), // override memory limit
    hints: zod_1.z.array(zod_1.z.string()).optional(), // set-specific hints
    constraints: zod_1.z.string().optional(), // override constraints
    inputFormat: zod_1.z.string().optional(), // override input format
    outputFormat: zod_1.z.string().optional(), // override output format
    notes: zod_1.z.string().optional(), // additional notes for this set
    order: zod_1.z.number().default(0), // position within the problem set
    isCustomized: zod_1.z.boolean().default(false), // true if modified from original
    lastModified: zod_1.z.date().default(() => new Date()),
    modifiedBy: zod_1.z.string().optional(),
});
exports.insertProblemSetSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required"),
    description: zod_1.z.string().optional(),
    difficulty: zod_1.z.enum(["easy", "medium", "hard"]),
    category: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    problemIds: zod_1.z.array(zod_1.z.string()).default([]), // legacy support
    problemInstances: zod_1.z.array(exports.problemInstanceSchema).default([]), // new isolated approach
    isPublic: zod_1.z.boolean().default(true),
    estimatedTime: zod_1.z.number().optional(),
    createdBy: zod_1.z.string().optional(),
});
exports.insertProblemSetEnrollmentSchema = zod_1.z.object({
    problemSetId: zod_1.z.number(),
    userId: zod_1.z.string(),
    enrolledAt: zod_1.z.date().default(() => new Date()),
    progress: zod_1.z.number().min(0).max(100).default(0),
    completedProblems: zod_1.z.array(zod_1.z.number()).default([]),
    totalSubmissions: zod_1.z.number().default(0),
    correctSubmissions: zod_1.z.number().default(0),
});
exports.insertUserProgressSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    moduleId: zod_1.z.number(),
    completedAt: zod_1.z.date().default(() => new Date()),
    progress: zod_1.z.number().min(0).max(100).default(0),
});
exports.mcqOptionSchema = zod_1.z.object({
    text: zod_1.z.string(),
    isCorrect: zod_1.z.boolean(),
});
exports.assignmentQuestionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(["coding", "mcq", "text"]),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    points: zod_1.z.number().min(0),
    // For coding questions
    starterCode: exports.starterCodeSchema.optional(),
    testCases: zod_1.z.array(exports.testCaseSchema).optional(),
    // For MCQ questions
    options: zod_1.z.array(exports.mcqOptionSchema).optional(),
    // For text questions
    expectedAnswer: zod_1.z.string().optional(),
});
exports.insertAssignmentSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Assignment title is required"),
    description: zod_1.z.string().optional(),
    questions: zod_1.z.array(exports.assignmentQuestionSchema).min(1, "At least one question is required"),
    dueDate: zod_1.z.date(),
    groups: zod_1.z.array(zod_1.z.string()).optional(),
    isPublic: zod_1.z.boolean().default(false),
    createdBy: zod_1.z.string(),
    maxAttempts: zod_1.z.number().min(1).default(3),
    timeLimit: zod_1.z.number().optional(), // in minutes
});
exports.questionSubmissionSchema = zod_1.z.object({
    questionId: zod_1.z.string(),
    answer: zod_1.z.string(),
    score: zod_1.z.number().min(0).max(100),
    isCorrect: zod_1.z.boolean(),
});
exports.insertAssignmentSubmissionSchema = zod_1.z.object({
    assignmentId: zod_1.z.number(),
    userId: zod_1.z.string(),
    questionSubmissions: zod_1.z.array(exports.questionSubmissionSchema),
    overallScore: zod_1.z.number().min(0).max(100),
    submittedAt: zod_1.z.date().default(() => new Date()),
    attemptNumber: zod_1.z.number().min(1),
});
exports.insertGroupSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Group name is required"),
    description: zod_1.z.string().optional(),
    members: zod_1.z.array(zod_1.z.string()).default([]),
    createdBy: zod_1.z.string(),
    isActive: zod_1.z.boolean().default(true),
});
exports.insertContestParticipantSchema = zod_1.z.object({
    contestId: zod_1.z.number(),
    userId: zod_1.z.string(),
    joinedAt: zod_1.z.date().default(() => new Date()),
    rank: zod_1.z.number().optional(),
    score: zod_1.z.number().default(0),
});
exports.insertAnnouncementSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Announcement title is required"),
    content: zod_1.z.string().min(1, "Announcement content is required"),
    targetGroups: zod_1.z.array(zod_1.z.string()).optional(),
    isGlobal: zod_1.z.boolean().default(false),
    createdBy: zod_1.z.string(),
    expiresAt: zod_1.z.date().optional(),
    isActive: zod_1.z.boolean().default(true),
});
