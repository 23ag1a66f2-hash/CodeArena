import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useMaintenanceMode } from "@/contexts/MaintenanceModeContext";
import { MaintenanceMessage } from "@/components/MaintenanceMessage";
import {
  Users,
  Trophy,
  BookOpen,
  FileText,
  Calendar,
  TrendingUp,
  UserPlus,
  Settings,
  Edit,
  Trash2,
  Plus,
  Shield,
  MessageSquare,
  UsersIcon,
  BarChart3,
  Target,
  Activity
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState, useCallback, useEffect, useMemo } from "react";
import type { User, Assignment, Group, Announcement } from "@/shared/schema";
import { config } from "@/config";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { AvatarFallback, AvatarImage, Avatar } from "@/components/ui/avatar";

// Analytics type definition
interface Analytics {
  totalUsers: number;
  totalProblems: number;
  totalSubmissions: number;
  activeContests: number;
  recentActivity: Array<{
    id: string;
    problemId: string;
    language: string;
    status: string;
    timestamp: string;
  }>;
}

// Form schemas
const assignmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  problems: z.array(z.number()).min(1, "At least one problem is required"),
  dueDate: z.string().min(1, "Due date is required"),
  assignedTo: z.array(z.string()).min(1, "At least one student must be assigned"),
});

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().min(1, "Description is required"),
  members: z.array(z.string()).min(1, "At least one member is required"),
  instructors: z.array(z.string()).min(1, "At least one instructor is required"),
});

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  priority: z.enum(["low", "medium", "high"]),
  targetAudience: z.array(z.string()).min(1, "Target audience is required"),
  isVisible: z.boolean().default(true),
});

const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["student", "admin"]).default("student"),
});

