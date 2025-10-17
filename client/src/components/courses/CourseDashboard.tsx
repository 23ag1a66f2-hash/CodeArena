import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  BookOpen, 
  Users, 
  Play, 
  CheckCircle, 
  Clock, 
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Star,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  Target,
  Calendar,
  Award
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Course {
  id: number;
  title: string;
  description?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours?: number;
  prerequisites?: string[];
  learningObjectives?: string[];
  modules?: any[];
  enrolledUsers?: string[];
  isPublic: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  rating?: number;
  enrollmentCount?: number;
  completionRate?: number;
  moduleCount?: number;
}

interface CourseStats {
  totalCourses: number;
  totalEnrollments: number;
  averageRating: number;
  completionRate: number;
  popularCategories: Array<{ category: string; count: number }>;
  recentActivity: Array<{ action: string; course: string; timestamp: string }>;
}

export function CourseDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle student course navigation
  const handleCourseStart = async (courseId: number) => {
    try {
      const response = await apiRequest('GET', `/api/courses/${courseId}/modules`);
      if (!response.ok) {
        if (response.status === 403) {
          // Try enrolling the current user automatically, then retry modules fetch
          const enrollRes = await apiRequest('POST', `/api/courses/${courseId}/enroll`, { userId: 'self' });
          if (!enrollRes.ok && enrollRes.status !== 200 && enrollRes.status !== 201 && enrollRes.status !== 409) {
            toast({
              title: "Enrollment failed",
              description: "Could not enroll in this course.",
              variant: "destructive",
            });
            return;
          }
          // Retry fetching modules after enrollment
          const retry = await apiRequest('GET', `/api/courses/${courseId}/modules`);
          if (!retry.ok) throw new Error('Failed to fetch modules after enrollment');
          const modules = await retry.json();
          if (modules && modules.length > 0) {
            const firstModule = modules[0];
            setLocation(`/courses/${courseId}/modules/${firstModule.id}`);
            queryClient.invalidateQueries({ queryKey: ['/api/users/me/enrollments'] });
            return;
          }
          toast({ title: 'No modules found', description: 'This course has no modules yet.', variant: 'destructive' });
          return;
        }
        throw new Error('Failed to fetch modules');
      }
      const modules = await response.json();
      
      if (modules && modules.length > 0) {
        const firstModule = modules[0];
        setLocation(`/courses/${courseId}/modules/${firstModule.id}`);
      } else {
        toast({
          title: "No modules found",
          description: "This course doesn't have any modules yet.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        title: "Error",
        description: "Failed to load course content. Please try again.",
        variant: "destructive",
      });
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('newest');

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['/api/users/me/courses'],
    enabled: !!user,
  });

  // Coerce to array to avoid runtime errors if API returns a non-array
  const courseList: Course[] = Array.isArray(courses) ? (courses as Course[]) : [];

  // Fetch current user's enrollments to show real-time progress per course
  const { data: myEnrollments = [] } = useQuery({
    queryKey: ['/api/users/me/enrollments'],
    enabled: !!user,
  });

  const resetProgressMutation = useMutation({
    mutationFn: async (courseId: number) => {
      const res = await apiRequest('POST', `/api/courses/${courseId}/reset-progress`);
      if (!res.ok) throw new Error('Failed to reset progress');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/enrollments'] });
      toast({ title: 'Progress reset', description: 'You can start the course again.' });
    },
    onError: (e: any) => {
      toast({ title: 'Failed to reset progress', description: e?.message || 'Try again', variant: 'destructive' });
    }
  });

  const getEnrollmentForCourse = (courseId: number) => {
    return Array.isArray(myEnrollments) ? myEnrollments.find((e: any) => e.courseId === courseId) : undefined;
  };

  const handleStartAgain = async (courseId: number) => {
    await resetProgressMutation.mutateAsync(courseId);
    // After reset, route to the first module
    await handleCourseStart(courseId);
  };

  const { data: courseStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/course-stats'],
    enabled: user?.role === 'admin',
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: number) => {
      return apiRequest('DELETE', `/api/courses/${courseId}`);
    },
    onSuccess: () => {
      toast({
        title: "Course Deleted",
        description: "Course has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/courses'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete course",
        variant: "destructive",
      });
    }
  });

  const filteredCourses = courseList.filter((course: Course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || course.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const sortedCourses = [...filteredCourses].sort((a: Course, b: Course) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'title':
        return a.title.localeCompare(b.title);
      case 'popularity':
        return (b.enrollmentCount || 0) - (a.enrollmentCount || 0);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      default:
        return 0;
    }
  });

  const categories = [...new Set(courseList.map((course: Course) => course.category).filter(Boolean))];

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const CourseCard = ({ course }: { course: Course }) => (
    <Card className="group hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
              {course.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-sm">
              {course.description || 'No description available'}
            </CardDescription>
          </div>
          {user?.role === 'admin' && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/admin/courses/${course.id}`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/admin/courses/${course.id}/edit`)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate(course.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {course.difficulty && (
                <Badge className={getDifficultyColor(course.difficulty)}>
                  {course.difficulty}
                </Badge>
              )}
              {course.category && (
                <Badge variant="outline">{course.category}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm">{course.rating || 4.5}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <BookOpen className="h-4 w-4 mr-1" />
              {(course.moduleCount ?? course.modules?.length ?? 0)} Modules
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              {course.enrollmentCount || 0} Students
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {(course.estimatedHours ?? 0)}h
            </div>
            <div className="flex items-center">
              <Target className="h-4 w-4 mr-1" />
              {(() => {
                const e = getEnrollmentForCourse(course.id);
                const p = e?.progress ?? 0;
                return `${p}% Complete`;
              })()}
            </div>
          </div>

          <div className="space-y-2">
            <Progress value={(getEnrollmentForCourse(course.id)?.progress ?? 0)} className="h-2" />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Created {formatDate(course.createdAt)}
              </span>
              {(() => {
                const e = getEnrollmentForCourse(course.id);
                const p = e?.progress ?? 0;
                const hasStarted = p > 0;
                const isComplete = p >= 100;
                if (user?.role === 'admin') {
                  return (
                    <Button 
                      size="sm" 
                      onClick={() => setLocation(`/admin/courses/${course.id}`)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Manage
                    </Button>
                  );
                }
                if (isComplete) {
                  return (
                    <Button size="sm" onClick={() => handleStartAgain(course.id)} disabled={resetProgressMutation.isPending}>
                      <Play className="h-4 w-4 mr-2" />
                      {resetProgressMutation.isPending ? 'Resetting...' : 'Start Again'}
                    </Button>
                  );
                } else if (hasStarted) {
                  return (
                    <Button size="sm" onClick={() => handleCourseStart(course.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Resume Course
                    </Button>
                  );
                } else {
                  return (
                    <Button size="sm" onClick={() => handleCourseStart(course.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Course
                    </Button>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const CourseListItem = ({ course }: { course: Course }) => (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 grid grid-cols-4 gap-4 items-center">
            <div>
              <h3 className="font-medium hover:text-primary transition-colors cursor-pointer">
                {course.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {course.description}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {course.difficulty && (
                <Badge className={getDifficultyColor(course.difficulty)}>
                  {course.difficulty}
                </Badge>
              )}
              {course.category && (
                <Badge variant="outline">{course.category}</Badge>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center mb-1">
                <Users className="h-3 w-3 mr-1" />
                {course.enrollmentCount || 0} students
              </div>
              <div className="flex items-center">
                <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                {course.rating || 4.5}
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <div>{formatDate(course.createdAt)}</div>
              <Progress value={course.completionRate || 0} className="h-1 mt-1" />
            </div>
          </div>
          
          <div className="flex gap-2">
            {user?.role === 'admin' ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setLocation(`/admin/courses/${course.id}`)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setLocation(`/admin/courses/${course.id}/edit`)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(course.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            ) : (
              (() => {
                const e = getEnrollmentForCourse(course.id);
                const p = e?.progress ?? 0;
                const hasStarted = p > 0;
                const isComplete = p >= 100;
                
                if (isComplete) {
                  return (
                    <Button size="sm" onClick={() => handleStartAgain(course.id)} disabled={resetProgressMutation.isPending}>
                      <Play className="h-4 w-4 mr-2" />
                      {resetProgressMutation.isPending ? 'Resetting...' : 'Start Again'}
                    </Button>
                  );
                } else if (hasStarted) {
                  return (
                    <Button size="sm" onClick={() => handleCourseStart(course.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </Button>
                  );
                } else {
                  return (
                    <Button size="sm" onClick={() => handleCourseStart(course.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  );
                }
              })()
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Course Dashboard</h1>
          <p className="text-muted-foreground">
            {user?.role === 'admin' 
              ? 'Manage and monitor your courses'
              : 'View and access your enrolled courses'}
          </p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={() => setLocation('/admin/courses/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        )}
      </div>

      {/* Analytics Cards for Admin */}
      {user?.role === 'admin' && courseStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{courseStats.totalCourses}</p>
                  <p className="text-sm text-muted-foreground">Total Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{courseStats.totalEnrollments}</p>
                  <p className="text-sm text-muted-foreground">Total Enrollments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{courseStats.averageRating.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Award className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{courseStats.completionRate}%</p>
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses">All Courses</TabsTrigger>
          {user?.role === 'admin' && (
            <>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search courses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="popularity">Popularity</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex border rounded-md">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="rounded-r-none"
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Courses Display */}
          {coursesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedCourses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">
                {user?.role === 'admin' ? 'No courses found' : 'No enrolled courses'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== 'all' || selectedDifficulty !== 'all'
                  ? 'Try adjusting your filters or search terms.'
                  : user?.role === 'admin' 
                    ? 'Get started by creating your first course.'
                    : 'You are not enrolled in any courses yet. Contact your administrator to be enrolled in courses.'}
              </p>
              {user?.role === 'admin' && (
                <Button onClick={() => setLocation('/admin/courses/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Course
                </Button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedCourses.map((course: Course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedCourses.map((course: Course) => (
                <CourseListItem key={course.id} course={course} />
              ))}
            </div>
          )}
        </TabsContent>

        {user?.role === 'admin' && (
          <>
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Popular Categories
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {courseStats?.popularCategories?.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2">
                        <span>{item.category}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Overall Completion Rate</span>
                        <span>{courseStats?.completionRate || 0}%</span>
                      </div>
                      <Progress value={courseStats?.completionRate || 0} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Average Course Rating</span>
                        <span>{courseStats?.averageRating?.toFixed(1) || 0}/5</span>
                      </div>
                      <Progress value={(courseStats?.averageRating || 0) * 20} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {courseStats?.recentActivity?.length > 0 ? (
                    <div className="space-y-4">
                      {courseStats.recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div>
                            <p className="font-medium">{activity.action}</p>
                            <p className="text-sm text-muted-foreground">{activity.course}</p>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(activity.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No recent activity to display</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}