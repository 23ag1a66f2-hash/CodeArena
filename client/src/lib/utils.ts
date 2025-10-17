import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { config } from "../config"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function for authenticated fetch calls
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const isRelativeApi = typeof url === 'string' && url.startsWith('/api/');
  const fullUrl = isRelativeApi ? `${config.apiUrl}${url}` : url;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  } as Record<string, string>;

  return fetch(fullUrl, {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  });
}
