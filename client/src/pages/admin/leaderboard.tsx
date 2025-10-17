import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Trophy, Star, Calendar } from "lucide-react";

interface LeaderboardEntry {
  id: number;
  rank: number;
  user: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
  };
  score: number;
  problemsSolved: number;
  contestsParticipated: number;
  lastActive: string;
}

export default function AdminLeaderboard() {
  const [timeRange, setTimeRange] = useState<"all" | "day" | "week" | "month">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/admin/leaderboard", timeRange],
    retry: false,
  });

  const filteredLeaderboard = leaderboard?.filter(entry =>
    entry.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    if (rank === 2) return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    if (rank === 3) return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and monitor user performance across the platform.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaderboard?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Star className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaderboard?.filter(entry => {
                const lastActive = new Date(entry.lastActive);
                const today = new Date();
                return lastActive.toDateString() === today.toDateString();
              }).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Problems Solved</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaderboard?.reduce((acc, entry) => acc + entry.problemsSolved, 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contest Participants</CardTitle>
            <Trophy className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaderboard?.filter(entry => entry.contestsParticipated > 0).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Search Users</span>
            </div>
            <Select value={timeRange} onValueChange={(value: "all" | "day" | "week" | "month") => setTimeRange(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="day">Last 24 Hours</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeaderboard.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800">
                    {entry.user.avatar ? (
                      <img
                        src={entry.user.avatar}
                        alt={entry.user.name}
                        className="h-12 w-12 rounded-full"
                      />
                    ) : (
                      <div className="text-2xl font-bold text-gray-500">
                        {entry.user.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {entry.user.name}
                      </h3>
                      <Badge className={getRankBadgeColor(entry.rank)}>
                        #{entry.rank}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {entry.user.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {entry.score} points
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {entry.problemsSolved} problems solved
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <div>
                    Contests participated: {entry.contestsParticipated}
                  </div>
                  <div>
                    Last active: {new Date(entry.lastActive).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredLeaderboard.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p>Try adjusting your search criteria.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 