// Export all Mongoose models
export { User } from './User';
export { Course } from './Course';
export { CourseModule } from './CourseModule';
export { CourseEnrollment } from './CourseEnrollment';
export { Problem } from './Problem';
export { Submission } from './Submission';
export { ProblemSet } from './ProblemSet';
export { ProblemSetEnrollment } from './ProblemSetEnrollment';
export { ModuleProgress } from './ModuleProgress';
export { VersionHistory } from './VersionHistory';
export { Contest } from './Contest';
export { ContestParticipant } from './ContestParticipant';
export { ContestSubmission } from './ContestSubmission';
export { ContestQuestion } from './ContestQuestion';

// Export interfaces
export type { IUser } from './User';
export type { ICourse } from './Course';
export type { ICourseModule } from './CourseModule';
export type { ICourseEnrollment } from './CourseEnrollment';
// Note: Problem model does not export TS interfaces
export type { ISubmission } from './Submission';
export type { IProblemSet, IProblemInstance } from './ProblemSet';
export type { IProblemSetEnrollment } from './ProblemSetEnrollment';
export type { IModuleProgress } from './ModuleProgress';
export type { IVersionHistory } from './VersionHistory'; 