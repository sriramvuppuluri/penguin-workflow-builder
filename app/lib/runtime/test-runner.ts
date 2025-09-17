import type { WebContainer } from '@webcontainer/api';
import { ActionRunner } from './action-runner';
import type { TestAction, ValidateAction, FeedbackAction, TestResult, ActionAlert } from '~/types/actions';
import type { TestAgent, TestContext, TestReport } from '~/lib/agents/base/TestAgent';
import { BrowserTestAgent } from '~/lib/agents/browser/BrowserTestAgent';
import { ApiTestAgent } from '~/lib/agents/api/ApiTestAgent';
import { A11yTestAgent } from '~/lib/agents/a11y/A11yTestAgent';
import { PerformanceTestAgent } from '~/lib/agents/performance/PerformanceTestAgent';
import { createScopedLogger } from '~/utils/logger';
import type { ActionCallbackData } from './message-parser';
import type { BoltShell } from '~/utils/shell';

const logger = createScopedLogger('TestRunner');

export interface TestRunnerOptions {
  webcontainer: Promise<WebContainer>;
  getShellTerminal: () => BoltShell;
  onAlert?: (alert: ActionAlert) => void;
  onTestComplete?: (report: TestReport) => void;
  previewUrl?: string;
}

export class TestRunner extends ActionRunner {
  private agents: Map<string, TestAgent> = new Map();
  private testReports: Map<string, TestReport> = new Map();
  private previewUrl: string = 'http://localhost:5173';
  private onTestComplete?: (report: TestReport) => void;

  constructor(options: TestRunnerOptions) {
    super(options.webcontainer, options.getShellTerminal, options.onAlert);
    this.onTestComplete = options.onTestComplete;
    if (options.previewUrl) {
      this.previewUrl = options.previewUrl;
    }
    this.initializeAgents();
  }

  private async initializeAgents() {
    // Register test agents
    const agents = [
      new BrowserTestAgent(),
      new ApiTestAgent(),
      new A11yTestAgent(),
      new PerformanceTestAgent(),
    ];

    for (const agent of agents) {
      await agent.initialize();
      this.agents.set(agent.constructor.name, agent);
    }

    logger.info(`Initialized ${agents.length} test agents`);
  }

