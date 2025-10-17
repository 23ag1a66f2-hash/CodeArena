import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast, toastSuccess, toastError } from "@/components/ui/use-toast";
import { ArrowLeft, Plus, QrCode, Copy, Download, Edit, Trash2, Users, BookOpen, Clock, Target, Loader2, Cog } from "lucide-react";
import { authenticatedFetch } from "@/lib/utils";
import { Link } from "wouter";

interface ProblemSet {
  _id?: string; // MongoDB ObjectId
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  category?: string;
  tags: string[];
  problemIds: string[];
  problemInstances?: any[];
  problems?: any[];
  isPublic: boolean;
  estimatedTime?: number;
  totalProblems: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  allowDirectEnrollment?: boolean;
}

interface ProblemSetEnrollment {
  id: number;
  problemSetId: number;
  userId: string;
  enrolledAt: string;
  progress: number;
  completedProblems: number[];
  totalSubmissions: number;
  correctSubmissions: number;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export default function ProblemSetDetail() {
  const { problemSetId: problemSetIdParam } = useParams<{ problemSetId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  
  // Use the full MongoDB ObjectId string instead of parsing as integer
  const problemSetId = problemSetIdParam;

  // Fetch problem set data
  const { data: problemSet, isLoading: problemSetLoading } = useQuery({
    queryKey: ['problem-set', problemSetId],
    queryFn: async () => {
      if (!problemSetId) {
        throw new Error('Problem Set ID is required');
      }
      const response = await authenticatedFetch(`/api/admin/problem-sets/${problemSetId}`);
      if (!response.ok) throw new Error('Failed to fetch problem set');
      return response.json() as Promise<ProblemSet>;
    },
    enabled: !!problemSetId,
  });

  // Fetch enrollments data
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['problem-set-enrollments', problemSetId],
    queryFn: async () => {
      if (!problemSetId) {
        throw new Error('Problem Set ID is required');
      }
      const response = await authenticatedFetch(`/api/problem-sets/${problemSetId}/enrollments`);
      if (!response.ok) throw new Error('Failed to fetch enrollments');
      return response.json() as Promise<ProblemSetEnrollment[]>;
    },
    enabled: !!problemSetId,
  });

