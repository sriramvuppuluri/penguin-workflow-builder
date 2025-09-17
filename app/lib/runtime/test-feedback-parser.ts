import type { TestReport } from '~/lib/agents/base/TestAgent';
import type { TestResult, FeedbackAction } from '~/types/actions';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('TestFeedbackParser');

const TEST_RESULT_TAG_OPEN = '<boltTestResult';
const TEST_RESULT_TAG_CLOSE = '</boltTestResult>';
const TEST_FEEDBACK_TAG_OPEN = '<boltTestFeedback';
const TEST_FEEDBACK_TAG_CLOSE = '</boltTestFeedback>';

export interface TestFeedbackData {
  report: TestReport;
  formattedMessage: string;
  llmPrompt: string;
  severity: 'success' | 'warning' | 'error';
}

export class TestFeedbackParser {
  /**
   * Parse test report and generate structured feedback for LLM
   */
  static generateFeedback(report: TestReport): TestFeedbackData {
    const severity = this.calculateSeverity(report);
    const formattedMessage = this.formatReportForDisplay(report);
    const llmPrompt = this.generateLLMPrompt(report);

    return {
      report,
      formattedMessage,
      llmPrompt,
      severity,
    };
  }

  /**
   * Calculate severity based on test results
   */
  private static calculateSeverity(report: TestReport): 'success' | 'warning' | 'error' {
    const failureRate = report.summary.failed / report.summary.total;
    
    if (failureRate === 0) {
      return 'success';
    } else if (failureRate < 0.3) {
      return 'warning';
    } else {
      return 'error';
    }
  }

  /**
   * Format test report for display in UI
   */
  private static formatReportForDisplay(report: TestReport): string {
    const lines: string[] = [];
    
    // Header
    lines.push(`## Test Report: ${report.agentName}`);
    lines.push('');
    
    // Summary
    lines.push('### Summary');
    lines.push(`- Total Tests: ${report.summary.total}`);
    lines.push(`- Passed: ${report.summary.passed} ✅`);
    lines.push(`- Failed: ${report.summary.failed} ❌`);
    lines.push(`- Skipped: ${report.summary.skipped} ⏭️`);
    lines.push(`- Duration: ${(report.duration / 1000).toFixed(2)}s`);
    lines.push('');

    // Failed tests
    const failures = report.results.filter(r => r.status === 'failed');
    if (failures.length > 0) {
      lines.push('### Failed Tests');
      failures.forEach(test => {
        lines.push(`\n#### ❌ ${test.testName}`);
        if (test.error) {
          lines.push(`**Error:** ${test.error}`);
        }
        if (test.details) {
          lines.push('**Details:**');
          lines.push('```json');
          lines.push(JSON.stringify(test.details, null, 2));
          lines.push('```');
        }
      });
      lines.push('');
    }

    // Warnings
    const warnings = report.results.filter(r => r.status === 'warning');
    if (warnings.length > 0) {
      lines.push('### Warnings');
      warnings.forEach(test => {
        lines.push(`\n#### ⚠️ ${test.testName}`);
        if (test.error) {
          lines.push(`**Warning:** ${test.error}`);
        }
      });
      lines.push('');
    }

    // Suggestions
    if (report.suggestions && report.suggestions.length > 0) {
      lines.push('### Suggestions for Improvement');
      report.suggestions.forEach(suggestion => {
        lines.push(`- ${suggestion}`);
      });
      lines.push('');
    }

    // Passed tests (collapsed)
    const passed = report.results.filter(r => r.status === 'passed');
    if (passed.length > 0) {
      lines.push('<details>');
      lines.push('<summary>✅ Passed Tests (' + passed.length + ')</summary>');
      lines.push('');
      passed.forEach(test => {
        lines.push(`- ${test.testName}`);
      });
      lines.push('</details>');
    }

    return lines.join('\n');
  }

  /**
   * Generate LLM prompt based on test results
   */
  private static generateLLMPrompt(report: TestReport): string {
    const failures = report.results.filter(r => r.status === 'failed');
    
    if (failures.length === 0) {
      return `All tests passed successfully! The application appears to be working correctly.`;
    }

    const lines: string[] = [
      `The automated tests have detected ${failures.length} issue(s) that need to be fixed:`,
      '',
    ];

    // Group failures by type
    const failuresByType = new Map<string, TestResult[]>();
    failures.forEach(failure => {
      const type = this.categorizeFailure(failure);
      if (!failuresByType.has(type)) {
        failuresByType.set(type, []);
      }
      failuresByType.get(type)!.push(failure);
    });

    // Generate focused prompts for each failure type
    failuresByType.forEach((tests, type) => {
      lines.push(`### ${type} Issues (${tests.length})`);
      tests.forEach(test => {
        lines.push(`- **${test.testName}**: ${test.error || 'Test failed'}`);
        if (test.details) {
          lines.push(`  Context: ${JSON.stringify(test.details)}`);
        }
      });
      lines.push('');
    });

    // Add suggestions
    if (report.suggestions && report.suggestions.length > 0) {
      lines.push('### Recommended Fixes:');
      report.suggestions.forEach(suggestion => {
        lines.push(`- ${suggestion}`);
      });
      lines.push('');
    }

    lines.push('Please fix these issues to ensure the application works correctly.');

    return lines.join('\n');
  }