export default function AdminDashboard() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { 
    isMaintenanceMode, 
    maintenanceFrom, 
    maintenanceTo, 
    timeUntilMaintenance,
    timeUntilMaintenanceEnd,
    isMaintenanceActive,
    isPreMaintenanceWarning,
    toggleMaintenanceMode, 
    setMaintenanceMode,
    setMaintenanceTimes 
  } = useMaintenanceMode();

  // Debug: Log when isMaintenanceMode changes
  useEffect(() => {
    console.log('Admin Dashboard - isMaintenanceMode changed to:', isMaintenanceMode);
  }, [isMaintenanceMode]);

  // Sync with server maintenance status
  const { data: serverMaintenanceStatus, isLoading: serverStatusLoading } = useQuery({
    queryKey: ['/api/admin/maintenance/status'],
    queryFn: async () => {
      const res = await fetch('/api/admin/maintenance/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch maintenance status');
      const data = await res.json();
      console.log('Admin Dashboard - Server Status Loaded:', data);
      return data;
    },
    refetchInterval: 1000, // Refetch every 1 second for real-time updates
    enabled: isAuthenticated && user?.role === 'admin'
  });

  // Update maintenance configuration on server
  const updateMaintenanceConfig = useMutation({
    mutationFn: async (config: { isMaintenanceMode: boolean; maintenanceFrom: string; maintenanceTo: string }) => {
      console.log('=== CLIENT SENDING MAINTENANCE CONFIG ===');
      console.log('Config to send:', config);
      console.log('Token:', token ? 'Present' : 'Missing');
      
      const res = await fetch('/api/admin/maintenance/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      console.log('Response status:', res.status);
      console.log('Response headers:', Object.fromEntries(res.headers.entries()));
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Server error response:', errorData);
        throw new Error('Failed to update maintenance config');
      }
      
      const result = await res.json();
      console.log('Server success response:', result);
      return result;
    },
    onSuccess: () => {
      console.log('Mutation successful, forcing refresh...');
      // Force refresh the server status
      queryClient.invalidateQueries({ queryKey: ['/api/admin/maintenance/status'] });
      toast({
        title: "Maintenance configuration updated",
        description: "Server maintenance settings have been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating maintenance config",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle maintenance mode toggle with server sync
  const handleMaintenanceToggle = (enabled: boolean) => {
    console.log('=== ADMIN TOGGLE CHANGE ===');
    console.log('Current state before toggle:', isMaintenanceMode);
    console.log('Toggling to:', enabled);
    if (enabled) {
      toggleMaintenanceMode();
      // When enabling, sync with server
      const configToSend = {
        isMaintenanceMode: true,
        maintenanceFrom: maintenanceFrom,
        maintenanceTo: maintenanceTo
      };
      console.log('Sending TURN ON config:', configToSend);
      updateMaintenanceConfig.mutate(configToSend);
    } else {
      // Disable maintenance mode - update local state immediately
      setMaintenanceMode(false);
      setMaintenanceTimes('', '');
      // Also update server
      const configToSend = {
        isMaintenanceMode: false,
        maintenanceFrom: '',
        maintenanceTo: ''
      };
      console.log('Sending TURN OFF config:', configToSend);
      updateMaintenanceConfig.mutate(configToSend);
    }
  };

  // Handle maintenance times change with server sync
  const handleMaintenanceTimesChange = (from: string, to: string) => {
    setMaintenanceTimes(from, to);
    if (isMaintenanceMode) {
      updateMaintenanceConfig.mutate({
        isMaintenanceMode: true,
        maintenanceFrom: from,
        maintenanceTo: to
      });
    }
  };
  const [selectedTab, setSelectedTab] = useState("overview");
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);

  // Memoize token and fetch options to prevent recreation on every render
  const token = useMemo(() => localStorage.getItem('token'), []);
  const fetchOptions = useMemo(() => ({
    credentials: 'include' as const,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }), [token]);

  useEffect(() => {
    // Handle authentication data from URL parameters (Google OAuth callback)
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');

    if (token && userStr) {
      try {
        const userData = JSON.parse(decodeURIComponent(userStr));
        // Store auth data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));

        // Clean up URL parameters
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        // Show success message
        toast({
          title: "Successfully signed in",
          description: `Welcome back${userData.firstName ? ', ' + userData.firstName : ''}!`
        });
      } catch (error) {
        console.error('[DEBUG] Error processing auth data:', error);
      }
    }
  }, []); // Run only once on mount

  // Memoize the auth check to prevent unnecessary redirects
  const shouldRedirect = useMemo(() =>
    !isAuthenticated || user?.role !== 'admin',
    [isAuthenticated, user?.role]
  );

  useEffect(() => {
    if (shouldRedirect) {
      setLocation('/dashboard');
    }
  }, [shouldRedirect, setLocation]);

  // Early return if not authenticated or not admin
  if (shouldRedirect) {
    return null;
  }

  // Queries with proper configuration and error handling
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async () => {
      const res = await fetch(`${config.apiUrl}/api/admin/analytics/summary`, fetchOptions);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    retry: false,
    enabled: !!token && isAuthenticated,
    staleTime: 30000, // Add staleTime to prevent frequent refetches
  });

  // Platform Statistics Time Series Data
  const { data: platformStats, isLoading: platformStatsLoading } = useQuery({
    queryKey: ["admin", "analytics", "platform-stats"],
    queryFn: async () => {
      const res = await fetch(`${config.apiUrl}/api/admin/analytics/platform-stats`, fetchOptions);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    retry: false,
    enabled: !!token && isAuthenticated,
    staleTime: 30000,
  });

  // User Distribution Time Series Data
  const { data: userDistribution, isLoading: userDistributionLoading } = useQuery({
    queryKey: ["admin", "analytics", "user-distribution"],
    queryFn: async () => {
      const res = await fetch(`${config.apiUrl}/api/admin/analytics/user-distribution`, fetchOptions);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    retry: false,
    enabled: !!token && isAuthenticated,
    staleTime: 30000,
  });

  // Recent admin activities (version history)
  const { data: recentAdminActivities } = useQuery({
    queryKey: ["admin", "version-history", "recent"],
    queryFn: async () => {
      const res = await fetch(`${config.apiUrl}/api/admin/version-history/recent?limit=4`, fetchOptions);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    retry: false,
    enabled: !!token && isAuthenticated,
    staleTime: 15000,
  });

  // Users query
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const res = await fetch(`${config.apiUrl}/api/admin/users`, fetchOptions);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    retry: false,
    enabled: !!token && isAuthenticated,
    staleTime: 30000,
  });

  // Submissions query
  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["admin", "submissions"],
    queryFn: async () => {
      const res = await fetch(`${config.apiUrl}/api/admin/submissions`, fetchOptions);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    retry: false,
    enabled: !!token && isAuthenticated,
    staleTime: 30000,
  });

  // Submission stats query
  const { data: submissionStats, isLoading: submissionStatsLoading } = useQuery({
    queryKey: ["admin", "submission-stats"],
    queryFn: async () => {
      const res = await fetch(`${config.apiUrl}/api/admin/submissions/stats`, fetchOptions);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    retry: false,
    enabled: !!token && isAuthenticated,
    staleTime: 30000,
  });

  // Assignments query
  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ["admin", "assignments"],
    queryFn: async () => {
      const res = await fetch(`${config.apiUrl}/api/admin/assignments`, fetchOptions);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    retry: false,
    enabled: !!token && isAuthenticated,
    staleTime: 30000,
  });

  // Groups query
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["admin", "groups"],
    queryFn: async () => {
      const res = await fetch(`${config.apiUrl}/api/admin/groups`, fetchOptions);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    retry: false,
    enabled: !!token && isAuthenticated,
    staleTime: 30000,
  });

  // Announcements query
  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ["admin", "announcements"],
    queryFn: async () => {
      const res = await fetch(`${config.apiUrl}/api/admin/announcements`, fetchOptions);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    retry: false,
    enabled: !!token && isAuthenticated,
    staleTime: 30000,
  });

  // Mutations
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`${config.apiUrl}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createUserSchema>) => {
      const res = await fetch(`${config.apiUrl}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setShowCreateUser(false);
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`${config.apiUrl}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok && res.status !== 204) {
        const error = await res.text();
        throw new Error(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof assignmentSchema>) => {
      const res = await fetch(`${config.apiUrl}/api/admin/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "assignments"] });
      setShowCreateAssignment(false);
      toast({
        title: "Success",
        description: "Assignment created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create assignment",
        variant: "destructive",
      });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: z.infer<typeof groupSchema>) => {
      const res = await fetch(`${config.apiUrl}/api/admin/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
      setShowCreateGroup(false);
      toast({
        title: "Success",
        description: "Group created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: z.infer<typeof announcementSchema>) => {
      const res = await fetch(`${config.apiUrl}/api/admin/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "announcements"] });
      setShowCreateAnnouncement(false);
      toast({
        title: "Success",
        description: "Announcement created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create announcement",
        variant: "destructive",
      });
    },
  });

  // Forms
  const assignmentForm = useForm<z.infer<typeof assignmentSchema>>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: "",
      description: "",
      problems: [],
      dueDate: "",
      assignedTo: [],
    },
  });

  const groupForm = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      description: "",
      members: [],
      instructors: [],
    },
  });

  const announcementForm = useForm<z.infer<typeof announcementSchema>>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: "",
      content: "",
      priority: "medium",
      targetAudience: ["all"],
      isVisible: true,
    },
  });

  const createUserForm = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "student",
    },
  });

  // Memoized handlers to prevent re-renders
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: string;
    newRole: string;
    currentRole?: string;
    name?: string;
  } | null>(null);

  const handleUpdateUserRole = useCallback((userId: string, role: string, currentRole?: string, name?: string) => {
    if (currentRole !== role) {
      setPendingRoleChange({ userId, newRole: role, currentRole, name });
      return;
    }
    updateUserRoleMutation.mutate({ userId, role });
  }, [updateUserRoleMutation]);

  const handleTabChange = useCallback((value: string) => {
    setSelectedTab(value);
  }, []);

  const onAssignmentSubmit = (data: z.infer<typeof assignmentSchema>) => {
    createAssignmentMutation.mutate(data);
  };

  const onGroupSubmit = (data: z.infer<typeof groupSchema>) => {
    createGroupMutation.mutate(data);
  };

  const onAnnouncementSubmit = (data: z.infer<typeof announcementSchema>) => {
    createAnnouncementMutation.mutate(data);
  };

  const onCreateUserSubmit = (data: z.infer<typeof createUserSchema>) => {
    createUserMutation.mutate(data);
  };

  if (analyticsLoading || usersLoading || assignmentsLoading || groupsLoading || announcementsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Maintenance Message Banner */}
      <MaintenanceMessage />
      
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your CodeArena platform</p>
          </div>
        {/* create assignment , group , announcement 
         <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setShowCreateAssignment(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Create Assignment
          </Button>
          <Button onClick={() => setShowCreateGroup(true)} variant="outline" className="w-full sm:w-auto">
            <UsersIcon className="w-4 h-4 mr-2" />
            Create Group
          </Button>
          <Button onClick={() => setShowCreateAnnouncement(true)} variant="outline" className="w-full sm:w-auto">
            <MessageSquare className="w-4 h-4 mr-2" />
            Create Announcement
          </Button>
        </div> */}
      </div>

      <Tabs value={selectedTab} onValueChange={handleTabChange} className="space-y-4">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="flex h-10 w-max min-w-full lg:w-full lg:grid lg:grid-cols-2">
            <TabsTrigger value="overview" className="flex-shrink-0 whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="users" className="flex-shrink-0 whitespace-nowrap">Users</TabsTrigger>

          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">Registered students and admins</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Problems</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalProblems || 0}</div>
                <p className="text-xs text-muted-foreground">Available coding problems</p>
              </CardContent>
            </Card>
          </div>

          {/* Maintenance Mode Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>Manage system-wide settings and maintenance mode</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="maintenance-mode" className="text-base font-medium">
                    Maintenance Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable to schedule maintenance and stop server access
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="maintenance-mode"
                    checked={isMaintenanceMode}
                    onCheckedChange={handleMaintenanceToggle}
                    disabled={serverStatusLoading}
                  />
                  {serverStatusLoading && (
                    <div className="text-xs text-muted-foreground">
                      Loading...
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    State: {isMaintenanceMode ? 'ON' : 'OFF'}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-from" className={`text-sm font-medium ${!isMaintenanceMode ? 'text-muted-foreground' : ''}`}>
                      Maintenance Start Time
                    </Label>
                    <Input
                      id="maintenance-from"
                      type="time"
                      value={maintenanceFrom}
                      onChange={(e) => handleMaintenanceTimesChange(e.target.value, maintenanceTo)}
                      disabled={!isMaintenanceMode}
                      className={`w-full ${!isMaintenanceMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maintenance-to" className={`text-sm font-medium ${!isMaintenanceMode ? 'text-muted-foreground' : ''}`}>
                      Maintenance End Time
                    </Label>
                    <Input
                      id="maintenance-to"
                      type="time"
                      value={maintenanceTo}
                      onChange={(e) => handleMaintenanceTimesChange(maintenanceFrom, e.target.value)}
                      disabled={!isMaintenanceMode}
                      className={`w-full ${!isMaintenanceMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>
                
                {!isMaintenanceMode && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 rounded-md">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      💡 <strong>Tip:</strong> Enable maintenance mode above to schedule server maintenance and set start/end times.
                    </p>
                  </div>
                )}
                
            {isMaintenanceMode && (
              <>
                {/* Admin Status Display */}
                <div className={`p-4 rounded-md border ${
                  isMaintenanceActive 
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' 
                    : isPreMaintenanceWarning 
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                      : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                }`}>
                      <div className="space-y-2">
                        <p className={`text-sm font-medium ${
                          isMaintenanceActive 
                            ? 'text-red-800 dark:text-red-200' 
                            : isPreMaintenanceWarning 
                              ? 'text-amber-800 dark:text-amber-200'
                              : 'text-blue-800 dark:text-blue-200'
                        }`}>
                          {isMaintenanceActive 
                            ? '🔴 Server is DOWN - Maintenance in progress'
                            : isPreMaintenanceWarning 
                              ? '⚠️ Pre-maintenance warning active'
                              : '📅 Maintenance scheduled'
                          }
                        </p>
                        
                        {maintenanceFrom && maintenanceTo && (
                          <p className={`text-sm ${
                            isMaintenanceActive 
                              ? 'text-red-700 dark:text-red-300' 
                              : isPreMaintenanceWarning 
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-blue-700 dark:text-blue-300'
                          }`}>
                            Scheduled: {maintenanceFrom} - {maintenanceTo}
                          </p>
                        )}
                        
                        {timeUntilMaintenance !== null && timeUntilMaintenance > 0 && (
                          <p className={`text-sm ${
                            isPreMaintenanceWarning 
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-blue-700 dark:text-blue-300'
                          }`}>
                            {isPreMaintenanceWarning ? 'Starts in:' : 'Time until start:'} {Math.floor(timeUntilMaintenance / 60)}h {timeUntilMaintenance % 60}m
                          </p>
                        )}
                        
                        {isMaintenanceActive && timeUntilMaintenanceEnd !== null && timeUntilMaintenanceEnd > 0 && (
                          <p className="text-sm text-red-700 dark:text-red-300">
                            Estimated completion in: {Math.floor(timeUntilMaintenanceEnd / 60)}h {timeUntilMaintenanceEnd % 60}m
                          </p>
                        )}
                      </div>
                    </div>
                    
                {/* Admin Status Info */}
                <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>✅ Admin Access:</strong> You can continue working normally during maintenance. 
                    Regular users will see a blocking modal, but you have full access to all features.
                  </p>
                </div>
                
                {/* Warning about server shutdown */}
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    <strong>⚠️ Important:</strong> When maintenance is active, regular users will be blocked with a modal and unable to access the website. 
                    This includes production environments.
                  </p>
                </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>



          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Admin Activities</CardTitle>
                <CardDescription>Latest 4 version history entries</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setLocation('/admin/version-history')}>Show More</Button>
            </CardHeader>
            <CardContent>
              {recentAdminActivities && recentAdminActivities.length > 0 ? (
                <div className="space-y-3">
                  {recentAdminActivities.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{a.description || `${a.entityType}${a.entityId ? ` #${a.entityId}` : ''}`}</p>
                        <p className="text-sm text-muted-foreground truncate">{a.action}</p>

                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm">{a.adminName || a.adminId}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent admin activities</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Manage user roles and permissions</CardDescription>
                </div>
                <Button onClick={() => setShowCreateUser(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div>Loading users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.profileImageUrl ? (
                              <img
                                src={user.profileImageUrl}
                                alt="Profile"
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <Avatar className="w-8 h-8 rounded-full  overflow-hidden">
                                <AvatarImage src={user.profileImageUrl}  />
                                <AvatarFallback className="flex bg-green-600 text-white items-center justify-center w-full h-full text-center">
                                  {user.firstName?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div>
                              <p className="font-medium">{user.firstName} {user.lastName}</p>
                            </div>
                          </div>

                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role || 'student'}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(user.createdAt!).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={user.role || 'student'}
                              onValueChange={(role) => handleUpdateUserRole(user.id, role, user.role, `${user.firstName} ${user.lastName}`)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="hover:bg-red-600">
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {user.firstName} {user.lastName} ({user.email})? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteUserMutation.mutate(user.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete User
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create User Dialog */}
        <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>Add a new user to CodeArenaa</DialogDescription>
            </DialogHeader>
            <Form {...createUserForm}>
              <form onSubmit={createUserForm.handleSubmit(onCreateUserSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createUserForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createUserForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={createUserForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createUserForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createUserForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowCreateUser(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </Tabs>

      {/* Create Assignment Dialog */}
      <Dialog open={showCreateAssignment} onOpenChange={setShowCreateAssignment}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>
              Create a new assignment for your students
            </DialogDescription>
          </DialogHeader>
          <Form {...assignmentForm}>
            <form onSubmit={assignmentForm.handleSubmit(onAssignmentSubmit)} className="space-y-4">
              <FormField
                control={assignmentForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Assignment title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={assignmentForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Assignment description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={assignmentForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="datetime-local" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createAssignmentMutation.isPending}>
                  {createAssignmentMutation.isPending ? "Creating..." : "Create Assignment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      {/* <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a new group or class for organizing students
            </DialogDescription>
          </DialogHeader>
          <Form {...groupForm}>
            <form onSubmit={groupForm.handleSubmit(onGroupSubmit)} className="space-y-4">
              <FormField
                control={groupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Group name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={groupForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Group description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createGroupMutation.isPending}>
                  {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      Create Announcement Dialog 
      <Dialog open={showCreateAnnouncement} onOpenChange={setShowCreateAnnouncement}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Announcement</DialogTitle>
            <DialogDescription>
              Create a new announcement for students and staff
            </DialogDescription>
          </DialogHeader>
          <Form {...announcementForm}>
            <form onSubmit={announcementForm.handleSubmit(onAnnouncementSubmit)} className="space-y-4">
              <FormField
                control={announcementForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Announcement title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={announcementForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Announcement content" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={announcementForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createAnnouncementMutation.isPending}>
                  {createAnnouncementMutation.isPending ? "Creating..." : "Create Announcement"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog> */}

      {/* Create User Dialog */}
      <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Add a new user to CodeArenaa</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data = {
              firstName: formData.get('firstName') as string,
              lastName: formData.get('lastName') as string,
              email: formData.get('email') as string,
              password: formData.get('password') as string,
              role: (formData.get('role') as string) as "student" | "admin",
            };
            createUserMutation.mutate(data);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" name="firstName" placeholder="First name" required />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" placeholder="Last name" required />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="Email address" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" placeholder="Password" required />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue="student">
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateUser(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
            {/* Confirm role elevation dialog */}
            <AlertDialog open={!!pendingRoleChange} onOpenChange={(open) => !open && setPendingRoleChange(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Change user role?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {(() => {
                      const name = pendingRoleChange?.name ? ` for ${pendingRoleChange.name}` : '';
                      const fromRole = pendingRoleChange?.currentRole || 'student';
                      const toRole = pendingRoleChange?.newRole || 'student';
                      const adminNote = toRole === 'admin'
                        ? ' Admins have full platform control.'
                        : (fromRole === 'admin' && toRole !== 'admin')
                          ? ' This will revoke admin privileges for this user.'
                          : '';
                      return `You are about to change the role${name} from ${fromRole} to ${toRole}.` + adminNote + ' This change takes effect immediately.';
                    })()}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => { setPendingRoleChange(null); queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] }); }}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    if (pendingRoleChange) {
                      updateUserRoleMutation.mutate({ userId: pendingRoleChange.userId, role: pendingRoleChange.newRole });
                    }
                    setPendingRoleChange(null);
                  }}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
      </div>
    </div>
  );
}