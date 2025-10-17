import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, UserPlus, ArrowLeft, Loader2, Users, BookOpen, Plus, Mail } from 'lucide-react';
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

interface ProblemSet {
  id: string;
  title: string;
}

export default function AddStudentToProblemSet() {
  const { problemSetId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentName, setNewStudentName] = useState('');

  // Fetch problem set details
  const { data: problemSet } = useQuery({
    queryKey: ['problem-set', problemSetId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/problem-sets/${problemSetId}`);
      if (!response.ok) throw new Error('Failed to fetch problem set');
      return response.json() as Promise<ProblemSet>;
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

  // Fetch existing enrollments
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['problem-set-enrollments', problemSetId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/problem-sets/${problemSetId}/enrollments`);
      if (!response.ok) throw new Error('Failed to fetch enrollments');
      return response.json() as Promise<any[]>;
    }
  });

  // Create enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const response = await apiRequest('POST', `/api/problem-sets/${problemSetId}/enroll`, { userIds });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to enroll students');
      }
      return response.json();
    },
    onSuccess: () => {
      const selectedCount = Object.keys(selectedUsers).filter(id => selectedUsers[id]).length;
      toast({
        title: "Success",
        description: `Successfully enrolled ${selectedCount} student(s) in the problem set.`,
      });
      setSelectedUsers({});
      queryClient.invalidateQueries({ queryKey: ['problem-set-enrollments', problemSetId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to enroll students",
        variant: "destructive",
      });
    }
  });

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async ({ email, name }: { email: string; name?: string }) => {
      const [firstName, lastName] = name ? name.split(' ') : ['', ''];
      const response = await apiRequest('POST', '/api/admin/users', {
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        role: 'student'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create student');
      }
      return response.json();
    },
    onSuccess: (newUser) => {
      toast({
        title: "Success",
        description: `Student account created for ${newUser.email}. Default password: student123`,
      });
      setNewStudentEmail('');
      setNewStudentName('');
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create student",
        variant: "destructive",
      });
    }
  });

  const enrolledUserIds = new Set(enrollments.map(e => e.userId));
  const availableUsers = users.filter(user => 
    user.role === 'student' && !enrolledUserIds.has(user.id)
  );

  const filteredUsers = availableUsers.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower)
    );
  });

  const toggleUserSelection = (userId: string) => {
    console.log('Toggling user:', userId);
    console.log('Current selected users:', Object.keys(selectedUsers).filter(id => selectedUsers[id]));
    
    setSelectedUsers(prev => {
      const newState = { ...prev };
      newState[userId] = !prev[userId];
      console.log('New state for user', userId, ':', newState[userId]);
      console.log('All selected users:', Object.keys(newState).filter(id => newState[id]));
      return newState;
    });
  };

  const handleEnrollSelected = () => {
    const selectedUserIds = Object.keys(selectedUsers).filter(id => selectedUsers[id]);
    if (selectedUserIds.length === 0) return;
    enrollMutation.mutate(selectedUserIds);
  };

  const handleCreateStudent = () => {
    if (!newStudentEmail.trim()) return;
    createStudentMutation.mutate({
      email: newStudentEmail.trim(),
      name: newStudentName.trim() || undefined
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation(`/admin/problem-sets/${problemSetId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add Students to Problem Set</h1>
            <p className="text-muted-foreground">
              {problemSet?.title}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableUsers.length}</div>
              <p className="text-xs text-muted-foreground">
                Students not yet enrolled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Currently Enrolled</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrollments.length}</div>
              <p className="text-xs text-muted-foreground">
                Students already enrolled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selected</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(selectedUsers).filter(id => selectedUsers[id]).length}</div>
              <p className="text-xs text-muted-foreground">
                Ready to enroll
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Add Students</CardTitle>
            <CardDescription>
              Search and select students to enroll in this problem set
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Student
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Student</DialogTitle>
                    <DialogDescription>
                      Create a new student account and add them to this problem set.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="student@example.com"
                        value={newStudentEmail}
                        onChange={(e) => setNewStudentEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name (Optional)</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateStudent}
                        disabled={!newStudentEmail.trim() || createStudentMutation.isPending}
                      >
                        {createStudentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Student
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                onClick={handleEnrollSelected}
                disabled={Object.keys(selectedUsers).filter(id => selectedUsers[id]).length === 0 || enrollMutation.isPending}
              >
                {enrollMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enroll Selected ({Object.keys(selectedUsers).filter(id => selectedUsers[id]).length})
              </Button>
            </div>

            {/* Users Table */}
            {usersLoading || enrollmentsLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {searchTerm ? 'No students found matching your search' : 'No available students to enroll'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id} className="cursor-pointer" onClick={() => toggleUserSelection(user.id)}>
                          <TableCell>
                            <input
                              type="checkbox"
                              id={`checkbox-${user.id}`}
                              checked={Boolean(selectedUsers[user.id])}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleUserSelection(user.id);
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}` 
                                : user.email?.split('@')[0]
                              }
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 