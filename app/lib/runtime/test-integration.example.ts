/**
 * Example integration of the Test Agent System
 * 
 * This file demonstrates how to use the testing sub-agents to automatically
 * test built applications and provide feedback to the LLM.
 */

import { TestRunner } from './test-runner';
import type { TestAction } from '~/types/actions';
import type { TestReport } from '~/lib/agents/base/TestAgent';
import { TestFeedbackParser } from './test-feedback-parser';
import { webcontainer } from '~/lib/webcontainer';
import type { BoltShell } from '~/utils/shell';

/**
 * Example 1: Run browser tests on a built application
 */
export async function runBrowserTests(shell: BoltShell) {
  const testRunner = new TestRunner({
    webcontainer,
    getShellTerminal: () => shell,
    onAlert: (alert) => {
      console.log('Test Alert:', alert);
    },
    onTestComplete: (report) => {
      console.log('Test Complete:', report);
      handleTestReport(report);
    },
    previewUrl: 'http://localhost:5173',
  });

  // Create a browser test action
  const testAction: TestAction = {
    type: 'test',
    testType: 'browser',
    content: 'Running browser tests...',
    target: '/',
    config: {
      checkSEO: true,
      checkImages: true,
    },
  };

  // Add and run the test action
  const actionId = 'test-browser-1';
  testRunner.addAction({
    actionId,
    messageId: 'msg-1',
    action: testAction,
  });

  await testRunner.runTestAction({
    actionId,
    messageId: 'msg-1',
    action: testAction,
  });

  // Get the test report
  const report = testRunner.getTestReport(actionId);
  if (report) {
    console.log('Test Report:', TestFeedbackParser.formatReportForDisplay(report));
  }
}

/**
 * Example 2: Run multiple test types in sequence
 */
export async function runComprehensiveTests(shell: BoltShell) {
  const testRunner = new TestRunner({
    webcontainer,
    getShellTerminal: () => shell,
    previewUrl: 'http://localhost:5173',
  });

  const testTypes: Array<TestAction['testType']> = [
    'browser',
    'api',
    'accessibility',
    'performance',
  ];

  const reports: TestReport[] = [];

  for (const testType of testTypes) {
    const action: TestAction = {
      type: 'test',
      testType,
      content: `Running ${testType} tests...`,
    };

    const actionId = `test-${testType}`;
    testRunner.addAction({
      actionId,
      messageId: 'msg-1',
      action,
    });

    await testRunner.runTestAction({
      actionId,
      messageId: 'msg-1',
      action,
    });

    const report = testRunner.getTestReport(actionId);
    if (report) {
      reports.push(report);
    }
  }

  // Generate comprehensive feedback
  const testContext = TestFeedbackParser.extractTestContext(reports);
  console.log('Comprehensive Test Results:', testContext);

  // Send feedback to LLM
  await sendTestFeedbackToLLM(reports);
}

/**
 * Example 3: Handle test results and provide feedback to LLM
 */
function handleTestReport(report: TestReport) {
  const feedback = TestFeedbackParser.generateFeedback(report);

  // Check severity and take appropriate action
  switch (feedback.severity) {
    case 'error':
      console.error('Critical test failures detected!');
      // Trigger automatic fix attempt
      triggerAutoFix(feedback);
      break;
    case 'warning':
      console.warn('Some tests have warnings');
      // Suggest improvements
      suggestImprovements(feedback);
      break;
    case 'success':
      console.log('All tests passed!');
      break;
  }

  // Format for LLM
  const llmPrompt = feedback.llmPrompt;
  console.log('LLM Prompt:', llmPrompt);
}

/**
 * Example 4: Send test feedback to the LLM for iterative improvement
 */
async function sendTestFeedbackToLLM(reports: TestReport[]) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: 'The automated tests have completed. Please review the results and fix any issues.',
        },
      ],
      testReports: reports, // Include test reports in the request
    }),
  });

  const result = await response.json();
  console.log('LLM Response:', result);
}

/**
 * Example 5: Trigger automatic fixes based on test failures
 */
async function triggerAutoFix(feedback: TestFeedbackData) {
  const { report } = feedback;
  const failures = report.results.filter(r => r.status === 'failed');

  // Generate fix prompts for each failure
  const fixPrompts = failures.map(failure => {
    switch (failure.testName) {
      case 'JavaScript Errors':
        return `Fix JavaScript error: ${failure.error}`;
      case 'Broken Links':
        return `Fix broken links: ${JSON.stringify(failure.details)}`;
      case 'Image Alt Texts':
        return 'Add alt text to all images for accessibility';
      case 'Form Labels':
        return 'Add labels to all form inputs';
      default:
        return `Fix test failure: ${failure.testName} - ${failure.error}`;
    }
  });

  // Send fix requests to LLM
  for (const prompt of fixPrompts) {
    console.log('Requesting fix:', prompt);
    // Send prompt to LLM for automatic fixing
  }
}

/**
 * Example 6: Suggest improvements based on test warnings
 */
function suggestImprovements(feedback: TestFeedbackData) {
  const { report } = feedback;
  
  if (report.suggestions && report.suggestions.length > 0) {
    console.log('Improvement Suggestions:');
    report.suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });
  }
}

/**
 * Example 7: Use in message parser to detect test commands
 */
export function detectTestCommands(message: string): TestAction | null {
  const testPatterns = [
    { pattern: /test the app/i, type: 'browser' as const },
    { pattern: /test accessibility/i, type: 'accessibility' as const },
    { pattern: /test performance/i, type: 'performance' as const },
    { pattern: /test api/i, type: 'api' as const },
    { pattern: /run all tests/i, type: 'browser' as const },
  ];

  for (const { pattern, type } of testPatterns) {
    if (pattern.test(message)) {
      return {
        type: 'test',
        testType: type,
        content: `Running ${type} tests as requested...`,
      };
    }
  }

  return null;
}

/**
 * Example 8: Integration with workbench store for UI updates
 */
export function updateUIWithTestResults(reports: TestReport[]) {
  // This would be integrated with the workbench store to update the UI
  // For example:
  // workbenchStore.setTestReports(reports);
  // workbenchStore.showTestResults(true);
  
  console.log('Updating UI with test results:', reports.length, 'reports');
}