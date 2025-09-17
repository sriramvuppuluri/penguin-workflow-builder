import type { WebContainer } from '@webcontainer/api';
import { path as nodePath } from '~/utils/path';
import { atom, map, type MapStore } from 'nanostores';
import type { ActionAlert, BoltAction, DeployAlert, FileHistory, SupabaseAction, SupabaseAlert, TestAction } from '~/types/actions';
import { createScopedLogger } from '~/utils/logger';
import { unreachable } from '~/utils/unreachable';
import type { ActionCallbackData } from './message-parser';
import type { BoltShell } from '~/utils/shell';
import type { TestReport } from '~/lib/agents/base/TestAgent';
import { ErrorMonitor } from './error-monitor';

const logger = createScopedLogger('ActionRunner');

export type ActionStatus = 'pending' | 'running' | 'complete' | 'aborted' | 'failed';

export type BaseActionState = BoltAction & {
  status: Exclude<ActionStatus, 'failed'>;
  abort: () => void;
  executed: boolean;
  abortSignal: AbortSignal;
};

export type FailedActionState = BoltAction &
  Omit<BaseActionState, 'status'> & {
    status: Extract<ActionStatus, 'failed'>;
    error: string;
  };

export type ActionState = BaseActionState | FailedActionState;

type BaseActionUpdate = Partial<Pick<BaseActionState, 'status' | 'abort' | 'executed'>>;

export type ActionStateUpdate =
  | BaseActionUpdate
  | (Omit<BaseActionUpdate, 'status'> & { status: 'failed'; error: string });

type ActionsMap = MapStore<Record<string, ActionState>>;

class ActionCommandError extends Error {
  readonly _output: string;
  readonly _header: string;

  constructor(message: string, output: string) {
    // Create a formatted message that includes both the error message and output
    const formattedMessage = `Failed To Execute Shell Command: ${message}\n\nOutput:\n${output}`;
    super(formattedMessage);

    // Set the output separately so it can be accessed programmatically
    this._header = message;
    this._output = output;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ActionCommandError.prototype);

    // Set the name of the error for better debugging
    this.name = 'ActionCommandError';
  }

  // Optional: Add a method to get just the terminal output
  get output() {
    return this._output;
  }
  get header() {
    return this._header;
  }
}

export class ActionRunner {
  #webcontainer: Promise<WebContainer>;
  #currentExecutionPromise: Promise<void> = Promise.resolve();
  #shellTerminal: () => BoltShell;
  #testRunner?: any; // Will be initialized lazily
  runnerId = atom<string>(`${Date.now()}`);
  actions: ActionsMap = map({});
  onAlert?: (alert: ActionAlert) => void;
  onSupabaseAlert?: (alert: SupabaseAlert) => void;
  onDeployAlert?: (alert: DeployAlert) => void;
  onTestComplete?: (report: TestReport) => void;
  onCompilationError?: (errorData: any) => void;
  buildOutput?: { path: string; exitCode: number; output: string };
  testReports: Map<string, TestReport> = new Map();

  constructor(
    webcontainerPromise: Promise<WebContainer>,
    getShellTerminal: () => BoltShell,
    onAlert?: (alert: ActionAlert) => void,
    onSupabaseAlert?: (alert: SupabaseAlert) => void,
    onDeployAlert?: (alert: DeployAlert) => void,
    onTestComplete?: (report: TestReport) => void,
  ) {
    this.#webcontainer = webcontainerPromise;
    this.#shellTerminal = getShellTerminal;
    this.onAlert = onAlert;
    this.onSupabaseAlert = onSupabaseAlert;
    this.onDeployAlert = onDeployAlert;
    this.onTestComplete = onTestComplete;
  }

