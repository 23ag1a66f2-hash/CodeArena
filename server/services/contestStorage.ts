// @ts-nocheck

import { ObjectId } from 'mongodb';
import { Contest as ContestModel } from '../models/Contest.js';
import { ContestParticipant as ContestParticipantModel } from '../models/ContestParticipant.js';
import { ContestSubmission as ContestSubmissionModel } from '../models/ContestSubmission.js';
import { ContestQuestion as ContestQuestionModel } from '../models/ContestQuestion.js';
import { Problem } from '../models/Problem.js';
import type {
  Contest as ContestType,
  ContestProblem,
  ContestParticipant as ContestParticipantType,
  ContestQuestion as ContestQuestionType,
  ContestAnalytics,
  ContestLeaderboardEntry,
} from '../shared-schema.js';

// Contest document interfaces for MongoDB
export interface ContestDocument extends Omit<ContestType, '_id'> {
  _id?: ObjectId;
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContestParticipantDocument extends Omit<ContestParticipantType, '_id'> {
  _id?: ObjectId;
  id: string;
}

export interface ContestSubmissionDocument {
  _id?: ObjectId;
  id: string;
  contestId: string;
  problemId: string;
  userId: string;
  code: string;
  language: string;
  status: string;
  points?: number;
  runtime?: number;
  memory?: number;
  submissionTime: Date;
  penalty: number;
  isContestSubmission: boolean;
}

// Contest Storage Interface
export interface IContestStorage {
  // Contest Management
  createContest(contest: Omit<ContestType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContestDocument>;
  getContest(contestId: string): Promise<ContestDocument | null>;
  getAllContests(filters?: { status?: string; type?: string; visibility?: string }): Promise<ContestDocument[]>;
  updateContest(contestId: string, updates: Partial<ContestType>): Promise<ContestDocument | null>;
  updateContestEndMethod(contestId: string, endMethod: 'manually_ended' | 'time_expired'): Promise<boolean>;
  checkAndUpdateContestEndMethod(contestId: string): Promise<'manually_ended' | 'time_expired' | null>;
  checkAndUpdateAllExpiredContests(): Promise<{ updated: number; total: number }>;
  deleteContest(contestId: string): Promise<boolean>;
  
  // Problem Management within Contests
  addProblemToContest(contestId: string, problem: ContestProblem): Promise<boolean>;
  removeProblemFromContest(contestId: string, problemId: string): Promise<boolean>;
  updateContestProblem(contestId: string, problemId: string, updates: Partial<ContestProblem>): Promise<boolean>;
  getContestProblems(contestId: string): Promise<ContestProblem[]>;
  
  // Participant Management
  registerParticipant(contestId: string, userId: string): Promise<ContestParticipantDocument>;
  unregisterParticipant(contestId: string, userId: string): Promise<boolean>;
  getContestParticipants(contestId: string): Promise<ContestParticipantDocument[]>;
  getUserContestEnrollments(userId: string): Promise<ContestParticipantDocument[]>;
  updateParticipantScore(contestId: string, userId: string, score: number, penalty: number): Promise<boolean>;
  updateParticipantProblemStatus(contestId: string, userId: string, problemId: string, status: string, points: number): Promise<boolean>;
  updateParticipantContestEndMethod(contestId: string, userId: string, endMethod: 'manually_ended' | 'time_expired'): Promise<boolean>;
  updateAllParticipantsContestEndMethod(contestId: string, endMethod: 'manually_ended' | 'time_expired' | null): Promise<boolean>;
  disqualifyParticipant(contestId: string, userId: string, reason?: string): Promise<boolean>;
  
  // Submissions & Scoring
  submitSolution(submission: Omit<ContestSubmissionDocument, 'id' | '_id'>): Promise<ContestSubmissionDocument>;
  getContestSubmissions(contestId: string, userId?: string): Promise<ContestSubmissionDocument[]>;
  getParticipantSubmissions(contestId: string, userId: string): Promise<ContestSubmissionDocument[]>;
  
  // Leaderboard & Rankings
  generateLeaderboard(contestId: string): Promise<ContestLeaderboardEntry[]>;
  updateRankings(contestId: string): Promise<boolean>;
  
  // Analytics
  getContestAnalytics(contestId: string): Promise<ContestAnalytics>;
  
  // Q&A System
  submitQuestion(question: Omit<ContestQuestionType, 'id'>): Promise<ContestQuestionType>;
  answerQuestion(questionId: string, answer: string, answeredBy: string): Promise<boolean>;
  getContestQuestions(contestId: string, isPublic?: boolean): Promise<ContestQuestionType[]>;
  
  // Announcements
  addAnnouncement(contestId: string, message: string, priority?: 'low' | 'medium' | 'high'): Promise<boolean>;
  getAnnouncements(contestId: string): Promise<ContestType['announcements']>;
}

// MongoDB Implementation
export class ContestStorage implements IContestStorage {
  // Using Mongoose models; no lazy collection init required

