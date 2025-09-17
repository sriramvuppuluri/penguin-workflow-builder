import React, { useState } from 'react';
import type { TestReport } from '~/lib/agents/base/TestAgent';
import { TestStatus } from './TestStatus';

interface TestResultsProps {
  reports: TestReport[];
  className?: string;
}

export const TestResults: React.FC<TestResultsProps> = ({ reports, className = '' }) => {
  const [expandedReports, setExpandedReports] = useState<Set<number>>(new Set());

  if (reports.length === 0) {
    return null;
  }

  const toggleReport = (index: number) => {
    setExpandedReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const totalTests = reports.reduce((sum, r) => sum + r.summary.total, 0);
  const totalPassed = reports.reduce((sum, r) => sum + r.summary.passed, 0);
  const totalFailed = reports.reduce((sum, r) => sum + r.summary.failed, 0);
  const overallPassRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

  return (
    <div className={`test-results ${className}`}>
      {/* Overall Summary */}
      <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Test Results Summary</h2>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold">{totalTests}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Tests</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-green-600">{totalPassed}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Passed</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-red-600">{totalFailed}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">{overallPassRate.toFixed(0)}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pass Rate</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${overallPassRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Individual Test Reports */}
      <div className="space-y-2">
        {reports.map((report, index) => (
          <TestStatus
            key={index}
            report={report}
            expanded={expandedReports.has(index)}
            onToggle={() => toggleReport(index)}
          />
        ))}
      </div>
    </div>
  );
};