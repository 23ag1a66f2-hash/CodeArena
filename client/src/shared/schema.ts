// User related types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: 'student' | 'admin';
  profileImageUrl?: string;
  createdAt?: string;
}

// Assignment related types
export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  problems: number[];
  assignedTo: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Group related types
export interface Group {
  id: string;
  name: string;
  description: string;
  members?: string[];
  instructors?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Announcement related types
export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  targetAudience: string[];
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
} 