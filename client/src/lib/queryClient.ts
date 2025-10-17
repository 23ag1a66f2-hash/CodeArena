import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { config } from "../config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: any
): Promise<Response> {
  const token = localStorage.getItem('token');
  
  const configInit: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    }
  };

  if (data && method.toUpperCase() !== "GET") {
    configInit.body = JSON.stringify(data);
  }

  try {
    console.log(`🚀 Making ${method} request to ${url}`, { data });
    const response = await fetch(url, configInit);
    console.log(`✅ Response received from ${url}:`, { status: response.status });
    return response;
  } catch (error) {
    console.error(`❌ API request to ${url} failed:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('token');
    const rawUrl = String(queryKey[0] || '');
    const url = rawUrl.startsWith('http') ? rawUrl : `${config.apiUrl}${rawUrl}`;
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
      retry: 1,
      retryDelay: 1000,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});