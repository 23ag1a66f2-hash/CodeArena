import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause,
  CheckCircle,
  Clock,
  BookOpen,
  Video,
  Code,
  FileText,
  Download,
  Bookmark,
  Share2,
  MessageCircle,
  ThumbsUp,
  Eye,
  Lightbulb
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CourseModule {
  id: number;
  courseId: number;
  title: string;
  description: string;
  order: number;
  textContent?: string;
  videoUrl?: string;
  codeExample?: string;
  language?: string;
  expectedOutput?: string;
  duration?: number;
  isCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ModuleProgress {
  moduleId: number;
  isCompleted: boolean;
  timeSpent: number;
  completedAt?: string;
  notes?: string;
  bookmarked: boolean;
}

interface CourseViewerProps {
  courseId: string;
  moduleId?: string;
}

export function CourseModuleViewer({ courseId, moduleId }: CourseViewerProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [userNotes, setUserNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const { data: course } = useQuery({
    queryKey: [`/api/courses/${courseId}`],
  });

  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: [`/api/courses/${courseId}/modules`],
  });

  const { data: progress = [] } = useQuery({
    queryKey: [`/api/courses/${courseId}/progress`],
    enabled: !!user,
  });

  const completeModuleMutation = useMutation({
    mutationFn: async (data: { moduleId: number; timeSpent: number; notes?: string }) => {
      return apiRequest('POST', `/api/courses/${courseId}/modules/${data.moduleId}/complete`, { timeSpent: data.timeSpent, notes: data.notes });
    },
    onSuccess: () => {
      toast({
        title: "Module Completed",
        description: "Great job! Module marked as completed.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/progress`] });
    }
  });

  const bookmarkMutation = useMutation({
    mutationFn: async (moduleId: number) => {
      return apiRequest('POST', `/api/courses/${courseId}/modules/${moduleId}/bookmark`);
    },
    onSuccess: () => {
      toast({
        title: "Bookmarked",
        description: "Module added to your bookmarks.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/progress`] });
    }
  });

  useEffect(() => {
    if (moduleId && modules.length > 0) {
      const index = modules.findIndex((m: CourseModule) => m.id === parseInt(moduleId));
      if (index !== -1) {
        setCurrentModuleIndex(index);
      }
    }
  }, [moduleId, modules]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isVideoPlaying) {
        setTimeSpent(prev => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isVideoPlaying]);

  const currentModule = modules[currentModuleIndex];
  const moduleProgress = progress.find((p: ModuleProgress) => p.moduleId === currentModule?.id);

  const nextModule = () => {
    if (currentModuleIndex < modules.length - 1) {
      setCurrentModuleIndex(currentModuleIndex + 1);
      setTimeSpent(0);
    }
  };

  const prevModule = () => {
    if (currentModuleIndex > 0) {
      setCurrentModuleIndex(currentModuleIndex - 1);
      setTimeSpent(0);
    }
  };

  const completeModule = () => {
    if (currentModule) {
      completeModuleMutation.mutate({
        moduleId: currentModule.id,
        timeSpent,
        notes: userNotes
      });
    }
  };

  const toggleBookmark = () => {
    if (currentModule) {
      bookmarkMutation.mutate(currentModule.id);
    }
  };

  const getYouTubeVideoId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtube\.com\/v\/)([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateCourseProgress = () => {
    if (modules.length === 0) return 0;
    const completedModules = progress.filter((p: ModuleProgress) => p.isCompleted).length;
    return (completedModules / modules.length) * 100;
  };

  if (modulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Loading Course...</h2>
        </div>
      </div>
    );
  }

  if (!currentModule) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Modules Found</h2>
          <p className="text-muted-foreground mb-4">This course doesn't have any modules yet.</p>
          <Button onClick={() => setLocation('/courses')}>
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/courses')}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{course?.title}</h1>
            <p className="text-muted-foreground">{course?.description}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Overall Progress</p>
              <div className="flex items-center gap-2">
                <Progress value={calculateCourseProgress()} className="w-32" />
                <span className="text-sm font-medium">{Math.round(calculateCourseProgress())}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Module Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Course Modules
              </CardTitle>
              <CardDescription>
                {modules.length} modules • {progress.filter((p: ModuleProgress) => p.isCompleted).length} completed
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                <div className="space-y-1 p-4">
                  {modules.map((module: CourseModule, index: number) => {
                    const isCurrentModule = index === currentModuleIndex;
                    const moduleProgress = progress.find((p: ModuleProgress) => p.moduleId === module.id);
                    const isCompleted = moduleProgress?.isCompleted;
                    const isBookmarked = moduleProgress?.bookmarked;

                    return (
                      <div
                        key={module.id}
                        className={`
                          p-3 rounded-lg cursor-pointer transition-colors
                          ${isCurrentModule ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}
                        `}
                        onClick={() => setCurrentModuleIndex(index)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`
                              w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                              ${isCompleted ? 'bg-green-500 text-white' : 
                                isCurrentModule ? 'bg-primary-foreground text-primary' : 'bg-muted text-muted-foreground'}
                            `}>
                              {isCompleted ? <CheckCircle className="h-3 w-3" /> : index + 1}
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${isCurrentModule ? '' : 'text-foreground'}`}>
                                {module.title}
                              </p>
                              {module.duration && (
                                <p className={`text-xs ${isCurrentModule ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {module.duration} min
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isBookmarked && (
                              <Bookmark className="h-3 w-3 fill-current" />
                            )}
                            {module.videoUrl && (
                              <Video className="h-3 w-3" />
                            )}
                            {module.codeExample && (
                              <Code className="h-3 w-3" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Module {currentModule.order}: {currentModule.title}
                    {moduleProgress?.isCompleted && (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{currentModule.description}</CardDescription>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleBookmark}
                  >
                    <Bookmark className={`h-4 w-4 ${moduleProgress?.bookmarked ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="video">Video</TabsTrigger>
                  <TabsTrigger value="code">Practice</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  {currentModule.textContent ? (
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap">{currentModule.textContent}</div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No text content available for this module.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="video" className="space-y-4">
                  {currentModule.videoUrl ? (
                    <div className="space-y-4">
                      <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        {getYouTubeVideoId(currentModule.videoUrl) ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${getYouTubeVideoId(currentModule.videoUrl)}?enablejsapi=1&origin=${window.location.origin}`}
                            title={currentModule.title}
                            className="w-full h-full border-0"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            onLoad={() => setIsVideoPlaying(true)}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-white">
                            <div className="text-center">
                              <Video className="h-12 w-12 mx-auto mb-4" />
                              <p>Unable to load video</p>
                              <Button variant="link" className="text-white" asChild>
                                <a href={currentModule.videoUrl} target="_blank" rel="noopener noreferrer">
                                  Open in new tab
                                </a>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                          >
                            {isVideoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Time spent: {formatTime(timeSpent)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No video content available for this module.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="code" className="space-y-4">
                  {currentModule.codeExample ? (
                    <div className="space-y-4">
                      <div className="bg-muted p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary">{currentModule.language}</Badge>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                        <pre className="text-sm overflow-x-auto">
                          <code>{currentModule.codeExample}</code>
                        </pre>
                      </div>
                      
                      {currentModule.expectedOutput && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="flex items-center mb-2">
                            <Lightbulb className="h-4 w-4 text-green-600 mr-2" />
                            <span className="text-sm font-medium text-green-800">Expected Output</span>
                          </div>
                          <pre className="text-sm text-green-700">
                            <code>{currentModule.expectedOutput}</code>
                          </pre>
                        </div>
                      )}
                      
                      <Button className="w-full">
                        <Code className="h-4 w-4 mr-2" />
                        Try in Interactive Editor
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No code examples available for this module.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Your Notes</label>
                      <textarea
                        className="w-full mt-1 p-3 border rounded-lg resize-none"
                        rows={8}
                        placeholder="Take notes while learning..."
                        value={userNotes}
                        onChange={(e) => setUserNotes(e.target.value)}
                      />
                    </div>
                    
                    {moduleProgress?.notes && (
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Previous Notes</h4>
                        <p className="text-sm text-muted-foreground">{moduleProgress.notes}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Navigation and Actions */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={prevModule}
              disabled={currentModuleIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous Module
            </Button>
            
            <div className="flex items-center gap-2">
              {!moduleProgress?.isCompleted && (
                <Button
                  onClick={completeModule}
                  disabled={completeModuleMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {completeModuleMutation.isPending ? 'Completing...' : 'Mark as Complete'}
                </Button>
              )}
              
              <Button
                onClick={nextModule}
                disabled={currentModuleIndex === modules.length - 1}
              >
                Next Module
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Module Progress Summary */}
          <Card className="mt-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{progress.filter((p: ModuleProgress) => p.isCompleted).length}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{modules.length - progress.filter((p: ModuleProgress) => p.isCompleted).length}</p>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatTime(timeSpent)}</p>
                  <p className="text-sm text-muted-foreground">Time Spent</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{progress.filter((p: ModuleProgress) => p.bookmarked).length}</p>
                  <p className="text-sm text-muted-foreground">Bookmarked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}