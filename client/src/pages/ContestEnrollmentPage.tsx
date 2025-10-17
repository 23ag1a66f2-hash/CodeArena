import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, Trophy, Users, CheckCircle } from 'lucide-react';
import { useToast, toastSuccess, toastError, toastInfo } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Contest {
  id: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  problems: Problem[];
  participants?: Participant[];
}

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  points: number;
}

interface Participant {
  id: string;
  userId: string;
  contestId: string;
  registrationTime: string;
  status: 'registered' | 'active' | 'completed';
}

export default function ContestEnrollmentPage() {
  const { contestId } = useParams<{ contestId: string }>();
  const { toast } = useToast();

  const { user, isAuthenticated } = useAuth();
  const [hasTriedAutoEnroll, setHasTriedAutoEnroll] = useState(false);

  // Fetch contest data (accessible to both authenticated and unauthenticated users)
  const { data: contest, isLoading: contestLoading, error: contestError } = useQuery({
    queryKey: ['contest', contestId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contests/${contestId}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Contest not found');
        }
        throw new Error('Failed to fetch contest');
      }
      return response.json() as Promise<Contest>;
    },
    enabled: !!contestId
  });

  // Check if user is already enrolled
  const { data: userParticipation } = useQuery({
    queryKey: ['user-contest-participation', contestId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const response = await fetch(`/api/contests/${contestId}/participants/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!contestId && isAuthenticated,
    retry: false
  });

  const isAlreadyEnrolled = !!userParticipation;

  // Handle enrollment button click
  const handleEnrollClick = () => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      console.log('[DEBUG] User not authenticated, redirecting to login');
      window.location.href = `/login?returnTo=/contest-enrollment/${contestId}`;
      return;
    }
    
    // If authenticated, proceed with enrollment
    enrollMutation.mutate();
  };

  // Contest enrollment mutation (only for authenticated users)
  const enrollMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`/api/contests/${contestId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: 'self' }) // Backend will use req.user.id
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to enroll in this contest');
        }
        if (response.status === 409) {
          // User already enrolled
          return { alreadyEnrolled: true };
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to enroll in contest');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data?.alreadyEnrolled) {
        toastInfo('Already Enrolled', `You are already enrolled in ${contest?.title}`);
      } else {
        toastSuccess('Enrollment Successful!', `You have been enrolled in ${contest?.title}`);
      }
      // Redirect to contests page or contest detail page
      window.location.href = `/contests/${contestId}`;
    },
    onError: (error: Error) => {
      if (error.message.includes('log in') || error.message.includes('Authentication required')) {
        // Redirect to login page with return URL
        window.location.href = `/login?returnTo=/contest-enrollment/${contestId}`;
      } else {
        toastError('Enrollment Failed', error.message);
      }
    }
  });

  // Check if user is already enrolled and redirect them to contest page
  useEffect(() => {
    if (isAuthenticated && user && contestId && isAlreadyEnrolled && !hasTriedAutoEnroll) {
      console.log('[DEBUG] User already enrolled, redirecting to contest page...');
      setHasTriedAutoEnroll(true);
      window.location.href = `/contests/${contestId}`;
    }
  }, [isAuthenticated, user, contestId, isAlreadyEnrolled, hasTriedAutoEnroll]);

  // Show loading states
  if (contestLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading contest information...</p>
        </div>
      </div>
    );
  }

  // Show enrollment loading only when user clicks "Enroll in Contest" button
  if (enrollMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Enrolling you in the contest...</p>
        </div>
      </div>
    );
  }

  if (contestError || !contest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Contest Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The contest you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => window.location.href = '/contests'}>
            Browse Contests
          </Button>
        </div>
      </div>
    );
  }

  const isContestActive = new Date() >= new Date(contest.startTime) && new Date() <= new Date(contest.endTime);
  const isContestUpcoming = new Date() < new Date(contest.startTime);
  const isContestEnded = new Date() > new Date(contest.endTime);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <CardTitle className="text-3xl font-bold">{contest.title}</CardTitle>
            </div>
            <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(contest.startTime).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{contest.duration} minutes</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{contest.participants?.length || 0} participants</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Contest Status */}
              <div className="text-center">
                {isContestUpcoming && (
                  <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1">
                    Upcoming Contest
                  </Badge>
                )}
                {isContestActive && (
                  <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">
                    Contest Active
                  </Badge>
                )}
                {isContestEnded && (
                  <Badge className="bg-gray-100 text-gray-800 text-sm px-3 py-1">
                    Contest Ended
                  </Badge>
                )}
              </div>

              {/* Contest Description */}
              <div>
                <h3 className="text-lg font-semibold mb-2">About This Contest</h3>
                <p className="text-muted-foreground">{contest.description}</p>
              </div>

              {/* Contest Problems */}
              {/* <div>
                <h3 className="text-lg font-semibold mb-4">Contest Problems ({contest.problems.length})</h3>
                <div className="grid gap-3">
                  {contest.problems.map((problem, index) => (
                    <div key={problem.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <span className="font-medium">{problem.title}</span>
                        <Badge 
                          variant={problem.difficulty === 'easy' ? 'default' : problem.difficulty === 'medium' ? 'secondary' : 'destructive'}
                        >
                          {problem.difficulty}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{problem.points} points</span>
                    </div>
                  ))}
                </div>
              </div> */}

              {/* Contest Schedule */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="font-semibold mb-2">Start Time</h4>
                  <p className="text-muted-foreground">
                    {new Date(contest.startTime).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="font-semibold mb-2">End Time</h4>
                  <p className="text-muted-foreground">
                    {new Date(contest.endTime).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Enrollment Section */}
              <div className="text-center space-y-4">
                {isAlreadyEnrolled ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">You are enrolled in this contest!</span>
                    </div>
                    <Button 
                      onClick={() => window.location.href = `/contests/${contestId}`}
                      className="w-full md:w-auto"
                    >
                      Go to Contest
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!isAuthenticated && (
                      <p className="text-muted-foreground">
                        Please log in to enroll in this contest
                      </p>
                    )}
                    <Button 
                      onClick={handleEnrollClick}
                      className="w-full md:w-auto"
                      disabled={isContestEnded}
                    >
                      {isContestEnded ? 'Contest Ended' : 'Enroll in Contest'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 