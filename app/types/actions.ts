import type { Change } from 'diff';

export type ActionType = 'file' | 'shell' | 'supabase';

export interface BaseAction {
  content: string;
}

export interface FileAction extends BaseAction {
  type: 'file';
  filePath: string;
}

export interface ShellAction extends BaseAction {
  type: 'shell';
}

export interface StartAction extends BaseAction {
  type: 'start';
}

export interface BuildAction extends BaseAction {
  type: 'build';
}

export interface SupabaseAction extends BaseAction {
  type: 'supabase';
  operation: 'migration' | 'query';
  filePath?: string;
  projectId?: string;
}

export interface TestAction extends BaseAction {
  type: 'test';
  testType: 'browser' | 'api' | 'accessibility' | 'performance' | 'unit' | 'backend';
  target?: string; // URL or file path to test
  config?: Record<string, any>;
  autoFix?: boolean; // Whether to attempt automatic fixes
}

export interface ValidateAction extends BaseAction {
  type: 'validate';
  validationType: 'dom' | 'console' | 'network' | 'lighthouse';
  criteria?: Record<string, any>;
}

export interface FeedbackAction extends BaseAction {
  type: 'feedback';
  status: 'success' | 'failure' | 'warning';
  results: TestResult[];
  suggestions?: string[];
}

export interface TestResult {
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  details?: Record<string, any>;
  screenshot?: string;
}

export type BoltAction = FileAction | ShellAction | StartAction | BuildAction | SupabaseAction | TestAction | ValidateAction | FeedbackAction;

export type BoltActionData = BoltAction | BaseAction;

export interface ActionAlert {
  type: string;
  title: string;
  description: string;
  content: string;
  source?: 'terminal' | 'preview'; // Add source to differentiate between terminal and preview errors
}

export interface SupabaseAlert {
  type: string;
  title: string;
  description: string;
  content: string;
  source?: 'supabase';
}

export interface DeployAlert {
  type: 'success' | 'error' | 'info';
  title: string;
  description: string;
  content?: string;
  url?: string;
  stage?: 'building' | 'deploying' | 'complete';
  buildStatus?: 'pending' | 'running' | 'complete' | 'failed';
  deployStatus?: 'pending' | 'running' | 'complete' | 'failed';
  source?: 'vercel' | 'netlify' | 'github';
}

export interface LlmErrorAlertType {
  type: 'error' | 'warning';
  title: string;
  description: string;
  content?: string;
  provider?: string;
  errorType?: 'authentication' | 'rate_limit' | 'quota' | 'network' | 'unknown';
}

export interface FileHistory {
  originalContent: string;
  lastModified: number;
  changes: Change[];
  versions: {
    timestamp: number;
    content: string;
  }[];

  // Novo campo para rastrear a origem das mudanças
  changeSource?: 'user' | 'auto-save' | 'external';
}