  /**
   * Categorize failure type for grouping
   */
  private static categorizeFailure(result: TestResult): string {
    const name = result.testName.toLowerCase();
    const error = (result.error || '').toLowerCase();

    if (name.includes('javascript') || error.includes('typeerror') || error.includes('referenceerror')) {
      return 'JavaScript';
    }
    if (name.includes('load') || name.includes('performance')) {
      return 'Performance';
    }
    if (name.includes('accessibility') || name.includes('a11y') || name.includes('aria')) {
      return 'Accessibility';
    }
    if (name.includes('seo') || name.includes('meta')) {
      return 'SEO';
    }
    if (name.includes('api') || name.includes('endpoint')) {
      return 'API';
    }
    if (name.includes('image') || name.includes('resource')) {
      return 'Resources';
    }
    if (name.includes('form') || name.includes('input')) {
      return 'Forms';
    }
    
    return 'General';
  }

  /**
   * Parse test results from LLM message
   */
  static parseTestResults(message: string): TestReport | null {
    const startIndex = message.indexOf(TEST_RESULT_TAG_OPEN);
    const endIndex = message.indexOf(TEST_RESULT_TAG_CLOSE);

    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    try {
      const xmlContent = message.substring(
        startIndex,
        endIndex + TEST_RESULT_TAG_CLOSE.length
      );

      // Extract attributes and content
      const contentStart = xmlContent.indexOf('>') + 1;
      const contentEnd = xmlContent.lastIndexOf('<');
      const content = xmlContent.substring(contentStart, contentEnd);

      // Parse JSON content
      const report = JSON.parse(content) as TestReport;
      return report;
    } catch (error) {
      logger.error('Failed to parse test results:', error);
      return null;
    }
  }

  /**
   * Format test report for inclusion in LLM message
   */
  static formatForMessage(report: TestReport): string {
    return `${TEST_RESULT_TAG_OPEN}>
${JSON.stringify(report, null, 2)}
${TEST_RESULT_TAG_CLOSE}`;
  }

  /**
   * Generate feedback action from test report
   */
  static createFeedbackAction(report: TestReport): FeedbackAction {
    const severity = this.calculateSeverity(report);
    
    return {
      type: 'feedback',
      content: this.formatReportForDisplay(report),
      status: severity === 'error' ? 'failure' : severity === 'warning' ? 'warning' : 'success',
      results: report.results,
      suggestions: report.suggestions,
    };
  }

  /**
   * Extract test context for LLM understanding
   */
  static extractTestContext(reports: TestReport[]): string {
    const lines: string[] = [
      'Test Execution Context:',
      '======================',
      '',
    ];

    // Overall statistics
    const totalTests = reports.reduce((sum, r) => sum + r.summary.total, 0);
    const totalPassed = reports.reduce((sum, r) => sum + r.summary.passed, 0);
    const totalFailed = reports.reduce((sum, r) => sum + r.summary.failed, 0);

    lines.push(`Total Tests Run: ${totalTests}`);
    lines.push(`Overall Pass Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    lines.push('');

    // Group failures by category
    const allFailures: TestResult[] = [];
    reports.forEach(report => {
      allFailures.push(...report.results.filter(r => r.status === 'failed'));
    });

    if (allFailures.length > 0) {
      lines.push('Critical Issues Found:');
      lines.push('---------------------');
      
      const failuresByCategory = new Map<string, number>();
      allFailures.forEach(failure => {
        const category = this.categorizeFailure(failure);
        failuresByCategory.set(category, (failuresByCategory.get(category) || 0) + 1);
      });

      failuresByCategory.forEach((count, category) => {
        lines.push(`- ${category}: ${count} issue(s)`);
      });
      lines.push('');

      // Most common errors
      const errorCounts = new Map<string, number>();
      allFailures.forEach(failure => {
        if (failure.error) {
          const errorKey = failure.error.substring(0, 50);
          errorCounts.set(errorKey, (errorCounts.get(errorKey) || 0) + 1);
        }
      });

      if (errorCounts.size > 0) {
        lines.push('Most Common Errors:');
        Array.from(errorCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .forEach(([error, count]) => {
            lines.push(`- "${error}..." (${count} occurrences)`);
          });
      }
    } else {
      lines.push('✅ All tests passed successfully!');
    }

    return lines.join('\n');
  }
}