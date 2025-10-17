import { config } from '@/config';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<ApiResponse<T>> {
  const url = path.startsWith('http') ? path : `${config.apiUrl}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...getAuthHeader(),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: method === 'GET' ? undefined : body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  let data: any = undefined;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // non-JSON
  }

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `${res.status} ${res.statusText}`;
    return { ok: false, status: res.status, error: message };
  }

  return { ok: true, status: res.status, data } as ApiResponse<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}; 