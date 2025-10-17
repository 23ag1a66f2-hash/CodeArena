import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Plus, ArrowLeft, Edit, Trash2, Settings, Eye, Calendar, X, BarChart3, RefreshCw } from 'lucide-react';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { config } from '@/config';


interface Problem {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  memoryLimit: number;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    explanation?: string;
    isHidden?: boolean;
  }>;
  starterCode: Record<string, string>;
}

interface ProblemInstance {
  id?: string; // legacy id
  _id?: string; // subdocument id
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'customized' | 'default';
  basedOn?: string; // Original problem title
  lastModified: string;
  setNotes?: string;
  points: number;
  timeLimit: number;
  memoryLimit: number;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  examples?: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  testCases?: Array<{
    input: string;
    expectedOutput: string;
    explanation?: string;
    isHidden?: boolean;
  }>;
  starterCode?: Record<string, string>;
}

interface ProblemSet {
  id: string;
  title: string;
  description: string;
  problems?: ProblemInstance[];
  problemInstances?: ProblemInstance[];
}

const problemInstanceSchema = z.object({
  // Optional during edit; required only when creating (checked in onSubmit)
  selectedProblemId: z.union([z.string(), z.number()]).optional().transform(val => (val === undefined ? '' : String(val))),
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  points: z.number().min(1, 'Points must be at least 1'),
  timeLimit: z.number().min(1, 'Time limit must be at least 1'),
  memoryLimit: z.number().min(1, 'Memory limit must be at least 1'),
  constraints: z.string().optional(),
  inputFormat: z.string().optional(),
  outputFormat: z.string().optional(),
  setNotes: z.string().optional(),
  starterCode: z.record(z.string(), z.string()).optional(),
  testCases: z.array(z.object({
    input: z.string().min(1, 'Input is required'),
    expectedOutput: z.string().min(1, 'Expected output is required'),
    explanation: z.string().optional(),
    isHidden: z.boolean().optional(),
  })).optional(),
});

