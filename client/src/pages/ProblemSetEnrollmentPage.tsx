import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Users, BookOpen, Clock, Loader2, AlertCircle, Target } from 'lucide-react';
import { useToast, toastSuccess, toastError, toastWarning, toastInfo } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ProblemSet {
  id: string;
  title: string;
  description?: string;
  category?: string;
  difficulty?: string;
  problemCount?: number;
  enrollmentCount?: number;
  isPublic: boolean;
  allowDirectEnrollment?: boolean;
}

export default function ProblemSetEnrollmentPage() {
  const { problemSetId } = useParams<{ problemSetId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { user, isAuthenticated } = useAuth();
  const [hasTriedAutoEnroll, setHasTriedAutoEnroll] = useState(false);

  // Fetch problem set data
  const { data: problemSet, isLoading: problemSetLoading, error: problemSetError } = useQuery({
    queryKey: ['problem-set', problemSetId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/problem-sets/${problemSetId}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Assignment not found');
        }
        if (response.status === 403) {
          throw new Error('Access denied - please log in');
        }
        throw new Error('Failed to fetch assignment');
      }
      return response.json() as Promise<ProblemSet>;
    },
    enabled: !!problemSetId,
    retry: false
  });

  // Check if user is already enrolled
  const { data: enrollments } = useQuery({
    queryKey: ['user-problem-set-enrollments'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const response = await fetch('/api/users/me/problem-set-enrollments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return null;
      return response.json();
    },
    retry: false
  });

  const isAlreadyEnrolled = enrollments?.some((enrollment: any) => 
    String(enrollment.problemSetId) === String(problemSetId || '')
  );

  // Handle enrollment button click - DISABLED for direct enrollment
  const handleEnrollClick = () => {
    toastWarning("Enrollment Not Allowed", "Direct enrollment is not permitted. Please contact your instructor for access to this assignment.");
  };

  // Problem set enrollment mutation (only for authenticated users)
  const enrollMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Use self-enroll endpoint, guarded by allowDirectEnrollment
      const response = await fetch(`/api/problem-sets/${problemSetId}/self-enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({}) // Self-enrollment
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to enroll in this assignment');
        }
        if (response.status === 409) {
          // User already enrolled
          return { alreadyEnrolled: true };
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to enroll in assignment');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data?.alreadyEnrolled) {
        toastInfo('Already Enrolled', `You are already enrolled in ${problemSet?.title}`);
      } else {
        toastSuccess('Enrollment Successful!', `You have been enrolled in ${problemSet?.title}`);
      }
      // Always redirect to assignment page - NEVER to dashboard
      window.location.href = `/problem-sets/${problemSetId}`;
    },
    onError: (error: Error) => {
      if (error.message.includes('log in') || error.message.includes('Authentication required')) {
        // Redirect to login page with return URL
        window.location.href = `/login?returnTo=/enroll-problem-set/${problemSetId}`;
      } else {
        toastError('Enrollment Failed', error.message);
      }
    }
  });

  // Check if user is already enrolled and redirect them to assignment page
  useEffect(() => {
    if (isAuthenticated && user && problemSetId && isAlreadyEnrolled && !hasTriedAutoEnroll) {
      console.log('[DEBUG] User already enrolled, redirecting to assignment page...');
      setHasTriedAutoEnroll(true);
      window.location.href = `/problem-sets/${problemSetId}`;
    }
  }, [isAuthenticated, user, problemSetId, isAlreadyEnrolled, hasTriedAutoEnroll]);

  // DO NOT redirect unauthenticated users immediately  
  // Let them see the assignment details first, then redirect when they click "Enroll Now"

  // Show loading states
  if (problemSetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading assignment information...</p>
        </div>
      </div>
    );
  }

  // Show enrollment loading only when user clicks "Enroll in Assignment" button
  if (enrollMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Enrolling you in the assignment...</h2>
          <p className="text-muted-foreground">Please wait while we complete your enrollment.</p>
        </div>
      </div>
    );
  }

  if (problemSetError || !problemSet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h1 className="text-xl font-bold mb-2">Assignment Not Found</h1>
              <p className="text-muted-foreground mb-4">
                The assignment you're trying to access doesn't exist or has been removed.
              </p>
              <Button onClick={() => setLocation('/problem-sets')}>
                Browse Assignments
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
                You are already enrolled in this assignment.
              </p>
              <Button onClick={() => setLocation(`/problem-sets/${problemSetId}`)}>
                Go to Assignment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <Target className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-2xl mb-2">{problemSet.title}</CardTitle>
                <CardDescription className="text-lg">
                  {problemSet.description || 'No description available'}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Assignment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {problemSet.problemCount || 'Multiple'} Problems
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {problemSet.enrollmentCount || 0} Enrolled
                  </span>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {problemSet.difficulty && (
                  <Badge variant="outline">
                    {problemSet.difficulty}
                  </Badge>
                )}
                {problemSet.category && (
                  <Badge variant="outline">
                    {problemSet.category}
                  </Badge>
                )}
                {problemSet.isPublic && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Public
                  </Badge>
                )}
              </div>

              {/* Enrollment Action */}
              {problemSet.allowDirectEnrollment ? (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                      Enroll in this Assignment
                    </h3>
                    <p className="text-green-700 dark:text-green-300 text-sm mb-4">
                      Click the button below to enroll. You must be logged in.
                    </p>
                    <Button
                      onClick={() => enrollMutation.mutate()}
                      size="lg"
                      className="w-full"
                    >
                      Enroll Now
                    </Button>
                  </div>
                  <div className="text-center">
                    <Button variant="ghost" onClick={() => setLocation('/problem-sets')}>
                      Browse Other Assignments
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-600 dark:text-yellow-400" />
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                      Enrollment Not Available
                    </h3>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-4">
                      Direct enrollment is not permitted for this assignment. Please contact your instructor for access.
                    </p>
                    <Button
                      onClick={handleEnrollClick}
                      variant="outline"
                      size="lg"
                      className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                    >
                      <AlertCircle className="mr-2 h-4 w-4" />
                      Contact Instructor
                    </Button>
                  </div>
                  
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}