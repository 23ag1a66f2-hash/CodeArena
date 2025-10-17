import { useQuery, useQueryClient } from "@tanstack/react-query";
import { endpoints, config } from "@/config";
import { useLocation } from "wouter";
import { useCallback } from "react";

export function useAuth() {
  const token = localStorage.getItem('token');
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      if (!token) {
        return null;
      }
      
      // Check localStorage first for immediate data after OAuth
      const cachedUser = localStorage.getItem('user');
      let initialUserData = null;
      if (cachedUser) {
        try {
          initialUserData = JSON.parse(cachedUser);
          console.log('[DEBUG] Using cached user data:', initialUserData);
        } catch (e) {
          console.log('[DEBUG] Failed to parse cached user data');
        }
      }
      
      try {
        const response = await fetch(endpoints.user, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return null;
          }
          throw new Error('Failed to fetch user');
        }

        const userData = await response.json();
        console.log('[DEBUG] User data received from API:', userData);
        console.log('[DEBUG] Profile image URL:', userData.profileImageUrl);
        // Cache the user data
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
      } catch (error) {
        console.error('Auth error:', error);
        // If API fails but we have cached data, use it temporarily
        if (initialUserData) {
          console.log('[DEBUG] API failed, using cached user data temporarily');
          return initialUserData;
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
      }
    },
    retry: false, // Disable retries
    staleTime: 300000, // 5 minutes
    gcTime: 3600000, // 1 hour
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnReconnect: false, // Disable refetch on reconnect
  });

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch(`${config.apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Clear React Query cache
      queryClient.clear();
      
      // Redirect to login
      setLocation('/login');
    }
  }, [token, queryClient, setLocation]);

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user && !!token,
    logout,
  };
}
