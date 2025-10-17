import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Users, BookOpen, Clock, Loader2, AlertCircle } from 'lucide-react';
import { useToast, toastSuccess, toastError, toastInfo } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

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

export default function EnrollmentPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { user, isAuthenticated } = useAuth();
  const [hasTriedAutoEnroll, setHasTriedAutoEnroll] = useState(false);

  // Fetch course data (accessible to both authenticated and unauthenticated users)
  const { data: course, isLoading: courseLoading, error: courseError } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/courses/${courseId}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Course not found');
        }
        throw new Error('Failed to fetch course');
      }
      return response.json() as Promise<Course>;
    },
    enabled: !!courseId
  });

  // Check if user is already enrolled
  const { data: enrollments } = useQuery({
    queryKey: ['user-enrollments'],
    queryFn: async () => {
      const response = await fetch('/api/users/me/enrollments');
      if (!response.ok) throw new Error('Failed to fetch enrollments');
      return response.json();
    },
    retry: false
  });

  const isAlreadyEnrolled = enrollments?.some((enrollment: any) => 
    enrollment.courseId === parseInt(courseId || '0')
  );

  // Handle enrollment button click
  const handleEnrollClick = () => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      console.log('[DEBUG] User not authenticated, redirecting to login');
      window.location.href = `/login?returnTo=/enroll/${courseId}`;
      return;
    }
    
    // If authenticated, proceed with enrollment
    enrollMutation.mutate();
  };

  // Course enrollment mutation (only for authenticated users)
  const enrollMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: 'self' }) // Backend will use req.user.id
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to enroll in this course');
        }
        if (response.status === 409) {
          // User already enrolled
          return { alreadyEnrolled: true };
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to enroll in course');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data?.alreadyEnrolled) {
        toastInfo('Already Enrolled', `You are already enrolled in ${course?.title}`);
      } else {
        toastSuccess('Enrollment Successful!', `You have been enrolled in ${course?.title}`);
      }
      // Always redirect to course page - NEVER to dashboard
      window.location.href = `/courses/${courseId}`;
    },
    onError: (error: Error) => {
      if (error.message.includes('log in') || error.message.includes('Authentication required')) {
        // Redirect to login page with return URL
        window.location.href = `/login?returnTo=/enroll/${courseId}`;
      } else {
        toastError('Enrollment Failed', error.message);
      }
    }
  });

  // Check if user is already enrolled and redirect them to course page
  useEffect(() => {
    if (isAuthenticated && user && courseId && isAlreadyEnrolled && !hasTriedAutoEnroll) {
      console.log('[DEBUG] User already enrolled, redirecting to course page...');
      setHasTriedAutoEnroll(true);
      window.location.href = `/courses/${courseId}`;
    }
  }, [isAuthenticated, user, courseId, isAlreadyEnrolled, hasTriedAutoEnroll]);

  // DO NOT redirect unauthenticated users immediately
  // Let them see the course details first, then redirect when they click "Enroll Now"

  // Show loading states
  if (courseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading course information...</p>
        </div>
      </div>
    );
  }

  // Show enrollment loading only when user clicks "Enroll Now" button
  if (enrollMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Enrolling you in the course...</h2>
          <p className="text-muted-foreground">Please wait while we complete your enrollment.</p>
        </div>
      </div>
    );
  }

  if (courseError || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h1 className="text-xl font-bold mb-2">Course Not Found</h1>
              <p className="text-muted-foreground mb-4">
                The course you're trying to access doesn't exist or has been removed.
              </p>
              <Button onClick={() => setLocation('/courses')}>
                Browse Courses
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAlreadyEnrolled) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h1 className="text-xl font-bold mb-2">Already Enrolled</h1>
              <p className="text-muted-foreground mb-4">
                You are already enrolled in this course.
              </p>
              <Button onClick={() => setLocation(`/courses/${courseId}`)}>
                Go to Course
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Join Course</CardTitle>
              <CardDescription>
                You've been invited to enroll in this course
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Course Information */}
              <div className="border rounded-lg p-4 space-y-4">
                <div>
                  <h2 className="text-xl font-bold">{course.title}</h2>
                  {course.description && (
                    <p className="text-muted-foreground mt-2">{course.description}</p>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {course.category && (
                    <Badge variant="secondary">{course.category}</Badge>
                  )}
                  {course.difficulty && (
                    <Badge variant="outline">{course.difficulty}</Badge>
                  )}
                  <Badge variant={course.isPublic ? "default" : "secondary"}>
                    {course.isPublic ? 'Public' : 'Private'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {course.estimatedHours && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{course.estimatedHours} hours</span>
                    </div>
                  )}
                  {course.enrollmentCount !== undefined && (
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{course.enrollmentCount} students</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Enrollment Action */}
              <div className="space-y-4">
                <div className="text-center">
                  <Button
                    onClick={handleEnrollClick}
                    disabled={enrollMutation.isPending}
                    size="lg"
                    className="w-full"
                  >
                    {enrollMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enrolling...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Enroll in Course
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => setLocation('/courses')}
                  >
                    Browse Other Courses
                  </Button>
                </div>
              </div>

              {/* Information Notice */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> You must be logged in to enroll in courses. 
                  If you don't have an account, you'll be prompted to create one.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}