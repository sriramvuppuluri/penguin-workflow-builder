import React from 'react';
import { useStore } from '@nanostores/react';
import { testState } from '~/lib/stores/tests';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';

export const TestButton: React.FC = () => {
  const { isRunning } = useStore(testState);

  const runTests = (type: 'browser' | 'api' | 'accessibility' | 'performance') => {
    if (!isRunning) {
      workbenchStore.runTests(type);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => runTests('browser')}
        disabled={isRunning}
        className={classNames(
          'px-3 py-1 rounded text-sm font-medium transition-colors',
          isRunning
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        )}
        title="Run browser tests to check DOM, JavaScript errors, and links"
      >
        {isRunning ? (
          <>
            <span className="animate-spin inline-block mr-1">⚙️</span>
            Testing...
          </>
        ) : (
          <>
            <span className="mr-1">🧪</span>
            Test App
          </>
        )}
      </button>

      {!isRunning && (
        <div className="flex gap-1">
          <button
            onClick={() => runTests('accessibility')}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Run accessibility tests"
          >
            ♿
          </button>
          <button
            onClick={() => runTests('performance')}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Run performance tests"
          >
            ⚡
          </button>
          <button
            onClick={() => runTests('api')}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Run API tests"
          >
            🔌
          </button>
        </div>
      )}
    </div>
  );
};