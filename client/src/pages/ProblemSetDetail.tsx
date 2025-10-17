import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { authenticatedFetch } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Clock, BookOpen, CheckCircle, XCircle, Play, Edit3, Circle } from "lucide-react";

interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  tags?: string[];
  timeLimit?: number;
  memoryLimit?: number;
  instanceId?: string;
  isCustomized?: boolean;
}

interface ProblemInstance {
  id?: string; // Unique instance ID
  originalProblemId: number; // Reference to base problem
  title?: string;
  description?: string;
  difficulty?: string;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  timeLimit?: number;
  memoryLimit?: number;
  hints?: string[];
  notes?: string;
  isCustomized?: boolean;
  order?: number;
  lastModified?: string;
  modifiedBy?: string;
  customTestCases?: any[];
  customExamples?: any[];
  customStarterCode?: any;
}

interface ProblemSet {
  id: string; // Use string ID to match server
  title: string;
  description?: string;
  difficulty: string;
  category?: string;
  tags?: string[];
  problemIds?: string[]; // Use string problem IDs to match server
  problemInstances?: ProblemInstance[];
  problems?: any[]; // Raw problems array from database
  isPublic: boolean;
  estimatedTime?: number;
  totalProblems: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Submission {
  id: number;
  problemId: number;
  userId: string;
  status: string;
  submittedAt: string;
  problemInstanceId?: string; // Added for instance-specific submissions
}

export default function ProblemSetDetail() {
  const [match, params] = useRoute("/problem-sets/:id");
  const problemSetId = params?.id;
  const { user } = useAuth();
  
  console.log('ProblemSetDetail - problemSetId:', problemSetId);
  console.log('ProblemSetDetail - user role:', user?.role);

  const { data: problemSet, isLoading: loadingSet, error } = useQuery<ProblemSet>({
    queryKey: [`/api/problem-sets/${problemSetId}`],
    queryFn: async () => {
      if (!problemSetId) {
        throw new Error('Problem Set ID is required');
      }
      // Use admin endpoint for authenticated users to get full data including problem instances
      const endpoint = user?.role === 'admin' 
        ? `/api/admin/problem-sets/${problemSetId}`
        : `/api/problem-sets/${problemSetId}`;
      
      console.log('Fetching problem set from:', endpoint);
      const response = await authenticatedFetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch problem set');
      }
      const data = await response.json();
      console.log('Problem set response:', data);
      return data as Promise<ProblemSet>;
    },
    enabled: !!problemSetId,
    retry: (failureCount, error: any) => {
      // Don't retry on enrollment errors
      if (error?.status === 403) return false;
      return failureCount < 3;
    }
  });

  const { data: allProblems } = useQuery<Problem[]>({
    queryKey: ["/api/problems"],
  });

  const { data: submissions } = useQuery<Submission[]>({
    queryKey: ["/api/submissions"],
    enabled: !!user,
  });

