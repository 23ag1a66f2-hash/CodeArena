import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus, Search, Calendar, Clock, Edit, Trash2, Users, Copy, QrCode, Settings, UserPlus, List, Award } from "lucide-react";
import * as z from "zod";
import { useToast, toastSuccess, toastError, toastInfo } from "@/components/ui/use-toast";
import { format, isValid } from "date-fns";
import { useLocation } from "wouter";

interface Contest {
  id: number;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  problems: (Problem & { originalProblemId?: number })[];
  participants?: Participant[];
  participantCount?: number;
}

interface Participant {
  id: string;
  userId: string;
  contestId: string;
  registrationTime: string;
  status: 'registered' | 'active' | 'completed';
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  points: number;
  originalProblemId?: number; // For contest problems that reference original problems
}

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
}

const contestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  startTime: z.string().min(1, "Start time is required"),
  duration: z.number().min(30, "Duration must be at least 30 minutes"),
});

export default function AdminContests() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isParticipantDialogOpen, setIsParticipantDialogOpen] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [editingContest, setEditingContest] = useState<Contest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [participantsTab, setParticipantsTab] = useState<'enrolled' | 'add'>("enrolled");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof contestSchema>>({
    resolver: zodResolver(contestSchema),
    defaultValues: {
      title: "",
      description: "",
      startTime: "",
      duration: 120
    }
  });

  // Fetch contests with real-time updates
  const { data: contests, isLoading: isLoadingContests } = useQuery<Contest[]>({
    queryKey: ["/api/admin/contests"],
    retry: false,
    staleTime: 0, // Consider data stale immediately for better real-time updates
    refetchInterval: 3000, // Refetch every 3 seconds
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Refetch when component mounts
    queryFn: async () => {
      const response = await fetch("/api/admin/contests", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch contests");
      return response.json();
    },
  });



  // Fetch users with real-time updates
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
    staleTime: 1000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Fetch participants with user data for the selected contest
  const { data: participantsWithUserData, refetch: refetchParticipants } = useQuery({
    queryKey: ["/api/admin/contests", selectedContest?.id, "participants"],
    queryFn: async () => {
      if (!selectedContest?.id) return [];
      
      console.log('[DEBUG] Fetching participants for contest:', selectedContest.id);
      const response = await fetch(`/api/admin/contests/${selectedContest.id}/participants`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch participants");
      const data = await response.json();
      console.log('[DEBUG] Fetched participants data:', data);
      return data;
    },
    enabled: !!selectedContest?.id && isParticipantDialogOpen,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch contest submissions for all participants
  const { data: contestSubmissions } = useQuery({
    queryKey: ["/api/contests", selectedContest?.id, "submissions"],
    queryFn: async () => {
      if (!selectedContest?.id) return [];
      
      const response = await fetch(`/api/contests/${selectedContest.id}/submissions`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedContest?.id && isParticipantDialogOpen,
  });

  // Create contest mutation with optimistic updates
  const createContestMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/admin/contests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create contest");
      return response.json();
    },
    onMutate: async (newContest) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/admin/contests"] });

      // Snapshot the previous value
      const previousContests = queryClient.getQueryData(["/api/admin/contests"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["/api/admin/contests"], (old: any) => [...(old || []), { ...newContest, id: Date.now() }]);

      // Return a context object with the snapshotted value
      return { previousContests };
    },
    onError: (err, newContest, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(["/api/admin/contests"], context?.previousContests);
      toast({
        title: "Error",
        description: "Failed to create contest: " + err.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
    },
    onSuccess: () => {
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Contest created successfully",
      });
    },
  });

  // Delete contest mutation with optimistic updates
  const deleteContestMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/contests/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete contest");
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/contests"] });
      const previousContests = queryClient.getQueryData(["/api/admin/contests"]);
      queryClient.setQueryData(["/api/admin/contests"], (old: any) => 
        old?.filter((contest: Contest) => contest.id !== deletedId)
      );
      return { previousContests };
    },
    onError: (err, deletedId, context) => {
      queryClient.setQueryData(["/api/admin/contests"], context?.previousContests);
      toast({
        title: "Error",
        description: "Failed to delete contest: " + err.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contest deleted successfully",
      });
    },
  });

  // Add participant mutation with optimistic updates
  const addParticipantMutation = useMutation({
    mutationFn: async ({ contestId, userId }: { contestId: string; userId: string }) => {
      console.log('[DEBUG] Adding participant:', { contestId, userId });
      
      const response = await fetch(`/api/contests/${contestId}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ userId: userId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          throw new Error(errorData.message || "User is already enrolled in this contest");
        }
        throw new Error(errorData.message || "Failed to add participant");
      }
      
      const result = await response.json();
      console.log('[DEBUG] Participant added successfully:', result);
      return result;
    },
    onMutate: async ({ contestId, userId }) => {
      console.log('[DEBUG] onMutate - Adding participant optimistically');
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/admin/contests"] });
      await queryClient.cancelQueries({ queryKey: ["/api/admin/contests", contestId, "participants"] });
      
      // Snapshot the previous values
      const previousContests = queryClient.getQueryData(["/api/admin/contests"]);
      const previousParticipants = queryClient.getQueryData(["/api/admin/contests", contestId, "participants"]);
      
      // Find the user data for optimistic update
      const user = users?.find(u => u.id === userId);
      console.log('[DEBUG] Found user for optimistic update:', user);
      
      // Check if user is already enrolled to prevent optimistic update
      const isAlreadyEnrolled = (participantsWithUserData ?? selectedContest?.participants ?? [])?.some(
        (p: any) => p.userId === userId
      );
      
      if (isAlreadyEnrolled) {
        console.log('[DEBUG] User already enrolled, skipping optimistic update');
        return { previousContests, previousParticipants, skipOptimistic: true };
      }
      
      // Optimistically update the cache
      queryClient.setQueryData(["/api/admin/contests"], (old: any) => 
        old?.map((contest: Contest) => {
          if (contest.id.toString() === contestId) {
            console.log('[DEBUG] Updating contest in cache:', contest.id);
            
            const newParticipant = {
              id: `temp_${Date.now()}`,
              userId,
              contestId,
              registrationTime: new Date().toISOString(),
              status: 'registered' as const,
              user: user ? {
                id: user.id,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email
              } : null
            };
            
            const updatedContest = {
              ...contest,
              participants: [...(contest.participants || []), newParticipant]
            };
            
            console.log('[DEBUG] Updated contest participants:', updatedContest.participants?.length);
            return updatedContest;
          }
          return contest;
        })
      );
      
      // Also update the participants query cache
      queryClient.setQueryData(["/api/admin/contests", contestId, "participants"], (old: any[] | undefined) => {
        const newParticipant = {
          id: `temp_${Date.now()}`,
          userId,
          contestId,
          registrationTime: new Date().toISOString(),
          status: 'registered' as const,
          user: user ? {
            id: user.id,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email
          } : null
        };
        return [...(old || []), newParticipant];
      });
      
      return { previousContests, previousParticipants };
    },
    onError: (err, variables, context) => {
      console.error('[DEBUG] onError - Rolling back optimistic update:', err);
      
      // Only rollback if we actually did an optimistic update
      if (!context?.skipOptimistic) {
        queryClient.setQueryData(["/api/admin/contests"], context?.previousContests);
        queryClient.setQueryData(["/api/admin/contests", variables.contestId, "participants"], context?.previousParticipants);
      }
      
      const errorMessage = err.message.includes("already registered") || err.message.includes("already enrolled")
        ? `This user is already enrolled in the contest.`
        : `Failed to add participant: ${err.message}`;
        
      toast({
        title: "Enrollment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSuccess: (data, { contestId, userId }) => {
      console.log('[DEBUG] onSuccess - Participant added:', data);
      
      // Use the user data from the response if available, otherwise fallback to users list
      const userName = data?.user ? 
        `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || data.user.email :
        users?.find(u => u.id === userId) ? 
          `${users.find(u => u.id === userId)?.firstName} ${users.find(u => u.id === userId)?.lastName}` : 
          "User";
      
      toast({
        title: "Success",
        description: `${userName} has been enrolled in the contest successfully`,
      });
      
      // Force refresh the participants data to get the latest from the database
      if (selectedContest) {
        console.log('[DEBUG] Refreshing participants data after enrollment');
        queryClient.invalidateQueries({ queryKey: ["/api/admin/contests", selectedContest.id, "participants"] });
        queryClient.removeQueries({ queryKey: ["/api/admin/contests", selectedContest.id, "participants"] });
        setTimeout(() => {
          refetchParticipants();
        }, 100); // Small delay to ensure cache is cleared
      }
    },
    onSettled: () => {
      console.log('[DEBUG] onSettled - Invalidating queries');
      // Force immediate refetch to ensure UI is up to date
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin/contests"] });
    },
  });

  // Remove participant mutation
  const removeParticipantMutation = useMutation({
    mutationFn: async ({ contestId, userId }: { contestId: string; userId: string }) => {
      console.log('[DEBUG] Removing participant:', { contestId, userId });
      const response = await fetch(`/api/contests/${contestId}/participants/${userId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to remove participant");
      }
      const result = await response.json();
      console.log('[DEBUG] Participant removed successfully:', result);
      return result;
    },
    onMutate: async ({ contestId, userId }) => {
      console.log('[DEBUG] onMutate - Removing participant optimistically');
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/admin/contests"] });
      
      // Snapshot the previous value
      const previousContests = queryClient.getQueryData(["/api/admin/contests"]);
      
      // Optimistically update the cache
      queryClient.setQueryData(["/api/admin/contests"], (old: any) => 
        old?.map((contest: Contest) => {
          if (contest.id.toString() === contestId) {
            console.log('[DEBUG] Removing participant from contest in cache:', contest.id);
            
            const updatedContest = {
              ...contest,
              participants: contest.participants?.filter(p => p.userId !== userId) || []
            };
            
            console.log('[DEBUG] Updated contest participants after removal:', updatedContest.participants?.length);
            return updatedContest;
          }
          return contest;
        })
      );
      
      return { previousContests };
    },
    onError: (err, variables, context) => {
      console.error('[DEBUG] onError - Rolling back optimistic update:', err);
      queryClient.setQueryData(["/api/admin/contests"], context?.previousContests);
      toast({
        title: "Error",
        description: "Failed to remove participant: " + err.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      console.log('[DEBUG] onSuccess - Participant removed');
      toast({
        title: "Success",
        description: "Participant removed from contest successfully",
      });
      
      // Force refresh the participants data to get the latest from the database
      if (selectedContest) {
        console.log('[DEBUG] Refreshing participants data after removal');
        queryClient.invalidateQueries({ queryKey: ["/api/admin/contests", selectedContest.id, "participants"] });
        queryClient.removeQueries({ queryKey: ["/api/admin/contests", selectedContest.id, "participants"] });
        setTimeout(() => {
          refetchParticipants();
        }, 100); // Small delay to ensure cache is cleared
      }
    },
    onSettled: () => {
      console.log('[DEBUG] onSettled - Invalidating queries');
      // Force immediate refetch to ensure UI is up to date
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin/contests"] });
    },
  });

  // Update contest mutation with optimistic updates
  const updateContestMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('[DEBUG] updateContestMutation called with data:', data);
      const response = await fetch(`/api/admin/contests/${editingContest?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] Update contest failed:', response.status, errorText);
        throw new Error(`Failed to update contest: ${response.status} ${errorText}`);
      }
      const result = await response.json();
      console.log('[DEBUG] Update contest success:', result);
      return result;
    },
    onMutate: async (updatedContest) => {
      console.log('[DEBUG] updateContestMutation onMutate:', updatedContest);
      await queryClient.cancelQueries({ queryKey: ["/api/admin/contests"] });
      const previousContests = queryClient.getQueryData(["/api/admin/contests"]);
      
      // Optimistically update the contest
      queryClient.setQueryData(["/api/admin/contests"], (old: any) => 
        old?.map((contest: Contest) => 
          contest.id === editingContest?.id 
            ? { ...contest, ...updatedContest }
            : contest
        )
      );
      
      return { previousContests };
    },
    onError: (err, updatedContest, context) => {
      console.error('[DEBUG] updateContestMutation onError:', err);
      queryClient.setQueryData(["/api/admin/contests"], context?.previousContests);
      toast({
        title: "Error",
        description: "Failed to update contest: " + err.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      console.log('[DEBUG] updateContestMutation onSettled');
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
    },
    onSuccess: () => {
      console.log('[DEBUG] updateContestMutation onSuccess');
      setIsCreateDialogOpen(false);
      setEditingContest(null);
      form.reset();
      toast({
        title: "Success",
        description: "Contest updated successfully",
      });
    },
  });

  // QR Code generation
  const generateQrCode = async (contest: Contest) => {
    try {
      setSelectedContest(contest); // Set the selected contest for the dialog
      console.log('[DEBUG] Generating QR code for contest:', contest.id);
      
      const response = await fetch(`/api/contests/${contest.id}/qr-code`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate QR code');
      }
      
      const data = await response.json();
      console.log('[DEBUG] QR code generated successfully:', data);
      setQrCodeData(data.qrCode);
      setIsQrDialogOpen(true);
    } catch (error) {
      console.error('[DEBUG] Error generating QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code for enrollment',
        variant: 'destructive'
      });
    }
  };

  // Copy enrollment link to clipboard
  const copyEnrollmentLink = (contest: Contest) => {
    const enrollmentUrl = `${window.location.origin}/contest-enrollment/${contest.id}`;
    navigator.clipboard.writeText(enrollmentUrl);
    toastSuccess('Contest Link Copied!', `Enrollment link for "${contest.title}" has been copied to your clipboard`);
  };

  const onSubmit = (data: z.infer<typeof contestSchema>) => {
    // Transform data to match backend schema
    const transformedData = {
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(new Date(data.startTime).getTime() + data.duration * 60 * 1000), // Add duration in milliseconds
      // Add any existing participants if editing
      participants: editingContest?.participants || []
    };
    
    console.log('[DEBUG] Submitting contest data:', transformedData);
    
    if (editingContest) {
      updateContestMutation.mutate({
        ...transformedData,
        id: editingContest.id
      });
    } else {
      createContestMutation.mutate(transformedData);
    }
  };



  // Debug effect to monitor contest data changes
  useEffect(() => {
    if (contests && contests.length > 0) {
      console.log('[DEBUG] Contests data updated:', contests.length, 'contests');
      contests.forEach(contest => {
        if (contest.participants && contest.participants.length > 0) {
          console.log(`[DEBUG] Contest ${contest.id} has ${contest.participants.length} participants:`, 
            contest.participants.map((p: Participant) => ({ userId: (p as Participant).userId, userName: (p as Participant).user?.firstName }))
          );
        }
      });
    }
  }, [contests]);

  // Debug effect to monitor mutation states
  useEffect(() => {
    console.log('[DEBUG] addParticipantMutation state:', {
      isPending: addParticipantMutation.isPending,
      isSuccess: addParticipantMutation.isSuccess,
      isError: addParticipantMutation.isError,
      error: addParticipantMutation.error
    });
  }, [addParticipantMutation.isPending, addParticipantMutation.isSuccess, addParticipantMutation.isError]);

  useEffect(() => {
    console.log('[DEBUG] removeParticipantMutation state:', {
      isPending: removeParticipantMutation.isPending,
      isSuccess: removeParticipantMutation.isSuccess,
      isError: removeParticipantMutation.isError,
      error: removeParticipantMutation.error
    });
  }, [removeParticipantMutation.isPending, removeParticipantMutation.isSuccess, removeParticipantMutation.isError]);

  // Effect to refetch data when participant dialog opens
  useEffect(() => {
    if (isParticipantDialogOpen && selectedContest) {
      console.log('[DEBUG] Participant dialog opened, refetching data for contest:', selectedContest.id);
      // Force refetch to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin/contests"] });
    }
  }, [isParticipantDialogOpen, selectedContest, queryClient]);

  // Effect to monitor selected contest changes
  useEffect(() => {
    if (selectedContest) {
      console.log('[DEBUG] Selected contest changed:', selectedContest.id);
      // Find the latest contest data
      const latestContest = contests?.find(c => c.id.toString() === selectedContest.id.toString());
      if (latestContest && latestContest.participants) {
        console.log('[DEBUG] Latest contest participants:', latestContest.participants.length);
        // Update selected contest with latest data
        setSelectedContest(latestContest);
      }
    }
  }, [contests, selectedContest]);

  const handleEdit = (contest: Contest) => {
    console.log('[DEBUG] Editing contest:', contest);
    
    setEditingContest(contest);
    form.reset({
      title: contest.title,
      description: contest.description,
      startTime: new Date(contest.startTime).toISOString().slice(0, 16),
      duration: contest.duration,
    });
    setIsCreateDialogOpen(true);
  };

  // Handle manage participants
  const handleManageParticipants = (contest: Contest) => {
    console.log('[DEBUG] Opening manage participants for contest:', contest.id);
    console.log('[DEBUG] Current participants:', contest.participants?.length || 0);
    setSelectedContest(contest);
    setIsParticipantDialogOpen(true);
    
    // Force refetch of contests data to ensure fresh participant data
    queryClient.invalidateQueries({ queryKey: ["/api/admin/contests"] });
    queryClient.refetchQueries({ queryKey: ["/api/admin/contests"] });
    
    // Also refresh the participants data specifically
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contests", contest.id, "participants"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin/contests", contest.id, "participants"] });
    }, 100);
  };

  const handleViewDetails = (contest: Contest) => {
    setSelectedContest(contest);
    setLocation(`/admin/contests/${contest.id}`);
  };

  const handleManageProblems = (contest: Contest) => {
    setLocation(`/admin/contests/${contest.id}/problems`);
  };

  const filteredContests = contests?.filter(contest =>
    contest.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Update selected contest when contests data changes
  useEffect(() => {
    if (selectedContest && contests) {
      const updatedContest = contests.find(c => c.id === selectedContest.id);
      if (updatedContest) {
        console.log('[DEBUG] Updating selected contest with fresh data:', {
          oldParticipantsCount: selectedContest.participants?.length || 0,
          newParticipantsCount: updatedContest.participants?.length || 0
        });
        setSelectedContest(updatedContest);
      }
    }
  }, [contests, selectedContest]);



  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Contest Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage coding contests for your platform.
          </p>
        </div>
        {/* Create/Edit Contest Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              // Reset form to empty fields first
              setEditingContest(null);
              form.reset({
                title: "",
                description: "",
                startTime: "",
                duration: 120
              });
              // Then open the dialog
              setIsCreateDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Contest
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingContest ? 'Edit Contest' : 'Create New Contest'}</DialogTitle>
              <DialogDescription>
                {editingContest 
                  ? 'Update the contest details and settings.' 
                  : 'Fill in the details to create a new coding contest for participants.'
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Form fields remain the same */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter contest title" />
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
                          placeholder="Enter contest description"
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
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
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
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingContest(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createContestMutation.isPending || updateContestMutation.isPending}>
                    {createContestMutation.isPending || updateContestMutation.isPending 
                      ? 'Saving...' 
                      : editingContest 
                        ? 'Update Contest' 
                        : 'Create Contest'
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>



      {/* Participant Management Dialog */}
      <Dialog open={isParticipantDialogOpen} onOpenChange={setIsParticipantDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enrolled Students ({(participantsWithUserData ?? selectedContest?.participants ?? []).length})</DialogTitle>
            <DialogDescription>
              Manage the students enrolled in this contest.
            </DialogDescription>
          </DialogHeader>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 mb-6">
            <Button variant="outline" onClick={() => {
              if (selectedContest) {
                generateQrCode(selectedContest);
              }
            }}>
              <QrCode className="h-4 w-4 mr-2" />
              QR Code
            </Button>
            
          </div>
          {/* Tabs for Enrolled and Add Students */}
          <Tabs value={participantsTab} onValueChange={(v) => setParticipantsTab(v as any)}>
            <TabsList>
              <TabsTrigger value="enrolled">Enrolled</TabsTrigger>
              <TabsTrigger value="add">Add Students</TabsTrigger>
            </TabsList>

            <TabsContent value="add">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between  space-x-2">
                   <div className="flex items-center space-x-2"> <UserPlus className="h-5 w-5" />
                    <span>Enroll New Students</span></div>
                    <div className="flex justify-end">
                      <Button
                        disabled={selectedUserIds.size === 0 || addParticipantMutation.isPending || !selectedContest}
                        onClick={async () => {
                          if (!selectedContest) return;
                          for (const uid of Array.from(selectedUserIds)) {
                            try {
                              await addParticipantMutation.mutateAsync({ contestId: selectedContest.id.toString(), userId: uid });
                            } catch (e) {
                              // continue enrolling others
                            }
                          }
                          setSelectedUserIds(new Set());
                          setParticipantsTab('enrolled');
                        }}
                      >
                        {addParticipantMutation.isPending ? 'Enrolling...' : `Enroll Selected (${selectedUserIds.size})`}
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Select one or more students to enroll in this contest
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Search Students</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[260px] overflow-y-auto">
                      {users?.filter(user => {
                        const q = searchTerm.toLowerCase();
                        const enrolled = (participantsWithUserData ?? selectedContest?.participants ?? [])?.some((p: any) => p.userId === user.id);
                        return !enrolled && (
                          user.email?.toLowerCase().includes(q) ||
                          user.firstName?.toLowerCase().includes(q) ||
                          user.lastName?.toLowerCase().includes(q)
                        );
                      }).map((user) => {
                        const isSelected = selectedUserIds.has(user.id);
                        return (
                          <label key={user.id} className={`p-3 border rounded-lg flex items-center justify-between ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  setSelectedUserIds(prev => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(user.id); else next.delete(user.id);
                                    return next;
                                  });
                                }}
                              />
                              <div>
                                <div className="font-medium">{user.firstName} {user.lastName}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                      {Array.isArray(users) && users.filter(u => !(participantsWithUserData ?? selectedContest?.participants ?? [])?.some((p: any) => p.userId === u.id)).length === 0 && (
                        <div className="text-sm text-muted-foreground">All users are already enrolled.</div>
                      )}
                    </div>

                   
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="enrolled">
              <Card>
                <CardContent className="p-6">
                  {(() => {
                    const participants = participantsWithUserData ?? selectedContest?.participants ?? [];
                    console.log('[DEBUG] Rendering participants section:', {
                      selectedContestParticipants: selectedContest?.participants?.length || 0,
                      participantsWithUserData: participantsWithUserData?.length || 0,
                      finalParticipants: participants.length || 0,
                      participants: participants.map((p: any) => ({ id: p.id, userId: p.userId, name: p.user?.firstName }))
                    });
                    return participants.length === 0;
                  })() ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Students Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by enrolling your first student.
                  </p>
                </div>
                  ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Enrolled At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                                        {(participantsWithUserData ?? selectedContest?.participants ?? [])?.map((participant: any) => {
                      // Calculate progress and success rate from actual contest submissions data
                      const participantSubmissions = contestSubmissions?.filter((s: any) => s.userId === participant.userId) || [];
                      const totalSubmissions = participantSubmissions.length;
                      const correctSubmissions = participantSubmissions.filter((s: any) => 
                        s.status === 'accepted' || s.status === 'Accepted' || s.score === 100
                      ).length;
                      const progress = selectedContest?.problems?.length ? 
                        Math.round((correctSubmissions / selectedContest.problems.length) * 100) : 0;
                      const successRate = totalSubmissions > 0 ? Math.round((correctSubmissions / totalSubmissions) * 100) : 0;
                      
                      return (
                        <TableRow key={`participant-${participant.id}-${participant.userId}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {participant.user ? 
                                  `${participant.user.firstName || ''} ${participant.user.lastName || ''}`.trim() || 'Unknown User' : 
                                  `User ID: ${participant.userId}`
                                }
                              </div>
                              {participant.user?.email && (
                                <div className="text-sm text-muted-foreground">
                                  {participant.user.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(participant.registrationTime).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Edit functionality would go here
                                  toast({
                                    title: "Edit Student",
                                    description: "Edit functionality coming soon",
                                  });
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (selectedContest) {
                                    removeParticipantMutation.mutate({
                                      contestId: selectedContest.id.toString(),
                                      userId: participant.userId
                                    });
                                  }
                                }}
                                disabled={removeParticipantMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contest Enrollment QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code or use the enrollment link to join the contest: {selectedContest?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrCodeData ? (
              <>
                <div className="p-4 bg-white rounded-lg border">
                  <img
                    src={qrCodeData}
                    alt={`QR Code for enrolling in contest: ${selectedContest?.title}`}
                    className="w-48 h-48"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Contest: {selectedContest?.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enrollment URL: {window.location.origin}/contest-enrollment/{selectedContest?.id}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center w-48 h-48 bg-muted rounded-lg">
                <span className="text-muted-foreground">Loading QR Code...</span>
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => selectedContest && copyEnrollmentLink(selectedContest)}
              aria-label={`Copy enrollment link for ${selectedContest?.title}`}
            >
              Copy Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Search Contests</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search contests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      {isLoadingContests ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContests.map((contest) => (
            <Card key={contest.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex flex-col gap-4">
                {/* Header */}
                {(() => {
                  const now = new Date();
                  const rawStart: any = (contest as any).startTime || (contest as any).createdAt;
                  const start = rawStart ? new Date(rawStart) : new Date(NaN);
                  const rawEnd: any = (contest as any).endTime;
                  const durationMinutes: number = (contest as any).duration ?? 0;
                  const end = rawEnd ? new Date(rawEnd) : (isValid(start) ? new Date(start.getTime() + durationMinutes * 60000) : new Date(NaN));
                  let status: 'Upcoming' | 'Active' | 'Ended' = 'Ended';
                  if (isValid(start) && now < start) status = 'Upcoming';
                  else if (isValid(end) && now <= end) status = 'Active';
                  const statusClass = status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : status === 'Upcoming' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200';
                  return (
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">{contest.title}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${statusClass}`}>{status}</span>
                    </div>
                  );
                })()}

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">{contest.description}</p>

                {/* Info Row */}
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center gap-2"><List className="w-4 h-4 opacity-70" />{contest.problems?.length || 0} problems</div>
                  <div className="flex items-center gap-2"><Clock className="w-4 h-4 opacity-70" />{contest.duration} min</div>
                  <div className="flex items-center gap-2"><Users className="w-4 h-4 opacity-70" />{(contest as any).participantCount ?? contest.participants?.length ?? 0} participants</div>
                  {(() => {
                    const rawStart: any = (contest as any).startTime || (contest as any).createdAt;
                    const start = rawStart ? new Date(rawStart) : new Date(NaN);
                    const text = isValid(start) ? format(start, "PPp") : 'N/A';
                    return <div className="flex items-center gap-2"><Calendar className="w-4 h-4 opacity-70" />{text}</div>;
                  })()}
                </div>

                {/* Primary action row */}
                <div className="flex items-center gap-3">
                  <Button className="bg-green-600 hover:bg-green-700 text-white w-full" onClick={() => setLocation(`/contests/${contest.id}/results`)}>
                  <Award className="mr-2" /> Leaderboard
                  </Button>
                  <Button variant="outline" size="icon" className="w-9 h-9" onClick={() => handleEdit(contest)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="w-9 h-9" onClick={() => generateQrCode(contest)}>
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="w-9 h-9" onClick={() => copyEnrollmentLink(contest)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="w-9 h-9 border-red-300 text-red-600 hover:bg-red-50" onClick={() => { if (confirm("Are you sure you want to delete this contest?")) { deleteContestMutation.mutate(contest.id); } }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Secondary full-width actions */}
                <Button variant="secondary" className="w-full justify-start bg-gray-50 hover:bg-gray-100 text-gray-800" onClick={() => handleManageParticipants(contest)}>
                  <Users className="w-4 h-4 mr-2" /> Manage Enrollments for "{contest.title}"
                </Button>
                <Button variant="outline" className="w-full justify-start border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" onClick={() => handleManageProblems(contest)}>
                  <Settings className="w-4 h-4 mr-2" /> Isolated Problem Management
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoadingContests && filteredContests.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-gray-500 dark:text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No contests found</h3>
              <p>Try adjusting your search criteria or create a new contest.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 