import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Save, Loader2 } from 'lucide-react';
import axios from 'axios';
import { config } from '@/config';

interface CourseModule {
  id: number;
  courseId: number;
  title: string;
  description?: string;
  order: number;
  textContent?: string;
  videoUrl?: string;
  codeExample?: string;
  language?: string;
  expectedOutput?: string;
}

const api = axios.create({
  baseURL: `${config.apiUrl}/api`,
});

// Add request interceptor to include Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default function CreateModule() {
  const { courseId: courseIdParam } = useParams<{ courseId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const courseId = courseIdParam ? parseInt(courseIdParam) : NaN;
  
  const [formData, setFormData] = useState<Partial<CourseModule>>({
    title: '',
    description: '',
    order: 1,
    textContent: '',
    videoUrl: '',
    codeExample: '',
    language: 'javascript',
    expectedOutput: '',
  });

  const createModule = useMutation({
    mutationFn: async (data: Partial<CourseModule>) => {
      if (!courseId || isNaN(courseId)) {
        throw new Error('Course ID is required');
      }
      const response = await api.post(`/courses/${courseId}/modules`, data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/courses'] });
      
      // Force a refetch of the course modules
      queryClient.refetchQueries({ queryKey: ['course-modules', courseId] });
      
      alert('Module created successfully');
      setLocation(`/admin/courses/${courseId}`);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to create module');
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
      alert('Module title is required');
      return;
    }

    if (typeof formData.order !== 'number' || formData.order < 1) {
      alert('Order must be a positive number');
      return;
    }

    createModule.mutate(formData);
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
        
        <h1 className="text-3xl font-bold mb-2">Create New Module</h1>
        <p className="text-muted-foreground">
          Add a new learning module to this course
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Module Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter module title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Order</Label>
                <Input
                  id="order"
                  type="number"
                  min="1"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                  placeholder="Module order"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter module description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="textContent">Content</Label>
              <Textarea
                id="textContent"
                value={formData.textContent}
                onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                placeholder="Enter the main content/lesson text"
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL (Optional)</Label>
              <Input
                id="videoUrl"
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="language">Programming Language (Optional)</Label>
                <select
                  id="language"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full p-2 border border-input bg-background rounded-md"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedOutput">Expected Output (Optional)</Label>
                <Textarea
                  id="expectedOutput"
                  value={formData.expectedOutput}
                  onChange={(e) => setFormData({ ...formData, expectedOutput: e.target.value })}
                  placeholder="Expected output for code examples"
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="codeExample">Code Example (Optional)</Label>
              <Textarea
                id="codeExample"
                value={formData.codeExample}
                onChange={(e) => setFormData({ ...formData, codeExample: e.target.value })}
                placeholder="Enter code example or starter code"
                rows={8}
                className="font-mono text-sm"
              />
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
                disabled={createModule.isPending}
              >
                {createModule.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Module
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