  addAction(data: ActionCallbackData) {
    const { actionId } = data;

    const actions = this.actions.get();
    const action = actions[actionId];

    if (action) {
      // action already added
      return;
    }

    const abortController = new AbortController();

    this.actions.setKey(actionId, {
      ...data.action,
      status: 'pending',
      executed: false,
      abort: () => {
        abortController.abort();
        this.#updateAction(actionId, { status: 'aborted' });
      },
      abortSignal: abortController.signal,
    });

    this.#currentExecutionPromise.then(() => {
      this.#updateAction(actionId, { status: 'running' });
    });
  }

  async runAction(data: ActionCallbackData, isStreaming: boolean = false) {
    const { actionId } = data;
    const action = this.actions.get()[actionId];

    if (!action) {
      unreachable(`Action ${actionId} not found`);
    }

    if (action.executed) {
      return; // No return value here
    }

    if (isStreaming && action.type !== 'file') {
      return; // No return value here
    }

    this.#updateAction(actionId, { ...action, ...data.action, executed: !isStreaming });

    this.#currentExecutionPromise = this.#currentExecutionPromise
      .then(() => {
        return this.#executeAction(actionId, isStreaming);
      })
      .catch((error) => {
        console.error('Action failed:', error);
      });

    await this.#currentExecutionPromise;

    return;
  }

  async #executeAction(actionId: string, isStreaming: boolean = false) {
    const action = this.actions.get()[actionId];

    this.#updateAction(actionId, { status: 'running' });

    try {
      switch (action.type) {
        case 'shell': {
          await this.#runShellAction(action);
          break;
        }
        case 'file': {
          await this.#runFileAction(action);
          break;
        }
        case 'supabase': {
          try {
            await this.handleSupabaseAction(action as SupabaseAction);
          } catch (error: any) {
            // Update action status
            this.#updateAction(actionId, {
              status: 'failed',
              error: error instanceof Error ? error.message : 'Supabase action failed',
            });

            // Return early without re-throwing
            return;
          }
          break;
        }
        case 'build': {
          const buildOutput = await this.#runBuildAction(action);

          // Store build output for deployment
          this.buildOutput = buildOutput;
          
          // Auto-run tests after successful build
          if (buildOutput.exitCode === 0) {
            logger.info('Build successful, running automated tests...');
            await this.#runAutomatedTests(actionId);
          }
          break;
        }
        case 'test': {
          await this.#runTestAction(action, actionId);
          break;
        }
        case 'start': {
          // making the start app non blocking

          this.#runStartAction(action)
            .then(() => this.#updateAction(actionId, { status: 'complete' }))
            .catch((err: Error) => {
              if (action.abortSignal.aborted) {
                return;
              }

              this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });
              logger.error(`[${action.type}]:Action failed\n\n`, err);

              if (!(err instanceof ActionCommandError)) {
                return;
              }

              this.onAlert?.({
                type: 'error',
                title: 'Dev Server Failed',
                description: err.header,
                content: err.output,
              });
            });

          /*
           * adding a delay to avoid any race condition between 2 start actions
           * i am up for a better approach
           */
          await new Promise((resolve) => setTimeout(resolve, 2000));

          return;
        }
      }

      this.#updateAction(actionId, {
        status: isStreaming ? 'running' : action.abortSignal.aborted ? 'aborted' : 'complete',
      });
    } catch (error) {
      if (action.abortSignal.aborted) {
        return;
      }

      this.#updateAction(actionId, { status: 'failed', error: 'Action failed' });
      logger.error(`[${action.type}]:Action failed\n\n`, error);

      if (!(error instanceof ActionCommandError)) {
        return;
      }

      this.onAlert?.({
        type: 'error',
        title: 'Dev Server Failed',
        description: error.header,
        content: error.output,
      });

      // re-throw the error to be caught in the promise chain
      throw error;
    }
  }

  async #runShellAction(action: ActionState) {
    if (action.type !== 'shell') {
      unreachable('Expected shell action');
    }

    // Check if this is a backend-related command
    const isBackendCommand = action.content.includes('cd backend') || 
                           action.content.includes('uvicorn') || 
                           action.content.includes('python main.py') ||
                           action.content.includes('pip install');
    
    if (isBackendCommand && !action.content.includes('mkdir')) {
      // Check if backend directory exists (unless we're creating it)
      const webcontainer = await this.#webcontainer;
      try {
        await webcontainer.fs.readdir('backend');
        logger.debug('Backend directory exists, proceeding with command');
      } catch (error) {
        logger.error('Backend directory not found for command:', action.content);
        throw new ActionCommandError(
          'Backend Directory Not Found',
          'The backend directory does not exist. Please switch to Backend mode and generate the backend code first.'
        );
      }
    }

    const shell = this.#shellTerminal();
    await shell.ready();

    if (!shell || !shell.terminal || !shell.process) {
      unreachable('Shell terminal not found');
    }

    const resp = await shell.executeCommand(this.runnerId.get(), action.content, () => {
      logger.debug(`[${action.type}]:Aborting Action\n\n`, action);
      action.abort();
    });
    logger.debug(`${action.type} Shell Response: [exit code:${resp?.exitCode}]`);

    if (resp?.exitCode != 0) {
      throw new ActionCommandError(`Failed To Execute Shell Command`, resp?.output || 'No Output Available');
    }
  }

  async #runStartAction(action: ActionState) {
    if (action.type !== 'start') {
      unreachable('Expected shell action');
    }

    if (!this.#shellTerminal) {
      unreachable('Shell terminal not found');
    }

    const shell = this.#shellTerminal();
    await shell.ready();

    if (!shell || !shell.terminal || !shell.process) {
      unreachable('Shell terminal not found');
    }

    // Check if this is a backend start command
    const isBackendCommand = action.content.includes('cd backend') || 
                           action.content.includes('uvicorn') || 
                           action.content.includes('main:app');
    
    if (isBackendCommand) {
      // Check if backend directory exists
      const webcontainer = await this.#webcontainer;
      try {
        await webcontainer.fs.readdir('backend');
        logger.debug('Backend directory exists, proceeding with start command');
      } catch (error) {
        logger.error('Backend directory not found');
        throw new ActionCommandError(
          'Backend Not Found',
          'The backend directory does not exist yet. Please generate the backend code first by describing your API requirements in Backend mode.'
        );
      }
    }

    const resp = await shell.executeCommand(this.runnerId.get(), action.content, () => {
      logger.debug(`[${action.type}]:Aborting Action\n\n`, action);
      action.abort();
    });
    logger.debug(`${action.type} Shell Response: [exit code:${resp?.exitCode}]`);

    // Check for compilation errors
    const errorMonitor = ErrorMonitor.getInstance();
    if (shell.lastDetectedErrors && shell.lastDetectedErrors.length > 0) {
      logger.warn('Compilation errors detected during dev server startup');
      
      // Trigger error feedback
      this.#handleCompilationErrors(shell.lastDetectedErrors);
      
      // Clear the errors after handling
      shell.lastDetectedErrors = [];
    }

    if (resp?.exitCode != 0) {
      throw new ActionCommandError('Failed To Start Application', resp?.output || 'No Output Available');
    }

    return resp;
  }

  #handleCompilationErrors(errors: any[]) {
    const errorMonitor = ErrorMonitor.getInstance();
    
    // Get formatted error message
    const errorMessage = errorMonitor.formatErrorsForDisplay();
    const llmPrompt = errorMonitor.formatErrorsForLLM();
    
    logger.info('Compilation errors detected, preparing feedback:', errorMessage);
    
    // Store the error report for the chat to pick up
    if (this.onCompilationError) {
      this.onCompilationError({
        errors: errors,
        formattedMessage: errorMessage,
        llmPrompt: llmPrompt,
        timestamp: Date.now(),
      });
    } else {
      // Fallback to alert
      this.onAlert?.({
        type: 'error',
        title: 'Compilation Error Detected',
        description: 'Syntax or compilation errors were found in your code',
        content: errorMessage,
      });
    }
    
    // Clear the error buffer after handling
    errorMonitor.clearErrors();
  }

  async #runFileAction(action: ActionState) {
    if (action.type !== 'file') {
      unreachable('Expected file action');
    }

    const webcontainer = await this.#webcontainer;
    const relativePath = nodePath.relative(webcontainer.workdir, action.filePath);

    let folder = nodePath.dirname(relativePath);

    // remove trailing slashes
    folder = folder.replace(/\/+$/g, '');

    if (folder !== '.') {
      try {
        await webcontainer.fs.mkdir(folder, { recursive: true });
        logger.debug('Created folder', folder);
      } catch (error) {
        logger.error('Failed to create folder\n\n', error);
      }
    }

    try {
      await webcontainer.fs.writeFile(relativePath, action.content);
      logger.debug(`File written ${relativePath}`);
    } catch (error) {
      logger.error('Failed to write file\n\n', error);
    }
  }

  #updateAction(id: string, newState: ActionStateUpdate) {
    const actions = this.actions.get();

    this.actions.setKey(id, { ...actions[id], ...newState });
  }

  async getFileHistory(filePath: string): Promise<FileHistory | null> {
    try {
      const webcontainer = await this.#webcontainer;
      const historyPath = this.#getHistoryPath(filePath);
      const content = await webcontainer.fs.readFile(historyPath, 'utf-8');

      return JSON.parse(content);
    } catch (error) {
      logger.error('Failed to get file history:', error);
      return null;
    }
  }

  async saveFileHistory(filePath: string, history: FileHistory) {
    // const webcontainer = await this.#webcontainer;
    const historyPath = this.#getHistoryPath(filePath);

    await this.#runFileAction({
      type: 'file',
      filePath: historyPath,
      content: JSON.stringify(history),
      changeSource: 'auto-save',
    } as any);
  }

  #getHistoryPath(filePath: string) {
    return nodePath.join('.history', filePath);
  }

  async #runBuildAction(action: ActionState) {
    if (action.type !== 'build') {
      unreachable('Expected build action');
    }

    // Trigger build started alert
    this.onDeployAlert?.({
      type: 'info',
      title: 'Building Application',
      description: 'Building your application...',
      stage: 'building',
      buildStatus: 'running',
      deployStatus: 'pending',
      source: 'netlify',
    });

    const webcontainer = await this.#webcontainer;

    // Create a new terminal specifically for the build
    const buildProcess = await webcontainer.spawn('npm', ['run', 'build']);

    let output = '';
    buildProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          output += data;
        },
      }),
    );

    const exitCode = await buildProcess.exit;

    if (exitCode !== 0) {
      // Trigger build failed alert
      this.onDeployAlert?.({
        type: 'error',
        title: 'Build Failed',
        description: 'Your application build failed',
        content: output || 'No build output available',
        stage: 'building',
        buildStatus: 'failed',
        deployStatus: 'pending',
        source: 'netlify',
      });

      throw new ActionCommandError('Build Failed', output || 'No Output Available');
    }

    // Trigger build success alert
    this.onDeployAlert?.({
      type: 'success',
      title: 'Build Completed',
      description: 'Your application was built successfully',
      stage: 'deploying',
      buildStatus: 'complete',
      deployStatus: 'running',
      source: 'netlify',
    });

    // Check for common build directories
    const commonBuildDirs = ['dist', 'build', 'out', 'output', '.next', 'public'];

    let buildDir = '';

    // Try to find the first existing build directory
    for (const dir of commonBuildDirs) {
      const dirPath = nodePath.join(webcontainer.workdir, dir);

      try {
        await webcontainer.fs.readdir(dirPath);
        buildDir = dirPath;
        break;
      } catch {
        continue;
      }
    }

    // If no build directory was found, use the default (dist)
    if (!buildDir) {
      buildDir = nodePath.join(webcontainer.workdir, 'dist');
    }

    return {
      path: buildDir,
      exitCode,
      output,
    };
  }

  async #runTestAction(action: ActionState, actionId: string) {
    if (action.type !== 'test') {
      unreachable('Expected test action');
    }

    const testAction = action as TestAction;
    
    // Show initial test alert
    this.onAlert?.({
      type: 'info',
      title: `🧪 Testing: ${testAction.testType}`,
      description: `Starting ${testAction.testType} tests...`,
      content: 'Initializing test environment...',
    });

    // Lazy load TestRunner to avoid circular dependencies
    if (!this.#testRunner) {
      const { TestRunner } = await import('./test-runner');
      this.#testRunner = new TestRunner({
        webcontainer: this.#webcontainer,
        getShellTerminal: this.#shellTerminal,
        onAlert: this.onAlert,
        onTestComplete: (report) => {
          this.testReports.set(actionId, report);
          this.onTestComplete?.(report);
        },
        previewUrl: 'http://localhost:5173', // TODO: Get actual preview URL
      });
    }

    try {
      await this.#testRunner.runTestAction({
        actionId,
        messageId: 'test-msg',
        action: testAction,
      });
    } catch (error) {
      logger.error('Test execution failed:', error);
      this.onAlert?.({
        type: 'error',
        title: '⚠️ Test Failed',
        description: `Failed to run ${testAction.testType} tests`,
        content: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async #runAutomatedTests(buildActionId: string) {
    // Show alert that tests are starting
    this.onAlert?.({
      type: 'info',
      title: '🧪 Running Automated Tests',
      description: 'Validating your application after successful build...',
      content: 'Testing browser functionality, checking for errors, and validating links...',
    });

    // Create automated test action
    const testActionId = `${buildActionId}-autotest`;
    const testAction: TestAction = {
      type: 'test',
      testType: 'browser',
      content: 'Running automated tests after build...',
      config: {
        checkSEO: true,
        checkImages: true,
      },
    };

    // Add test action to the queue
    this.actions.setKey(testActionId, {
      ...testAction,
      status: 'pending',
      executed: false,
      abort: () => {
        logger.info('Automated tests aborted');
      },
      abortSignal: new AbortController().signal,
    });

    // Run the test
    try {
      await this.#runTestAction(testAction as any, testActionId);
      
      // Get test report
      const report = this.testReports.get(testActionId);
      if (report) {
        if (report.summary.failed > 0) {
          // Show detailed failure alert
          const failedTests = report.results
            .filter(r => r.status === 'failed')
            .map(r => `❌ ${r.testName}: ${r.error || 'Failed'}`)
            .join('\n');

          this.onAlert?.({
            type: 'error',
            title: `❌ Tests Failed (${report.summary.failed}/${report.summary.total})`,
            description: `${report.summary.failed} tests failed. The application may have issues.`,
            content: `Failed Tests:\n${failedTests}\n\nSuggestions:\n${report.suggestions?.join('\n') || 'Fix the errors above'}`,
          });
        } else {
          // Show success alert
          this.onAlert?.({
            type: 'success',
            title: '✅ All Tests Passed!',
            description: `Successfully validated ${report.summary.total} test${report.summary.total !== 1 ? 's' : ''}`,
            content: `✓ Page loads correctly\n✓ No JavaScript errors\n✓ All links working\n✓ SEO elements present\n✓ Images loading properly`,
          });
        }
      }
    } catch (error) {
      logger.error('Automated tests failed:', error);
      this.onAlert?.({
        type: 'error',
        title: '⚠️ Test Execution Failed',
        description: 'Could not complete automated testing',
        content: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  async handleSupabaseAction(action: SupabaseAction) {
    const { operation, content, filePath } = action;
    logger.debug('[Supabase Action]:', { operation, filePath, content });

    switch (operation) {
      case 'migration':
        if (!filePath) {
          throw new Error('Migration requires a filePath');
        }

        // Show alert for migration action
        this.onSupabaseAlert?.({
          type: 'info',
          title: 'Supabase Migration',
          description: `Create migration file: ${filePath}`,
          content,
          source: 'supabase',
        });

        // Only create the migration file
        await this.#runFileAction({
          type: 'file',
          filePath,
          content,
          changeSource: 'supabase',
        } as any);
        return { success: true };

      case 'query': {
        // Always show the alert and let the SupabaseAlert component handle connection state
        this.onSupabaseAlert?.({
          type: 'info',
          title: 'Supabase Query',
          description: 'Execute database query',
          content,
          source: 'supabase',
        });

        // The actual execution will be triggered from SupabaseChatAlert
        return { pending: true };
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  // Add this method declaration to the class
  handleDeployAction(
    stage: 'building' | 'deploying' | 'complete',
    status: ActionStatus,
    details?: {
      url?: string;
      error?: string;
      source?: 'netlify' | 'vercel' | 'github';
    },
  ): void {
    if (!this.onDeployAlert) {
      logger.debug('No deploy alert handler registered');
      return;
    }

    const alertType = status === 'failed' ? 'error' : status === 'complete' ? 'success' : 'info';

    const title =
      stage === 'building'
        ? 'Building Application'
        : stage === 'deploying'
          ? 'Deploying Application'
          : 'Deployment Complete';

    const description =
      status === 'failed'
        ? `${stage === 'building' ? 'Build' : 'Deployment'} failed`
        : status === 'running'
          ? `${stage === 'building' ? 'Building' : 'Deploying'} your application...`
          : status === 'complete'
            ? `${stage === 'building' ? 'Build' : 'Deployment'} completed successfully`
            : `Preparing to ${stage === 'building' ? 'build' : 'deploy'} your application`;

    const buildStatus =
      stage === 'building' ? status : stage === 'deploying' || stage === 'complete' ? 'complete' : 'pending';

    const deployStatus = stage === 'building' ? 'pending' : status;

    this.onDeployAlert({
      type: alertType,
      title,
      description,
      content: details?.error || '',
      url: details?.url,
      stage,
      buildStatus: buildStatus as any,
      deployStatus: deployStatus as any,
      source: details?.source || 'netlify',
    });
  }
}
