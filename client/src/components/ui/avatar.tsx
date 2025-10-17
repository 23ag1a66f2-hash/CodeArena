"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground font-medium",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

// Enhanced Avatar component specifically for user profiles
interface UserAvatarProps {
  user?: {
    profileImageUrl?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

const UserAvatar = React.forwardRef<
  HTMLDivElement,
  UserAvatarProps
>(({ user, className, size = "md" }, ref) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10", 
    lg: "h-24 w-24"
  };
  
  const fallbackSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-2xl"
  };

  const handleImageLoad = () => {
    console.log('[DEBUG] UserAvatar image loaded successfully:', user?.profileImageUrl);
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    console.log('[DEBUG] UserAvatar image failed to load:', user?.profileImageUrl);
    setImageError(true);
    setImageLoaded(false);
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const shouldShowImage = user?.profileImageUrl && !imageError;

  React.useEffect(() => {
    if (user?.profileImageUrl) {
      console.log('[DEBUG] UserAvatar mounted with profileImageUrl:', user.profileImageUrl);
      // Reset states when URL changes
      setImageLoaded(false);
      setImageError(false);
    }
  }, [user?.profileImageUrl]);

  return (
    <Avatar ref={ref} className={cn(sizeClasses[size], className)}>
      {shouldShowImage && (
        <AvatarImage
          src={user.profileImageUrl}
          alt={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'User'}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: imageError ? 'none' : 'block' }}
        />
      )}
      <AvatarFallback className={fallbackSizeClasses[size]}>
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
});

UserAvatar.displayName = "UserAvatar";

export { Avatar, AvatarImage, AvatarFallback, UserAvatar }
