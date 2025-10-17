import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, Users, Trophy, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface Contest {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  problems: any[];
  participants?: any[];
  rules?: string[];
}

export default function ContestDetailsPage() {
  const { contestId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const { isAuthenticated } = useAuth();

  // Fetch contest details
  const { data: contest, isLoading, error: contestError } = useQuery<Contest>({
    queryKey: ['/api/contests', contestId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`/api/contests/${contestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch contest details');
      }
      
      return response.json();
    },
    enabled: !!contestId && isAuthenticated,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message === 'Authentication required') {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Check if user is enrolled
  const { data: enrollmentStatus } = useQuery({
    queryKey: ['/api/contests', contestId, 'enrollment'],
    queryFn: async () => {
      const response = await fetch(`/api/contests/${contestId}/participants/me`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.status === 404) return { enrolled: false };
      if (!response.ok) throw new Error('Failed to check enrollment status');
      return { enrolled: true, ...(await response.json()) };
    },
  });

  // Enroll in contest mutation
  const enrollMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/contests/${contestId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ userId: 'self' }),
      });
      
      if (!response.ok) {
        if (response.status === 409) {
          return { alreadyEnrolled: true };
        }
        throw new Error('Failed to enroll in contest');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data?.alreadyEnrolled) {
        toast({
          title: 'Already Enrolled',
          description: 'You are already enrolled in this contest',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Successfully enrolled in the contest!',
        });
        
        // Force immediate refetch to update the UI
        queryClient.invalidateQueries({ queryKey: ['/api/contests', contestId, 'enrollment'] });
        queryClient.invalidateQueries({ queryKey: ['/api/contests'] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      await enrollMutation.mutateAsync();
    } finally {
      setIsEnrolling(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeUntilStart = () => {
    if (!contest) return null;
    const now = new Date();
    const startTime = new Date(contest.startTime);
    const diff = startTime.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes > 1 ? 's' : ''}`;
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading contest details...</p>
        </div>
      </div>
    );
  }

  if (contestError) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {contestError.message === 'Authentication required' ? 'Authentication Required' : 'Error Loading Contest'}
          </h3>
          <p className="text-gray-600 mb-4">
            {contestError.message === 'Authentication required' 
              ? 'Please log in to access this contest.'
              : contestError.message || 'Failed to load contest details.'
            }
          </p>
          {contestError.message === 'Authentication required' ? (
            <Button onClick={() => setLocation('/login')}>
              Go to Login
            </Button>
          ) : (
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Contest not found</h3>
          <p className="text-gray-600">The contest you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation('/contests')} className="mt-4">
            Back to Contests
          </Button>
        </div>
      </div>
    );
  }

  const timeUntilStart = getTimeUntilStart();
  const isEnrolled = enrollmentStatus?.enrolled;

  const requestFullscreen = async () => {
    try {
      const elem: any = document.documentElement;
      if (elem.requestFullscreen) await elem.requestFullscreen();
      else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
      else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
    } catch (_) {
      // ignore; browser may block
    }
    document.body.classList.add('contest-fullscreen');
  };

  const handleConfirmStart = async () => {
    setShowStartDialog(false);
    await requestFullscreen();
    setLocation(`/contests/${contestId}/problems`);
  };
 
  return (
    <div className="p-6">
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Before you start</DialogTitle>
            <DialogDescription>
              Please read the following carefully:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-200">
            <div>• By clicking the <span className="font-semibold">Start</span> button now, you will be taken to <span className="font-semibold">full screen</span>.</div>
            <div>• Pressing <span className="font-mono">Ctrl + C</span> or <span className="font-mono">Ctrl + V</span> will trigger <span className="font-semibold">plagiarism detection</span> for your code.</div>
            <div>• Using any other window or browser extensions during the contest will result in <span className="font-semibold text-red-600">disqualification</span>, and the contest will be ended immediately.</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmStart}>Start</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation('/contests')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contests
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {contest.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {contest.description}
            </p>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            {isEnrolled ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-4 w-4 mr-1" />
                Enrolled
              </Badge>
            ) : (
              <Button
                onClick={handleEnroll}
                disabled={isEnrolling}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isEnrolling ? 'Enrolling...' : 'Enroll Now'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contest Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contest Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-3 text-gray-500" />
                  <div>
                    <p className="font-medium">Start Time</p>
                    <p className="text-sm text-gray-600">{formatDateTime(contest.startTime)}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-3 text-gray-500" />
                  <div>
                    <p className="font-medium">Duration</p>
                    <p className="text-sm text-gray-600">{contest.duration} minutes</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-3 text-gray-500" />
                  <div>
                    <p className="font-medium">Participants</p>
                    <p className="text-sm text-gray-600">{contest.participants?.length || 0} enrolled</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Trophy className="h-5 w-5 mr-3 text-gray-500" />
                  <div>
                    <p className="font-medium">Problems</p>
                    <p className="text-sm text-gray-600">{contest.problems?.length || 0} problems</p>
                  </div>
                </div>
              </div>
              
              {timeUntilStart && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-blue-600" />
                    <p className="text-blue-800">
                      Contest starts in <span className="font-semibold">{timeUntilStart}</span>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contest Rules */}
          <Card>
            <CardHeader>
              <CardTitle>Contest Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700">
                    You can only submit solutions during the contest period.
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700">
                    Each problem has a time limit and memory limit that must be respected.
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700">
                    You can submit multiple times for each problem, but only the best score counts.
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700">
                    The leaderboard is updated in real-time based on your submissions.
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700">
                    Plagiarism is strictly prohibited and will result in disqualification.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEnrolled ? (
                enrollmentStatus?.isDisqualified ? (
                  <div className="text-center space-y-2">
                    <div className="text-red-600 font-medium">Disqualified</div>
                    <p className="text-sm text-gray-600">
                      You have been disqualified from this contest due to rule violations.
                    </p>
                    {enrollmentStatus?.disqualificationReason && (
                      <p className="text-xs text-red-500">
                        Reason: {enrollmentStatus.disqualificationReason}
                      </p>
                    )}
                    <Button
                      onClick={() => setLocation(`/contests/${contestId}/leaderboard`)}
                      variant="outline"
                      className="w-full"
                    >
                      View Results
                    </Button>
                  </div>
                ) : enrollmentStatus?.contestEndMethod === 'manually_ended' ? (
                  <div className="text-center space-y-2">
                    <div className="text-red-600 font-medium">Contest Ended</div>
                    <p className="text-sm text-gray-600">
                      Your contest participation has ended. You can view your results in the leaderboard.
                    </p>
                    <Button
                      onClick={() => setLocation(`/contests/${contestId}/leaderboard`)}
                      variant="outline"
                      className="w-full"
                    >
                      View Results
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowStartDialog(true)}
                    className="w-full"
                    disabled={new Date() < new Date(contest.startTime)}
                  >
                    {new Date() < new Date(contest.startTime) ? 'Contest Not Started' : 'Start Contest'}
                  </Button>
                )
              ) : (
                <Button
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {isEnrolling ? 'Enrolling...' : 'Enroll in Contest'}
                </Button>
              )}
              
            </CardContent>
          </Card>

          {/* Contest Status */}
          <Card>
            <CardHeader>
              <CardTitle>Contest Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge variant="secondary">Upcoming</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Your Status:</span>
                  <Badge variant={isEnrolled ? "default" : "outline"}>
                    {isEnrolled ? 'Enrolled' : 'Not Enrolled'}
                  </Badge>
                </div>
                {isEnrolled && enrollmentStatus?.isDisqualified && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge variant="destructive">
                      Disqualified
                    </Badge>
                  </div>
                )}
                {isEnrolled && enrollmentStatus?.contestEndMethod && !enrollmentStatus?.isDisqualified && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Contest End:</span>
                    <Badge variant={enrollmentStatus.contestEndMethod === 'manually_ended' ? "destructive" : "secondary"}>
                      {enrollmentStatus.contestEndMethod === 'manually_ended' ? 'Ended' : 'Time Expired'}
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Problems:</span>
                  <span className="text-sm font-medium">{contest.problems?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Duration:</span>
                  <span className="text-sm font-medium">{contest.duration} min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 