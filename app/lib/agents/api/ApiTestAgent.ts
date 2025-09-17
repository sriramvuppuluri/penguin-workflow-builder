import { TestAgent, type TestContext, type TestReport } from '../base/TestAgent';
import type { TestAction, TestResult } from '~/types/actions';

export class ApiTestAgent extends TestAgent {
  constructor() {
    super('ApiTest');
  }

  canHandle(action: TestAction): boolean {
    return action.testType === 'api';
  }

  async execute(context: TestContext, action: TestAction): Promise<TestReport> {
    this.logger.info('Starting API tests');
    const startTime = performance.now();
    const results: TestResult[] = [];

    try {
      // Test API endpoints
      const endpoints = action.config?.endpoints || [
        { path: '/api/health', method: 'GET' },
        { path: '/api/status', method: 'GET' },
      ];

      for (const endpoint of endpoints) {
        results.push(await this.testEndpoint(context, endpoint));
      }

      // Test response times
      results.push(await this.testResponseTimes(context, endpoints));

      // Test error handling
      results.push(await this.testErrorHandling(context));

    } catch (error) {
      this.logger.error('API test failed:', error);
      results.push({
        testName: 'API Test Suite',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const duration = performance.now() - startTime;
    return this.createReport(results, duration, {
      baseUrl: context.previewUrl,
      testType: 'api',
    });
  }

  private async testEndpoint(context: TestContext, endpoint: any): Promise<TestResult> {
    try {
      const url = `${context.previewUrl}${endpoint.path}`;
      const response = await fetch(url, {
        method: endpoint.method || 'GET',
        headers: endpoint.headers || {},
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
      });

      if (response.ok) {
        return {
          testName: `API ${endpoint.method} ${endpoint.path}`,
          status: 'passed',
          details: {
            statusCode: response.status,
            contentType: response.headers.get('content-type'),
          },
        };
      } else {
        return {
          testName: `API ${endpoint.method} ${endpoint.path}`,
          status: 'failed',
          error: `Endpoint returned status ${response.status}`,
          details: {
            statusCode: response.status,
            statusText: response.statusText,
          },
        };
      }
    } catch (error) {
      return {
        testName: `API ${endpoint.method} ${endpoint.path}`,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Request failed',
      };
    }
  }

  private async testResponseTimes(context: TestContext, endpoints: any[]): Promise<TestResult> {
    const timings: number[] = [];
    
    for (const endpoint of endpoints.slice(0, 3)) {
      const start = performance.now();
      try {
        await fetch(`${context.previewUrl}${endpoint.path}`);
        timings.push(performance.now() - start);
      } catch {
        // Ignore errors for timing test
      }
    }

    const avgTime = timings.length > 0 
      ? timings.reduce((a, b) => a + b, 0) / timings.length 
      : 0;

    if (avgTime > 1000) {
      return {
        testName: 'API Response Times',
        status: 'failed',
        error: `Average response time ${avgTime.toFixed(2)}ms exceeds 1000ms threshold`,
        details: { timings, average: avgTime },
      };
    }

    return {
      testName: 'API Response Times',
      status: 'passed',
      details: {
        timings,
        average: avgTime,
        message: `Average response time: ${avgTime.toFixed(2)}ms`,
      },
    };
  }

  private async testErrorHandling(context: TestContext): Promise<TestResult> {
    try {
      // Test 404 handling
      const response = await fetch(`${context.previewUrl}/api/non-existent-endpoint`);
      
      if (response.status === 404) {
        return {
          testName: 'API Error Handling',
          status: 'passed',
          details: {
            message: 'API properly handles 404 errors',
          },
        };
      } else {
        return {
          testName: 'API Error Handling',
          status: 'failed',
          error: 'API does not properly handle 404 errors',
          details: {
            receivedStatus: response.status,
          },
        };
      }
    } catch (error) {
      return {
        testName: 'API Error Handling',
        status: 'skipped',
        details: { reason: 'Could not test error handling' },
      };
    }
  }
}