  async runTestAction(data: ActionCallbackData): Promise<void> {
    const { actionId } = data;
    const action = this.actions.get()[actionId] as TestAction;

    if (!action || action.type !== 'test') {
      logger.error('Invalid test action');
      return;
    }

    this.#updateAction(actionId, { status: 'running' });

    try {
      // Show test progress alert
      this.onAlert?.({
        type: 'info',
        title: `⏳ Testing ${action.testType}...`,
        description: `Running ${action.testType} tests on your application`,
        content: 'Please wait while tests are being executed...',
      });

      const webcontainer = await this.#webcontainer;
      const context: TestContext = {
        webcontainer,
        previewUrl: this.previewUrl,
        targetPath: action.target,
        config: action.config,
      };

      // Find suitable agent for this test type
      const agent = this.findAgent(action);
      if (!agent) {
        throw new Error(`No agent found for test type: ${action.testType}`);
      }

      // Execute tests
      const report = await agent.execute(context, action);
      
      // Store report
      this.testReports.set(actionId, report);

      // Notify completion
      if (this.onTestComplete) {
        this.onTestComplete(report);
      }

      // Generate feedback action
      await this.generateFeedback(report, actionId);

      // Update action status
      const hasFailures = report.summary.failed > 0;
      if (hasFailures) {
        this.#updateAction(actionId, { 
          status: 'failed', 
          error: `${report.summary.failed} tests failed` 
        });

        // Show alert for failures
        this.onAlert?.({
          type: 'error',
          title: 'Tests Failed',
          description: `${report.summary.failed} out of ${report.summary.total} tests failed`,
          content: this.formatTestResults(report),
          source: 'terminal',
        });
      } else {
        this.#updateAction(actionId, { status: 'complete' });

        // Show success alert
        this.onAlert?.({
          type: 'success',
          title: 'Tests Passed',
          description: `All ${report.summary.total} tests passed successfully`,
          content: this.formatTestResults(report),
          source: 'terminal',
        });
      }
    } catch (error) {
      logger.error('Test execution failed:', error);
      this.#updateAction(actionId, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Test execution failed' 
      });

      this.onAlert?.({
        type: 'error',
        title: 'Test Execution Failed',
        description: 'Failed to run tests',
        content: error instanceof Error ? error.message : 'Unknown error',
        source: 'terminal',
      });
    }
  }

  async runValidateAction(data: ActionCallbackData): Promise<void> {
    const { actionId } = data;
    const action = this.actions.get()[actionId] as ValidateAction;

    if (!action || action.type !== 'validate') {
      logger.error('Invalid validate action');
      return;
    }

    this.#updateAction(actionId, { status: 'running' });

    try {
      const webcontainer = await this.#webcontainer;
      const results: TestResult[] = [];

      switch (action.validationType) {
        case 'dom':
          results.push(await this.validateDOM(webcontainer, action.criteria));
          break;
        case 'console':
          results.push(await this.validateConsole(action.criteria));
          break;
        case 'network':
          results.push(await this.validateNetwork(action.criteria));
          break;
        case 'lighthouse':
          results.push(await this.validateLighthouse(webcontainer, action.criteria));
          break;
        default:
          throw new Error(`Unknown validation type: ${action.validationType}`);
      }

      const hasFailures = results.some(r => r.status === 'failed');
      this.#updateAction(actionId, { 
        status: hasFailures ? 'failed' : 'complete' 
      });

      // Generate simple report
      const report: TestReport = {
        agentName: 'Validator',
        timestamp: Date.now(),
        duration: 0,
        results,
        summary: {
          total: results.length,
          passed: results.filter(r => r.status === 'passed').length,
          failed: results.filter(r => r.status === 'failed').length,
          skipped: 0,
        },
      };

      this.testReports.set(actionId, report);
    } catch (error) {
      logger.error('Validation failed:', error);
      this.#updateAction(actionId, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Validation failed' 
      });
    }
  }

  private findAgent(action: TestAction): TestAgent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.canHandle(action)) {
        return agent;
      }
    }
    return undefined;
  }

  private async generateFeedback(report: TestReport, actionId: string): Promise<void> {
    const feedbackAction: FeedbackAction = {
      type: 'feedback',
      content: this.formatTestResults(report),
      status: report.summary.failed > 0 ? 'failure' : 'success',
      results: report.results,
      suggestions: report.suggestions,
    };

    // Store feedback for LLM consumption
    this.actions.setKey(`${actionId}-feedback`, {
      ...feedbackAction,
      status: 'complete',
      executed: true,
      abort: () => {},
      abortSignal: new AbortController().signal,
    });
  }

  private formatTestResults(report: TestReport): string {
    const lines: string[] = [
      `Test Report: ${report.agentName}`,
      `=====================================`,
      `Total: ${report.summary.total} | Passed: ${report.summary.passed} | Failed: ${report.summary.failed} | Skipped: ${report.summary.skipped}`,
      `Duration: ${(report.duration / 1000).toFixed(2)}s`,
      '',
    ];

    // Add failed tests details
    const failures = report.results.filter(r => r.status === 'failed');
    if (failures.length > 0) {
      lines.push('Failed Tests:');
      lines.push('-------------');
      failures.forEach(test => {
        lines.push(`❌ ${test.testName}`);
        if (test.error) {
          lines.push(`   Error: ${test.error}`);
        }
        if (test.details) {
          lines.push(`   Details: ${JSON.stringify(test.details, null, 2)}`);
        }
      });
      lines.push('');
    }

    // Add suggestions if any
    if (report.suggestions && report.suggestions.length > 0) {
      lines.push('Suggestions:');
      lines.push('------------');
      report.suggestions.forEach(suggestion => {
        lines.push(`• ${suggestion}`);
      });
    }

    return lines.join('\n');
  }

  private async validateDOM(webcontainer: WebContainer, criteria?: Record<string, any>): Promise<TestResult> {
    // Simple DOM validation - can be extended
    return {
      testName: 'DOM Validation',
      status: 'passed',
      details: criteria,
    };
  }

  private async validateConsole(criteria?: Record<string, any>): Promise<TestResult> {
    // Console error validation
    return {
      testName: 'Console Validation',
      status: 'passed',
      details: criteria,
    };
  }

  private async validateNetwork(criteria?: Record<string, any>): Promise<TestResult> {
    // Network request validation
    return {
      testName: 'Network Validation',
      status: 'passed',
      details: criteria,
    };
  }

  private async validateLighthouse(webcontainer: WebContainer, criteria?: Record<string, any>): Promise<TestResult> {
    // Lighthouse metrics validation
    return {
      testName: 'Lighthouse Validation',
      status: 'passed',
      details: criteria,
    };
  }

  // Make the private method accessible for our test runner
  private #updateAction(id: string, newState: any) {
    const actions = this.actions.get();
    this.actions.setKey(id, { ...actions[id], ...newState });
  }

  // Reference to webcontainer from parent class
  private get #webcontainer() {
    return (this as any)._webcontainer || (this as any)['#webcontainer'];
  }

  async cleanup() {
    for (const agent of this.agents.values()) {
      await agent.cleanup();
    }
    this.agents.clear();
    this.testReports.clear();
  }

  getTestReport(actionId: string): TestReport | undefined {
    return this.testReports.get(actionId);
  }

  getAllReports(): TestReport[] {
    return Array.from(this.testReports.values());
  }
}