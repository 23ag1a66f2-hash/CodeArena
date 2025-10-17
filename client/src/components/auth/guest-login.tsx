import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface GuestLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GuestLogin({ isOpen, onClose, onSuccess }: GuestLoginProps) {
  const [name, setName] = useState("");
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (guestName: string) => {
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: guestName }),
      });

      if (!response.ok) {
        throw new Error('Failed to create guest session');
      }

      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      toast({
        title: "Welcome!",
        description: "Guest session created. You can now submit solutions.",
      });
      
      onSuccess();
      onClose();
    },
    onError: (error) => {
      console.error('Guest login error:', error);
      toast({
        title: "Error",
        description: "Failed to create guest session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const guestName = name.trim() || 'Guest User';
    loginMutation.mutate(guestName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Sign In</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loginMutation.isPending}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "Creating session..." : "Continue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}