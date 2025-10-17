// Export all Mongoose models with .js extension
export { User } from './User.js';
export { Course } from './Course.js';
export { CourseModule } from './CourseModule.js';
export { CourseEnrollment } from './CourseEnrollment.js';
export { Problem } from './Problem.js';
export { Submission } from './Submission.js';
export { ProblemSet } from './ProblemSet.js';
export { ProblemSetEnrollment } from './ProblemSetEnrollment.js';
export { ModuleProgress } from './ModuleProgress.js';
export { VersionHistory } from './VersionHistory.js';
export { Contest } from './Contest.js';
export { ContestParticipant } from './ContestParticipant.js';
export { ContestSubmission } from './ContestSubmission.js';
export { ContestQuestion } from './ContestQuestion.js';

// Export interfaces with .js extension
export type { IUser } from './User.js';
export type { ICourse } from './Course.js';
export type { ICourseModule } from './CourseModule.js';
export type { ICourseEnrollment } from './CourseEnrollment.js';
// Note: Problem model does not export TS interfaces
export type { ISubmission } from './Submission.js';
export type { IProblemSet, IProblemInstance } from './ProblemSet.js';
export type { IProblemSetEnrollment } from './ProblemSetEnrollment.js';
export type { IModuleProgress } from './ModuleProgress.js';
export type { IVersionHistory } from './VersionHistory.js';