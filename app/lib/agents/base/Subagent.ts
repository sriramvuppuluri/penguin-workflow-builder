import { createScopedLogger } from '~/utils/logger';
import type { WebContainer } from '@webcontainer/api';

export interface SubagentContext {
  webcontainer?: WebContainer;
  workingDirectory?: string;
  environment?: Record<string, string>;
  files?: Map<string, string>;
  previousResults?: SubagentResult[];
  parentTaskId?: string;
  apiKeys?: Record<string, string>;
}

export interface SubagentTask {
  id: string;
  type: string;
  description: string;
  requirements?: string[];
  constraints?: string[];
  expectedOutput?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface SubagentResult {
  taskId: string;
  agentName: string;
  success: boolean;
  output?: any;
  errors?: string[];
  warnings?: string[];
  artifacts?: {
    files?: Map<string, string>;
    commands?: string[];
    logs?: string[];
    metrics?: Record<string, number>;
  };
  suggestions?: string[];
  duration?: number;
  timestamp: number;
}

export interface SubagentCapability {
  name: string;
  description: string;
  examples?: string[];
}

export abstract class Subagent {
  protected name: string;
  protected description: string;
  protected capabilities: SubagentCapability[];
  protected logger: ReturnType<typeof createScopedLogger>;
  protected context: SubagentContext;
  protected maxRetries: number = 3;
  protected model?: string;

  constructor(
    name: string,
    description: string,
    capabilities: SubagentCapability[] = [],
    context: SubagentContext = {}
  ) {
    this.name = name;
    this.description = description;
    this.capabilities = capabilities;
    this.context = context;
    this.logger = createScopedLogger(`Subagent:${name}`);
  }

  /**
   * Execute a task with this subagent
   */
  abstract execute(task: SubagentTask): Promise<SubagentResult>;

  /**
   * Check if this agent can handle the given task
   */
  abstract canHandle(task: SubagentTask): boolean;

  /**
   * Get the specialized prompt for this agent
   */
  abstract getPrompt(task: SubagentTask): string;

  /**
   * Initialize the agent (optional)
   */
  async initialize(): Promise<void> {
    this.logger.info(`Initializing ${this.name} agent`);
  }

  /**
   * Clean up resources (optional)
   */
  async cleanup(): Promise<void> {
    this.logger.info(`Cleaning up ${this.name} agent`);
  }

  /**
   * Get agent information
   */
  getInfo(): {
    name: string;
    description: string;
    capabilities: SubagentCapability[];
  } {
    return {
      name: this.name,
      description: this.description,
      capabilities: this.capabilities,
    };
  }

  /**
   * Update context for the agent
   */
  updateContext(context: Partial<SubagentContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Helper method to create a result object
   */
  protected createResult(
    taskId: string,
    success: boolean,
    output?: any,
    errors?: string[]
  ): SubagentResult {
    return {
      taskId,
      agentName: this.name,
      success,
      output,
      errors,
      timestamp: Date.now(),
    };
  }

  /**
   * Helper method to log task execution
   */
  protected logTaskExecution(task: SubagentTask, phase: 'start' | 'end' | 'error', details?: any): void {
    const message = `Task ${task.id} - ${phase}`;
    
    switch (phase) {
      case 'start':
        this.logger.info(message, { task: task.description });
        break;
      case 'end':
        this.logger.info(message, { success: details?.success });
        break;
      case 'error':
        this.logger.error(message, details);
        break;
    }
  }

  /**
   * Validate task requirements
   */
  protected validateTask(task: SubagentTask): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!task.id) {
      errors.push('Task ID is required');
    }

    if (!task.description) {
      errors.push('Task description is required');
    }

    if (!task.type) {
      errors.push('Task type is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Execute with retry logic
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Attempt ${i + 1} failed:`, error);
        
        if (i < retries - 1) {
          await this.delay(1000 * Math.pow(2, i)); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Helper method for delays
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get capability by name
   */
  protected getCapability(name: string): SubagentCapability | undefined {
    return this.capabilities.find(cap => cap.name === name);
  }

  /**
   * Check if agent has a specific capability
   */
  hasCapability(name: string): boolean {
    return this.capabilities.some(cap => cap.name === name);
  }
}