export default function ProblemInstanceManagement() {
  const { problemSetId, contestId } = useParams();
  const [, setLocation] = useLocation();
  
  // Determine if we're managing problems for a contest or problem set
  const isContestMode = !!contestId;
  const entityId = contestId || problemSetId;
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<ProblemInstance | null>(null);
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [showEvaluationsDialog, setShowEvaluationsDialog] = useState(false);
  const [evaluationInstance, setEvaluationInstance] = useState<ProblemInstance | null>(null);
  const [showOverallAnalyticsDialog, setShowOverallAnalyticsDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof problemInstanceSchema>>({
    resolver: zodResolver(problemInstanceSchema),
    defaultValues: {
      selectedProblemId: '',
      title: '',
      description: '',
      difficulty: 'easy',
      points: 100,
      timeLimit: 1000,
      memoryLimit: 256,
      constraints: '',
      inputFormat: '',
      outputFormat: '',
      setNotes: '',
      starterCode: {},
      testCases: [{
        input: '',
        expectedOutput: '',
        explanation: '',
        isHidden: false,
      }],
    },
  });

  // Fetch entity details (problem set or contest)
  const { data: problemSet, isLoading } = useQuery<ProblemSet>({
    queryKey: [isContestMode ? '/api/admin/contests' : '/api/admin/problem-sets', entityId],
    queryFn: async () => {
      const endpoint = isContestMode 
        ? `/api/admin/contests/${entityId}` 
        : `/api/admin/problem-sets/${entityId}`;
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error(`Failed to fetch ${isContestMode ? 'contest' : 'problem set'}`);
      const data = await response.json();
      // Normalize instances to ensure id exists
      const instances = (data.problemInstances || data.problems || []).map((p: any) => ({
        ...p,
        id: p.id || p._id,
      }));
      return { ...data, problemInstances: instances, problems: instances } as ProblemSet;
    },
  });

  // Fetch all available problems for selection
  const { data: availableProblems, isLoading: isLoadingProblems } = useQuery<Problem[]>({
    queryKey: ['/api/problems'],
    queryFn: async () => {
      const response = await fetch(`${config.apiUrl}/api/problems`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch problems');
      return response.json();
    },
  });

  // Create problem instance mutation
  const createProblemInstanceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof problemInstanceSchema>) => {
      const endpoint = isContestMode 
        ? `/api/admin/contests/${entityId}/problems` 
        : `/api/admin/problem-sets/${entityId}/problems`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create problem instance');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [isContestMode ? '/api/admin/contests' : '/api/admin/problem-sets', entityId] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: 'Success',
        description: 'Problem instance created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete problem instance mutation
  const deleteProblemInstanceMutation = useMutation({
    mutationFn: async (problemId: string) => {
      const endpoint = isContestMode 
        ? `/api/admin/contests/${entityId}/problems/${problemId}` 
        : `/api/admin/problem-sets/${entityId}/problems/${problemId}`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete problem instance: ${response.status} ${errorText}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [isContestMode ? '/api/admin/contests' : '/api/admin/problem-sets', entityId] });
      toast({
        title: 'Success',
        description: 'Problem instance deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update problem instance mutation
  const updateProblemInstanceMutation = useMutation({
    mutationFn: async ({ problemId, data }: { problemId: string; data: z.infer<typeof problemInstanceSchema> }) => {
      const endpoint = isContestMode 
        ? `/api/admin/contests/${entityId}/problems/${problemId}` 
        : `/api/admin/problem-sets/${entityId}/problems/${problemId}`;
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update problem instance');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [isContestMode ? '/api/admin/contests' : '/api/admin/problem-sets', entityId] });
      setIsCreateDialogOpen(false);
      setEditingProblem(null);
      setEditingProblemId(null);
      form.reset();
      toast({
        title: 'Success',
        description: 'Problem instance updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: z.infer<typeof problemInstanceSchema>) => {
    if (editingProblem && editingProblemId) {
      updateProblemInstanceMutation.mutate({ problemId: editingProblemId, data });
    } else {
      // Create path requires selecting a base problem
      if (!data.selectedProblemId) {
        toast({
          title: 'Select a problem',
          description: 'Please select a problem to create an instance from.',
          variant: 'destructive',
        });
        return;
      }
      const selectedProblem = availableProblems?.find(p => String(p.id) === String(data.selectedProblemId));
      const problemTitle = selectedProblem?.title || data.title;
      // Create
      createProblemInstanceMutation.mutate(data);
    }
  };

  const handleEdit = (problem: ProblemInstance) => {
    // normalize id: prefer _id, else id
    const effectiveId = (problem as any)._id || problem.id || '';
    setEditingProblem(problem);
    setEditingProblemId(String(effectiveId));
    
    // If we have the original selection id stored, prefer it. Otherwise try to match by title.
    let selectedProblemId = '';
    if (availableProblems) {
      const originalRef = (problem as any).problemId || (problem as any).originalProblemId;
      if (originalRef) {
        const byId = availableProblems.find(p => String(p.id) === String(originalRef));
        if (byId) selectedProblemId = String(byId.id);
      }
      if (!selectedProblemId) {
        const byTitle = availableProblems.find(p => p.title === problem.title || p.title === (problem as any).basedOn);
        if (byTitle) selectedProblemId = String(byTitle.id);
      }
    }

    form.reset({
      selectedProblemId: selectedProblemId || '',
      title: problem.title || '',
      description: problem.description || '',
      difficulty: problem.difficulty || 'easy',
      points: problem.points || 100,
      timeLimit: problem.timeLimit || 1000,
      memoryLimit: problem.memoryLimit || 256,
      constraints: problem.constraints || '',
      inputFormat: problem.inputFormat || '',
      outputFormat: problem.outputFormat || '',
      setNotes: problem.setNotes || '',
      starterCode: problem.starterCode || {},
      testCases: (problem.testCases && problem.testCases.length > 0)
        ? problem.testCases.map(tc => ({
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
            explanation: tc.explanation || '',
            isHidden: tc.isHidden || false,
          }))
        : [{ input: '', expectedOutput: '', explanation: '', isHidden: false }],
    });
    setIsCreateDialogOpen(true);
  };

  // const handleEvaluations = (problem: ProblemInstance) => {
  //   // Open inline dialog instead of navigating to a non-existent route
  //   setEvaluationInstance(problem);
  //   setShowEvaluationsDialog(true);
  // };

  // Auto-populate form when a problem is selected (only for new instances, not editing)
  const selectedProblemId = form.watch('selectedProblemId');
  
  useEffect(() => {
    console.log('Auto-populate effect triggered:', { 
      selectedProblemId, 
      availableProblemsCount: availableProblems?.length,
      isEditing: !!editingProblem 
    });
    
    // Only auto-populate if we're not editing an existing problem instance
    if (selectedProblemId && availableProblems && !editingProblem) {
      const selectedProblem = availableProblems.find(p => p.id === selectedProblemId);
      console.log('Selected problem found:', selectedProblem);
      
      if (selectedProblem) {
        console.log('Populating form with problem data:', selectedProblem.title);
        
        // Use setValue with shouldValidate and shouldDirty options
        form.setValue('title', selectedProblem.title, { shouldValidate: true, shouldDirty: true });
        form.setValue('description', selectedProblem.description, { shouldValidate: true, shouldDirty: true });
        form.setValue('difficulty', selectedProblem.difficulty, { shouldValidate: true, shouldDirty: true });
        form.setValue('timeLimit', selectedProblem.timeLimit || 1000, { shouldValidate: true, shouldDirty: true });
        form.setValue('memoryLimit', selectedProblem.memoryLimit || 256, { shouldValidate: true, shouldDirty: true });
        form.setValue('constraints', selectedProblem.constraints || '', { shouldValidate: true, shouldDirty: true });
        form.setValue('inputFormat', selectedProblem.inputFormat || '', { shouldValidate: true, shouldDirty: true });
        form.setValue('outputFormat', selectedProblem.outputFormat || '', { shouldValidate: true, shouldDirty: true });
        
        // Populate starter code for all languages from the original problem
        if (selectedProblem.starterCode && Object.keys(selectedProblem.starterCode).length > 0) {
          console.log('Populating starter code for languages:', Object.keys(selectedProblem.starterCode));
          form.setValue('starterCode', selectedProblem.starterCode, { shouldValidate: true, shouldDirty: true });
        } else {
          console.log('No starter code found in original problem, setting empty object');
          form.setValue('starterCode', {}, { shouldValidate: true, shouldDirty: true });
        }
        
        // Populate test cases from the original problem
        if (selectedProblem.testCases && selectedProblem.testCases.length > 0) {
          console.log('Populating test cases:', selectedProblem.testCases.length);
          form.setValue('testCases', selectedProblem.testCases.map(tc => ({
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
            explanation: tc.explanation || '',
            isHidden: tc.isHidden || false,
          })), { shouldValidate: true, shouldDirty: true });
        } else {
          // Ensure at least one empty test case if none from original problem
          console.log('No test cases found, setting default empty test case');
          form.setValue('testCases', [{
            input: '',
            expectedOutput: '',
            explanation: '',
            isHidden: false,
          }], { shouldValidate: true, shouldDirty: true });
        }
        
        console.log('Form populated successfully');
      } else {
        console.log('Selected problem not found in available problems');
      }
    } else if (selectedProblemId && !availableProblems) {
      console.log('Problem ID selected but available problems not loaded yet');
    } else if (editingProblem) {
      console.log('Editing existing problem instance - not auto-populating from original problem');
    } else {
      console.log('No problem selected or clearing selection');
    }
  }, [selectedProblemId, availableProblems, form, editingProblem]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Helper function to check if a problem is already added
  const isProblemAlreadyAdded = (problemTitle: string) => {
    const existingProblems = problemSet?.problems || problemSet?.problemInstances || [];
    return existingProblems.some(existingProblem => 
      existingProblem.title === problemTitle ||
      existingProblem.basedOn === problemTitle
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading problem instances...</p>
        </div>
      </div>
    );
  }

  if (!problemSet) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{isContestMode ? 'Contest' : 'Problem set'} not found</h3>
          <p className="text-gray-600">The {isContestMode ? 'contest' : 'problem set'} you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation(isContestMode ? '/contests' : '/admin/problem-sets')} className="mt-4">
            Back to {isContestMode ? 'Contests' : 'Problem Sets'}
          </Button>
        </div>
      </div>
    );
  }

  // Prefer non-empty lists. Avoid using `||` with arrays because empty arrays are truthy.
  const problemInstancesList = (problemSet.problems && problemSet.problems.length > 0)
    ? problemSet.problems
    : (problemSet.problemInstances || []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation(isContestMode ? '/contests' : '/admin/problem-sets')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {isContestMode ? 'Contests' : 'Problem Sets'}
        </Button>
        
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {problemSet.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage {isContestMode ? 'Contest' : 'Problem Set'} Problems
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Settings className="h-5 w-5 mr-2 text-yellow-600" />
            <span className="text-yellow-800 font-medium">Isolated Problem Management</span>
          </div>
          <p className="text-yellow-700 text-sm mt-1">Changes only affect this {isContestMode ? 'contest' : 'set'}</p>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Problem Instances</h2>
            <p className="text-gray-600">Manage individual problems in this {isContestMode ? 'contest' : 'set'}</p>
            {/* Summary of available vs added problems */}
            {availableProblems && (
              <div className="mt-2 text-sm text-gray-500">
                <span className="font-medium">
                  {(problemSet?.problems || problemSet?.problemInstances || []).length} added
                </span>
                {' • '}
                <span>
                  {availableProblems.length - (problemSet?.problems || problemSet?.problemInstances || []).length} available
                </span>
                {' • '}
                <span className="text-blue-600">
                  {availableProblems.length} total problems
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowOverallAnalyticsDialog(true)}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Overall Analytics
            </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button               onClick={() => {
                // Reset form when opening dialog for new instance
                form.reset({
                  selectedProblemId: '',
                  title: '',
                  description: '',
                  difficulty: 'easy',
                  points: 100,
                  timeLimit: 1000,
                  memoryLimit: 256,
                  constraints: '',
                  inputFormat: '',
                  outputFormat: '',
                  setNotes: '',
                  starterCode: {},
                  testCases: [{
                    input: '',
                    expectedOutput: '',
                    explanation: '',
                    isHidden: false,
                  }],
                });
                setEditingProblem(null);
                setEditingProblemId(null);
                setIsCreateDialogOpen(true);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Problem Instance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProblem ? 'Edit Problem Instance' : 'Add Problem Instance'}</DialogTitle>
                <DialogDescription>
                  {editingProblem 
                    ? 'Update the problem instance details and configuration.' 
                    : `Add a new problem instance to this ${isContestMode ? 'contest' : 'set'}.`
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Problem Selection Dropdown */}
                  <FormField
                    control={form.control}
                    name="selectedProblemId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Problem</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            console.log('Problem selected:', value);
                            field.onChange(value);
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a problem to create instance from" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingProblems ? (
                              <SelectItem value="loading" disabled>Loading problems...</SelectItem>
                            ) : (
                              availableProblems?.map((problem) => {
                                // Check if this problem is already added
                                const isAlreadyAdded = isProblemAlreadyAdded(problem.title);
                                
                                return (
                                  <SelectItem 
                                    key={problem.id} 
                                    value={problem.id}
                                    disabled={isAlreadyAdded}
                                    className={isAlreadyAdded ? "opacity-50 cursor-not-allowed" : ""}
                                  >
                                    <div className="flex items-center space-x-2">
                                      <span>{problem.title}</span>
                                      <Badge 
                                        variant={problem.difficulty === 'easy' ? 'default' : 
                                                 problem.difficulty === 'medium' ? 'secondary' : 'destructive'}
                                      >
                                        {problem.difficulty}
                                      </Badge>
                                      {isAlreadyAdded && (
                                        <Badge variant="outline" className="text-xs text-gray-500">
                                          Already Added
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                );
                              })
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-2">
                          <span>Title</span>
                          {selectedProblemId && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              Editable
                            </Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder={selectedProblemId || editingProblem ? "Customize problem instance title" : "Select a problem first"} 
                            disabled={!selectedProblemId && !editingProblem}
                            className={selectedProblemId || editingProblem ? "border-blue-200 focus:border-blue-400" : "bg-gray-50"}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Enter problem description"
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select difficulty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Points</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="timeLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time Limit (ms)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              {...field}
                              onChange={e => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="memoryLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Memory Limit (MB)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="setNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Set Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Add notes specific to this problem set"
                            className="min-h-[60px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setEditingProblem(null);
                        setEditingProblemId(null);
                          form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createProblemInstanceMutation.isPending || updateProblemInstanceMutation.isPending}>
                      {createProblemInstanceMutation.isPending 
                        ? 'Creating...' 
                        : updateProblemInstanceMutation.isPending
                          ? 'Updating...'
                          : editingProblem 
                            ? 'Update Problem' 
                            : 'Add Problem'
                      }
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      {/* Problem Instances List */}
      <div className="space-y-4">
        {problemInstancesList.map((problem, index) => (
          <Card
            key={`${(problem as any).id || (problem as any)._id || problem.title || 'pi'}-${index}`}
            className="hover:shadow-md transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold">{problem.title}</h3>
                    <Badge 
                      variant={problem.difficulty === 'easy' ? 'default' : 
                               problem.difficulty === 'medium' ? 'secondary' : 'destructive'}
                      className={problem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                               problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                               'bg-red-100 text-red-800'}
                    >
                      {problem.difficulty}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {problem.status}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 mb-3 line-clamp-2">
                    {problem.description}
                  </p>
                  
                  <div className="space-y-1 text-sm text-gray-500">
                    <div className="flex items-center">
                      <span className="font-medium mr-2">Based on:</span>
                      {problem.basedOn}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Last modified: {formatDate(problem.lastModified)}</span>
                    </div>
                    {problem.setNotes && (
                      <div className="flex items-start">
                        <span className="font-medium mr-2">Set Notes:</span>
                        <span className="text-gray-600">{problem.setNotes}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(problem)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEvaluations(problem)}
                  >
                    Evaluations
                  </Button> */}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="hover:bg-red-600"
                    onClick={() => {
                      // Try different possible ID field names
                      console.log(problem,"clicked the delete ");
                      const problemId = problem.id || (problem as any)._id || (problem as any).problemId;
                      
                      if (!problemId) {
                        // Try to find the problem by title in the contest
                        const contest = problemSet;
                        const problemByTitle = contest?.problems?.find(p => p.title === problem.title) || 
                                              contest?.problemInstances?.find(p => p.title === problem.title);
                        
                        if (problemByTitle && problemByTitle.id) {
                          if (confirm(`Are you sure you want to delete "${problem.title}"? This action cannot be undone.`)) {
                            deleteProblemInstanceMutation.mutate(problemByTitle.id);
                          }
                          return;
                        }
                        
                        toast({
                          title: 'Error',
                          description: 'Problem ID is missing. Cannot delete.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      
                      if (confirm(`Are you sure you want to delete "${problem.title}"? This action cannot be undone.`)) {
                        deleteProblemInstanceMutation.mutate(problemId);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {problemInstancesList.length === 0 && (
        <div className="text-center py-12">
          <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No problem instances yet</h3>
          <p className="text-gray-600">Add problem instances to start building this {isContestMode ? 'contest' : 'problem set'}.</p>
        </div>
      )}

      {/* Evaluations Dialog */}
      <EvaluationsDialog 
        open={showEvaluationsDialog}
        onOpenChange={setShowEvaluationsDialog}
        problemInstance={evaluationInstance}
        problemSetId={problemSetId}
      />

      {/* Overall Analytics Dialog */}
      <OverallAnalyticsDialog
        open={showOverallAnalyticsDialog}
        onOpenChange={setShowOverallAnalyticsDialog}
        problemSetId={problemSetId}
        problemSetTitle={problemSet?.title}
      />
    </div>
  );
} 

// Evaluations Dialog Component
interface EvaluationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  problemInstance: any;
  problemSetId: string | undefined;
}

function EvaluationsDialog({ open, onOpenChange, problemInstance, problemSetId }: EvaluationsDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch evaluations data
  const { data: evaluationsData, isLoading } = useQuery<{
    students: Array<{
      id: string;
      name: string;
      email: string;
      status: 'completed' | 'not-completed';
      submissionDate: string | null;
      score: number | null;
    }>;
    summary: {
      total: number;
      completed: number;
      notCompleted: number;
    };
  }>({
    queryKey: [`/api/problem-sets/${problemSetId}/problems/${problemInstance?.id}/evaluations`],
    enabled: !!problemSetId && !!problemInstance?.id && open,
  });

  if (!problemInstance) return null;

  const students = evaluationsData?.students || [];
  const completedCount = students.filter(s => s.status === 'completed').length;
  const totalCount = students.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filter students based on search and status
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "completed" && student.status === "completed") ||
                         (statusFilter === "not-completed" && student.status !== "completed");
    return matchesSearch && matchesStatus;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Problem Evaluations</DialogTitle>
          <DialogDescription>
            Student completion statistics for "{problemInstance.title}"
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="p-8 text-center">Loading evaluation data...</div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{totalCount - completedCount}</div>
                  <div className="text-sm text-gray-600">Not Completed</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{completionRate}%</div>
                  <div className="text-sm text-gray-600">Completion Rate</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <Input
                  placeholder="Search students by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="not-completed">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Students List */}
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 font-medium text-sm border-b">
                <div>Student</div>
                <div>Status</div>
                <div>Submission Date</div>
                <div>Score</div>
              </div>
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm || statusFilter !== "all" ? "No students match the filters" : "No students enrolled"}
                </div>
              ) : (
                filteredStudents.map((student, index: number) => (
                  <div key={student.id || index} className="grid grid-cols-4 gap-4 p-3 border-b hover:bg-gray-50">
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-gray-600">{student.email}</div>
                    </div>
                    <div>
                      <Badge variant={student.status === 'completed' ? 'default' : 'secondary'}>
                        {student.status === 'completed' ? 'Completed' : 'Not Completed'}
                      </Badge>
                    </div>
                    <div className="text-sm">
                      {student.submissionDate ? new Date(student.submissionDate).toLocaleDateString() : '-'}
                    </div>
                    <div className="text-sm">
                      {student.score !== undefined && student.score !== null ? `${student.score}%` : '-'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Overall Analytics Dialog Component
interface OverallAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  problemSetId: string | undefined;
  problemSetTitle: string | undefined;
}

function OverallAnalyticsDialog({ open, onOpenChange, problemSetId, problemSetTitle }: OverallAnalyticsDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch overall analytics data for the problem set - NO automatic refresh
  const { data: analyticsData, isLoading, refetch } = useQuery<{
    students: Array<{
      id: string;
      name: string;
      email: string;
      progress: number;
      completedProblems: number;
      totalProblems: number;
      lastActivity: string | null;
      overallScore: number;
    }>;
    summary: {
      totalEnrolled: number;
      averageProgress: number;
      averageScore: number;
      completionRate: number;
    };
  }>({
    queryKey: [`/api/problem-sets/${problemSetId}/overall-analytics`],
    enabled: !!problemSetId && open,
    refetchInterval: false, // Disable automatic refresh
    refetchIntervalInBackground: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Comprehensive refresh mutation
  const comprehensiveRefreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/problem-sets/${problemSetId}/refresh-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to refresh analytics');
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      toast({
        title: "Analytics Recalculated",
        description: `Successfully recalculated analytics for ${data.updatedCount} enrollments.`,
        duration: 3000,
      });
      
      // Refetch the analytics data to show updated results
      await refetch();
          setLastUpdated(new Date());
    },
    onError: (error) => {
          toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to recalculate analytics",
        variant: "destructive",
            duration: 3000,
          });
        }
      });

  // Manual refresh function
  const handleManualRefresh = async () => {
    try {
      await refetch();
          setLastUpdated(new Date());
          toast({
        title: "Analytics Refreshed",
        description: "Student progress data has been updated.",
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh analytics data. Please try again.",
        variant: "destructive",
            duration: 3000,
          });
        }
  };

  // Comprehensive refresh function
  const handleComprehensiveRefresh = async () => {
    try {
      await comprehensiveRefreshMutation.mutateAsync();
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  };

  if (!problemSetId) return null;

  const students = analyticsData?.students || [];
  const summary = analyticsData?.summary || {
    totalEnrolled: 0,
    averageProgress: 0,
    averageScore: 0,
    completionRate: 0
  };

  // Filter students based on search and status
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "completed" && student.progress >= 100) ||
                         (statusFilter === "in-progress" && student.progress > 0 && student.progress < 100) ||
                         (statusFilter === "not-started" && student.progress === 0);
    return matchesSearch && matchesStatus;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Overall Analytics</DialogTitle>
          <DialogDescription>
            Student progress and completion statistics for "{problemSetTitle}"
          </DialogDescription>
          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-600 font-medium">Manual Refresh Only</span>
              </div>
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
            <div className="flex space-x-2">
            
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleComprehensiveRefresh}
                disabled={comprehensiveRefreshMutation.isPending || isLoading}
                className="border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${comprehensiveRefreshMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="p-8 text-center">Loading analytics data...</div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {summary.totalEnrolled}
                  </div>
                  <div className="text-sm text-gray-600">Total Enrolled</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {summary.averageProgress.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Average Progress</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {summary.averageScore.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Average Score</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {summary.completionRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Completion Rate</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <Input
                  placeholder="Search students by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="not-started">Not Started</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Students List */}
            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <div className="grid grid-cols-6 gap-4 p-3 bg-gray-50 font-medium text-sm border-b">
                <div>Student</div>
                <div>Progress</div>
                <div>Problems Completed</div>
                <div>Overall Score</div>
                <div>Last Activity</div>
                <div>Status</div>
              </div>
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {searchTerm || statusFilter !== "all" ? "No students match the filters" : "No students enrolled"}
                </div>
              ) : (
                filteredStudents.map((student, index: number) => {
                  const getStatusBadge = (progress: number) => {
                    if (progress >= 100) return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
                    if (progress > 0) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
                    return <Badge variant="outline" className="bg-gray-100 text-gray-600">Not Started</Badge>;
                  };

                  return (
                    <div key={student.id || index} className="grid grid-cols-6 gap-4 p-3 border-b hover:bg-gray-50">
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-gray-600">{student.email}</div>
                      </div>
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(100, Math.max(0, student.progress))}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{Math.max(0, Math.min(100, student.progress)).toFixed(1)}%</span>
                      </div>
                      <div className="text-sm">
                        {student.completedProblems} / {student.totalProblems}
                      </div>
                      <div className="text-sm font-medium">
                        {Math.max(0, Math.min(100, student.overallScore)).toFixed(1)}%
                      </div>
                      <div className="text-sm">
                        {student.lastActivity ? new Date(student.lastActivity).toLocaleDateString() : 'Never'}
                      </div>
                      <div>
                        {getStatusBadge(student.progress)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}