  async createContest(contestData: Omit<ContestType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContestDocument> {
    const now = new Date();
    const contest: any = {
      ...contestData,
      id: new ObjectId().toString(),
      createdAt: now,
      updatedAt: now,
    };
    const created = await ContestModel.create(contest);
    return created.toObject() as any;
  }

  async getContest(contestId: string): Promise<ContestDocument | null> {
    const contest = await ContestModel.findOne({ id: contestId }).lean();
    if (contest) return contest as any;
    try {
      const byMongoId = await ContestModel.findById(contestId).lean();
      return (byMongoId as any) || null;
    } catch {
      return null;
    }
  }

  async getAllContests(filters?: { status?: string; type?: string; visibility?: string }): Promise<ContestDocument[]> {
    const query: any = {};
    
    if (filters?.status) query.status = filters.status;
    if (filters?.type) query.type = filters.type;
    if (filters?.visibility) query.visibility = filters.visibility;
    const results = await ContestModel.find(query).sort({ createdAt: -1 }).lean();
    return results.map((contest: any) => ({ ...contest, problems: contest.problems || [] }));
  }

  async updateContest(contestId: string, updates: Partial<ContestType>): Promise<ContestDocument | null> {
    const sanitized: Record<string, any> = Object.fromEntries(
      Object.entries({ ...updates }).filter(([_, v]) => v !== undefined)
    );
    const result = await ContestModel.findOneAndUpdate(
      { id: contestId },
      { $set: { ...sanitized, updatedAt: new Date() } },
      { new: true }
    ).lean();
    return (result as any) || null;
  }

  async updateContestEndMethod(contestId: string, endMethod: 'manually_ended' | 'time_expired'): Promise<boolean> {
    try {
      // Update contest end method
      const contestResult = await ContestModel.updateOne(
        { id: contestId },
        { $set: { contestEndMethod: endMethod, updatedAt: new Date() } }
      );

      // Update all participants' contest end method
      const participantResult = await this.updateAllParticipantsContestEndMethod(contestId, endMethod);

      console.log(`[CONTEST-STORAGE] Updated contest ${contestId} end method to ${endMethod}`);
      console.log(`[CONTEST-STORAGE] Contest update: ${contestResult.modifiedCount > 0}, Participants update: ${participantResult}`);

      return (contestResult.modifiedCount || 0) > 0;
    } catch (error) {
      console.error(`[CONTEST-STORAGE] Error updating contest end method:`, error);
      return false;
    }
  }

  async checkAndUpdateContestEndMethod(contestId: string): Promise<'manually_ended' | 'time_expired' | null> {
    const contest: any = await ContestModel.findOne({ id: contestId }).lean();
    if (!contest) {
      return null;
    }

    const now = new Date();
    let newEndMethod: 'manually_ended' | 'time_expired' | null = null;

    if (contest.endTime && now > contest.endTime) {
      newEndMethod = 'time_expired';
    } else if (contest.contestEndMethod === 'time_expired') {
      newEndMethod = 'time_expired';
    }

    if (newEndMethod) {
      await this.updateContestEndMethod(contestId, newEndMethod);
    }

    return newEndMethod;
  }

  async checkAndUpdateAllExpiredContests(): Promise<{ updated: number; total: number }> {
    const contests = await ContestModel.find({ endTime: { $lt: new Date() } }).lean();
    let updatedCount = 0;
    for (const contest of contests) {
      const now = new Date();
      let newEndMethod: 'manually_ended' | 'time_expired' | null = null;

      if (contest.endTime && now > contest.endTime) {
        newEndMethod = 'time_expired';
      } else if (contest.contestEndMethod === 'time_expired') {
        newEndMethod = 'time_expired';
      }

      if (newEndMethod) {
        await this.updateContestEndMethod(contest.id, newEndMethod);
        updatedCount++;
      }
    }
    return { updated: updatedCount, total: contests.length };
  }

  async deleteContest(contestId: string): Promise<boolean> {
    const result = await ContestModel.deleteOne({ id: contestId });
    await ContestParticipantModel.deleteMany({ contestId });
    await ContestSubmissionModel.deleteMany({ contestId });
    await ContestQuestionModel.deleteMany({ contestId });
    return result.deletedCount !== undefined && result.deletedCount > 0;
  }

  async addProblemToContest(contestId: string, problem: ContestProblem): Promise<boolean> {
    // Ensure the problem has an ID
    const problemWithId = {
      ...problem,
      id: problem.id || new ObjectId().toString(),
    };
    const result = await ContestModel.updateOne(
      { id: contestId },
      { $push: { problems: problemWithId }, $set: { updatedAt: new Date() } }
    );
    return result.modifiedCount !== undefined && result.modifiedCount > 0;
  }

  async removeProblemFromContest(contestId: string, problemId: string): Promise<boolean> {
    let result = await ContestModel.updateOne(
      { id: contestId },
      { $pull: { problems: { id: problemId } } as any, $set: { updatedAt: new Date() } }
    );
    if ((result.modifiedCount || 0) === 0) {
      const contest: any = await ContestModel.findOne({ id: contestId }).lean();
      const problemToRemove = contest?.problems?.find((p: any) => p.id === problemId);
      if (problemToRemove) {
        result = await ContestModel.updateOne(
          { id: contestId },
          { $pull: { problems: { title: problemToRemove.title } } as any, $set: { updatedAt: new Date() } }
        );
      }
    }
    return (result.modifiedCount || 0) > 0;
  }

  async updateContestProblem(contestId: string, problemId: string, updates: Partial<ContestProblem>): Promise<boolean> {
    try {
      console.log(`[CONTEST-STORAGE] 🔄 Updating problem ${problemId} in contest ${contestId}`);
      console.log(`[CONTEST-STORAGE] Updates to apply:`, updates);
      
      // First, get the current problem to preserve existing fields
      const contest = await ContestModel.findOne({ id: contestId }).lean();
      if (!contest) {
        console.log(`[CONTEST-STORAGE] ❌ Contest ${contestId} not found`);
        return false;
      }
      
      const currentProblem = contest.problems?.find(p => p.id === problemId);
      if (!currentProblem) {
        console.log(`[CONTEST-STORAGE] ❌ Problem ${problemId} not found in contest`);
        return false;
      }
      
      console.log(`[CONTEST-STORAGE] Current problem:`, {
        id: currentProblem.id,
        title: currentProblem.title,
        selectedProblemId: currentProblem.selectedProblemId,
        originalProblemId: currentProblem.originalProblemId
      });
      
      // Merge updates with existing problem data, preserving important fields
      const updatedProblem = {
        ...currentProblem,
        ...updates,
        // Preserve these critical fields if they exist
        selectedProblemId: updates.selectedProblemId !== undefined ? updates.selectedProblemId : currentProblem.selectedProblemId,
        originalProblemId: updates.originalProblemId !== undefined ? updates.originalProblemId : currentProblem.originalProblemId,
        id: currentProblem.id, // Always preserve the problem ID
        updatedAt: new Date()
      };
      
      console.log(`[CONTEST-STORAGE] Updated problem:`, {
        id: updatedProblem.id,
        title: updatedProblem.title,
        selectedProblemId: updatedProblem.selectedProblemId,
        originalProblemId: updatedProblem.originalProblemId
      });
      
      const result = await ContestModel.updateOne(
        { id: contestId, 'problems.id': problemId },
        { 
          $set: { 
            'problems.$': updatedProblem,
            updatedAt: new Date() 
          } 
        }
      );
      
      const success = (result.modifiedCount || 0) > 0;
      console.log(`[CONTEST-STORAGE] ${success ? '✅' : '❌'} Problem update ${success ? 'succeeded' : 'failed'}`);
      
      return success;
    } catch (error) {
      console.error(`[CONTEST-STORAGE] ❌ Error updating problem ${problemId} in contest ${contestId}:`, error);
      return false;
    }
  }

  async getContestProblems(contestId: string): Promise<ContestProblem[]> {
    const contest: any = await ContestModel.findOne({ id: contestId }).lean();
    return contest?.problems || [];
  }

  async registerParticipant(contestId: string, userId: string): Promise<ContestParticipantDocument> {
    console.log('[DEBUG] registerParticipant called:', { contestId, userId });
    const existingParticipant = await ContestParticipantModel.findOne({ contestId, userId }).lean();
    if (existingParticipant) {
      console.log('[DEBUG] Participant already exists:', existingParticipant.id);
      throw new Error('User is already registered for this contest');
    }

    const participant: any = {
      id: new ObjectId().toString(),
      contestId,
      userId,
      registrationTime: new Date(),
      totalScore: 0,
      totalPenalty: 0,
      submissions: [],
      problemsAttempted: [],
      problemsSolved: [],
      isDisqualified: false,
      enrollmentType: 'qr', // Default to QR for self-enrollment
    };

    console.log('[DEBUG] Creating new participant:', participant);
    const created = await ContestParticipantModel.create(participant);

    // Also add the user to the contest's participants array
    try {
      await ContestModel.findOneAndUpdate(
        { id: contestId },
        { $addToSet: { participants: userId } }
      );
    } catch (error) {
      console.error('[DEBUG] Error updating contest participants array:', error);
      // Don't fail the entire operation if this update fails
    }

    return created;
  }

  // New method for admin enrollment
  async registerParticipantByAdmin(contestId: string, userId: string): Promise<ContestParticipantDocument> {
    console.log('[DEBUG] registerParticipantByAdmin called:', { contestId, userId });
    const existingParticipant = await ContestParticipantModel.findOne({ contestId, userId }).lean();
    if (existingParticipant) {
      console.log('[DEBUG] Participant already exists:', existingParticipant.id);
      throw new Error('User is already registered for this contest');
    }

    const participant: any = {
      id: new ObjectId().toString(),
      contestId,
      userId,
      registrationTime: new Date(),
      totalScore: 0,
      totalPenalty: 0,
      submissions: [],
      problemsAttempted: [],
      problemsSolved: [],
      isDisqualified: false,
      enrollmentType: 'admin', // Set enrollment type as admin
    };

    console.log('[DEBUG] Creating new participant by admin:', participant);
    const created = await ContestParticipantModel.create(participant);

    // Also add the user to the contest's participants array
    try {
      await ContestModel.findOneAndUpdate(
        { id: contestId },
        { $addToSet: { participants: userId } }
      );
    } catch (error) {
      console.error('[DEBUG] Error updating contest participants array:', error);
      // Don't fail the entire operation if this update fails
    }

    return created;
  }

  async unregisterParticipant(contestId: string, userId: string): Promise<boolean> {
    const result = await ContestParticipantModel.deleteOne({ contestId, userId });
    
    // Also remove the user from the contest's participants array
    if (result.deletedCount > 0) {
      try {
        await ContestModel.updateOne(
          { id: contestId },
          { 
            $pull: { participants: userId },
            $set: { updatedAt: new Date() }
          }
        );
        console.log('[DEBUG] Removed user from contest participants array');
      } catch (error) {
        console.error('[DEBUG] Error removing user from contest participants array:', error);
        // Don't fail the unregistration if this update fails
      }
    }
    
    return (result.deletedCount || 0) > 0;
  }

  async getContestParticipants(contestId: string): Promise<ContestParticipantDocument[]> {
    // Query participants (lean for performance)
    const participants = await ContestParticipantModel.find({ contestId }).lean();

    // If there are no participants, return early
    if (!participants || participants.length === 0) {
      return [] as any;
    }

    // Gather unique user ids to hydrate user details
    const userIds = Array.from(new Set(participants.map((p: any) => String(p.userId))));

    // Load minimal user profile via Mongoose in one query (SRP: storage handles data shaping)
    const { User } = await import('../models/User');
    const users = await User.find({ _id: { $in: userIds } })
      .select('firstName lastName email')
      .lean();

    // Build map for quick lookup
    const byId = new Map(users.map((u: any) => [String(u._id), u]));

    // Return enriched participants adhering to a stable response contract
    const enriched = participants.map((p: any) => {
      const user = byId.get(String(p.userId));
      return {
        ...p,
        user: user
          ? {
              id: String(user._id),
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              email: user.email || '',
            }
          : null,
      };
    });

    return enriched as any;
  }

  async getUser(userId: string): Promise<any> {
    try {
      // Use Mongoose User model indirectly to keep dependencies minimal here
      const { User } = await import('../models/User');
      try {
        const byId = await User.findById(userId).lean();
        if (byId) return byId;
      } catch {}
      const byLegacy = await User.findOne({ id: userId }).lean();
      return byLegacy;
    } catch (error) {
      console.error('[DEBUG] Error fetching user:', error);
      return null;
    }
  }

  async getUserContestEnrollments(userId: string): Promise<ContestParticipantDocument[]> {
    const participants = await ContestParticipantModel.find({ userId }).lean();
    
    // For each participant, ensure their rank is up to date
    for (const participant of participants) {
      if (!participant.rank) {
        // If rank is missing, update rankings for this contest
        await this.updateRankings(participant.contestId);
      }
    }
    
    // Fetch updated participants with ranks
    const updatedParticipants = await ContestParticipantModel.find({ userId }).lean();
    return updatedParticipants as any;
  }

  async updateParticipantScore(contestId: string, userId: string, score: number, penalty: number): Promise<boolean> {
    const result = await ContestParticipantModel.updateOne(
      { contestId, userId },
      { $set: { totalScore: score, totalPenalty: penalty } }
    );
    return (result.modifiedCount || 0) > 0;
  }

  async updateParticipantProblemStatus(contestId: string, userId: string, problemId: string, status: string, points: number): Promise<boolean> {
    try {
      // Get current participant data
      const participant = await ContestParticipantModel.findOne({ contestId, userId }).lean();
      if (!participant) {
        console.log(`[CONTEST-STORAGE] Participant not found for contest ${contestId}, user ${userId}`);
        return false;
      }

      // Get all submissions for this user and problem to determine final status
      const problemSubmissions = await ContestSubmissionModel.find({ 
        contestId, 
        userId, 
        problemId 
      }).sort({ submissionTime: -1 }).lean();

      if (problemSubmissions.length === 0) {
        console.log(`[CONTEST-STORAGE] No submissions found for problem ${problemId}`);
        return false;
      }

      // Find the best submission (highest points)
      const bestSubmission = problemSubmissions.reduce((best, current) => {
        return (current.points || 0) > (best.points || 0) ? current : best;
      });

      const isAccepted = (bestSubmission.status || '').toLowerCase() === 'accepted';
      const finalPoints = bestSubmission.points || 0;

      // Prepare update operations
      const updateOps: any = {};

      // Update problemsAttempted - add problem if not already there
      if (!participant.problemsAttempted?.includes(problemId)) {
        updateOps.$addToSet = { problemsAttempted: problemId };
      }

      // Update problemsSolved - add problem if accepted and not already there
      if (isAccepted && !participant.problemsSolved?.includes(problemId)) {
        if (!updateOps.$addToSet) updateOps.$addToSet = {};
        updateOps.$addToSet.problemsSolved = problemId;
      }

      // Remove from problemsSolved if not accepted but was previously there
      if (!isAccepted && participant.problemsSolved?.includes(problemId)) {
        if (!updateOps.$pull) updateOps.$pull = {};
        updateOps.$pull.problemsSolved = problemId;
      }

      // Calculate total score across all problems
      const allProblemSubmissions = await ContestSubmissionModel.find({ contestId, userId }).lean();
      const problemScores: Record<string, number> = {};
      
      // Group submissions by problem and find best score for each
      for (const sub of allProblemSubmissions) {
        const currentBest = problemScores[sub.problemId] || 0;
        if ((sub.points || 0) > currentBest) {
          problemScores[sub.problemId] = sub.points || 0;
        }
      }
      
      // Calculate total score
      const totalScore = Object.values(problemScores).reduce((sum, score) => sum + score, 0);

      // Update total score
      updateOps.$set = {
        totalScore,
        totalPenalty: 0, // Reset penalty for now, can be enhanced later
        updatedAt: new Date()
      };

      // If we have operations to perform, update the participant
      if (Object.keys(updateOps).length > 0) {
        const result = await ContestParticipantModel.updateOne(
          { contestId, userId },
          updateOps
        );

        console.log(`[CONTEST-STORAGE] Updated participant ${userId} for problem ${problemId}:`, {
          status: bestSubmission.status,
          points: finalPoints,
          isAccepted,
          totalScore,
          problemsAttempted: updateOps.$addToSet?.problemsAttempted,
          problemsSolved: updateOps.$addToSet?.problemsSolved || updateOps.$pull?.problemsSolved
        });

        return (result.modifiedCount || 0) > 0;
      }

      return true; // No updates needed
    } catch (error) {
      console.error(`[CONTEST-STORAGE] Error updating participant problem status:`, error);
      return false;
    }
  }

  async updateParticipantContestEndMethod(contestId: string, userId: string, endMethod: 'manually_ended' | 'time_expired'): Promise<boolean> {
    try {
      const result = await ContestParticipantModel.updateOne(
        { contestId, userId },
        { 
          $set: { 
            contestEndMethod: endMethod,
            updatedAt: new Date()
          }
        }
      );

      console.log(`[CONTEST-STORAGE] Updated contest end method for participant ${userId} in contest ${contestId}: ${endMethod}`);
      return (result.modifiedCount || 0) > 0;
    } catch (error) {
      console.error(`[CONTEST-STORAGE] Error updating participant contest end method:`, error);
      return false;
    }
  }

  async updateAllParticipantsContestEndMethod(contestId: string, endMethod: 'manually_ended' | 'time_expired' | null): Promise<boolean> {
    try {
      const result = await ContestParticipantModel.updateMany(
        { contestId },
        { 
          $set: { 
            contestEndMethod: endMethod,
            updatedAt: new Date()
          }
        }
      );

      console.log(`[CONTEST-STORAGE] Updated contest end method for all participants in contest ${contestId}: ${endMethod} (${result.modifiedCount} participants updated)`);
      return (result.modifiedCount || 0) > 0;
    } catch (error) {
      console.error(`[CONTEST-STORAGE] Error updating all participants contest end method:`, error);
      return false;
    }
  }

  async disqualifyParticipant(contestId: string, userId: string, reason?: string): Promise<boolean> {
    try {
      const updateData: any = {
        isDisqualified: true,
        updatedAt: new Date()
      };
      
      if (reason) {
        updateData.disqualificationReason = reason;
      }

      const result = await ContestParticipantModel.updateOne(
        { contestId, userId },
        { $set: updateData }
      );

      console.log(`[CONTEST-STORAGE] Disqualified participant ${userId} in contest ${contestId}${reason ? ` for reason: ${reason}` : ''}`);
      return (result.modifiedCount || 0) > 0;
    } catch (error) {
      console.error(`[CONTEST-STORAGE] Error disqualifying participant:`, error);
      return false;
    }
  }

  async submitSolution(submission: Omit<ContestSubmissionDocument, 'id' | '_id'>): Promise<ContestSubmissionDocument> {
    const doc: any = { ...submission, id: new ObjectId().toString() };
    console.log(`[CONTEST-STORAGE] Creating submission: contestId=${doc.contestId}, userId=${doc.userId}, problemId=${doc.problemId}, submissionId=${doc.id}`);
    
    const created = await ContestSubmissionModel.create(doc);
    console.log(`[CONTEST-STORAGE] Submission created successfully: ${doc.id}`);
    
    // Add submission ID to participant's submissions array
    const updateResult = await ContestParticipantModel.updateOne(
      { contestId: doc.contestId, userId: doc.userId },
      { $push: { submissions: doc.id } as any }
    );
    console.log(`[CONTEST-STORAGE] Updated participant submissions array: modifiedCount=${updateResult.modifiedCount}, matchedCount=${updateResult.matchedCount}`);

    // Update participant's problem-solving status
    await this.updateParticipantProblemStatus(
      doc.contestId, 
      doc.userId, 
      doc.problemId, 
      doc.status, 
      doc.points || 0
    );

    return created.toObject() as any;
  }

  async getContestSubmissions(contestId: string, userId?: string): Promise<ContestSubmissionDocument[]> {
    const query: any = { contestId };
    if (userId) query.userId = userId;
    const list = await ContestSubmissionModel.find(query).sort({ submissionTime: -1 }).lean();
    return list as any;
  }

  async getParticipantSubmissions(contestId: string, userId: string): Promise<ContestSubmissionDocument[]> {
    const list = await ContestSubmissionModel.find({ contestId, userId }).sort({ submissionTime: -1 }).lean();
    return list as any;
  }

  async generateLeaderboard(contestId: string): Promise<ContestLeaderboardEntry[]> {
    // Load contest for problem points and ids
    const contest: any = await ContestModel.findOne({ id: contestId }).lean();
    const problemPoints: Record<string, number> = {};
    for (const p of contest?.problems || []) {
      problemPoints[(p as any).id] = (p as any).points || 0;
    }

    // Fetch all enrolled participants first
    const participants: any[] = await ContestParticipantModel.find({ contestId }).lean();
    console.log(`[CONTEST-LEADERBOARD] Found ${participants.length} enrolled participants for contest ${contestId}`);

    // Fetch all submissions for contest
    const allSubs: any[] = await ContestSubmissionModel.find({ contestId }).sort({ submissionTime: 1 }).lean();
    console.log(`[CONTEST-LEADERBOARD] Found ${allSubs.length} total submissions for contest ${contestId}`);
    if (allSubs.length > 0) {
      console.log(`[CONTEST-LEADERBOARD] Sample submissions:`, allSubs.slice(0, 3).map(s => ({
        userId: s.userId,
        problemId: s.problemId,
        status: s.status,
        points: s.points,
        submissionTime: s.submissionTime
      })));
    }

    // If no participants are enrolled, return empty array
    if (participants.length === 0) return [] as any;

    // Initialize all enrolled participants with zero scores
    interface Aggregate {
      userId: string;
      problemScores: Record<string, number>;
      totalScore: number;
      totalPenalty: number;
      problemsSolved: number;
      submissions: number;
      lastSubmission: Date | null;
    }
    const byUser = new Map<string, Aggregate>();

    // Initialize all enrolled participants
    for (const participant of participants) {
      byUser.set(participant.userId, {
        userId: participant.userId,
        problemScores: {} as Record<string, number>,
        totalScore: 0,
        totalPenalty: 0,
        problemsSolved: 0,
        submissions: 0,
        lastSubmission: null,
      });
    }

    // Process submissions to update scores
    for (const s of allSubs) {
      const agg = byUser.get(s.userId);
      if (!agg) {
        console.log(`[CONTEST-LEADERBOARD] Warning: Submission from unenrolled user ${s.userId}`);
        continue; // Skip submissions from users not enrolled
      }

      agg.submissions += 1;
      console.log(`[CONTEST-LEADERBOARD] User ${s.userId} submission ${agg.submissions}: problem ${s.problemId}, status ${s.status}, points ${s.points}`);
      if (!agg.lastSubmission || (s.submissionTime && s.submissionTime > agg.lastSubmission)) {
        agg.lastSubmission = s.submissionTime || null;
      }

      const pointsForProblem = s.points ?? problemPoints[s.problemId] ?? 0;
      const currentBest = agg.problemScores[s.problemId] || 0;
      const isAccepted = (s.status || '').toLowerCase() === 'accepted';
      const scoreThisAttempt = isAccepted ? pointsForProblem : 0;

      if (scoreThisAttempt > currentBest) {
        // Update score delta and solved count if threshold crossed from 0 to >0
        if (currentBest === 0 && scoreThisAttempt > 0) {
          agg.problemsSolved += 1;
        }
        agg.totalScore += scoreThisAttempt - currentBest;
        agg.problemScores[s.problemId] = scoreThisAttempt;
      }
    }

    // Optional: enrich usernames
    const cache = new Map<string, string>();
    const getDisplayName = async (userId: string) => {
      if (cache.has(userId)) return cache.get(userId)!;
      const u = await this.getUser(userId);
      const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.email || userId;
      cache.set(userId, name);
      return name;
    };

    // Assemble entries with ranks
    const entriesRaw = Array.from(byUser.values());
    entriesRaw.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (a.totalPenalty !== b.totalPenalty) return a.totalPenalty - b.totalPenalty;
      const at = a.lastSubmission ? a.lastSubmission.getTime() : 0;
      const bt = b.lastSubmission ? b.lastSubmission.getTime() : 0;
      return at - bt;
    });

