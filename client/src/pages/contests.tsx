import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Calendar, Clock, Users, Trophy, Play, CheckCircle, Star, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface Contest {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  problems: any[];
  participants?: any[];
  status: 'upcoming' | 'active' | 'ended';
  isEnrolled?: boolean;
  participantCount?: number;
  userProgress?: {
    problemsSolved: number;
    rank: number;
  };
  contestEndMethod?: 'time_expired' | 'manually_ended';
}

export default function ContestsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'active' | 'ended'>('all');
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const userId = localStorage.getItem('userId') || 'me';

  // Fetch available contests
  const { data: contests, isLoading } = useQuery<Contest[]>({
    queryKey: ['/api/contests'],
    queryFn: async () => {
      const response = await fetch('/api/contests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch contests');
      return response.json();
    },
  });

  // Fetch enrollment status for each contest
  const { data: enrollmentStatuses } = useQuery({
    queryKey: ['/api/contests/enrollment-statuses'],
    queryFn: async () => {
      if (!contests || contests.length === 0) return {};
      
      const statusPromises = contests.map(async (contest) => {
        try {
          const response = await fetch(`/api/contests/${contest.id}/participants/me`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            return { contestId: contest.id, status: data };
          } else {
            return { contestId: contest.id, status: null };
          }
        } catch (error) {
          return { contestId: contest.id, status: null };
        }
      });
      
      const results = await Promise.all(statusPromises);
      return results.reduce((acc, { contestId, status }) => {
        acc[contestId] = status;
        return acc;
      }, {} as Record<string, any>);
    },
    enabled: !!contests && contests.length > 0,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Determine contest status
  const getContestStatus = (contest: Contest): 'upcoming' | 'active' | 'ended' => {
    const now = new Date();
    const startTime = new Date(contest.startTime);
    const endTime = new Date(contest.endTime);

    // Add debugging
    console.log(`[CONTEST-STATUS] Contest: ${contest.title}`);
    console.log(`[CONTEST-STATUS] Now: ${now.toISOString()}`);
    console.log(`[CONTEST-STATUS] Start: ${startTime.toISOString()}`);
    console.log(`[CONTEST-STATUS] End: ${endTime.toISOString()}`);
    console.log(`[CONTEST-STATUS] Contest end method: ${contest.contestEndMethod}`);

    // Check if contest has been manually ended or time expired
    // BUT only if the contest has actually ended based on time
    // This prevents rescheduled contests from showing as ended
    if (contest.contestEndMethod === 'manually_ended' || contest.contestEndMethod === 'time_expired') {
      // Only consider the contest ended if it's actually past the end time
      if (now > endTime) {
        console.log(`[CONTEST-STATUS] Contest ended: ${contest.contestEndMethod} and past end time`);
        return 'ended';
      } else {
        console.log(`[CONTEST-STATUS] Contest was ended but rescheduled - ignoring end method`);
      }
    }

    // Check if contest has actually ended based on current time
    if (now > endTime) {
      console.log(`[CONTEST-STATUS] Contest has ended based on time`);
      return 'ended';
    }

    if (now < startTime) return 'upcoming';
    if (now >= startTime && now <= endTime) return 'active';
    
    // Fallback: if we reach here, the contest should be ended
    console.log(`[CONTEST-STATUS] Fallback: marking contest as ended`);
    return 'ended';
  };

  // Filter contests based on search and status
  const filteredContests = contests?.filter(contest => {
    // Add debugging for contest data
    console.log(`[CONTEST-DATA] Contest: ${contest.title}`);
    console.log(`[CONTEST-DATA] Start time: ${contest.startTime}`);
    console.log(`[CONTEST-DATA] End time: ${contest.endTime}`);
    console.log(`[CONTEST-DATA] Raw start: ${typeof contest.startTime} - ${contest.startTime}`);
    console.log(`[CONTEST-DATA] Raw end: ${typeof contest.endTime} - ${contest.endTime}`);
    
    const matchesSearch = contest.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contest.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || getContestStatus(contest) === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status: 'upcoming' | 'active' | 'ended') => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Upcoming</Badge>;
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'ended':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Ended</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleContestClick = (contest: Contest) => {
    const status = getContestStatus(contest);
    const hasEnded = contest.contestEndMethod === 'manually_ended' || contest.contestEndMethod === 'time_expired';
    const endedByUser = localStorage.getItem(`contest:${contest.id}:endedBy:${userId}`) === 'true';
    
    // Get enrollment status to check if user has participated
    const enrollmentStatus = enrollmentStatuses?.[contest.id];
    const hasParticipated = enrollmentStatus && (
      enrollmentStatus.submissions?.length > 0 || 
      enrollmentStatus.contestEndMethod || 
      enrollmentStatus.isDisqualified
    );
    
    if (hasEnded || status === 'ended' || endedByUser) {
      // If user has participated, show results; otherwise, contest is over
      if (hasParticipated) {
        setLocation(`/contests/${contest.id}/results`);
      } else {
        // Contest has ended and user hasn't participated - show a message
        toast({
          title: 'Contest Ended',
          description: 'This contest has ended. You can no longer participate.',
          variant: 'destructive',
        });
        return;
      }
    } else if (status === 'upcoming') {
      setLocation(`/contests/${contest.id}/details`);
    } else {
      setLocation(`/contests/${contest.id}/problems`);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading contests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Coding Contests
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Discover and participate in exciting coding challenges
        </p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search contests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'upcoming', 'active', 'ended'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Contests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContests
          .filter((contest) => {
            const status = getContestStatus(contest);
            const localUserId = localStorage.getItem('userId');
            const isEnrolled = (contest as any).isEnrolled ?? contest.participants?.some((p: any) => p.userId === localUserId) ?? false;
            
            // Show all contests but prioritize enrolled ones
            // For active contests, show enrolled users prominently
            // For upcoming contests, show all (user can enroll)
            // For ended contests, show all (user can view results)
            return true;
          })
          .sort((a, b) => {
            // Sort by: enrolled first, then by status (active > upcoming > ended), then by start time
            const aStatus = getContestStatus(a);
            const bStatus = getContestStatus(b);
            const aEnrolled = (a as any).isEnrolled ?? a.participants?.some((p: any) => p.userId === localStorage.getItem('userId')) ?? false;
            const bEnrolled = (b as any).isEnrolled ?? b.participants?.some((p: any) => p.userId === localStorage.getItem('userId')) ?? false;
            
            // Enrolled contests first
            if (aEnrolled && !bEnrolled) return -1;
            if (!aEnrolled && bEnrolled) return 1;
            
            // Then by status priority
            const statusPriority = { 'active': 3, 'upcoming': 2, 'ended': 1 };
            const aPriority = statusPriority[aStatus] || 0;
            const bPriority = statusPriority[bStatus] || 0;
            
            if (aPriority !== bPriority) return bPriority - aPriority;
            
            // Finally by start time (newest first)
            return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
          })
          .map((contest) => {
          const status = getContestStatus(contest);
          const localUserId = localStorage.getItem('userId');
          const isEnrolled = (contest as any).isEnrolled ?? contest.participants?.some((p: any) => p.userId === localUserId) ?? false;
          const participantCount = contest.participantCount ?? contest.participants?.length ?? 0;
          const endedByUser = localStorage.getItem(`contest:${contest.id}:endedBy:${localUserId || 'me'}`) === 'true';
          
          // Get enrollment status from the database
          const enrollmentStatus = enrollmentStatuses?.[contest.id];
          const hasParticipated = enrollmentStatus && (
            enrollmentStatus.submissions?.length > 0 || 
            enrollmentStatus.contestEndMethod || 
            enrollmentStatus.isDisqualified
          );

          return (
            <Card key={contest.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{contest.title}</CardTitle>
                    {getStatusBadge(status)}
                  </div>
                  {isEnrolled && (
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      Enrolled
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4 line-clamp-2">
                  {contest.description}
                </CardDescription>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDateTime(contest.startTime)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    {contest.duration} minutes
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    {participantCount} participants
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Trophy className="h-4 w-4 mr-2" />
                    {contest.problems?.length || 0} problems
                  </div>
                  
                  {/* User Progress for Enrolled Contests */}
                  {isEnrolled && contest.userProgress && (
                    <>
                      {contest.userProgress.problemsSolved > 0 && (
                        <div className="flex items-center text-sm text-green-600 font-medium">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {contest.userProgress.problemsSolved} problems solved
                        </div>
                      )}
                      {contest.userProgress.rank && contest.userProgress.rank > 0 && (
                        <div className="flex items-center text-sm text-purple-600 font-medium">
                          <Award className="h-4 w-4 mr-2" />
                          Rank #{contest.userProgress.rank}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleContestClick(contest)}
                    className="flex-1"
                    variant={isEnrolled ? "default" : "outline"}
                    disabled={(() => {
                      // Disable button for ended contests where user hasn't participated
                      if (status === 'ended' || endedByUser) {
                        return !hasParticipated;
                      }
                      return false;
                    })()}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {(() => {
                      // For ended contests (time expired or manually ended)
                      if (status === 'ended' || endedByUser) {
                        // If user has participated, show results; otherwise, contest is over
                        return hasParticipated ? 'View Results' : 'Contest Ended';
                      }
                      
                      // For upcoming contests
                      if (status === 'upcoming') {
                        return isEnrolled ? 'View Details' : 'Join Contest';
                      }
                      
                      // For active contests
                      if (status === 'active') {
                        if (!isEnrolled) return 'Start Contest';
                        return hasParticipated ? 'Resume Contest' : 'Start Contest';
                      }
                      
                      // Fallback
                      return 'View Results';
                    })()}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredContests.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No contests found</h3>
          <p className="text-gray-600">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'No contests are available at the moment'}
          </p>
        </div>
      )}
    </div>
  );
}
