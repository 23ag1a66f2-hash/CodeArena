import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/ui/avatar";
import { Trophy, Medal, Award, TrendingUp, Star } from "lucide-react";

interface LeaderboardUser {
  id: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  problemsSolved: number;
  totalSubmissions: number;
  currentStreak?: number;
}

export default function Leaderboard() {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const { data: leaderboard, isLoading } = useQuery<LeaderboardUser[]>({
    queryKey: ["/api/leaderboard", { timeframe }],
    retry: false,
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-slate-400" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-500" />;
      default:
        return <span className="text-sm font-bold text-slate-600 dark:text-slate-400">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 2:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
      case 3:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Leaderboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          See how you rank against other developers in the community.
        </p>
      </div>

      {/* Top Performers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((rank) => {
          const user = leaderboard?.[rank - 1];
          const isCurrentUser = rank === 2;
          
          return (
            <Card key={rank} className={`relative ${rank === 1 ? 'ring-2 ring-yellow-400' : ''} ${isCurrentUser ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800' : ''}`}>
              {rank === 1 && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-yellow-500 text-white">👑 Champion</Badge>
                </div>
              )}
              {isCurrentUser && (
                <div className="absolute -top-2 right-2">
                  <Badge className="bg-blue-500 text-white">You</Badge>
                </div>
              )}
              <CardContent className="p-6 text-center">
                <div className="mb-4">
                  {getRankIcon(rank)}
                </div>
                <UserAvatar user={user} size="lg" className="w-16 h-16 mx-auto mb-4" />
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-1">
                  {user ? `${user.firstName} ${user.lastName}` : `User ${rank}`}
                </h3>
                <p className="text-2xl font-bold text-arena-green mb-2">
                  {user?.problemsSolved || Math.floor(Math.random() * 100) + 50} 
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  problems solved
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Timeframe Tabs */}
      <Tabs value={timeframe} onValueChange={(value) => setTimeframe(value as 'daily' | 'weekly' | 'monthly')} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value={timeframe}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5" />
                <span>
                  {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} Rankings
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                      <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                      </div>
                      <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard?.map((user, index) => {
                    const rank = index + 1;
                    const isCurrentUser = rank === 15; // Mock current user position
                    
                    return (
                      <div 
                        key={user.id} 
                        className={`flex items-center space-x-4 p-4 rounded-lg transition-colors ${
                          isCurrentUser 
                            ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="w-8 flex justify-center">
                          {rank <= 3 ? (
                            getRankIcon(rank)
                          ) : (
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
                              #{rank}
                            </span>
                          )}
                        </div>
                        
                        <UserAvatar user={user} size="md" className="w-12 h-12" />
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-slate-900 dark:text-slate-100">
                              {user.firstName} {user.lastName}
                            </h3>
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                            {rank <= 10 && (
                              <Star className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                            <span>{user.problemsSolved} problems</span>
                            <span>•</span>
                            <span>{user.totalSubmissions} submissions</span>
                            {user.currentStreak && user.currentStreak > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-orange-600">{user.currentStreak} day streak</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge className={getRankBadgeColor(rank)}>
                            Rank #{rank}
                          </Badge>
                          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {Math.floor(Math.random() * 1000) + 2000} pts
                          </div>
                        </div>
                      </div>
                    );
                  }) || (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <Trophy className="w-12 h-12 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No leaderboard data</h3>
                      <p>Rankings will appear here once users start solving problems.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Your Statistics */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Your Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                #15
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Current Rank
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-arena-green mb-1">
                47
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Problems Solved
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-arena-blue mb-1">
                156
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Total Submissions
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500 mb-1">
                12
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Day Streak
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