    // Create participant map for contestEndMethod lookup
    const participantMap = new Map(participants.map(p => [p.userId, p]));

    const result: any[] = [];
    let rank = 1;
    for (const e of entriesRaw) {
      const participant = participantMap.get(e.userId);
      const contestEndMethod = participant?.contestEndMethod || null;
      
      result.push({
        rank: rank++,
        userId: e.userId,
        userName: await getDisplayName(e.userId),
        totalScore: e.totalScore,
        totalPenalty: e.totalPenalty,
        problemsSolved: e.problemsSolved,
        submissions: e.submissions,
        lastSubmission: e.lastSubmission ? e.lastSubmission.toISOString() : '',
        problemScores: e.problemScores,
        contestEndMethod: contestEndMethod,
      });
    }

    return result as any;
  }

  async updateRankings(contestId: string): Promise<boolean> {
    const leaderboard = await this.generateLeaderboard(contestId);
    for (const entry of leaderboard) {
      await ContestParticipantModel.updateOne(
        { contestId, userId: entry.userId },
        { $set: { rank: entry.rank } }
      );
    }
    return true;
  }

  async getContestAnalytics(contestId: string): Promise<ContestAnalytics> {
    const participantsCount = await ContestParticipantModel.countDocuments({ contestId });
    const submissionsCount = await ContestSubmissionModel.countDocuments({ contestId });
    const contest: any = await ContestModel.findOne({ id: contestId }).lean();
    if (!contest) {
      throw new Error('Contest not found');
    }
    const problemStatistics: any[] = [];
    for (const problem of contest.problems || []) {
      const problemSubmissions: any[] = await ContestSubmissionModel.find({ contestId, problemId: (problem as any).id }).lean();
      const successful = problemSubmissions.filter((s: any) => (s.status || '').toLowerCase() === 'accepted').length;
      problemStatistics.push({
        problemId: (problem as any).id,
        totalAttempts: problemSubmissions.length,
        successfulSolutions: successful,
      });
    }
    return {
      contestId,
      totalParticipants: participantsCount,
      totalSubmissions: submissionsCount,
      problemStatistics,
      averageScore: 0,
      successRate: 0,
      recentActivity: [],
    } as any;
  }

