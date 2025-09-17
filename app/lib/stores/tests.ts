import { atom, map } from 'nanostores';
import type { TestReport } from '~/lib/agents/base/TestAgent';
import type { TestAction } from '~/types/actions';

export interface TestState {
  isRunning: boolean;
  currentTest?: TestAction;
  reports: TestReport[];
  showResults: boolean;
  selectedReportIndex: number;
}

// Store for test reports
export const testReports = map<Record<string, TestReport>>({});

// Store for test UI state  
export const testState = atom<TestState>({
  isRunning: false,
  reports: [],
  showResults: false,
  selectedReportIndex: -1,
});

// Store for test progress
export const testProgress = atom<{
  current: number;
  total: number;
  message: string;
}>({
  current: 0,
  total: 0,
  message: '',
});

// Actions
export function addTestReport(id: string, report: TestReport) {
  testReports.setKey(id, report);
  
  // Update state with new report
  const currentState = testState.get();
  testState.set({
    ...currentState,
    reports: [...currentState.reports, report],
    showResults: true,
  });
}

export function clearTestReports() {
  testReports.set({});
  testState.set({
    isRunning: false,
    reports: [],
    showResults: false,
    selectedReportIndex: -1,
  });
}

export function setTestRunning(isRunning: boolean, currentTest?: TestAction) {
  const currentState = testState.get();
  testState.set({
    ...currentState,
    isRunning,
    currentTest,
  });
}

export function toggleTestResults() {
  const currentState = testState.get();
  testState.set({
    ...currentState,
    showResults: !currentState.showResults,
  });
}

export function selectTestReport(index: number) {
  const currentState = testState.get();
  testState.set({
    ...currentState,
    selectedReportIndex: index,
  });
}

export function updateTestProgress(current: number, total: number, message: string) {
  testProgress.set({ current, total, message });
}

// Helpers
export function getTestSummary(): {
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  passRate: number;
} {
  const reports = Object.values(testReports.get());
  
  const totalTests = reports.reduce((sum, r) => sum + r.summary.total, 0);
  const totalPassed = reports.reduce((sum, r) => sum + r.summary.passed, 0);
  const totalFailed = reports.reduce((sum, r) => sum + r.summary.failed, 0);
  const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

  return {
    totalTests,
    totalPassed,
    totalFailed,
    passRate,
  };
}

export function hasFailingTests(): boolean {
  const reports = Object.values(testReports.get());
  return reports.some(r => r.summary.failed > 0);
}

export function getLatestReport(): TestReport | undefined {
  const reports = Object.values(testReports.get());
  return reports[reports.length - 1];
}