  // Delete enrollment mutation
  const deleteEnrollmentMutation = useMutation({
    mutationFn: async (enrollmentId: number) => {
      const response = await authenticatedFetch(`/api/problem-set-enrollments/${enrollmentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete enrollment');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problem-set-enrollments', problemSetId] });
      toast({
        title: 'Success',
        description: 'Student enrollment deleted successfully',
      });
    },
    onError: () => {
      toastError('Error', 'Failed to delete enrollment');
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateAverageProgress = () => {
    if (enrollments.length === 0) return 0;
    const totalProgress = enrollments.reduce((sum, enrollment) => sum + enrollment.progress, 0);
    return Math.round(totalProgress / enrollments.length);
  };

  const calculateSuccessRate = () => {
    if (enrollments.length === 0) return 0;
    const totalAttempts = enrollments.reduce((sum, enrollment) => sum + enrollment.totalSubmissions, 0);
    const totalCorrect = enrollments.reduce((sum, enrollment) => sum + enrollment.correctSubmissions, 0);
    return totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  };

  // Generate QR code for problem set enrollment
  const generateQrCode = async () => {
    try {
      const response = await authenticatedFetch(`/api/problem-sets/${problemSetId}/qr-code`);
      if (!response.ok) throw new Error('Failed to generate QR code');
      const data = await response.json();
      setQrCodeData(data.qrCode);
      setIsQrDialogOpen(true);
    } catch (error) {
      toastError('QR Code Generation Failed', 'Failed to generate QR code for enrollment');
    }
  };

  // Copy enrollment link to clipboard
  const copyEnrollmentLink = () => {
    const enrollmentUrl = `${window.location.origin}/enroll-problem-set/${problemSetId}`;
    navigator.clipboard.writeText(enrollmentUrl);
    toastSuccess('Enrollment Link Copied!', 'The enrollment link has been copied to your clipboard');
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (problemSetLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!problemSet) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Problem Set Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The problem set you're looking for doesn't exist or has been removed.
              </p>
              <Link href="/admin/problem-sets">
                <Button>Back to Problem Sets</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/problem-sets">
          <Button variant="outline" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{problemSet.title}</h1>
          <p className="text-muted-foreground">{problemSet.description}</p>
        </div>
        <div className="flex gap-2">
          <Badge className={getDifficultyColor(problemSet.difficulty)}>
            {problemSet.difficulty}
          </Badge>
          <Badge variant="outline">
            {problemSet.problemInstances?.length || problemSet.problems?.length || problemSet.totalProblems || 0} Problems
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {/* <TabsTrigger value="problems">
            <BookOpen className="w-4 h-4 mr-2" />
            Problems ({problemSet.problemInstances?.length || problemSet.problems?.length || 0})
          </TabsTrigger> */}
          <TabsTrigger value="students">
            <Users className="w-4 h-4 mr-2" />
            Enrolled Students ({enrollments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enrollments.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{calculateAverageProgress()}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{calculateSuccessRate()}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Est. Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{problemSet.estimatedTime || 0}m</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Direct Enrollment</CardTitle>
                <Cog className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Allow QR/Link Enrollment</span>
                  <Button
                    variant={problemSet.allowDirectEnrollment ? 'default' : 'secondary'}
                    onClick={async () => {
                      const res = await authenticatedFetch(`/api/admin/problem-sets/${problemSetId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ allowDirectEnrollment: !problemSet.allowDirectEnrollment })
                      });
                      if (res.ok) {
                        queryClient.invalidateQueries({ queryKey: ['problem-set', problemSetId] });
                        toast({ title: 'Updated', description: 'Direct enrollment setting updated' });
                      } else {
                        toastError('Error', 'Failed to update setting');
                      }
                    }}
                  >
                    {problemSet.allowDirectEnrollment ? 'On' : 'Off'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Problem Set Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Category</h4>
                <p className="text-muted-foreground">{problemSet.category || 'Not specified'}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {problemSet.tags && problemSet.tags.length > 0 ? (
                    problemSet.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm">No tags</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Visibility</h4>
                <Badge variant={problemSet.isPublic ? "default" : "secondary"}>
                  {problemSet.isPublic ? "Public" : "Private"}
                </Badge>
              </div>

              <div>
                <h4 className="font-medium mb-2">Created</h4>
                <p className="text-muted-foreground">{formatDate(problemSet.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* <TabsContent value="problems">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Problems ({problemSet.problemInstances?.length || problemSet.problems?.length || 0})</CardTitle>
                <CardDescription>
                  Manage the problems in this problem set
                </CardDescription>
              </div>
                              <Button onClick={() => setLocation(`/admin/problem-sets/${problemSetId}/problems`)}>
                  <Cog className="h-4 w-4 mr-2" />
                  Manage Problems
                </Button>
            </CardHeader>
            <CardContent>
              {problemSet.problemInstances && problemSet.problemInstances.length > 0 ? (
                <div className="space-y-4">
                  {problemSet.problemInstances.map((problem: any, index: number) => (
                    <div key={problem.id || index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{problem.title}</h4>
                        <p className="text-sm text-muted-foreground">{problem.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{problem.difficulty}</Badge>
                          <Badge variant="outline">{problem.points || 100} points</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : problemSet.problems && problemSet.problems.length > 0 ? (
                <div className="space-y-4">
                  {problemSet.problems.map((problem: any, index: number) => (
                    <div key={problem.id || index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{problem.title}</h4>
                        <p className="text-sm text-muted-foreground">{problem.description}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{problem.difficulty}</Badge>
                          <Badge variant="outline">{problem.points || 100} points</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Problems Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    This problem set doesn't contain any problems yet.
                  </p>
                  <Button onClick={() => setLocation(`/admin/problem-sets/${problemSetId}/problems`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Problems
                  </Button>
                </div>
              )}
              
              
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium mb-2">Debug Info:</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Problem IDs: {problemSet.problemIds?.join(', ') || 'None'}</div>
                  <div>Problem Instances: {problemSet.problemInstances?.length || 0}</div>
                  <div>Problems Array: {problemSet.problems?.length || 0}</div>
                  <div>Total Problems: {problemSet.totalProblems}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent> */}

        <TabsContent value="students">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Enrolled Students ({enrollments.length})</CardTitle>
                <CardDescription>
                  Manage the students enrolled in this problem set
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={generateQrCode}>
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Code
                </Button>
                <Button onClick={() => setLocation(`/admin/problem-sets/${problemSetId}/enrollments/create`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {enrollmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : enrollments.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Students Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by enrolling your first student in this problem set.
                  </p>
                  <Button onClick={() => setLocation(`/admin/problem-sets/${problemSetId}/enrollments/create`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Student
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      {/* <TableHead>Progress</TableHead> */}
                      {/* <TableHead>Submissions</TableHead> */}
                      {/* <TableHead>Success Rate</TableHead> */}
                      <TableHead>Enrolled</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {enrollment.user?.firstName && enrollment.user?.lastName
                                ? `${enrollment.user.firstName} ${enrollment.user.lastName}`
                                : enrollment.user?.email || 'Unknown User'}
                            </div>
                            {enrollment.user?.email && (
                              <div className="text-sm text-muted-foreground">
                                {enrollment.user.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        {/* <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${enrollment.progress}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{enrollment.progress}%</span>
                          </div>
                        </TableCell> */}
                        {/* <TableCell>
                          <div className="text-center">
                            <div className="font-medium">{enrollment.totalSubmissions}</div>
                            <div className="text-sm text-muted-foreground">total</div>
                          </div>
                        </TableCell> */}
                        {/* <TableCell>
                          <div className="text-center">
                            <div className="font-medium">
                              {enrollment.totalSubmissions > 0 
                                ? Math.round((enrollment.correctSubmissions / enrollment.totalSubmissions) * 100)
                                : 0}%
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {enrollment.correctSubmissions}/{enrollment.totalSubmissions}
                            </div>
                          </div>
                        </TableCell> */}
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(enrollment.enrolledAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-start">
                           
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteEnrollmentMutation.mutate(enrollment.id)}
                              disabled={deleteEnrollmentMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Problem Set Enrollment QR Code</DialogTitle>
            <DialogDescription>
              Students can scan this QR code to join the problem set. They must be logged in to enroll.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrCodeData ? (
              <>
                <div className="p-4 bg-white rounded-lg border">
                  <img src={qrCodeData} alt="Problem Set Enrollment QR Code" className="w-48 h-48" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Problem Set: {problemSet?.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enrollment URL: {window.location.origin}/enroll-problem-set/{problemSetId}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center w-48 h-48 bg-muted rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={copyEnrollmentLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button
              onClick={() => {
                if (qrCodeData) {
                  const link = document.createElement('a');
                  link.href = qrCodeData;
                  link.download = `problem-set-${problemSetId}-qr-code.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }}
              disabled={!qrCodeData}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 