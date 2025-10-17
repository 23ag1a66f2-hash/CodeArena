import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';
import axios from 'axios';
import { config } from '@/config';

interface Course {
  id: number;
  title: string;
  description?: string;
  isPublic: boolean;
  enableMarkComplete?: boolean;
  createdAt: string;
  updatedAt?: string;
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
  return config;
});

export default function EditCourse() {
  const { courseId: courseIdParam } = useParams<{ courseId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const courseId = courseIdParam ? parseInt(courseIdParam) : NaN;

  const [formData, setFormData] = useState<Partial<Course>>({
    title: '',
    description: '',
    isPublic: false,
    enableMarkComplete: true,
  });

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId || isNaN(courseId)) {
        throw new Error('Course ID is required');
      }
      const response = await api.get(`/courses/${courseId}`);
      return response.data;
    },
    enabled: !!courseId && !isNaN(courseId),
  });

  // Update form data when course data is loaded
  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || '',
        description: course.description || '',
        isPublic: course.isPublic || false,
        enableMarkComplete: course.enableMarkComplete ?? true,
      });
    }
  }, [course]);

  const updateCourse = useMutation({
    mutationFn: async (data: Partial<Course>) => {
      if (!courseId || isNaN(courseId)) {
        throw new Error('Course ID is required');
      }
      const response = await api.put(`/courses/${courseId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      alert('Course updated successfully');
      setLocation('/admin/courses');
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update course');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!courseId || isNaN(courseId)) {
      alert('Course ID is missing');
      return;
    }
    
    // Validate form data
    if (!formData.title?.trim()) {
      alert('Course title is required');
      return;
    }

    updateCourse.mutate(formData);
  };

  if (!courseId || isNaN(courseId)) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Course ID</h1>
          <p className="text-muted-foreground mb-4">
            The course ID is missing or invalid.
          </p>
          <Button onClick={() => setLocation('/admin/courses')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The course you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => setLocation('/admin/courses')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-6">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => setLocation(`/admin/courses/${courseId}`)}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Course
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">Edit Course</h1>
        <p className="text-muted-foreground">
          Update the course details below
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter course title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter course description"
                rows={4}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
              />
              <Label htmlFor="isPublic">Make this course public</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enableMarkComplete"
                checked={formData.enableMarkComplete}
                onCheckedChange={(checked) => setFormData({ ...formData, enableMarkComplete: checked })}
              />
              <Label htmlFor="enableMarkComplete">Enable Mark Complete</Label>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(`/admin/courses/${courseId}`)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={updateCourse.isPending}
              >
                {updateCourse.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
