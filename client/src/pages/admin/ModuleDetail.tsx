import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ChevronLeft, Edit, Trash2, BookOpen, Code, Video, FileText, Loader2 } from 'lucide-react';
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
  createdAt: string;
  updatedAt: string;
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

export default function ModuleDetail() {
  const { moduleId: moduleIdParam } = useParams<{ moduleId: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const moduleId = moduleIdParam ? parseInt(moduleIdParam) : NaN;

  const { data: module, isLoading, error } = useQuery({
    queryKey: ['module', moduleId],
    queryFn: async () => {
      if (!moduleId || isNaN(moduleId)) {
        throw new Error('Module ID is required');
      }
      const response = await api.get(`/modules/${moduleId}`);
      console.log('Module data fetched:', response.data);
      return response.data as CourseModule;
    },
    enabled: !!moduleId && !isNaN(moduleId),
  });

  const deleteModule = useMutation({
    mutationFn: async () => {
      if (!moduleId || isNaN(moduleId)) {
        throw new Error('Module ID is required');
      }
      await api.delete(`/modules/${moduleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', module?.courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-modules', module?.courseId] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/courses'] });
      alert('Module deleted successfully');
      setLocation(`/admin/courses/${module?.courseId}`);
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to delete module');
    },
  });

  const handleDeleteModule = () => {
    deleteModule.mutate();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!moduleId || isNaN(moduleId)) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Module ID</h1>
          <p className="text-muted-foreground mb-4">
            The module ID is missing or invalid.
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

  if (error) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Module</h1>
          <p className="text-muted-foreground mb-4">
            Failed to load module data. Please try again.
          </p>
          <p className="text-sm text-red-500 mb-4">
            Error: {error.message}
          </p>
          <Button onClick={() => setLocation('/admin/courses')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="container mx-auto py-8 px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Module Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The module you're looking for doesn't exist or has been deleted.
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
          onClick={() => setLocation(module.courseId ? `/admin/courses/${module.courseId}` : '/admin/courses')}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Course
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{module.title}</h1>
            {module.description && (
              <p className="text-muted-foreground text-lg mb-4">{module.description}</p>
            )}
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                Order: {module.order}
              </Badge>
              {module.language && (
                <Badge variant="secondary">
                  {module.language}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                Created {formatDate(module.createdAt)}
              </span>
              {module.updatedAt && (
                <span className="text-sm text-muted-foreground">
                  Last updated {formatDate(module.updatedAt)}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation(`/admin/modules/${moduleId}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Module
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Module
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Module</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{module.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteModule}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Module
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          {module.codeExample && <TabsTrigger value="code">Code Example</TabsTrigger>}
          {module.videoUrl && <TabsTrigger value="video">Video</TabsTrigger>}
        </TabsList>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Module Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              {module.textContent ? (
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap font-sans">{module.textContent}</pre>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Content Yet</h3>
                  <p className="text-muted-foreground">
                    This module doesn't have any content yet.
                  </p>
                  {/* Debug information - remove in production */}
                  <div className="mt-4 p-4 bg-gray-100 rounded text-left text-xs">
                    <p><strong>Debug Info:</strong></p>
                    <p>Module ID: {module.id}</p>
                    <p>Course ID: {module.courseId || 'undefined'}</p>
                    <p>Title: {module.title}</p>
                    <p>Text Content: {module.textContent || 'empty'}</p>
                    <p>Video URL: {module.videoUrl || 'empty'}</p>
                    <p>Code Example: {module.codeExample || 'empty'}</p>
                    <p>Language: {module.language || 'empty'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {module.codeExample && (
          <TabsContent value="code">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Code Example
                  {module.language && (
                    <Badge variant="secondary" className="ml-2">
                      {module.language}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Code:</h4>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                      <code className="text-sm">{module.codeExample}</code>
                    </pre>
                  </div>
                  
                  {module.expectedOutput && (
                    <div>
                      <h4 className="font-semibold mb-2">Expected Output:</h4>
                      <pre className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <code className="text-sm text-green-800">{module.expectedOutput}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {module.videoUrl && (
          <TabsContent value="video">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Video Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video">
                  <iframe
                    src={(() => {
                      const patterns = [
                        /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
                        /(?:youtu\.be\/)([^&\n?#]+)/,
                        /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
                        /(?:youtube\.com\/v\/)([^&\n?#]+)/
                      ];
                      
                      for (const pattern of patterns) {
                        const match = module.videoUrl!.match(pattern);
                        if (match && match[1]) {
                          return `https://www.youtube.com/embed/${match[1]}?enablejsapi=1&origin=${window.location.origin}`;
                        }
                      }
                      return module.videoUrl;
                    })()}
                    title={module.title}
                    className="w-full h-full rounded-lg border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 