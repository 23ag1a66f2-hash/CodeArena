import { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { ObjectId } from 'mongodb';
import { ProblemSet as ProblemSetModel } from '../models/ProblemSet';
import { User } from '../models/User';
import { ProblemSetEnrollment } from '../models/ProblemSetEnrollment';
import { connectToMongoDB } from '../db';
import { storage } from '../storage';
import { getDb } from '../db';

function normalizeInstances(instances: any[] | undefined) {
  if (!Array.isArray(instances)) return [] as any[];
  return instances.map((inst: any) => {
    if (!inst) return inst;
    const withId = !inst.id && inst._id ? { ...inst, id: String(inst._id) } : inst;

    // Provide UI-friendly fields mirrored from custom* fields and synonyms
    const originalProblemId = withId.originalProblemId ?? withId.problemId ?? withId.selectedProblemId;
    const starterCode = withId.customStarterCode ?? withId.starterCode ?? {};
    const testCases = withId.customTestCases ?? withId.testCases ?? [];
    const examples = withId.customExamples ?? withId.examples ?? [];
    const setNotes = withId.setNotes ?? withId.notes ?? '';

    return {
      ...withId,
      originalProblemId,
      starterCode,
      testCases,
      examples,
      setNotes,
    };
  });
}

export async function listProblemSets(req: Request, res: Response) {
  try {
    const { status, difficulty, category } = req.query as Record<string, string | undefined>;
    const query: any = {};
    if (status) query.status = status;
    if (difficulty) query.difficulty = difficulty;
    if (category) query.category = category;

    const results = await ProblemSetModel.find(query).sort({ createdAt: -1 }).lean();
    
    // Check if this is an admin request by looking at the URL path
    const isAdminRequest = req.originalUrl?.includes('/api/admin/');
    
    let problemSets;
    if (isAdminRequest) {
      // For admin requests, include enrollment counts
      const { ProblemSetEnrollment } = await import('../models/ProblemSetEnrollment');
      
      problemSets = await Promise.all(results.map(async (ps: any) => {
        const normalized = normalizeInstances(ps.problemInstances);
        const actualProblemCount = normalized.length || ps.problemIds?.length || 0;
        
        // Get enrollment count for this problem set
        const enrollmentCount = await ProblemSetEnrollment.countDocuments({ 
          problemSetId: ps.id || String(ps._id) 
        });
        
        return {
          ...ps,
          problemInstances: normalized,
          // Maintain compatibility for callers expecting a 'problems' array
          problems: normalized,
          tags: ps.tags || [],
          totalProblems: actualProblemCount,
          allowDirectEnrollment: ps.allowDirectEnrollment === true,
          enrollmentCount,
        };
      }));
    } else {
      // For public requests, don't include enrollment counts
      problemSets = results.map((ps: any) => {
        const normalized = normalizeInstances(ps.problemInstances);
        const actualProblemCount = normalized.length || ps.problemIds?.length || 0;
        return {
          ...ps,
          problemInstances: normalized,
          // Maintain compatibility for callers expecting a 'problems' array
          problems: normalized,
          tags: ps.tags || [],
          totalProblems: actualProblemCount,
          allowDirectEnrollment: ps.allowDirectEnrollment === true,
        };
      });
    }
    
    res.json(problemSets);
  } catch (error) {
    console.error('Error fetching problem sets:', error);
    res.status(500).json({ message: 'Failed to fetch problem sets' });
  }
}

export async function getProblemSetById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    let ps: any = await ProblemSetModel.findOne({ id }).lean();
    if (!ps) {
      // Try Mongo _id as fallback
      try {
        ps = await ProblemSetModel.findById(id).lean();
      } catch {}
    }
    if (!ps) return res.status(404).json({ message: 'Problem set not found' });
    
    const normalized = normalizeInstances(ps.problemInstances);
    const actualProblemCount = normalized.length || ps.problemIds?.length || 0;
    
    // Check if this is an admin request by looking at the URL path
    const isAdminRequest = req.originalUrl?.includes('/api/admin/');
    
    let sanitizedProblemSet: any = {
      ...ps,
      problemInstances: normalized,
      problems: normalized,
      tags: ps.tags || [],
      totalProblems: actualProblemCount,
      allowDirectEnrollment: ps.allowDirectEnrollment === true,
    };
    
    if (isAdminRequest) {
      // For admin requests, include enrollment count
      const { ProblemSetEnrollment } = await import('../models/ProblemSetEnrollment');
      const enrollmentCount = await ProblemSetEnrollment.countDocuments({ 
        problemSetId: ps.id || String(ps._id) 
      });
      sanitizedProblemSet.enrollmentCount = enrollmentCount;
    }
    
    res.json(sanitizedProblemSet);
  } catch (error) {
    console.error('Error fetching problem set:', error);
    res.status(500).json({ message: 'Failed to fetch problem set' });
  }
}

