import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayCircle, BookOpen, Code, CheckCircle, ChevronLeft, ChevronRight, Menu, X, Clock, Award, BarChart3, Maximize2, Minimize2 } from 'lucide-react';
import { MonacoEditor } from '@/components/MonacoEditor';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

interface CourseModule {
  id: number;
  courseId: number;
  title: string;
  description?: string;
  order: number;
  textContent?: string;
  videoUrl?: string;
  codeExample?: string;
  language?: string;
  expectedOutput?: string;
  createdAt: string;
  updatedAt: string;
}

interface Course {
  id: number;
  title: string;
  description?: string;
  isPublic: boolean;
  enableMarkComplete?: boolean;
}

interface CourseProgress {
  enrollment: {
    id: number;
    courseId: number;
    userId: string;
    completedModules: number[];
    progress: number;
  };
  completedModules: CourseModule[];
  totalModules: number;
}

export default function CourseModuleViewer() {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch course data
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/courses/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      return response.json() as Promise<Course>;
    }
  });

  // Fetch course modules
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['course-modules', courseId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/courses/${courseId}/modules`);
      if (!response.ok) throw new Error('Failed to fetch modules');
      return response.json() as Promise<CourseModule[]>;
    }
  });

  // Fetch course progress
  const { data: progress, isLoading: progressLoading, refetch: refetchProgress } = useQuery({
    queryKey: ['course-progress', courseId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/courses/${courseId}/progress`);
      if (!response.ok) throw new Error('Failed to fetch progress');
      return response.json() as Promise<CourseProgress>;
    },
    retry: false
  });

  // Extract enrollment from progress data
  const enrollment = progress?.enrollment;

  // Add refetch function for enrollment (using same progress refetch)
  const refetchEnrollment = refetchProgress;

  // Get current module with proper type safety
  const modulesList = Array.isArray(modules) ? modules : [];

  // If no moduleId provided, redirect to first module
  if (!moduleId && modulesList.length > 0) {
    const firstModule = modulesList[0];
    setLocation(`/courses/${courseId}/modules/${firstModule.id}`);
    return null;
  }

  // If moduleId is provided but no modules found, show loading or error
  if (moduleId && modulesList.length === 0 && !modulesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Module Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested module could not be found.</p>
          <Button onClick={() => setLocation(`/courses/${courseId}`)}>
            Back to Course
          </Button>
        </div>
      </div>
    );
  }

  const currentModuleIndex = modulesList.findIndex(m => m.id.toString() === moduleId);
  const currentModule = currentModuleIndex >= 0 ? modulesList[currentModuleIndex] : (modulesList.length > 0 ? modulesList[0] : undefined);

  // Update code when module changes
  useEffect(() => {
    if (currentModule?.codeExample) {
      setCode(currentModule.codeExample);
    }
  }, [currentModule]);

  // Navigation functions
  const navigateToModule = (module: CourseModule) => {
    setLocation(`/courses/${courseId}/modules/${module.id}`);
  };

  const navigateToPreviousModule = () => {
    if (currentModuleIndex > 0) {
      const prevModule = modulesList[currentModuleIndex - 1];
      navigateToModule(prevModule);
    }
  };

  const navigateToNextModule = () => {
    if (currentModuleIndex < modulesList.length - 1) {
      const nextModule = modulesList[currentModuleIndex + 1];
      navigateToModule(nextModule);
    }
  };

  // Mark module complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      if (!currentModule) throw new Error('No module selected');
      return apiRequest('POST', `/api/courses/${courseId}/modules/${currentModule.id}/complete`, {
        timeSpent: 300,
        notes: 'Module completed'
      });
    },
    onSuccess: async () => {
      // Optimistically refetch progress so UI reflects new percentage and disables button
      queryClient.invalidateQueries({ queryKey: ['course-progress', courseId] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/enrollments'] });
      await refetchProgress();
      await refetchEnrollment();
      toast({ title: 'Module completed!' });
    },
    onError: (error: Error) => {
      console.error('Error marking module complete:', error);
      toast({
        title: 'Failed to mark module complete',
        variant: 'destructive'
      });
    }
  });

  // Execute code mutation
  const executeCodeMutation = useMutation({
    mutationFn: async () => {
      setIsExecuting(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/modules/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code,
          language: currentModule?.language || 'javascript'
        })
      });
      if (!response.ok) throw new Error('Failed to execute code');
      return response.json();
    },
    onSuccess: async (data) => {
      // Prefer showing the error from Docker/runner if present
      const text = (data?.error && String(data.error).trim().length > 0)
        ? `Error: ${String(data.error)}`
        : (data?.output || '');
      setOutput(text);
      setIsExecuting(false);
      // If Mark Complete is disabled, auto-complete when expectedOutput matches and there is no error
      if (!data?.error && course?.enableMarkComplete === false && currentModule?.expectedOutput) {
        const expected = (currentModule.expectedOutput || '').trim();
        const got = (data.output || '').trim();
        if (expected.length > 0 && got === expected) {
          await markCompleteMutation.mutateAsync();
        }
      }
    },
    onError: (error: Error) => {
      setOutput(`Error: ${error.message}`);
      setIsExecuting(false);
    }
  });

  if (courseLoading || modulesLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!course || !currentModule) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Module Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The requested module could not be found.
          </p>
          <Button
            onClick={() => setLocation('/courses')}
            className="mt-4"
          >
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/courses')}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Courses
              </Button>
              <div>
                <h1 className="text-xl font-bold">{course?.title || 'Course'}</h1>
                <p className="text-sm text-muted-foreground">{currentModule?.title || 'Module'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {enrollment && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm">Progress:</span>
                  <Progress value={enrollment?.progress || 0} className="w-24" />
                  <span className="text-sm">{enrollment?.progress || 0}%</span>
                </div>
              )}
              {course?.enableMarkComplete !== false && (
                <Button
                  onClick={() => markCompleteMutation.mutate()}
                  disabled={markCompleteMutation.isPending ||
                    (enrollment?.completedModules?.includes(currentModule.id) ?? false)}
                  size="sm"
                  variant={enrollment?.completedModules?.includes(currentModule.id) ? "outline" : "default"}
                >
                  {enrollment?.completedModules?.includes(currentModule.id) ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completed
                    </>
                  ) : (
                    'Mark Complete'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative">
        {/* Collapsible Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-80'} transition-all duration-300 ease-in-out border-r bg-gradient-to-b from-background to-muted/20 flex flex-col`}>
          {/* Sidebar Header */}
          <div className="border-b p-4 flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Course Modules</h3>
                  <p className="text-xs text-muted-foreground">{modulesList.length} modules</p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-8 w-8 p-0"
            >
              {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </Button>
          </div>

          {/* Course Progress Overview */}
          {!sidebarCollapsed && (
            <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Progress</span>
                  <span className="text-xs font-bold text-primary">{enrollment?.progress || 0}%</span>
                </div>
                <Progress value={enrollment?.progress || 0} className="h-2" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Award className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-muted-foreground">
                      {progress?.enrollment?.completedModules?.length || 0} completed
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-3 w-3 text-blue-500" />
                    <span className="text-xs text-muted-foreground">
                      {modulesList.length - (progress?.enrollment?.completedModules?.length || 0)} remaining
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modules List */}
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1">
              {modulesList.map((module, index) => {
                const isCompleted = progress?.enrollment?.completedModules?.includes(module.id);
                const isCurrent = module.id === currentModule?.id;

                return (
                  <div
                    key={module.id}
                    className={`group relative rounded-lg cursor-pointer transition-all duration-200 ${isCurrent
                        ? 'bg-primary text-primary-foreground shadow-md scale-105'
                        : 'hover:bg-muted/80 hover:shadow-sm'
                      }`}
                    onClick={() => navigateToModule(module)}
                  >
                    {sidebarCollapsed ? (
                      <div className="p-2 flex items-center justify-center relative">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isCurrent ? 'bg-primary-foreground text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                          {index + 1}
                        </div>
                        {isCompleted && (
                          <CheckCircle className="h-3 w-3 text-green-500 absolute -top-0 -right-0" />
                        )}
                      </div>
                    ) : (
                      <div className="p-3">
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isCurrent
                              ? 'bg-primary-foreground text-primary'
                              : isCompleted
                                ? 'bg-green-100 text-green-700'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                            {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium text-sm leading-tight mb-1 ${isCurrent ? 'text-primary-foreground' : 'text-foreground'
                              }`}>
                              {module.title}
                            </h4>
                            {module.description && (
                              <p className={`text-xs leading-relaxed line-clamp-2 ${isCurrent ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                }`}>
                                {module.description}
                              </p>
                            )}
                            <div className="flex items-center mt-2 space-x-2">
                              <Clock className={`h-3 w-3 ${isCurrent ? 'text-primary-foreground/60' : 'text-muted-foreground'
                                }`} />
                              <span className={`text-xs ${isCurrent ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                }`}>
                                Module {module.order}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isCurrent && (
                          <div className="absolute inset-0 rounded-lg border-2 border-primary/30 pointer-events-none" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <Tabs defaultValue="content" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="content">
                <BookOpen className="h-4 w-4 mr-2" />
                Content & Code
              </TabsTrigger>
              <TabsTrigger value="video">
                <PlayCircle className="h-4 w-4 mr-2" />
                Video
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="flex-1 mt-4">
              <ResizablePanelGroup direction="horizontal" className="h-full border rounded-lg">
                {/* Content Panel */}
                {!isFullscreen && (
                  <>
                    <ResizablePanel defaultSize={50} minSize={30}>
                      <Card className="h-full border-0 rounded-none">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{currentModule.title}</CardTitle>
                          {currentModule.description && (
                            <p className="text-sm text-muted-foreground">{currentModule.description}</p>
                          )}
                        </CardHeader>
                        <CardContent className="pt-0">
                          <ScrollArea className="h-[calc(100vh-300px)]">
                            <div className="prose prose-sm max-w-none">
                              {currentModule.textContent ? (
                                <div className="whitespace-pre-wrap leading-relaxed">
                                  {currentModule.textContent}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center h-32 text-muted-foreground">
                                  No content available for this module
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    </ResizablePanel>

                    <ResizableHandle withHandle />
                  </>
                )}

                {/* Code Panel */}
                <ResizablePanel defaultSize={isFullscreen ? 100 : 50} minSize={30}>
                  <div className="h-full flex flex-col">
                    <Card className="flex flex-col flex-1 border-0 rounded-none">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Code Editor</CardTitle>
                          <div className="flex items-center space-x-2">
                            {currentModule.language && (
                              <Badge variant="secondary" className="text-xs">
                                {currentModule.language}
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsFullscreen(!isFullscreen)}
                              className="flex items-center space-x-1"
                            >
                              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                              <span>{isFullscreen ? "Exit" : "Fullscreen"}</span>
                            </Button>
                            <Button
                              onClick={() => executeCodeMutation.mutate()}
                              disabled={isExecuting}
                              size="sm"
                            >
                              {isExecuting ? 'Running...' : 'Run Code'}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="flex-1 flex flex-col pt-0 pb-0 overflow-hidden">
                        <div className="flex-1 border rounded-lg overflow-hidden">
                          <MonacoEditor
                            value={code}
                            onChange={setCode}
                            language={currentModule.language || 'javascript'}
                            height="100%"
                            options={{
                              automaticLayout: true,
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>


                    {/* Output Section */}
                    {output && (
                      <Card className="mt-4 border-0 rounded-none">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Output</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className={`bg-muted rounded-lg p-3 max-h-32 overflow-auto ${output.includes('Error') ? "bg-red-100" : "bg-green-600"}`}>
                            <pre className={`text-xs font-mono whitespace-pre-wrap ${output.includes('Error') ? 'text-red-500' : 'text-green-800'}`}>
                              {output}
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Expected Output Section */}
                    {currentModule.expectedOutput && (
                      <Card className="mt-2 border-0 rounded-none">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm text-green-600">Expected Output</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-24 overflow-auto">
                            <pre className="text-xs font-mono whitespace-pre-wrap text-green-800">
                              {currentModule.expectedOutput}
                            </pre>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </TabsContent>

            <TabsContent value="video" className="flex-1 mt-4">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Video Content</CardTitle>
                </CardHeader>
                <CardContent>
                  {currentModule.videoUrl ? (
                    <div className="aspect-video">
                      <iframe
                        src={(() => {
                          const patterns = [
                            /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
                            /(?:youtu\.be\/)([^&\n?#]+)/,
                            /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
                            /(?:youtube\.com\/v\/)([^&\n?#]+)/
                          ];

                          for (const pattern of patterns) {
                            const match = currentModule.videoUrl.match(pattern);
                            if (match && match[1]) {
                              return `https://www.youtube.com/embed/${match[1]}?enablejsapi=1&origin=${window.location.origin}`;
                            }
                          }
                          return currentModule.videoUrl;
                        })()}
                        className="w-full h-full rounded-lg border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={currentModule.title}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                      <p className="text-muted-foreground">No video content available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="border-t bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <Button
            onClick={navigateToPreviousModule}
            disabled={currentModuleIndex === 0}
            variant="outline"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous Module
          </Button>

          <span className="text-sm text-muted-foreground">
            Module {currentModuleIndex + 1} of {modulesList.length}
          </span>

          <Button
            onClick={navigateToNextModule}
            disabled={currentModuleIndex === modulesList.length - 1}
          >
            Next Module
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}