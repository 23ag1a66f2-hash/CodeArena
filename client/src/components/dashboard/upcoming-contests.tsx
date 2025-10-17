import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Trophy } from "lucide-react";

export function UpcomingContests() {
  const { data: contests, isLoading } = useQuery({
    queryKey: ["/api/contests"],
    retry: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Contests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="animate-pulse border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter upcoming contests (mock data for now since we don't have real contest dates)
  const upcomingContests = [
    {
      id: 1,
      title: "Weekly Contest 127",
      date: "Dec 15, 2024",
      time: "2:00 PM EST",
      participants: "1,247 registered",
      type: "weekly",
    },
    {
      id: 2,
      title: "Monthly Challenge",
      date: "Dec 20, 2024",
      prize: "$500 Prize Pool",
      type: "monthly",
    },
  ];

  return (
    <Card>
      <CardHeader className="border-b border-gray-200 dark:border-gray-800">
        <CardTitle>Upcoming Contests</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {upcomingContests.map((contest) => (
            <div key={contest.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                {contest.title}
              </h3>
              <div className="space-y-2 text-sm">
                {contest.date && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{contest.date}</span>
                  </div>
                )}
                {contest.time && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{contest.time}</span>
                  </div>
                )}
                {contest.participants && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{contest.participants}</span>
                  </div>
                )}
                {contest.prize && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <Trophy className="w-4 h-4 mr-2" />
                    <span>{contest.prize}</span>
                  </div>
                )}
              </div>
              <Button 
                className={`w-full mt-4 font-medium ${
                  contest.type === 'weekly' 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {contest.type === 'weekly' ? 'Register Now' : 'Learn More'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
