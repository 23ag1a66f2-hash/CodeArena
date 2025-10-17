import { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';
import { insertCourseModuleSchema } from '../shared-schema.js';
import { CourseModule } from '../models/CourseModule.js';
import { executionServicePromise } from '../services/executionService.js';
import { storage } from '../storage.js';

export async function getModuleById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const module = await storage.getCourseModule(id);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    res.json(module);
  } catch (error) {
    console.error('Error fetching module:', error);
    res.status(500).json({ message: 'Failed to fetch module' });
  }
}

export async function createModule(req: AuthRequest, res: Response) {
  try {
    const courseId = parseInt(req.params.id);
    const raw = req.body || {};
    const sanitized = {
      ...raw,
      courseId,
      order: raw.order !== undefined ? Number(raw.order) : undefined,
      videoUrl: raw.videoUrl === '' ? undefined : raw.videoUrl,
      textContent: raw.textContent === '' ? undefined : raw.textContent,
      codeExample: raw.codeExample === '' ? undefined : raw.codeExample,
      expectedOutput: raw.expectedOutput === '' ? undefined : raw.expectedOutput,
      language: raw.language === '' ? undefined : raw.language,
      title: raw.title === '' ? undefined : raw.title,
      description: raw.description === '' ? undefined : raw.description,
    } as any;
    const validatedData = insertCourseModuleSchema.parse(sanitized);
    
    const module = await storage.createCourseModule(validatedData);
    res.status(201).json(module);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating module:', error);
    res.status(500).json({ message: 'Failed to create module' });
  }
}

export async function updateModule(req: AuthRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const raw = req.body || {};
    const sanitized = {
      ...raw,
      order: raw.order !== undefined ? Number(raw.order) : undefined,
      videoUrl: raw.videoUrl === '' ? undefined : raw.videoUrl,
      textContent: raw.textContent === '' ? undefined : raw.textContent,
      codeExample: raw.codeExample === '' ? undefined : raw.codeExample,
      expectedOutput: raw.expectedOutput === '' ? undefined : raw.expectedOutput,
      language: raw.language === '' ? undefined : raw.language,
      title: raw.title === '' ? undefined : raw.title,
      description: raw.description === '' ? undefined : raw.description,
    } as any;
    const validatedData = insertCourseModuleSchema.partial().parse(sanitized);
    
    const module = await storage.updateCourseModule(id, validatedData);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    res.json(module);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error updating module:', error);
    res.status(500).json({ message: 'Failed to update module' });
  }
}

export async function deleteModule(req: AuthRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    const module = await storage.getCourseModule(id);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    
    await storage.deleteCourseModule(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting module:', error);
    res.status(500).json({ message: 'Failed to delete module' });
  }
}

export async function executeModule(req: Request, res: Response) {
  try {
    const { code, language, input } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({ 
        message: 'Code and language are required' 
      });
    }

    console.log(`[MODULES-CONTROLLER] 🚀 Executing module code:`, {
      language,
      codeLength: code.length,
      hasInput: !!input
    });
    
    const executionService = await executionServicePromise;
    const result = await executionService.executeCode(code, language, input);
    
    console.log(`[MODULES-CONTROLLER] ✅ Module execution completed:`, {
      success: !result.error,
      outputLength: result.output?.length || 0,
      error: result.error
    });

    res.json({
      success: !result.error,
      output: result.output,
      error: result.error,
      runtime: result.runtime,
      memory: result.memory
    });
  } catch (error: any) {
    console.error(`[MODULES-CONTROLLER] ❌ Module execution failed:`, error);
    res.status(500).json({ 
      message: 'Failed to execute code',
      error: error.message 
    });
  }
}