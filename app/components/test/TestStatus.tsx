import React from 'react';
import type { TestReport } from '~/lib/agents/base/TestAgent';
import { classNames } from '~/utils/classNames';

interface TestStatusProps {
  report: TestReport;
  expanded?: boolean;
  onToggle?: () => void;
}

export const TestStatus: React.FC<TestStatusProps> = ({ report, expanded = false, onToggle }) => {
  const passRate = (report.summary.passed / report.summary.total) * 100;
  const hasFailures = report.summary.failed > 0;
  const hasWarnings = report.results.some(r => r.status === 'warning');

  const statusColor = hasFailures 
    ? 'text-red-500 bg-red-100 dark:bg-red-900/20' 
    : hasWarnings 
    ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20'
    : 'text-green-500 bg-green-100 dark:bg-green-900/20';

  const statusIcon = hasFailures ? '❌' : hasWarnings ? '⚠️' : '✅';

  return (
    <div className="border rounded-lg p-4 mb-4 bg-white dark:bg-gray-800">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{statusIcon}</span>
          <div>
            <h3 className="font-semibold text-lg">{report.agentName}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {report.summary.passed}/{report.summary.total} tests passed ({passRate.toFixed(0)}%)
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={classNames('px-3 py-1 rounded-full text-sm font-medium', statusColor)}>
            {hasFailures ? 'Failed' : hasWarnings ? 'Warning' : 'Passed'}
          </span>
          <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            {expanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Test Duration */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Duration: {(report.duration / 1000).toFixed(2)}s
          </div>

          {/* Failed Tests */}
          {report.summary.failed > 0 && (
            <div className="bg-red-50 dark:bg-red-900/10 rounded p-3">
              <h4 className="font-medium text-red-700 dark:text-red-400 mb-2">Failed Tests</h4>
              <ul className="space-y-1">
                {report.results
                  .filter(r => r.status === 'failed')
                  .map((result, idx) => (
                    <li key={idx} className="text-sm">
                      <span className="text-red-600 dark:text-red-400">✗</span> {result.testName}
                      {result.error && (
                        <div className="ml-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {result.error}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {report.results.some(r => r.status === 'warning') && (
            <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded p-3">
              <h4 className="font-medium text-yellow-700 dark:text-yellow-400 mb-2">Warnings</h4>
              <ul className="space-y-1">
                {report.results
                  .filter(r => r.status === 'warning')
                  .map((result, idx) => (
                    <li key={idx} className="text-sm">
                      <span className="text-yellow-600 dark:text-yellow-400">⚠</span> {result.testName}
                      {result.error && (
                        <div className="ml-4 text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {result.error}
                        </div>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {report.suggestions && report.suggestions.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/10 rounded p-3">
              <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">Suggestions</h4>
              <ul className="space-y-1">
                {report.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                    • {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Passed Tests (Collapsed by default) */}
          <details className="bg-green-50 dark:bg-green-900/10 rounded p-3">
            <summary className="font-medium text-green-700 dark:text-green-400 cursor-pointer">
              Passed Tests ({report.summary.passed})
            </summary>
            <ul className="mt-2 space-y-1">
              {report.results
                .filter(r => r.status === 'passed')
                .map((result, idx) => (
                  <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-green-600 dark:text-green-400">✓</span> {result.testName}
                  </li>
                ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
};