export async function createProblemSet(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });

    // Ensure required fields for schema
    const now = new Date();
    const problemSetData = {
      id: new ObjectId().toString(),
      title: String(req.body?.title || ''),
      description: String(req.body?.description || ''),
      difficulty: String(req.body?.difficulty || 'easy'),
      category: String(req.body?.category || ''),
      estimatedTime: Number(req.body?.estimatedTime || 1),
      tags: Array.isArray(req.body?.tags) ? req.body.tags : [],
      createdBy: String(req.user.id),
      isPublic: true,
      problemIds: [],
      problemInstances: [],
      participants: [],
      totalProblems: 0,
      createdAt: now,
      updatedAt: now,
    } as any;

    const created = await ProblemSetModel.create(problemSetData);
    res.status(201).json(created);
  } catch (error: any) {
    console.error('Error creating problem set:', error);
    res.status(400).json({ message: 'Failed to create problem set', error: error.message });
  }
}

export async function updateProblemSet(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };
    const updated = await ProblemSetModel.findOneAndUpdate({ id }, { $set: updateData }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Problem set not found' });
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating problem set:', error);
    res.status(400).json({ message: 'Failed to update problem set', error: error.message });
  }
}

export async function deleteProblemSet(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const { id } = req.params;
    const result = await ProblemSetModel.deleteOne({ id });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Problem set not found' });
    res.json({ message: 'Problem set deleted successfully' });
  } catch (error) {
    console.error('Error deleting problem set:', error);
    res.status(500).json({ message: 'Failed to delete problem set' });
  }
}

export async function addProblemInstance(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const { id } = req.params;

    // Determine original problem reference
    const selectedProblemIdRaw = req.body?.selectedProblemId ?? req.body?.originalProblemId ?? req.body?.problemId;
    const selectedProblemId = selectedProblemIdRaw ? parseInt(String(selectedProblemIdRaw)) : undefined;
    if (!selectedProblemId || Number.isNaN(selectedProblemId)) {
      return res.status(400).json({ message: 'selectedProblemId (or originalProblemId/problemId) is required and must be numeric' });
    }

    // Load the problem set to compute order and ensure existence
    const existingPs: any = await ProblemSetModel.findOne({ id }).lean();
    if (!existingPs) return res.status(404).json({ message: 'Problem set not found' });
    const currentInstances: any[] = Array.isArray(existingPs.problemInstances) ? existingPs.problemInstances : [];
    const nextOrder = (currentInstances.length || 0) + 1; // Schema min is 1

    // Fetch original problem from DB (raw collection used across app)
    const db = await connectToMongoDB();
    const originalProblem = await db.collection('problems').findOne({ id: selectedProblemId });
    if (!originalProblem) {
      return res.status(404).json({ message: 'Original problem not found' });
    }

    // Build problem instance by cloning original problem with optional overrides
    const generatedSubId = new ObjectId();
    const nowIso = new Date().toISOString();

    const override = req.body || {};

    const problemInstance: any = {
      // Required instance identity
      id: generatedSubId.toString(),
      _id: generatedSubId,

      // Required reference as per model schema
      problemId: originalProblem.id,

      // General display/metadata with overrides
      title: override.title ?? originalProblem.title,
      description: override.description ?? originalProblem.description,
      difficulty: (override.difficulty ?? originalProblem.difficulty) as any,
      constraints: override.constraints ?? originalProblem.constraints,
      inputFormat: override.inputFormat ?? originalProblem.inputFormat,
      outputFormat: override.outputFormat ?? originalProblem.outputFormat,
      notes: override.notes ?? originalProblem.notes,

      // Limits with overrides
      timeLimit: override.timeLimit ?? originalProblem.timeLimit,
      memoryLimit: override.memoryLimit ?? originalProblem.memoryLimit,

      // Instance-specific customizable payloads (persisted by schema)
      customStarterCode: override.starterCode ?? originalProblem.starterCode ?? {},
      customTestCases: override.testCases ?? originalProblem.testCases ?? [],
      customExamples: override.examples ?? originalProblem.examples ?? [],

      // Ordering and lifecycle
      order: typeof override.order === 'number' && override.order >= 1 ? override.order : nextOrder,
      isCustomized: true,
      lastModified: nowIso,
      modifiedBy: String(req.user?.id || ''),
    };

    // Persist instance
    const updated = await ProblemSetModel.findOneAndUpdate(
      { id },
      { $push: { problemInstances: problemInstance }, $set: { updatedAt: new Date() } },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: 'Problem set not found' });
    res.status(201).json(problemInstance);
  } catch (error: any) {
    console.error('Error adding problem instance:', error);
    res.status(400).json({ message: 'Failed to add problem instance', error: error.message });
  }
}

