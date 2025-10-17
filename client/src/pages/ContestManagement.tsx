import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Calendar, 
  Clock, 
  Users, 
  Trophy, 
  Plus, 
  Play, 
  Pause, 
  BarChart3,
  Eye,
  Edit,
  Award,
  Trash2,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';

// Contest form schema
const contestFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['coding', 'algorithm', 'competitive']),
  visibility: z.enum(['public', 'private', 'unlisted']),
  startTime: z.string(),
  endTime: z.string(),
  duration: z.number().min(1).optional(),
  timeZone: z.string().default('UTC'),
  scoringMethod: z.enum(['maximum', 'time_based', 'partial', 'acm_icpc']),
  wrongSubmissionPenalty: z.number().min(0).default(0),
  timePenalty: z.boolean().default(false),
  freezeLeaderboard: z.boolean().default(false),
  freezeTime: z.number().optional(),
  registrationOpen: z.boolean().default(true),
  allowLateRegistration: z.boolean().default(false),
  prizePool: z.string().optional(),
  certificates: z.boolean().default(false),
  enableAnalytics: z.boolean().default(true),
  allowReplay: z.boolean().default(true),
});

type ContestFormData = z.infer<typeof contestFormSchema>;

interface Contest {
  id: string;
  title: string;
  description?: string;
  type: 'coding' | 'algorithm' | 'competitive';
  visibility: 'public' | 'private' | 'unlisted';
  status: 'draft' | 'published' | 'active' | 'ended' | 'cancelled';
  startTime: string;
  endTime: string;
  duration?: number;
  participants: string[];
  problems: any[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  prizePool?: string;
  certificates: boolean;
}

export default function ContestManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingContest, setEditingContest] = useState<Contest | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [editSelectedProblems, setEditSelectedProblems] = useState<string[]>([]);

  // Fetch contests
  const { data: contests = [], isLoading } = useQuery<Contest[]>({
    queryKey: ['/api/contests'],
    enabled: !!user && user.role === 'admin',
  });

  // Fetch available problems for contest creation/editing
  const { data: availableProblems = [] } = useQuery<any[]>({
    queryKey: ['/api/contests/available-problems'],
    enabled: (showCreateDialog || showEditDialog) && !!user && user.role === 'admin',
  });

  // Debug available problems whenever they change
  console.log('[DEBUG] Available problems loaded:', availableProblems);

  // Effect to set selected problems when available problems load and we have an editing contest
  useEffect(() => {
    if (editingContest && availableProblems.length > 0 && showEditDialog) {
      console.log('[DEBUG] Setting up selected problems for edit dialog');
      console.log('[DEBUG] Available problems:', availableProblems.map(p => ({ id: p.id, title: p.title })));
      
      // Extract originalProblemIds from contest problems and match them with available problems
      let existingProblemIds: string[] = [];
      
      if (editingContest.problems && Array.isArray(editingContest.problems)) {
        editingContest.problems.forEach((contestProblem: any, index: number) => {
          console.log(`[DEBUG] Contest problem ${index}:`, contestProblem);
          
          // For contest problems, we need to match originalProblemId with available problem ids
          const originalProblemId = contestProblem.originalProblemId;
          
          if (originalProblemId) {
            // Find the matching available problem by ID
            const matchingProblem = availableProblems.find(p => p.id === originalProblemId);
            if (matchingProblem) {
              existingProblemIds.push(matchingProblem.id);
              console.log(`[DEBUG] Matched contest problem ${originalProblemId} with available problem ${matchingProblem.id}`);
            } else {
              console.log(`[DEBUG] No matching available problem found for originalProblemId: ${originalProblemId}`);
            }
          }
        });
      }
      
      console.log('[DEBUG] Final mapped existing problem IDs:', existingProblemIds);
      console.log('[DEBUG] Setting editSelectedProblems to:', existingProblemIds);
      setEditSelectedProblems(existingProblemIds);
    }
  }, [editingContest, availableProblems, showEditDialog]);

  // Contest form
  const form = useForm<ContestFormData>({
    resolver: zodResolver(contestFormSchema),
    defaultValues: {
      type: 'coding',
      visibility: 'public',
      scoringMethod: 'maximum',
      wrongSubmissionPenalty: 0,
      timePenalty: false,
      freezeLeaderboard: false,
      registrationOpen: true,
      allowLateRegistration: false,
      certificates: false,
      enableAnalytics: true,
      allowReplay: true,
      timeZone: 'UTC',
    },
  });

  // Edit contest form
  const editForm = useForm<ContestFormData>({
    resolver: zodResolver(contestFormSchema),
    defaultValues: {
      type: 'coding',
      visibility: 'public',
      scoringMethod: 'maximum',
      wrongSubmissionPenalty: 0,
      timePenalty: false,
      freezeLeaderboard: false,
      registrationOpen: true,
      allowLateRegistration: false,
      certificates: false,
      enableAnalytics: true,
      allowReplay: true,
      timeZone: 'UTC',
    },
  });

  // Create contest mutation
  const createContestMutation = useMutation({
    mutationFn: async (data: ContestFormData) => {
      const selectedProblemObjects = availableProblems.filter(problem => 
        selectedProblems.includes(problem.id)
      );
      
      const contestData = {
        ...data,
        selectedProblems: selectedProblemObjects,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        status: 'draft' as const,
      };
      return apiRequest('/api/contests', 'POST', contestData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contests'] });
      setShowCreateDialog(false);
      setSelectedProblems([]);
      form.reset();
    },
  });

  // Update contest mutation
  const updateContestMutation = useMutation({
    mutationFn: async (data: ContestFormData) => {
      if (!editingContest) {
        console.log('[DEBUG] No editing contest found');
        return;
      }
      
      console.log('[DEBUG] Update mutation - selectedProblems:', editSelectedProblems);
      console.log('[DEBUG] Update mutation - availableProblems:', availableProblems);
      
      const selectedProblemObjects = availableProblems.filter(problem => 
        editSelectedProblems.includes(problem.id)
      );
      
      console.log('[DEBUG] Selected problem objects for update:', selectedProblemObjects);
      
      const contestData: any = {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      };
      // Only include selectedProblems when actually changing problems
      if (Array.isArray(editSelectedProblems) && editSelectedProblems.length > 0) {
        contestData.selectedProblems = selectedProblemObjects;
      }
      
      console.log('[DEBUG] Final contest data for update:', contestData);
      return apiRequest(`/api/contests/${editingContest.id}`, 'PUT', contestData);
    },
    onSuccess: (result) => {
      console.log('[DEBUG] Update contest successful:', result);
      queryClient.invalidateQueries({ queryKey: ['/api/contests'] });
      setShowEditDialog(false);
      setEditingContest(null);
      setEditSelectedProblems([]);
      editForm.reset();
    },
    onError: (error) => {
      console.error('[DEBUG] Update contest failed:', error);
    }
  });

  // Update contest status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ contestId, status }: { contestId: string; status: string }) => {
      return apiRequest(`/api/contests/${contestId}`, 'PUT', { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contests'] });
    },
  });

  // Delete contest mutation
  const deleteContestMutation = useMutation({
    mutationFn: async (contestId: string) => {
      return apiRequest(`/api/contests/${contestId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contests'] });
      setSelectedContest(null);
    },
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Admin privileges required to access contest management.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const onSubmit = (data: ContestFormData) => {
    createContestMutation.mutate(data);
  };

  const onEditSubmit = (data: ContestFormData) => {
    console.log('[DEBUG] onEditSubmit called with:', data);
    console.log('[DEBUG] editSelectedProblems:', editSelectedProblems);
    console.log('[DEBUG] availableProblems:', availableProblems);
    updateContestMutation.mutate(data);
  };

  // Handle edit contest
  const handleEditContest = (contest: Contest) => {
    setEditingContest(contest);
    
    // First show the dialog to trigger the available problems query
    setShowEditDialog(true);
    
    // Populate form with existing contest data
    editForm.reset({
      title: contest.title,
      description: contest.description || '',
      type: contest.type,
      visibility: contest.visibility,
      startTime: new Date(contest.startTime).toISOString().slice(0, 16),
      endTime: new Date(contest.endTime).toISOString().slice(0, 16),
      duration: contest.duration || 120,
      timeZone: 'UTC',
      scoringMethod: 'maximum',
      wrongSubmissionPenalty: 0,
      timePenalty: false,
      freezeLeaderboard: false,
      registrationOpen: true,
      allowLateRegistration: false,
      prizePool: contest.prizePool || '',
      certificates: contest.certificates || false,
      enableAnalytics: true,
      allowReplay: true,
    });

    // Set selected problems - this will be properly handled by the useEffect
    console.log('[DEBUG] Contest object:', contest);
    console.log('[DEBUG] Contest problems:', contest.problems);
  };

  const handleStatusChange = (contestId: string, status: string) => {
    updateStatusMutation.mutate({ contestId, status });
  };

  const handleDeleteContest = (contestId: string) => {
    if (confirm('Are you sure you want to delete this contest? This action cannot be undone.')) {
      deleteContestMutation.mutate(contestId);
    }
  };

  // Handle problem selection for create dialog
  const handleProblemToggle = (problemId: string) => {
    setSelectedProblems(prev => 
      prev.includes(problemId) 
        ? prev.filter(id => id !== problemId)
        : [...prev, problemId]
    );
  };

  // Handle problem selection for edit dialog
  const handleEditProblemToggle = (problemId: string) => {
    console.log('[DEBUG] Toggling problem selection for:', problemId);
    setEditSelectedProblems(prev => {
      const newSelection = prev.includes(problemId) 
        ? prev.filter(id => id !== problemId)
        : [...prev, problemId];
      console.log('[DEBUG] New edit selected problems:', newSelection);
      return newSelection;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'published': return 'bg-blue-500';
      case 'active': return 'bg-green-500';
      case 'ended': return 'bg-red-500';
      case 'cancelled': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4">Loading contests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Contest Management</h1>
          <p className="text-gray-600 mt-2">Create and manage programming contests with advanced features</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Contest
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Programming Contest</DialogTitle>
              <DialogDescription>
                Set up a comprehensive contest with problems, participants, leaderboards, and analytics.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contest Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Weekly Coding Challenge #1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contest Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="coding">Coding Contest</SelectItem>
                            <SelectItem value="algorithm">Algorithm Challenge</SelectItem>
                            <SelectItem value="competitive">Competitive Programming</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the contest objectives, rules, and what participants can expect..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visibility</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">Public - Anyone can join</SelectItem>
                            <SelectItem value="private">Private - Invitation only</SelectItem>
                            <SelectItem value="unlisted">Unlisted - Hidden from public list</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="scoringMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scoring Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="maximum">Maximum Score - Highest score wins</SelectItem>
                            <SelectItem value="time_based">Time-based - Speed matters</SelectItem>
                            <SelectItem value="partial">Partial Credit - Points for partial solutions</SelectItem>
                            <SelectItem value="acm_icpc">ACM ICPC Style - Problem solving focus</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="wrongSubmissionPenalty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wrong Submission Penalty</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Points deducted per wrong submission
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center">
                      <Trophy className="w-5 h-5 mr-2" />
                      Contest Rules
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="timePenalty"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Time Penalty</FormLabel>
                            <FormDescription>
                              Apply penalty based on submission time
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="freezeLeaderboard"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Freeze Leaderboard</FormLabel>
                            <FormDescription>
                              Hide leaderboard updates before contest ends
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Registration & Features
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="registrationOpen"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Registration Open</FormLabel>
                            <FormDescription>
                              Allow participants to register
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="certificates"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Certificates</FormLabel>
                            <FormDescription>
                              Generate certificates for winners
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="prizePool"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prize Pool (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., $500 cash prizes, Certificates, Gift cards, etc."
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Describe prizes and rewards for winners to motivate participants
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Problem Selection Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <Trophy className="w-5 h-5 mr-2" />
                    Select Problems
                  </h3>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-4 space-y-2">
                    {availableProblems.map((problem: any) => (
                      <div key={problem.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          id={`problem-${problem.id}`}
                          checked={selectedProblems.includes(problem.id)}
                          onChange={() => handleProblemToggle(problem.id)}
                          className="w-4 h-4"
                        />
                        <label htmlFor={`problem-${problem.id}`} className="flex-1 cursor-pointer">
                          <div className="font-medium">{problem.title}</div>
                          <Badge variant="outline" className="mt-1">
                            {problem.difficulty}
                          </Badge>
                        </label>
                      </div>
                    ))}
                    {availableProblems.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        No problems available. Create problems first to add them to contests.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createContestMutation.isPending}>
                    {createContestMutation.isPending ? 'Creating Contest...' : 'Create Contest'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contest Grid */}
      <div className="grid gap-6">
        {contests.map((contest: Contest) => (
          <Card key={contest.id} className="overflow-hidden hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-xl font-bold">{contest.title}</CardTitle>
                    <Badge className={`${getStatusColor(contest.status)} text-white font-medium`}>
                      {contest.status.charAt(0).toUpperCase() + contest.status.slice(1)}
                    </Badge>
                    <Badge variant="outline" className="font-medium">{contest.type}</Badge>
                    <Badge variant="secondary">{contest.visibility}</Badge>
                  </div>
                  {contest.description && (
                    <CardDescription className="text-sm line-clamp-2">
                      {contest.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedContest(contest)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Manage
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditContest(contest)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  {contest.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(contest.id, 'published')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Publish
                    </Button>
                  )}
                  {contest.status === 'published' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusChange(contest.id, 'active')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  )}
                  {contest.status === 'active' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleStatusChange(contest.id, 'ended')}
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      End
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteContest(contest.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900">Start</p>
                    <p className="text-gray-600">
                      {format(new Date(contest.startTime), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-orange-500" />
                  <div>
                    <p className="font-medium text-gray-900">End</p>
                    <p className="text-gray-600">
                      {format(new Date(contest.endTime), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-green-500" />
                  <div>
                    <p className="font-medium text-gray-900">Participants</p>
                    <p className="text-gray-600">{contest.participants.length}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Trophy className="w-4 h-4 mr-2 text-purple-500" />
                  <div>
                    <p className="font-medium text-gray-900">Problems</p>
                    <p className="text-gray-600">{contest.problems.length}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Award className="w-4 h-4 mr-2 text-yellow-500" />
                  <div>
                    <p className="font-medium text-gray-900">Prize Pool</p>
                    <p className="text-gray-600">{contest.prizePool || 'None'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {contests.length === 0 && (
          <Card className="text-center py-16 border-2 border-dashed border-gray-300">
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-blue-100 rounded-full">
                  <Trophy className="w-16 h-16 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-medium mb-2">No contests yet</h3>
                  <p className="text-gray-600 mb-6 max-w-md">
                    Create your first programming contest to enable competitive coding, leaderboards, and analytics for your users.
                  </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)} size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Contest
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Contest Dialog */}
      {showEditDialog && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Contest</DialogTitle>
              <DialogDescription>
                Modify contest settings and problem selection
              </DialogDescription>
            </DialogHeader>
            
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contest Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Weekly Coding Challenge #1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contest Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="coding">Coding Contest</SelectItem>
                            <SelectItem value="algorithm">Algorithm Challenge</SelectItem>
                            <SelectItem value="competitive">Competitive Programming</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the contest objectives, rules, and what participants can expect..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visibility</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">Public - Anyone can join</SelectItem>
                            <SelectItem value="private">Private - Invitation only</SelectItem>
                            <SelectItem value="unlisted">Unlisted - Hidden from public list</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="120"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Problem Selection Section for Edit */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <Trophy className="w-5 h-5 mr-2" />
                    Select Problems
                  </h3>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-4 space-y-2">
                    {availableProblems.map((problem: any) => (
                      <div key={problem.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          id={`edit-problem-${problem.id}`}
                          checked={editSelectedProblems.includes(problem.id)}
                          onChange={() => handleEditProblemToggle(problem.id)}
                          className="w-4 h-4"
                        />
                        <label htmlFor={`edit-problem-${problem.id}`} className="flex-1 cursor-pointer">
                          <div className="font-medium">{problem.title}</div>
                          <Badge variant="outline" className="mt-1">
                            {problem.difficulty}
                          </Badge>
                        </label>
                      </div>
                    ))}
                    {availableProblems.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        No problems available. Create problems first to add them to contests.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowEditDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateContestMutation.isPending}>
                    {updateContestMutation.isPending ? 'Updating Contest...' : 'Update Contest'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Contest Detail Modal */}
      {selectedContest && (
        <Dialog open={!!selectedContest} onOpenChange={() => setSelectedContest(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-blue-600" />
                {selectedContest.title}
              </DialogTitle>
              <DialogDescription>
                Comprehensive contest management and analytics dashboard
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="problems">Problems</TabsTrigger>
                <TabsTrigger value="participants">Participants</TabsTrigger>
                <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        Participants
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{selectedContest.participants.length}</div>
                      <p className="text-xs text-gray-600">Registered users</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <Trophy className="w-4 h-4 mr-2" />
                        Problems
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">{selectedContest.problems.length}</div>
                      <p className="text-xs text-gray-600">Total challenges</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <Award className="w-4 h-4 mr-2" />
                        Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge className={`${getStatusColor(selectedContest.status)} text-white`}>
                        {selectedContest.status.charAt(0).toUpperCase() + selectedContest.status.slice(1)}
                      </Badge>
                      <p className="text-xs text-gray-600 mt-1">Current state</p>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">Ready</div>
                      <p className="text-xs text-gray-600">Data collection</p>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Contest Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="font-medium">Start Time</Label>
                        <p className="text-sm text-gray-600 mt-1">
                          {format(new Date(selectedContest.startTime), 'PPpp')}
                        </p>
                      </div>
                      <div>
                        <Label className="font-medium">End Time</Label>
                        <p className="text-sm text-gray-600 mt-1">
                          {format(new Date(selectedContest.endTime), 'PPpp')}
                        </p>
                      </div>
                    </div>
                    {selectedContest.description && (
                      <div>
                        <Label className="font-medium">Description</Label>
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedContest.description}
                        </p>
                      </div>
                    )}
                    {selectedContest.prizePool && (
                      <div>
                        <Label className="font-medium">Prize Pool</Label>
                        <p className="text-sm text-gray-600 mt-1 flex items-center">
                          <Award className="w-4 h-4 mr-1 text-yellow-500" />
                          {selectedContest.prizePool}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="problems">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Trophy className="w-5 h-5 mr-2" />
                      Contest Problems & Problem Isolation
                    </CardTitle>
                    <CardDescription>
                      Manage problems for this contest with isolated modifications and custom settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <div className="p-4 bg-purple-100 rounded-full w-fit mx-auto mb-4">
                        <Trophy className="w-12 h-12 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">Advanced Problem Management</h3>
                      <p className="text-gray-600 mb-4 max-w-md mx-auto">
                        Copy problems from your library, customize them for this contest, set custom points, and manage test cases independently.
                      </p>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Problems to Contest
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="participants">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Participant Management
                    </CardTitle>
                    <CardDescription>
                      View registrations, manage participants, and handle invitations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-4">
                        <Users className="w-12 h-12 text-green-600" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">Participant Dashboard</h3>
                      <p className="text-gray-600 mb-4 max-w-md mx-auto">
                        Manage registrations, send invitations, track participant activity, and handle disqualifications.
                      </p>
                      <Button className="bg-green-600 hover:bg-green-700">
                        <Users className="w-4 h-4 mr-2" />
                        Manage Participants
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="leaderboard">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Real-time Leaderboard
                    </CardTitle>
                    <CardDescription>
                      Live contest rankings with advanced scoring and tie-breaking rules
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <div className="p-4 bg-yellow-100 rounded-full w-fit mx-auto mb-4">
                        <BarChart3 className="w-12 h-12 text-yellow-600" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">Dynamic Leaderboard</h3>
                      <p className="text-gray-600 mb-4 max-w-md mx-auto">
                        Real-time rankings with custom scoring, penalty tracking, freeze capabilities, and detailed submission analytics.
                      </p>
                      <Button className="bg-yellow-600 hover:bg-yellow-700">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        View Live Leaderboard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="analytics">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Contest Analytics & Insights
                    </CardTitle>
                    <CardDescription>
                      Comprehensive performance analytics and plagiarism detection
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <div className="p-4 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                        <BarChart3 className="w-12 h-12 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">Advanced Analytics</h3>
                      <p className="text-gray-600 mb-4 max-w-md mx-auto">
                        Detailed submission analytics, problem difficulty analysis, participant engagement metrics, and plagiarism detection reports.
                      </p>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        View Analytics Dashboard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Settings className="w-5 h-5 mr-2" />
                      Contest Configuration
                    </CardTitle>
                    <CardDescription>
                      Modify contest settings, security options, and advanced features
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                        <Settings className="w-12 h-12 text-gray-600" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">Advanced Settings</h3>
                      <p className="text-gray-600 mb-4 max-w-md mx-auto">
                        Configure security settings, modify scoring rules, manage announcements, Q&A system, and export contest data.
                      </p>
                      <Button variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}