import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Users,
  UserPlus,
  Search,
  Trash2,
  BookOpen,
  Calendar,
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

interface Enrollment {
  id: number;
  courseId: number;
  userId: string;
  enrolledAt: string;
  enrolledBy?: string;
  progress: number;
}

interface Course {
  id: number;
  title: string;
  description?: string;
  isPublic: boolean;
}

export default function ManageCourseEnrollments() {
  const { courseId } = useParams<{ courseId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');

  // Fetch course data
  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: ['/api/courses', courseId],
    enabled: !!courseId
  });

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users']
  });

  // Fetch course enrollments - FORCE FRESH DATA TO DEBUG DUPLICATION
  const { data: enrollments = [], isLoading: enrollmentsLoading, refetch: refetchEnrollments } = useQuery<Enrollment[]>({
    queryKey: [`/api/courses/${courseId}/enrollments`], // Force unique key
    enabled: !!courseId,
    staleTime: 0, // No caching to ensure fresh data
    gcTime: 0, // No cache retention (new React Query v5 syntax)
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Force refetch when returning to page
    refetchInterval: 5000, // Refetch every 5 seconds to keep data fresh
    retry: false
  });

  // CRITICAL DEBUG: Log exact enrollment data
  console.log('=== ENROLLMENT DEBUG ===');
  console.log('Enrollments length:', enrollments.length);
  console.log('Enrollments data:', enrollments);
  console.log('Enrollment IDs:', enrollments.map(e => e.id));
  console.log('========================');

  // Filter users for enrollment (exclude already enrolled users)
  const enrolledUserIds = enrollments.map((e: Enrollment) => e.userId);
  const availableUsers = users.filter((user: User) => 
    !enrolledUserIds.includes(user.id) && user.role !== 'admin'
  );

  // Filter users based on search
  const filteredUsers = availableUsers.filter((user: User) =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Enroll user mutation
  const enrollMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      return apiRequest('POST', `/api/courses/${courseId}/enroll`, { userId });
    },
    onSuccess: async () => {
      toast({
        title: "Student Enrolled",
        description: "Student has been successfully enrolled in the course.",
      });
      // Force complete cache refresh
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/enrollments`] });
      queryClient.removeQueries({ queryKey: [`/api/courses/${courseId}/enrollments`] });
      await refetchEnrollments();
      setSelectedUser('');
    },
    onError: (error: any) => {
      toast({
        title: "Enrollment Failed",
        description: error.message || "Failed to enroll student in course.",
        variant: "destructive",
      });
    }
  });

  // Remove enrollment mutation
  const removeEnrollmentMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      return apiRequest('DELETE', `/api/courses/${courseId}/enrollments/${userId}`);
    },
    onSuccess: async () => {
      toast({
        title: "Enrollment Removed",
        description: "Student has been removed from the course.",
      });
      // Force complete cache refresh
      queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseId}/enrollments`] });
      queryClient.removeQueries({ queryKey: [`/api/courses/${courseId}/enrollments`] });
      await refetchEnrollments();
    },
    onError: (error: any) => {
      toast({
        title: "Remove Failed",
        description: error.message || "Failed to remove student from course.",
        variant: "destructive",
      });
    }
  });

  const handleEnrollUser = () => {
    if (selectedUser) {
      enrollMutation.mutate({ userId: selectedUser });
    }
  };

  const handleRemoveEnrollment = (userId: string) => {
    removeEnrollmentMutation.mutate({ userId });
  };

  if (courseLoading) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto py-8 px-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h1 className="text-xl font-bold mb-2">Course Not Found</h1>
              <p className="text-muted-foreground mb-4">
                The course you're trying to manage doesn't exist.
              </p>
              <Button onClick={() => setLocation('/admin/courses')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Courses
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/admin/courses')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Manage Course Enrollments</h1>
          <p className="text-muted-foreground mt-1">
            Enroll students in "{course?.title || 'Unknown Course'}"
          </p>
        </div>
        <Badge variant={course?.isPublic ? "default" : "secondary"}>
          {course?.isPublic ? 'Public Course' : 'Private Course'}
        </Badge>
      </div>

      {/* Course Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>{course?.title || 'Course Details'}</span>
          </CardTitle>
          {course?.description && (
            <CardDescription>{course.description}</CardDescription>
          )}
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Enroll New Student */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>Enroll New Student</span>
            </CardTitle>
            <CardDescription>
              Add a student to this course
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Students</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Student</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student to enroll" />
                </SelectTrigger>
                <SelectContent>
                  {filteredUsers.length === 0 ? (
                    <SelectItem value="none" disabled>
                      {searchTerm ? 'No students found' : 'No students available for enrollment'}
                    </SelectItem>
                  ) : (
                    filteredUsers.map((user: User) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleEnrollUser}
              disabled={!selectedUser || enrollMutation.isPending}
              className="w-full"
            >
              {enrollMutation.isPending ? 'Enrolling...' : 'Enroll Student'}
            </Button>
          </CardContent>
        </Card>

        {/* Current Enrollments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Current Enrollments ({enrollments.length})</span>
            </CardTitle>
            <CardDescription>
              Students currently enrolled in this course
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enrollmentsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div className="space-y-1">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="h-8 w-20 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : enrollments.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No students enrolled yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {enrollments.map((enrollment: Enrollment) => {
                  const user = users.find((u: User) => u.id === enrollment.userId);
                  return (
                    <div key={`enrollment-${enrollment.id}-${enrollment.userId}`} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {user?.name || user?.email || 'Unknown User'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{enrollment.progress}% Complete</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEnrollment(enrollment.userId)}
                          disabled={removeEnrollmentMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}