  // Handle enrollment errors
  if (error && (error as any)?.status === 403) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
          <p className="text-gray-600 mt-2 mb-4">
            You must be enrolled in this problem set to access it.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/problems">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Problem Sets
              </Button>
            </Link>
            <Link href={`/enroll-problem-set/${problemSetId}`}>
              <Button>
                <BookOpen className="w-4 h-4 mr-2" />
                Enroll Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!problemSetId || (!loadingSet && !problemSet)) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Problem set not found</h1>
          <Link href="/problems">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Problem Sets
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loadingSet) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Get problems in this set - using both new problemInstances and legacy problemIds for compatibility
  const setProblems: Problem[] = [];
  
  console.log('ProblemSet data:', problemSet);
  console.log('All problems:', allProblems);
  
  if (problemSet?.problemInstances && problemSet.problemInstances.length > 0) {
    console.log('Using problem instances:', problemSet.problemInstances);
    // New system: use problem instances with their customizations
    for (const instance of problemSet.problemInstances) {
      if (instance.originalProblemId === null || instance.originalProblemId === undefined) {
        // Handle instances that are completely custom (no original problem)
        if (instance.title) { // Only add if it has a title
          setProblems.push({
            id: 0, // Use 0 for custom problems to avoid conflicts
            instanceId: instance.id,
            title: instance.title,
            description: instance.description || '',
            difficulty: instance.difficulty || 'medium',
            timeLimit: instance.timeLimit,
            memoryLimit: instance.memoryLimit,
            isCustomized: true,
            tags: []
          });
        }
      } else {
        // Handle instances based on original problems
        const originalProblem = allProblems?.find(p => p.id === instance.originalProblemId);
        if (originalProblem) {
          // Merge original problem with instance customizations
          setProblems.push({
            ...originalProblem,
            id: instance.originalProblemId, // Keep original ID for submissions tracking
            instanceId: instance.id, // Store instance ID for reference
            title: instance.title || originalProblem.title,
            description: instance.description || originalProblem.description,
            difficulty: instance.difficulty || originalProblem.difficulty,
            timeLimit: instance.timeLimit || originalProblem.timeLimit,
            memoryLimit: instance.memoryLimit || originalProblem.memoryLimit,
            isCustomized: instance.isCustomized || false
          });
        }
      }
    }
  } else if (problemSet?.problems && problemSet.problems.length > 0) {
    console.log('Using problems array:', problemSet.problems);
    // Handle raw problems array from database
    for (const problem of problemSet.problems) {
      setProblems.push({
        id: parseInt(problem.selectedProblemId || problem.id) || 0,
        instanceId: problem.id,
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        timeLimit: problem.timeLimit,
        memoryLimit: problem.memoryLimit,
        isCustomized: problem.status === 'customized',
        tags: problem.tags || []
      });
    }
  } else if (problemSet?.problemIds && problemSet.problemIds.length > 0) {
    console.log('Using problem IDs:', problemSet.problemIds);
    // Legacy system: use problemIds - convert to numbers for comparison
    const legacyProblems = allProblems?.filter(problem => 
      problemSet.problemIds!.includes(String(problem.id))
    ) || [];
    setProblems.push(...legacyProblems.map(p => ({ ...p, isCustomized: false })));
  }
  
  console.log('Final set problems:', setProblems);
  console.log('Debug info:', {
    problemInstancesLength: problemSet?.problemInstances?.length || 0,
    problemsLength: problemSet?.problems?.length || 0,
    problemIdsLength: problemSet?.problemIds?.length || 0,
    totalProblems: problemSet?.totalProblems || 0,
    setProblemsLength: setProblems.length
  });



  // Get user's submissions for these problems
  const userSubmissions = submissions?.filter(sub => 
    setProblems.some(problem => problem.id === sub.problemId)
  ) || [];

  // Calculate progress using instance-specific tracking
  const solvedProblems = new Set();
  
  setProblems.forEach(problem => {
    const problemSubmissions = userSubmissions.filter(sub => sub.problemId === problem.id);
    
    // If this problem has an instance ID, check for instance-specific submissions
    if (problem.instanceId) {
      const instanceSubmissions = problemSubmissions.filter(sub => 
        sub.problemInstanceId === problem.instanceId
      );
      if (instanceSubmissions.some(sub => sub.status === 'accepted')) {
        solvedProblems.add(`${problem.id}-${problem.instanceId}`);
      }
    } else {
      // For legacy problems without instance IDs, use global tracking
      if (problemSubmissions.some(sub => sub.status === 'accepted')) {
        solvedProblems.add(problem.id);
      }
    }
  });
  
  const progress = setProblems.length > 0 ? (solvedProblems.size / setProblems.length) * 100 : 0;
  
  console.log('Final calculation:', {
    setProblemsLength: setProblems.length,
    solvedProblemsSize: solvedProblems.size,
    progress,
    problemSetTotalProblems: problemSet?.totalProblems,
    problemSetProblemIds: problemSet?.problemIds,
    problemSetProblemInstances: problemSet?.problemInstances?.length
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProblemStatus = (problem: Problem) => {
    const problemSubmissions = userSubmissions.filter(sub => sub.problemId === problem.id);
    
    // If this problem has an instance ID, check for instance-specific submissions
    if (problem.instanceId) {
      const instanceSubmissions = problemSubmissions.filter(sub => 
        sub.problemInstanceId === problem.instanceId
      );
      if (instanceSubmissions.some(sub => sub.status === 'accepted')) return 'solved';
      if (instanceSubmissions.length > 0) return 'attempted';
      return 'not-attempted';
    } else {
      // For legacy problems without instance IDs, use global tracking
      if (problemSubmissions.some(sub => sub.status === 'accepted')) return 'solved';
      if (problemSubmissions.length > 0) return 'attempted';
      return 'not-attempted';
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/assignments">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{problemSet?.title}</h1>
            {problemSet?.description && (
              <p className="text-muted-foreground mt-1">{problemSet.description}</p>
            )}
          </div>
        </div>

        {/* Set Info */}
        <div className="flex flex-wrap gap-4 items-center">
          <Badge className={getDifficultyColor(problemSet?.difficulty || '')}>
            {(problemSet?.difficulty?.charAt(0) || '').toUpperCase() + (problemSet?.difficulty?.slice(1) || '')}
          </Badge>
          {problemSet?.category && (
            <Badge variant="outline">{problemSet.category}</Badge>
          )}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span>{setProblems.length} problems</span>
          </div>
          {problemSet?.estimatedTime && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{problemSet.estimatedTime} minutes</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {user && setProblems.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Progress: {Math.round(progress)}%</span>
              <span className="text-sm text-muted-foreground">
                ({solvedProblems?.size || 0}/{setProblems?.length || 0} solved)
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </div>

      {/* Tags */}
      {problemSet?.tags && problemSet.tags.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Tags</h3>
          <div className="flex gap-2 flex-wrap">
            {problemSet.tags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Problems List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Problems ({setProblems.length})</h2>
        {setProblems.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No problems in this set</h3>
              <p className="text-muted-foreground">
                This problem set doesn't contain any problems yet.
              </p>
              {problemSet && (
                <div className="mt-4 text-xs text-muted-foreground">
                  <p>Debug info:</p>
                  <p>Problem IDs: {JSON.stringify(problemSet.problemIds)}</p>
                  <p>Problem Instances: {JSON.stringify(problemSet.problemInstances?.length || 0)}</p>
                  <p>Total Problems: {problemSet.totalProblems}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {setProblems.map((problem, index) => {
              const status = getProblemStatus(problem);
              // Create unique key using both problem ID and instance ID (if available)
              const uniqueKey = problem.instanceId ? `${problem.id}-${problem.instanceId}` : `${problem.id}-${index}`;
              return (
                <Card key={uniqueKey} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          {status === 'solved' ? (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          ) : status === 'attempted' ? (
                            <Clock className="w-6 h-6 text-yellow-500" />
                          ) : (
                            <Circle className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{problem.title}</h3>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <Badge className={getDifficultyColor(problem.difficulty)} variant="outline">
                              {problem.difficulty.charAt(0).toUpperCase() + problem.difficulty.slice(1)}
                            </Badge>
                            {problem.tags && problem.tags.length > 0 && (
                              <div className="flex gap-1">
                                {problem.tags.slice(0, 2).map((tag, tagIndex) => (
                                  <Badge key={`${uniqueKey}-tag-${tagIndex}`} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {problem.tags.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{problem.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Link href={`/problems/${problem.id}?problemSet=${problemSetId}${problem.instanceId ? `&instanceId=${problem.instanceId}` : ''}`}>
                        <Button>
                          <Play className="w-4 h-4 mr-2" />
                          {status === 'solved' ? 'Solve Again' : 'Solve'}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}