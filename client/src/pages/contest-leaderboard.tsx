import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, ArrowLeft, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  totalScore: number;
  totalPenalty: number;
  problemsSolved: number;
  submissions: number;
  lastSubmission: string;
  problemScores: Record<string, number>;
  contestEndMethod?: string; // Added for contest end method
}

interface Contest {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  problems: Array<{
    id: string;
    title: string;
    points: number;
  }>;
  contestEndMethod: 'time_expired' | 'manually_ended';
}

export default function ContestLeaderboardPage() {
  const { contestId } = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  // Fetch contest details
  const { data: contest, isLoading: contestLoading, error: contestError } = useQuery<Contest>({
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
      if (error.message === 'Authentication required') {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Fetch leaderboard data
  const { data: leaderboard, isLoading: leaderboardLoading, error: leaderboardError } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/contests', contestId, 'leaderboard'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`/api/contests/${contestId}/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch leaderboard');
      }
      
      return response.json();
    },
    enabled: !!contestId && isAuthenticated,
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    retry: (failureCount, error) => {
      if (error.message === 'Authentication required') {
        return false;
      }
      return failureCount < 3;
    },
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getCurrentUserRank = () => {
    const currentUserId = localStorage.getItem('userId');
    return leaderboard?.find(entry => entry.userId === currentUserId);
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to view the contest leaderboard.</p>
          <Button onClick={() => setLocation('/login')} className="mt-4">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (contestLoading || leaderboardLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (contestError || leaderboardError) {
    const error = contestError || leaderboardError;
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {error?.message === 'Authentication required' ? 'Authentication Required' : 'Error Loading Leaderboard'}
          </h3>
          <p className="text-gray-600 mb-4">
            {error?.message === 'Authentication required' 
              ? 'Please log in to view the contest leaderboard.'
              : error?.message || 'Failed to load leaderboard data.'
            }
          </p>
          {error?.message === 'Authentication required' ? (
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

  const currentUser = getCurrentUserRank();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => setLocation(`/contests/${contestId}/details`)}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contest
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Leaderboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {contest.title} - Real-time rankings
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-600">Live Updates</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Contest Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaderboard?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Problems</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contest.problems?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Rank</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentUser ? `#${currentUser.rank}` : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Your Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentUser ? currentUser.totalScore : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Rankings</CardTitle>
          <CardDescription>
            Real-time leaderboard showing participant rankings and scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard && leaderboard.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Participant</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Penalty</TableHead>
                    <TableHead className="text-center">Solved</TableHead>
                    <TableHead className="text-center">Contest End Method</TableHead>
                    {contest.problems?.map((problem) => (
                      <TableHead key={problem.id} className="text-center">
                        {problem.title}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Last Submission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry, index) => (
                    <TableRow 
                      key={entry.userId}
                      className={entry.userId === localStorage.getItem('userId') ? 'bg-blue-50' : ''}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          {getRankIcon(entry.rank)}
                          <span>#{entry.rank}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{entry.userName}</span>
                          {entry.userId === localStorage.getItem('userId') && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        <span className="font-bold text-gray-900">
                          {entry.totalScore}
                        </span>
                        <span className="text-gray-500"> / </span>
                        <span className="text-gray-600">
                          {contest.problems?.length ? contest.problems.length * 100 : 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-gray-600">
                        {entry.totalPenalty}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{entry.problemsSolved}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {(() => {
                          // Use participant's contest end method from database
                          const contestEndMethod = entry.contestEndMethod;
                          
                          if (contestEndMethod === 'manually_ended') {
                            return <Badge variant="outline" className="text-orange-600 border-orange-300">Manually Ended</Badge>;
                          } else if (contestEndMethod === 'time_expired') {
                            return <Badge variant="outline" className="text-red-600 border-red-300">Time Expired</Badge>;
                          } else {
                            // If no contest end method is set, don't show anything
                            return null;
                          }
                        })()}
                      </TableCell>
                      {contest.problems?.map((problem) => {
                        const score = entry.problemScores[problem.id] || 0;
                        return (
                          <TableCell key={problem.id} className="text-center">
                            {score > 0 ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                {score}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center text-sm text-gray-600">
                        <div className="flex items-center justify-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(entry.lastSubmission)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No participants yet</h3>
              <p className="text-gray-600">Be the first to solve problems and appear on the leaderboard!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current User Stats */}
      {currentUser && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Your Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">#{currentUser.rank}</div>
                <div className="text-sm text-gray-600">Current Rank</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {currentUser ? (
                    <>
                      <span className="text-green-700">{currentUser.totalScore}</span>
                      <span className="text-gray-500"> / </span>
                      <span className="text-gray-600">
                        {contest.problems?.length ? contest.problems.length * 100 : 0}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-400">0</span>
                      <span className="text-gray-500"> / </span>
                      <span className="text-gray-400">0</span>
                    </>
                  )}
                </div>
                <div className="text-sm text-gray-600">Total Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{currentUser.problemsSolved}</div>
                <div className="text-sm text-gray-600">Problems Solved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {(() => {
                    // Check if user is disqualified first
                    if (currentUser.isDisqualified) {
                      return 'Disqualified';
                    }
                    
                    // Use participant's contest end method from database
                    const contestEndMethod = currentUser.contestEndMethod;
                    
                    if (contestEndMethod === 'manually_ended') {
                      return 'Manually Ended';
                    } else if (contestEndMethod === 'time_expired') {
                      return 'Time Expired';
                    } else {
                      // If no contest end method is set, don't show anything
                      return null;
                    }
                  })()}
                </div>
                <div className="text-sm text-gray-600">Contest Status</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 