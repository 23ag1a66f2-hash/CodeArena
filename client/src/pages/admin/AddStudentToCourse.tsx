import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, UserPlus, ArrowLeft, Loader2, Users, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  createdAt: string;
}

interface Course {
  id: number;
  title: string;
  description?: string;
  enrollmentCount?: number;
}

export default function AddStudentToCourse() {
  const { courseId } = useParams<{ courseId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Fetch course data
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/courses/${courseId}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      return response.json() as Promise<Course>;
    }
  });

  // Fetch all users (students)
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json() as Promise<User[]>;
    }
  });

  // Fetch current enrollments
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['course-enrollments', courseId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/courses/${courseId}/enrollments`);
      if (!response.ok) throw new Error('Failed to fetch enrollments');
      return response.json();
    }
  });

  // Filter users based on search term and exclude already enrolled students
  const enrolledUserIds = new Set(enrollments.map((enrollment: any) => enrollment.userId));
  
  const filteredUsers = users
    .filter(user => user.role === 'student')
    .filter(user => !enrolledUserIds.has(user.id))
    .filter(user => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        user.email?.toLowerCase().includes(searchLower) ||
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower)
      );
    });

  // Enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const promises = userIds.map(userId =>
        apiRequest('POST', `/api/courses/${courseId}/enroll`, { userId })
      );
      const responses = await Promise.all(promises);
      return Promise.all(responses.map(res => res.json()));
    },
    onSuccess: () => {
      toast({
        title: 'Students Enrolled',
        description: `Successfully enrolled ${selectedUsers.size} student(s) in the course`
      });
      queryClient.invalidateQueries({ queryKey: ['course-enrollments', courseId] });
      setSelectedUsers(new Set());
      setLocation(`/admin/courses/${courseId}`);
    },
    onError: (error: Error) => {
      toast({
        title: 'Enrollment Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleEnrollSelected = () => {
    if (selectedUsers.size === 0) return;
    enrollMutation.mutate(Array.from(selectedUsers));
  };

  if (courseLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation(`/admin/courses/${courseId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Course
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Students to Course</h1>
          <p className="text-muted-foreground">{course?.title}</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Course Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Course Title</Label>
                <p className="text-sm text-muted-foreground">{course?.title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Current Enrollments</Label>
                <p className="text-sm text-muted-foreground">{enrollments.length} students</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Available Students</Label>
                <p className="text-sm text-muted-foreground">{filteredUsers.length} students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Students to Enroll
                </CardTitle>
                <CardDescription>
                  Choose students to add to this course. Already enrolled students are not shown.
                </CardDescription>
              </div>
              {selectedUsers.size > 0 && (
                <Button
                  onClick={handleEnrollSelected}
                  disabled={enrollMutation.isPending}
                >
                  {enrollMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Enroll {selectedUsers.size} Student(s)
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Students Table */}
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No students found matching your search.' : 'No available students to enroll.'}
                </p>

              </div>
            ) : (
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead className="hidden md:table-cell">Role</TableHead>
                      <TableHead className="hidden lg:table-cell">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="cursor-pointer" onClick={() => handleSelectUser(user.id)}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : 'No name provided'
                              }
                            </p>
                            {/* Mobile-only info */}
                            <div className="sm:hidden text-xs text-muted-foreground mt-1">
                              <div>{user.email || 'No email'}</div>
                              <Badge variant="secondary" className="text-xs mt-1">{user.role}</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <p className="text-sm">{user.email || 'No email'}</p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <p className="text-sm text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {selectedUsers.size > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>{selectedUsers.size}</strong> student(s) selected for enrollment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}