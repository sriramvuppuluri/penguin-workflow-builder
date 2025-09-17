import React from 'react';
import type { TestReport } from '~/lib/agents/base/TestAgent';
import { classNames } from '~/utils/classNames';

interface TestStatusMessageProps {
  status: 'running' | 'completed' | 'failed';
  report?: TestReport;
  testType?: string;
}

export const TestStatusMessage: React.FC<TestStatusMessageProps> = ({ 
  status, 
  report, 
  testType = 'browser' 
}) => {
  if (status === 'running') {
    return (
      <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="animate-spin text-2xl">🧪</div>
        <div>
          <div className="font-semibold text-blue-900 dark:text-blue-100">
            Running Automated Tests...
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            Validating {testType} functionality after build
          </div>
        </div>
      </div>
    );
  }

  if (status === 'completed' && report) {
    const hasFailures = report.summary.failed > 0;
    const passRate = (report.summary.passed / report.summary.total) * 100;

    return (
      <div className={classNames(
        'p-4 rounded-lg border',
        hasFailures 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      )}>
        <div className="flex items-start gap-3">
          <div className="text-2xl">{hasFailures ? '❌' : '✅'}</div>
          <div className="flex-1">
            <div className={classNames(
              'font-semibold mb-2',
              hasFailures 
                ? 'text-red-900 dark:text-red-100'
                : 'text-green-900 dark:text-green-100'
            )}>
              {hasFailures 
                ? `Tests Failed (${report.summary.failed}/${report.summary.total})`
                : `All ${report.summary.total} Tests Passed!`}
            </div>
            
            {/* Test Summary */}
            <div className="text-sm space-y-1 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span>{report.summary.passed} passed</span>
              </div>
              {report.summary.failed > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-400">✗</span>
                  <span>{report.summary.failed} failed</span>
                </div>
              )}
              {report.summary.skipped > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">○</span>
                  <span>{report.summary.skipped} skipped</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
              <div 
                className={classNames(
                  'h-2 rounded-full transition-all duration-500',
                  hasFailures 
                    ? 'bg-gradient-to-r from-red-400 to-red-600'
                    : 'bg-gradient-to-r from-green-400 to-green-600'
                )}
                style={{ width: `${passRate}%` }}
              />
            </div>

            {/* Failed Tests Details */}
            {hasFailures && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-red-700 dark:text-red-300">
                  View Failed Tests
                </summary>
                <div className="mt-2 space-y-2">
                  {report.results
                    .filter(r => r.status === 'failed')
                    .map((result, idx) => (
                      <div key={idx} className="text-sm bg-white dark:bg-gray-800 p-2 rounded">
                        <div className="font-medium text-red-600 dark:text-red-400">
                          {result.testName}
                        </div>
                        {result.error && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {result.error}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </details>
            )}

            {/* Suggestions */}
            {report.suggestions && report.suggestions.length > 0 && (
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                  💡 Suggestions:
                </div>
                <ul className="text-xs space-y-1">
                  {report.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-yellow-700 dark:text-yellow-300">
                      • {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};