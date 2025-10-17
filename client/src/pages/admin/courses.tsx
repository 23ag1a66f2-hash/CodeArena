import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Search, Eye, Edit, Trash2, Loader2, BarChart3 } from 'lucide-react';
import axios from 'axios';
import { config } from '@/config';

interface Course {
  id: number;
  title: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt?: string;
  moduleCount?: number;
  enrollmentCount?: number;
}

const api = axios.create({
  baseURL: config.apiUrl + '/api',
});

// Add request interceptor to include Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers.Accept = 'application/json';
  return config;
});

export default function AdminCourses() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await api.get('/courses');
      return response.data as Course[];
    },
  });

  const courseList: Course[] = Array.isArray(courses) ? (courses as Course[]) : [];

  const deleteCourse = useMutation({
    mutationFn: async (courseId: number) => {
      await api.delete(`/courses/${courseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/courses'] });
      alert('Course deleted successfully');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to delete course');
    },
  });

  const filteredCourses = courseList.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Courses</h1>
          <p className="text-muted-foreground">
            Manage your courses and their content
          </p>
        </div>
        <Button onClick={() => setLocation('/admin/courses/wizard')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Course
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Course List</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCourses?.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold mb-2">No Courses Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No courses match your search.' : 'Get started by creating your first course.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setLocation('/admin/courses/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Course
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Modules</TableHead>
                    <TableHead className="hidden md:table-cell">Students</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredCourses?.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{course.title}</div>
                        {course.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {course.description}
                          </div>
                        )}
                        {/* Mobile-only status badge */}
                        <div className="mt-1 sm:hidden">
                          <Badge variant={course.isPublic ? "default" : "secondary"} className="text-xs">
                            {course.isPublic ? 'Public' : 'Private'}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={course.isPublic ? "default" : "secondary"}>
                        {course.isPublic ? 'Public' : 'Private'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{course.moduleCount || 0}</TableCell>
                    <TableCell className="hidden md:table-cell">{course.enrollmentCount || 0}</TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDate(course.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/admin/courses/${course.id}/analytics`)}
                          title="View Analytics"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button> */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/admin/courses/${course.id}`)}
                          title="View Course"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/admin/courses/${course.id}/edit`)}
                          title="Edit Course"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              title="Delete Course"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Course</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{course.title}"? This action cannot be undone.
                                All course modules and student progress will be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCourse.mutate(course.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Course
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}