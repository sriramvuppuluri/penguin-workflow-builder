import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  category?: 'unit' | 'integration' | 'api' | 'performance';
}

export interface TestStatusProps {
  tests: TestResult[];
  isRunning: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  currentTestIndex: number;
  autoFixAttempt?: number;
  onClose?: () => void;
}

export const TestStatus = memo(({
  tests,
  isRunning,
  totalTests,
  passedTests,
  failedTests,
  currentTestIndex,
  autoFixAttempt = 0,
  onClose
}: TestStatusProps) => {
  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  
  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <div className="i-ph:check-circle text-green-500" />;
      case 'failed':
        return <div className="i-ph:x-circle text-red-500" />;
      case 'running':
        return <div className="i-svg-spinners:3-dots-fade text-penguin-elements-item-contentAccent" />;
      case 'skipped':
        return <div className="i-ph:minus-circle text-gray-500" />;
      default:
        return <div className="i-ph:circle text-gray-400" />;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'unit':
        return 'text-blue-500';
      case 'integration':
        return 'text-purple-500';
      case 'api':
        return 'text-green-500';
      case 'performance':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed bottom-4 right-4 z-50 w-96 bg-penguin-elements-background-depth-2 rounded-lg shadow-lg border border-penguin-elements-borderColor p-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="i-ph:test-tube text-xl text-penguin-elements-item-contentAccent" />
            <h3 className="font-semibold text-penguin-elements-textPrimary">Test Runner</h3>
            {isRunning && (
              <div className="text-xs bg-penguin-elements-item-backgroundAccent text-penguin-elements-item-contentAccent px-2 py-0.5 rounded">
                Running...
              </div>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-penguin-elements-textSecondary hover:text-penguin-elements-textPrimary"
            >
              <div className="i-ph:x text-lg" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-penguin-elements-textSecondary mb-1">
            <span>{currentTestIndex} / {totalTests} tests</span>
            <span>{successRate}% passed</span>
          </div>
          <div className="h-2 bg-penguin-elements-background-depth-3 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-penguin-elements-item-contentAccent"
              initial={{ width: 0 }}
              animate={{ width: `${(currentTestIndex / totalTests) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-penguin-elements-background-depth-3 rounded p-2 text-center">
            <div className="text-2xl font-bold text-green-500">{passedTests}</div>
            <div className="text-xs text-penguin-elements-textSecondary">Passed</div>
          </div>
          <div className="bg-penguin-elements-background-depth-3 rounded p-2 text-center">
            <div className="text-2xl font-bold text-red-500">{failedTests}</div>
            <div className="text-xs text-penguin-elements-textSecondary">Failed</div>
          </div>
          <div className="bg-penguin-elements-background-depth-3 rounded p-2 text-center">
            <div className="text-2xl font-bold text-gray-500">{totalTests - passedTests - failedTests}</div>
            <div className="text-xs text-penguin-elements-textSecondary">Pending</div>
          </div>
        </div>

        {/* Auto-fix indicator */}
        {autoFixAttempt > 0 && failedTests > 0 && (
          <div className="mb-3 p-2 bg-penguin-elements-alerts-warningBackground border border-penguin-elements-alerts-warningBorder rounded">
            <div className="flex items-center gap-2 text-sm text-penguin-elements-alerts-warningText">
              <div className="i-ph:wrench" />
              <span>Auto-fixing attempt #{autoFixAttempt}...</span>
            </div>
          </div>
        )}

        {/* Test List */}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {tests.slice(0, Math.max(currentTestIndex, 10)).map((test, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-2 p-2 rounded text-sm ${
                test.status === 'running' 
                  ? 'bg-penguin-elements-item-backgroundAccent' 
                  : 'bg-penguin-elements-background-depth-3'
              }`}
            >
              {getStatusIcon(test.status)}
              <div className="flex-1 truncate">
                <span className="text-penguin-elements-textPrimary">{test.name}</span>
                {test.category && (
                  <span className={`ml-2 text-xs ${getCategoryColor(test.category)}`}>
                    [{test.category}]
                  </span>
                )}
              </div>
              {test.duration && (
                <span className="text-xs text-penguin-elements-textSecondary">
                  {test.duration}ms
                </span>
              )}
            </motion.div>
          ))}
        </div>

        {/* Error Display */}
        {tests.some(t => t.status === 'failed' && t.error) && (
          <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded">
            <div className="text-xs text-red-400 font-mono">
              {tests.find(t => t.status === 'failed' && t.error)?.error}
            </div>
          </div>
        )}

        {/* Status Message */}
        <div className="mt-3 text-center text-sm">
          {isRunning ? (
            <span className="text-penguin-elements-textSecondary">
              Running backend tests to ensure quality...
            </span>
          ) : failedTests === 0 && passedTests === totalTests ? (
            <span className="text-green-500 font-semibold">
              ✅ All tests passed! Backend is ready.
            </span>
          ) : failedTests > 0 ? (
            <span className="text-red-500">
              ❌ {failedTests} test{failedTests !== 1 ? 's' : ''} failed. Attempting fixes...
            </span>
          ) : (
            <span className="text-penguin-elements-textSecondary">
              Waiting to run tests...
            </span>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

TestStatus.displayName = 'TestStatus';