  async submitQuestion(question: Omit<ContestQuestionType, 'id'>): Promise<ContestQuestionType> {
    const q: any = { ...question, id: new ObjectId().toString(), isPublic: (question as any).isPublic ?? false };
    const created = await ContestQuestionModel.create(q);
    return created.toObject() as any;
  }

  async answerQuestion(questionId: string, answer: string, answeredBy: string): Promise<boolean> {
    const result = await ContestQuestionModel.updateOne(
      { id: questionId },
      { 
        $set: { 
          answer, 
          answeredBy, 
          answeredAt: new Date(),
          status: 'answered' 
        } 
      }
    );
    return (result.modifiedCount || 0) > 0;
  }

  async getContestQuestions(contestId: string, isPublic?: boolean): Promise<ContestQuestionType[]> {
    const query: any = { contestId };
    if (isPublic !== undefined) query.isPublic = isPublic;
    const list = await ContestQuestionModel.find(query).sort({ timestamp: -1 }).lean();
    return list as any;
  }

  async addAnnouncement(contestId: string, message: string, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<boolean> {
    const announcement = {
      id: new ObjectId().toString(),
      message,
      timestamp: new Date(),
      priority,
      isGlobal: true
    };
    const result = await ContestModel.updateOne(
      { id: contestId },
      { 
        $push: { announcements: announcement },
        $set: { updatedAt: new Date() }
      }
    );
    return (result.modifiedCount || 0) > 0;
  }

  async getAnnouncements(contestId: string): Promise<ContestType['announcements']> {
    const contest: any = await ContestModel.findOne({ id: contestId }).lean();
    return contest?.announcements || [];
  }

  // Method to fetch all problems for selection
  async getAllProblems(): Promise<any[]> {
    try {
      // Using existing Problem model shape; adapt to expected fields
      const problems = await Problem.find({}).sort({ problemNumber: 1 }).lean();
      return problems.map((p: any) => ({
        id: p.problemNumber,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        points: 100,
        testCases: p.testCases || [],
        examples: p.examples || [],
        starterCode: p.starterCode || {},
        tags: p.tags || [],
      }));
    } catch (error) {
      console.error('Error fetching problems for contest:', error);
      return [];
    }
  }

  // Method to create contest problem instances from selected problems
  async createContestProblemInstances(selectedProblems: any[], contestId: string): Promise<any[]> {
    const problemInstances = selectedProblems.map((problem, index) => ({
      id: `${contestId}_${problem.id}_${Date.now()}_${index}`,
      originalProblemId: problem.id,
      title: problem.title,
      description: problem.description,
      difficulty: problem.difficulty,
      points: problem.points || 100, // Use points from frontend or default to 100
      order: index,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      constraints: problem.constraints,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      maxSubmissions: undefined,
      partialScoring: false,
      // Copy test cases and examples (like in Assignments/Courses)
      customTestCases: problem.testCases,
      customExamples: problem.examples,
      customStarterCode: problem.starterCode,
      // Copy all other problem properties
      tags: problem.tags || [],
      notes: problem.notes || "",
      examples: problem.examples || [],
      testCases: problem.testCases || [],
      starterCode: problem.starterCode || {}
    }));

    return problemInstances;
  }
}

export const contestStorage = new ContestStorage();