export async function updateProblemInstance(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const { id, problemId } = req.params;
    const body = req.body || {};
    
    console.log(`[PROBLEM-SETS-CONTROLLER] 🔄 Updating problem instance ${problemId} in problem set ${id}`);
    console.log(`[PROBLEM-SETS-CONTROLLER] Updates to apply:`, body);
    
    // First, get the current problem instance to preserve existing fields
    const problemSet = await ProblemSetModel.findOne({ id }).lean();
    if (!problemSet) {
      console.log(`[PROBLEM-SETS-CONTROLLER] ❌ Problem set ${id} not found`);
      return res.status(404).json({ message: 'Problem set not found' });
    }
    
    const isObjectId = ObjectId.isValid(problemId);
    const currentProblemInstance = problemSet.problemInstances?.find(p => 
      isObjectId ? String(p._id) === problemId : p.id === problemId
    );
    
    if (!currentProblemInstance) {
      console.log(`[PROBLEM-SETS-CONTROLLER] ❌ Problem instance ${problemId} not found`);
      return res.status(404).json({ message: 'Problem instance not found' });
    }
    
    console.log(`[PROBLEM-SETS-CONTROLLER] Current problem instance:`, {
      id: currentProblemInstance.id,
      _id: currentProblemInstance._id,
      title: currentProblemInstance.title,
      selectedProblemId: currentProblemInstance.selectedProblemId,
      originalProblemId: currentProblemInstance.originalProblemId
    });
    
    const updateData: any = {
      ...body,
      // Normalize UI fields back to stored schema fields
      customStarterCode: body.starterCode ?? body.customStarterCode,
      customTestCases: body.testCases ?? body.customTestCases,
      customExamples: body.examples ?? body.customExamples,
      notes: body.setNotes ?? body.notes,
      lastModified: new Date().toISOString(),
    };
    
    // Merge updates with existing problem instance data, preserving important fields
    const updatedProblemInstance = {
      ...currentProblemInstance,
      ...updateData,
      // Preserve these critical fields if they exist
      selectedProblemId: updateData.selectedProblemId !== undefined ? updateData.selectedProblemId : currentProblemInstance.selectedProblemId,
      originalProblemId: updateData.originalProblemId !== undefined ? updateData.originalProblemId : currentProblemInstance.originalProblemId,
      // Always preserve the problem ID
      id: currentProblemInstance.id,
      _id: currentProblemInstance._id,
      updatedAt: new Date()
    };
    
    console.log(`[PROBLEM-SETS-CONTROLLER] Updated problem instance:`, {
      id: updatedProblemInstance.id,
      _id: updatedProblemInstance._id,
      title: updatedProblemInstance.title,
      selectedProblemId: updatedProblemInstance.selectedProblemId,
      originalProblemId: updatedProblemInstance.originalProblemId
    });
    
    const match: any = isObjectId
      ? { id, 'problemInstances._id': new ObjectId(problemId) }
      : { id, 'problemInstances.id': problemId };

    const setPath = isObjectId ? 'problemInstances.$' : 'problemInstances.$';

    const result = await ProblemSetModel.findOneAndUpdate(
      match,
      { $set: { [setPath]: updatedProblemInstance, updatedAt: new Date() } },
      { new: true }
    ).lean();
    
    if (!result) {
      console.log(`[PROBLEM-SETS-CONTROLLER] ❌ Update failed - no result returned`);
      return res.status(404).json({ message: 'Problem set or problem instance not found' });
    }
    
    console.log(`[PROBLEM-SETS-CONTROLLER] ✅ Problem instance updated successfully`);
    res.json({ message: 'Problem instance updated successfully' });
  } catch (error: any) {
    console.error('Error updating problem instance:', error);
    res.status(400).json({ message: 'Failed to update problem instance', error: error.message });
  }
}

