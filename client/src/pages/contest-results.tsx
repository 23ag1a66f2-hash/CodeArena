import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Medal, Award, Users, Clock, Target, ArrowLeft, TrendingUp, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useState as useReactState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ContestResultRow {
  rank: number;
  userId: string;
  displayName: string;
  totalScore: number;
  submissionTime?: string | null; // Actual submission timestamp
  totalAttempts?: number;
  lastSubmission?: string;
  contestEndMethod?: string; // Added for contest end method
}

interface Contest {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  totalProblems: number;
  totalPoints: number;
  contestEndMethod?: string; // Added for contest end method
  problems?: Array<{ id: string; title?: string; points?: number }>;
}

export default function ContestResultsPage() {
  const { contestId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [submissionsOpen, setSubmissionsOpen] = useState(false);
  const [submissionsUser, setSubmissionsUser] = useState<{ userId: string; displayName: string } | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<any[] | null>(null);
  const loadUserSubs = async (uid: string) => {
    try {
      setUserSubmissions(null);
      const res = await fetch(`/api/admin/contests/${contestId}/users/${uid}/submissions`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch submissions');
      const data = await res.json();
      console.log('[CONTEST-RESULTS] Admin submissions response:', data);
      // Extract submissions from the response
      setUserSubmissions(data.submissions || []);
    } catch (e: any) {
      console.error('[CONTEST-RESULTS] Error loading user submissions:', e);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  // Fetch final results (only valid after contest end)
  const { data: finalResults, error: resultsError } = useQuery<any>({
    queryKey: ['/api/contests', contestId, 'results'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contests/${contestId}/results`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err.message || 'Failed to fetch contest results';
        throw new Error(msg);
      }
      return response.json();
    },
    enabled: !!contestId,
    refetchInterval: false,
  });

  // Fetch contest details
  const { data: contest } = useQuery<Contest>({
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
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch contest details');
      }
      
      return response.json();
    },
    enabled: !!contestId,
  });
  const idToTitle = useMemo(() => {
    const map = new Map<string, string>();
    const problems = (contest as any)?.problems || [];
    for (const p of problems) {
      if (p?.id) map.set(String(p.id), p.title || String(p.id));
      if (p?.originalProblemId) map.set(String(p.originalProblemId), p.title || String(p.originalProblemId));
    }
    return map;
  }, [contest]);
  const problemTitle = (pid: string) => idToTitle.get(String(pid)) || pid;

  const now = new Date();
  const start = contest ? new Date(contest.startTime as any) : null;
  const end = contest ? new Date(contest.endTime as any) : null;
  const isActive = !!(contest && start && end && now >= start && now <= end && !localStorage.getItem(`contest:${contestId}:endedBy:${localStorage.getItem('userId') || 'me'}`));

  // Fetch live standings for active contests
  const { data: liveStandings } = useQuery<any>({
    queryKey: ['/api/contests', contestId, 'standings'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contests/${contestId}/standings`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err.message || 'Failed to fetch standings';
        throw new Error(msg);
      }
      return response.json();
    },
    enabled: !!contestId && isActive,
    refetchInterval: isActive ? 3000 : false,
    refetchOnWindowFocus: isActive,
  });

  // Build unified rows (prefer final results; fallback to live standings)
  const rows: ContestResultRow[] = useMemo(() => {
    if (!contest) return [];
    
    // Check if contest has ended or user has ended it
    const now = new Date();
    const contestEndTime = new Date(contest.endTime);
    const localUserId = localStorage.getItem('userId') || 'me';
    const endedByUser = localStorage.getItem(`contest:${contest.id}:endedBy:${localUserId}`) === 'true';
    const contestHasEnded = now > contestEndTime || endedByUser;
    
    console.log(`[CONTEST-STATUS] Contest: ${contest.title}`);
    console.log(`[CONTEST-STATUS] Now: ${now.toISOString()}`);
    console.log(`[CONTEST-STATUS] Contest end time: ${contestEndTime.toISOString()}`);
    console.log(`[CONTEST-STATUS] Ended by user: ${endedByUser}`);
    console.log(`[CONTEST-STATUS] Contest has ended: ${contestHasEnded}`);
    
    if (finalResults && Array.isArray(finalResults)) {
      return (finalResults as any[]).map((r: any) => ({
        rank: r.rank,
        userId: r.userId,
        displayName: r.displayName,
        totalScore: r.totalScore ?? r.score ?? 0,
        submissionTime: r.submittedAt || r.lastSubmission || null, // Use actual submission time
        totalAttempts: r.totalAttempts ?? r.totalSubmissions ?? (Array.isArray(r.submissions) ? r.submissions.length : undefined),
        contestEndMethod: r.contestEndMethod, // Include contest end method from leaderboard data
      }));
    }
    
    // Only use live standings if contest is still active
    if (!contestHasEnded && liveStandings && liveStandings.standings && Array.isArray(liveStandings.standings)) {
      return (liveStandings.standings as any[]).map((r: any) => {
        const score = r.totalScore ?? r.score ?? 0;
        const last = r.lastSubmission ? new Date(r.lastSubmission as any) : null;
        
        console.log(`[SUBMISSION-TIME] Live contest - User: ${r.displayName}, Last submission: ${last?.toISOString()}`);
        
        return {
          rank: r.rank,
          userId: r.userId,
          displayName: r.displayName,
          totalScore: score,
          submissionTime: last, // Use actual submission time
          totalAttempts: r.totalAttempts ?? (Array.isArray(r.submissions) ? r.submissions.length : undefined),
          contestEndMethod: r.contestEndMethod, // Include contest end method from leaderboard data
        } as ContestResultRow;
      });
    }
    
    // If contest has ended but no final results, calculate final times
    if (contestHasEnded && liveStandings && liveStandings.standings && Array.isArray(liveStandings.standings)) {
      return (liveStandings.standings as any[]).map((r: any) => {
        const score = r.totalScore ?? r.score ?? 0;
        const last = r.lastSubmission ? new Date(r.lastSubmission as any) : null;
        
        console.log(`[SUBMISSION-TIME] Contest ended - User: ${r.displayName}, Last submission: ${last?.toISOString()}`);
        
        return {
          rank: r.rank,
          userId: r.userId,
          displayName: r.displayName,
          totalScore: score,
          submissionTime: last, // Use actual submission time
          totalAttempts: r.totalAttempts ?? (Array.isArray(r.submissions) ? r.submissions.length : undefined),
          contestEndMethod: r.contestEndMethod, // Include contest end method from leaderboard data
        } as ContestResultRow;
      });
    }
    
    return [];
  }, [contest, finalResults, liveStandings]);

  // Search state for leaderboard filtering
  const [searchTerm, setSearchTerm] = useState('');
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows as any[];
    return (rows as any[]).filter((r: any) => {
      const name = (r.displayName || '').toString().toLowerCase();
      return name.includes(q);
    });
  }, [rows, searchTerm]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-orange-500" />;
      default:
        return <span className="text-lg font-bold">{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-200';
      case 2:
        return 'bg-gray-50 border-gray-200';
      case 3:
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  if (!contest) {
    return (
      <div className="p-6">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  // Always render leaderboard; if no data rows yet, show the empty state row below

  // Calculate statistics
  const safeResults = rows;
  const totalParticipants = safeResults.length;
  const averageScore = totalParticipants ? safeResults.reduce((sum, r: any) => sum + (r.totalScore ?? r.score ?? 0), 0) / totalParticipants : 0;
  const averageProblemsSolved = 0;

  return (
    <div className="p-6">
      <div className="flex items-center mb-4">
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setLocation('/contests')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          </div>
        </div>
  <h1 className="text-2xl font-bold py-3 flex items-center gap-3">Leaderboard {(() => {
    const now = new Date();
    const start = new Date(contest.startTime as any);
    const end = new Date(contest.endTime as any);
    const isActive = now >= start && now <= end && !localStorage.getItem(`contest:${contest.id}:endedBy:${localStorage.getItem('userId') || 'me'}`);
    return isActive ? <Badge variant="secondary" className="text-green-700 bg-green-100">Live</Badge> : null;
  })()}</h1> 

      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{contest.title}</h1>
            {/* <Button size="sm" variant="outline">Friends</Button> */}
            <div className="ml-auto flex items-center gap-2">
              {/* <Button size="sm" variant="default">All</Button> */}
              {/* <Button size="sm" variant="outline">Friends</Button> */}
              <div className="ml-auto flex items-center gap-2">
                <Input placeholder="Type username to compare" className="h-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                {/* <Button size="sm" variant="default">Compare</Button> */}
                    </div>
                  </div>
                </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left w-16">Rank</th>
                  <th className="px-4 py-2 text-left">User</th>
                  {/* <th className="px-4 py-2 text-left">Contest End Method</th> */}
                  <th className="px-4 py-2 text-left">Score</th>
                  <th className="px-4 py-2 text-left">Submission Time</th>
                  {isAdmin && <th className="px-4 py-2 text-left">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {((filtered as any[]) || []).map((r: any) => (
                  <tr key={r.userId} className="border-t">
                    <td className="px-4 py-2">{r.rank}</td>
                    <td className="px-4 py-2">{r.displayName || 'Anonymous User'}</td>
                    {/* <td className="px-4 py-2">
                      {(() => {
                        // Use participant's contest end method from database
                        const contestEndMethod = r.contestEndMethod;
                        
                        if (contestEndMethod === 'manually_ended') {
                          return <span className="text-orange-600 font-medium">Manually Ended</span>;
                        } else if (contestEndMethod === 'time_expired') {
                          return <span className="text-red-600 font-medium">Time Expired</span>;
                        } else {
                          // If no contest end method is set, don't show anything
                          return null;
                        }
                      })()}
                    </td> */}
                    <td className="px-4 py-2">
                      <span className="font-medium">
                        {Number(r.totalScore ?? r.score ?? 0).toFixed(0)}
                      </span>
                      <span className="text-gray-500"> / </span>
                      <span className="text-gray-600">
                        {contest.problems?.length ? contest.problems.length * 100 : 0}
                      </span>
                    </td>
                    <td className="px-4 py-2">{r.submissionTime ? new Date(r.submissionTime).toLocaleString() : 'N/A'}</td>
                    {isAdmin && (
                      <td className="px-4 py-2">
                        <Button size="sm" variant="outline" onClick={async () => { setSubmissionsUser({ userId: r.userId, displayName: r.displayName || r.userId }); setSubmissionsOpen(true); await loadUserSubs(r.userId); }}>View Submissions</Button>
                      </td>
                    )}
                  </tr>
                ))}
                {(!filtered || (filtered as any[]).length === 0) && (
                  <tr className="border-t">
                    <td colSpan={isAdmin ? 6 : 5} className="px-4 py-6 text-center text-gray-500">No submissions yet. Leaderboard will update live as submissions come in.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Admin submissions modal */}
      {isAdmin && (
        <Dialog open={submissionsOpen} onOpenChange={setSubmissionsOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Submissions - {submissionsUser?.displayName}</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
              {!userSubmissions && <div className="p-4 text-sm text-gray-500">Loading...</div>}
              {Array.isArray(userSubmissions) && userSubmissions.length === 0 && (
                <div className="p-4 text-sm text-gray-500">No submissions found for this user.</div>
              )}
              {Array.isArray(userSubmissions) && userSubmissions.length > 0 && (
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Problem</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Language</th>
                      <th className="px-3 py-2 text-left">Runtime</th>
                      <th className="px-3 py-2 text-left">Memory</th>
                      <th className="px-3 py-2 text-left">Submitted</th>
                      <th className="px-3 py-2 text-left">Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userSubmissions.map((s: any) => (
                      <tr key={s.id} className="border-t align-top">
                        <td className="px-3 py-2">{problemTitle(s.problemId)}</td>
                        <td className="px-3 py-2 capitalize">{s.status}</td>
                        <td className="px-3 py-2">{s.language || '-'}</td>
                        <td className="px-3 py-2">{s.runtime ?? '-'}</td>
                        <td className="px-3 py-2">{s.memory ?? '-'}</td>
                        <td className="px-3 py-2">{new Date(s.submissionTime || s.submittedAt || Date.now()).toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <details>
                            <summary className="cursor-pointer text-blue-600 hover:underline">View Code</summary>
                            <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded overflow-x-auto text-xs whitespace-pre-wrap">{s.code || 'No code captured.'}</pre>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 