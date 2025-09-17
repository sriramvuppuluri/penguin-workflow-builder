import type { TestResult, TestAction } from '~/types/actions';
import type { WebContainer } from '@webcontainer/api';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('TestAgent');

export interface TestContext {
  webcontainer: WebContainer;
  previewUrl: string;
  targetPath?: string;
  config?: Record<string, any>;
}

export interface TestReport {
  agentName: string;
  timestamp: number;
  duration: number;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  suggestions?: string[];
  metadata?: Record<string, any>;
}

export abstract class TestAgent {
  protected name: string;
  protected logger: ReturnType<typeof createScopedLogger>;

  constructor(name: string) {
    this.name = name;
    this.logger = createScopedLogger(`TestAgent:${name}`);
  }

  /**
   * Execute tests for this agent
   */
  abstract execute(context: TestContext, action: TestAction): Promise<TestReport>;

  /**
   * Check if this agent can handle the given test action
   */
  abstract canHandle(action: TestAction): boolean;

  /**
   * Initialize the agent (optional)
   */
  async initialize(): Promise<void> {
    this.logger.debug(`Initializing ${this.name} agent`);
  }

  /**
   * Cleanup resources (optional)
   */
  async cleanup(): Promise<void> {
    this.logger.debug(`Cleaning up ${this.name} agent`);
  }

  /**
   * Generate suggestions based on test failures
   */
  protected generateSuggestions(results: TestResult[]): string[] {
    const suggestions: string[] = [];
    const failures = results.filter(r => r.status === 'failed');

    for (const failure of failures) {
      if (failure.error) {
        // Generate context-aware suggestions based on error type
        if (failure.error.includes('TypeError')) {
          suggestions.push(`Fix type error in ${failure.testName}: Check variable types and null/undefined values`);
        } else if (failure.error.includes('ReferenceError')) {
          suggestions.push(`Fix reference error in ${failure.testName}: Ensure all variables are properly defined`);
        } else if (failure.error.includes('404')) {
          suggestions.push(`Fix missing resource in ${failure.testName}: Check that all files and endpoints exist`);
        } else if (failure.error.includes('timeout')) {
          suggestions.push(`Fix timeout in ${failure.testName}: Optimize performance or increase timeout threshold`);
        } else {
          suggestions.push(`Fix error in ${failure.testName}: ${failure.error.substring(0, 100)}`);
        }
      }
    }

    return suggestions;
  }

  /**
   * Create a test report from results
   */
  protected createReport(results: TestResult[], duration: number, metadata?: Record<string, any>): TestReport {
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
    };

    return {
      agentName: this.name,
      timestamp: Date.now(),
      duration,
      results,
      summary,
      suggestions: this.generateSuggestions(results),
      metadata,
    };
  }

  /**
   * Helper to measure test execution time
   */
  protected async measureTime<T>(fn: () => Promise<T>): Promise<[T, number]> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return [result, duration];
  }
}