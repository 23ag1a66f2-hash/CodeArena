import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock, Users, Play, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Course {
  id: number;
  title: string;
  description?: string;
  category?: string;
  difficulty?: string;
  estimatedHours?: number;
  enrollmentCount?: number;
  isPublic: boolean;
}

interface CourseModule {
  id: number;
  title: string;
  description?: string;
  content?: string;
  orderIndex: number;
  isCompleted?: boolean;
}

interface CourseProgress {
  courseId: number;
  userId: string;
  completedModules: number[];
  progress: number;
  enrollment: {
    enrolledAt: string;
    lastAccessedAt: string;
  };
}

export default function StudentCourseView() {
  const { courseId } = useParams<{ courseId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const courseIdNum = courseId ? parseInt(courseId) : NaN;

  // Fetch course data
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseIdNum],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/courses/${courseIdNum}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      return response.json() as Promise<Course>;
    },
    enabled: !isNaN(courseIdNum)
  });

  // Fetch course modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['course-modules', courseIdNum],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/courses/${courseIdNum}/modules`);
      if (!response.ok) throw new Error('Failed to fetch modules');
      return response.json() as Promise<CourseModule[]>;
    },
    enabled: !isNaN(courseIdNum)
  });

  // Fetch course progress
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['course-progress', courseIdNum],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/courses/${courseIdNum}/progress`);
      if (!response.ok) throw new Error('Failed to fetch progress');
      return response.json() as Promise<CourseProgress>;
    },
    enabled: !isNaN(courseIdNum)
  });

  const handleStartModule = (moduleId: number) => {
    setLocation(`/courses/${courseIdNum}/modules/${moduleId}`);
  };

  const handleContinueLearning = () => {
    if (modules.length > 0) {
      // Find first incomplete module or first module
      const incompleteModule = modules.find(module => !progress?.completedModules.includes(module.id));
      const targetModule = incompleteModule || modules[0];
      setLocation(`/courses/${courseIdNum}/modules/${targetModule.id}`);
    }
  };

  if (isNaN(courseIdNum)) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Course</h1>
          <p className="text-muted-foreground mb-4">
            The course you're looking for doesn't exist.
          </p>
          <Button onClick={() => setLocation('/courses')}>
            Browse Courses
          </Button>
        </div>
      </div>
    );
  }

  if (courseLoading || modulesLoading || progressLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Loading Course...</h2>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The course you're looking for doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => setLocation('/courses')}>
            Browse Courses
          </Button>
        </div>
      </div>
    );
  }

  const completionPercentage = progress?.progress || 0;
  const completedModuleCount = progress?.completedModules?.length || 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => setLocation('/courses')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>
      </div>

      {/* Course Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <CardTitle className="text-3xl">{course.title}</CardTitle>
              {course.description && (
                <CardDescription className="text-lg">{course.description}</CardDescription>
              )}
              <div className="flex gap-2">
                {course.category && (
                  <Badge variant="secondary">{course.category}</Badge>
                )}
                {course.difficulty && (
                  <Badge variant="outline">{course.difficulty}</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <Button onClick={handleContinueLearning} size="lg">
                <Play className="h-4 w-4 mr-2" />
                {completedModuleCount > 0 ? 'Continue Learning' : 'Start Course'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {course.estimatedHours && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{course.estimatedHours} hours</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{modules.length} modules</span>
            </div>
            {course.enrollmentCount !== undefined && (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{course.enrollmentCount} students</span>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{completedModuleCount}/{modules.length} modules completed</span>
            </div>
            <Progress value={completionPercentage} className="w-full" />
            <p className="text-xs text-muted-foreground">
              {completionPercentage}% complete
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Course Modules */}
      <Card>
        <CardHeader>
          <CardTitle>Course Modules</CardTitle>
          <CardDescription>
            Complete modules in order to track your progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {modules.map((module, index) => {
              const isCompleted = progress?.completedModules?.includes(module.id) || false;
              const isNext = !isCompleted && (index === 0 || progress?.completedModules?.includes(modules[index - 1]?.id));

              return (
                <div
                  key={module.id}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                    isCompleted
                      ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                      : isNext
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
                      : 'bg-muted/20'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isNext
                        ? 'bg-blue-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{module.title}</h3>
                      {module.description && (
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={isCompleted ? "outline" : isNext ? "default" : "ghost"}
                    onClick={() => handleStartModule(module.id)}
                    disabled={!isCompleted && !isNext}
                  >
                    {isCompleted ? 'Review' : isNext ? 'Start' : 'Locked'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 