export async function deleteProblemInstance(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const { id, problemId } = req.params;
    // First, ensure the problem set exists
    const ps: any = await ProblemSetModel.findOne({ id }).lean();
    if (!ps) return res.status(404).json({ message: 'Problem set not found' });

    const isObjectId = ObjectId.isValid(problemId);

    // Delete by subdocument _id (preferred) or legacy id
    const update = await ProblemSetModel.updateOne(
      isObjectId ? { id } : { id },
      isObjectId
        ? ({ $pull: { problemInstances: { _id: new ObjectId(problemId) } }, $set: { updatedAt: new Date() } } as any)
        : ({ $pull: { problemInstances: { id: problemId } }, $set: { updatedAt: new Date() } } as any)
    );

    if (!update || update.modifiedCount === 0) {
      return res.status(404).json({ message: 'Problem instance not found' });
    }

    res.json({ message: 'Problem instance deleted successfully' });
  } catch (error) {
    console.error('Error deleting problem instance:', error);
    res.status(500).json({ message: 'Failed to delete problem instance' });
  }
}

export async function listProblemSetEnrollments(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const { id } = req.params;
    
    console.log('Fetching enrollments for problem set:', id);
    const enrollments = await storage.getProblemSetEnrollments(id);
    console.log('Found enrollments:', enrollments.length);
    
    res.json(enrollments);
  } catch (error: any) {
    console.error('Error fetching problem set enrollments:', error);
    res.status(500).json({ message: 'Failed to fetch enrollments' });
  }
}

export async function enrollUserInProblemSet(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const { id } = req.params;
    const userIds: string[] = Array.isArray(req.body?.userIds) && req.body.userIds.length
      ? req.body.userIds
      : (req.body?.userId ? [String(req.body.userId)] : []);
    if (userIds.length === 0) return res.status(400).json({ message: 'No userIds provided' });
    
    console.log('=== ENROLLMENT REQUEST START ===');
    console.log('Enrollment request:', { problemSetId: id, userIds, userIdsType: typeof userIds, userIdsLength: userIds.length });
    console.log('Problem set ID type:', typeof id);
    console.log('Problem set ID value:', id);
    console.log('User IDs:', userIds.map(uid => ({ id: uid, type: typeof uid })));
    
    // Verify the problem set exists before attempting enrollment
    const db = getDb();
    const problemSetCheck = await db.collection('problemsets').findOne({ id: id });
    console.log('Problem set verification:', {
      found: !!problemSetCheck,
      problemSetId: problemSetCheck?.id,
      problemSetMongoId: problemSetCheck?._id,
      currentParticipants: problemSetCheck?.participants
    });
    
    // Use storage system for enrollment
    const enrollments = [];
    let inserted = 0;
    
    for (const userId of userIds) {
      try {
        console.log('Enrolling user:', userId, 'in problem set:', id);
        const enrollment = await storage.enrollUserInProblemSet(userId, id);
        enrollments.push(enrollment);
        inserted += 1;
        console.log('Successfully enrolled user:', userId);
        console.log('=== ENROLLMENT REQUEST END ===');
      } catch (error: any) {
        console.error(`Error enrolling user ${userId}:`, error);
        // Continue with other users even if one fails
      }
    }

    // Get total enrollment count
    const allEnrollments = await storage.getProblemSetEnrollments(id);
    const total = allEnrollments.length;
    
    res.json({ 
      message: 'Enrolled successfully', 
      totalParticipants: total, 
      inserted,
      enrollments 
    });
  } catch (error: any) {
    console.error('Error enrolling user:', error);
    res.status(400).json({ message: 'Failed to enroll user', error: error.message });
  }
}

export async function removeUserFromProblemSet(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const { id, userId } = req.params;
    
    console.log('Removing user from problem set:', { problemSetId: id, userId });
    
    // Use storage system to remove user from problem set
    await storage.deleteProblemSetEnrollmentByUser(userId, id);
    
    res.json({ message: 'User removed from enrollment successfully' });
  } catch (error: any) {
    console.error('Error removing user from enrollment:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: 'User enrollment not found' });
    }
    res.status(500).json({ message: 'Failed to remove user from enrollment' });
  }
} 