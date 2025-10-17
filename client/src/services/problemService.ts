import { apiClient } from '@/lib/apiClient';

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

export interface StarterCode {
  python?: string;
  javascript?: string;
  cpp?: string;
  java?: string;
  c?: string;
  [lang: string]: string | undefined;
}

export interface Problem {
  id: number | string;
  title: string;
  description: string;
  difficulty: string;
  category?: string;
  tags: string[];
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  examples: Example[];
  testCases: TestCase[];
  timeLimit: number;
  memoryLimit: number;
  starterCode: StarterCode;
  problemNumber?: number;
}

export interface RunCodeResponse {
  // Simple run response
  output?: string;
  runtime?: number;
  memory?: number;
  error?: string;
  // Extended response used by problem-detail page
  success?: boolean;
  status?: string;
  results?: any[];
  message?: string;
}

export const problemService = {
  list: () => apiClient.get<Problem[]>('/api/problems'),
  get: (id: string | number) => apiClient.get<Problem>(`/api/problems/${id}`),
  run: (payload: { code: string; language: string; problemId?: number | string; timeLimit?: number; memoryLimit?: number; }) =>
    apiClient.post<RunCodeResponse>('/api/problems/run', payload),
}; 