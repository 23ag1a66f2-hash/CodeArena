import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Plus, Search, Book, Clock, Users, Edit, Trash2, Settings, Eye } from 'lucide-react';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface ProblemSet {
  _id?: string; // MongoDB ObjectId
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  problemInstances?: Array<{
    id: string;
    title: string;
    difficulty: string;
    originalProblemId: number;
    order: number;
    isCustomized: boolean;
    lastModified: string;
    modifiedBy: string;
  }>;
  totalProblems?: number;
  estimatedTime: number; // in minutes
  tags: string[];
  createdAt: string;
  updatedAt: string;
  enrollmentCount?: number; // Added for enrolled users count
}

const problemSetSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  category: z.string().min(1, 'Category is required'),
  estimatedTime: z.number().min(1, 'Estimated time is required'),
  tags: z.array(z.string()).default([]),
});

export default function ProblemSetManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProblemSet, setEditingProblemSet] = useState<ProblemSet | null>(null);
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<ProblemSet | null>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof problemSetSchema>>({
    resolver: zodResolver(problemSetSchema),
    defaultValues: {
      title: '',
      description: '',
      difficulty: 'easy',
      category: 'Data Structures & Algorithms',
      estimatedTime: 60,
      tags: [],
    },
  });

  // Fetch problem sets
  const { data: problemSets, isLoading } = useQuery<ProblemSet[]>({
    queryKey: ['/api/admin/problem-sets'],
    queryFn: async () => {
      const response = await fetch('/api/admin/problem-sets', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch problem sets');
      return response.json();
    },
  });

  // Create problem set mutation
  const createProblemSetMutation = useMutation({
    mutationFn: async (data: z.infer<typeof problemSetSchema>) => {
      const response = await fetch('/api/admin/problem-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create problem set');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/problem-sets'] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: 'Success',
        description: 'Problem set created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update problem set mutation
  const updateProblemSetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof problemSetSchema> }) => {
      const response = await fetch(`/api/admin/problem-sets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let message = 'Failed to update problem set';
        try {
          const err = await response.json();
          message = err.message || message;
        } catch {}
        throw new Error(message);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/problem-sets'] });
      setIsCreateDialogOpen(false);
      setEditingProblemSet(null);
      form.reset();
      toast({
        title: 'Success',
        description: 'Problem set updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete problem set mutation
  const deleteProblemSetMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/admin/problem-sets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete problem set');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/problem-sets'] });
      toast({
        title: 'Success',
        description: 'Problem set deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: z.infer<typeof problemSetSchema>) => {
    if (editingProblemSet) {
      // Use the string 'id' field for update route; do not use Mongo _id
      const id = editingProblemSet.id;
      updateProblemSetMutation.mutate({ id, data });
    } else {
      createProblemSetMutation.mutate(data);
    }
  };

  const handleEdit = (problemSet: ProblemSet) => {
    setEditingProblemSet(problemSet);
    form.reset({
      title: problemSet.title,
      description: problemSet.description,
      difficulty: problemSet.difficulty,
      category: problemSet.category,
      estimatedTime: problemSet.estimatedTime,
      tags: problemSet.tags,
    });
    setIsCreateDialogOpen(true);
  };

  const handleManageEnrollments = (problemSet: ProblemSet) => {
    // Use MongoDB ObjectId (_id) if available, otherwise fall back to custom id
    const problemSetId = problemSet._id || problemSet.id;
    setLocation(`/admin/problem-sets/${problemSetId}/enrollments`);
  };

  const handleIsolatedProblemManagement = (problemSet: ProblemSet) => {
    setLocation(`/admin/problem-sets/${problemSet.id}/problems`);
  };

  const filteredProblemSets = problemSets?.filter(problemSet => {
    const matchesSearch = problemSet.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         problemSet.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'all' || problemSet.difficulty === difficultyFilter;
    const matchesCategory = categoryFilter === 'all' || problemSet.category === categoryFilter;
    return matchesSearch && matchesDifficulty && matchesCategory;
  }) || [];

  const getDifficultyStats = () => {
    if (!problemSets) return { easy: 0, medium: 0, hard: 0, total: 0 };
    
    const stats = problemSets.reduce((acc, problemSet) => {
      acc[problemSet.difficulty]++;
      acc.total++;
      return acc;
    }, { easy: 0, medium: 0, hard: 0, total: 0 });
    
    return stats;
  };

  const stats = getDifficultyStats();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading problem sets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Manage Problem Sets
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create and manage curated collections of programming challenges.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sets</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Book className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Easy Sets</p>
                <p className="text-2xl font-bold">{stats.easy}</p>
              </div>
              <Badge variant="default" className="bg-green-100 text-green-800">Easy</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Medium Sets</p>
                <p className="text-2xl font-bold">{stats.medium}</p>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Medium</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hard Sets</p>
                <p className="text-2xl font-bold">{stats.hard}</p>
              </div>
              <Badge variant="destructive" className="bg-red-100 text-red-800">Hard</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search problem sets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={difficultyFilter} onValueChange={(value: any) => setDifficultyFilter(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Difficulties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulties</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(value: any) => setCategoryFilter(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Data Structures & Algorithms">Data Structures & Algorithms</SelectItem>
            <SelectItem value="Dynamic Programming">Dynamic Programming</SelectItem>
            <SelectItem value="Graph Theory">Graph Theory</SelectItem>
            <SelectItem value="String Processing">String Processing</SelectItem>
          </SelectContent>
        </Select>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Problem Set
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProblemSet ? 'Edit Problem Set' : 'Create New Problem Set'}</DialogTitle>
              <DialogDescription>
                {editingProblemSet 
                  ? 'Update the problem set details and configuration.' 
                  : 'Create a new curated collection of programming challenges.'
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter problem set title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Enter problem set description"
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter category" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="estimatedTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Time (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingProblemSet(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createProblemSetMutation.isPending || updateProblemSetMutation.isPending}>
                    {editingProblemSet
                      ? (updateProblemSetMutation.isPending ? 'Updating...' : 'Update Problem Set')
                      : (createProblemSetMutation.isPending ? 'Creating...' : 'Create Problem Set')
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Problem Sets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProblemSets.map((problemSet) => (
          <Card key={problemSet.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{problemSet.title}</CardTitle>
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge 
                      variant={problemSet.difficulty === 'easy' ? 'default' : 
                               problemSet.difficulty === 'medium' ? 'secondary' : 'destructive'}
                      className={problemSet.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                               problemSet.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                               'bg-red-100 text-red-800'}
                    >
                      {problemSet.difficulty}
                    </Badge>
                    <Badge variant="outline" className="text-gray-600">
                      {problemSet.category}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4 line-clamp-2">
                {problemSet.description}
              </CardDescription>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Book className="h-4 w-4 mr-2" />
                  {problemSet.problemInstances?.length || problemSet.totalProblems || 0} problems
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  {problemSet.estimatedTime}min
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  {problemSet.enrollmentCount !== undefined ? `${problemSet.enrollmentCount} enrolled users` : (problemSet.tags?.join(', ') || 'No tags')}
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                <Button
                  onClick={() => setLocation(`/admin/problem-sets/${problemSet.id}/problems`)}
                  className="flex-1"
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Problems
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(problemSet)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTarget(problemSet)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Management Buttons */}
              <div className="space-y-1">
                <Button
                  variant="secondary" 
                  className="w-full"
                  size="sm"
                  onClick={() => setLocation(`/admin/problem-sets/${problemSet.id}`)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Manage Enrollments for "{problemSet.title}"
                </Button>
                <Button
                  variant="outline" 
                  className="w-full bg-orange-50 hover:bg-orange-100 border-orange-200"
                  size="sm"
                  onClick={() => setLocation(`/admin/problem-sets/${problemSet.id}/problems`)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Isolated Problem Management
                </Button>
              </div>


            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProblemSets.length === 0 && (
        <div className="text-center py-12">
          <Book className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No problem sets found</h3>
          <p className="text-gray-600">
            {searchTerm || difficultyFilter !== 'all' || categoryFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'No problem sets are available at the moment'}
          </p>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete problem set?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await deleteProblemSetMutation.mutateAsync(deleteTarget.id);
                  setDeleteTarget(null);
                } catch {
                  // toast already handled in mutation onError
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 