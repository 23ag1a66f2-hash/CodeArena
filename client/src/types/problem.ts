export interface Problem {
  id: number;
  // Optional when viewing an assignment instance
  instanceId?: string;
  problemSetId?: string;
  isInstance?: boolean;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  testCases: TestCase[];
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  examples: Example[];
  starterCode?: Record<string, string>;
  timeLimit?: number;
  memoryLimit?: number;
  notes?: string;
  difficulty_rating?: number;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  timeLimit?: number;
  memoryLimit?: number;
  explanation?: string;
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
} 