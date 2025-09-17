import { TestAgent, type TestContext, type TestReport } from '../base/TestAgent';
import type { TestAction, TestResult } from '~/types/actions';

export class PerformanceTestAgent extends TestAgent {
  constructor() {
    super('PerformanceTest');
  }

  canHandle(action: TestAction): boolean {
    return action.testType === 'performance';
  }

  async execute(context: TestContext, action: TestAction): Promise<TestReport> {
    this.logger.info('Starting performance tests');
    const startTime = performance.now();
    const results: TestResult[] = [];

    try {
      // Run performance tests
      results.push(await this.testLoadTime(context));
      results.push(await this.testResourceSizes(context));
      results.push(await this.testCaching(context));
      results.push(await this.testCompression(context));
      results.push(await this.testResourceCount(context));

    } catch (error) {
      this.logger.error('Performance test failed:', error);
      results.push({
        testName: 'Performance Test Suite',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const duration = performance.now() - startTime;
    return this.createReport(results, duration, {
      url: context.previewUrl,
      testType: 'performance',
    });
  }

  private async testLoadTime(context: TestContext): Promise<TestResult> {
    const loadStart = performance.now();
    
    try {
      const response = await fetch(context.previewUrl);
      await response.text();
      const loadTime = performance.now() - loadStart;

      const threshold = context.config?.loadTimeThreshold || 3000;

      if (loadTime > threshold) {
        return {
          testName: 'Page Load Time',
          status: 'failed',
          error: `Load time ${loadTime.toFixed(2)}ms exceeds ${threshold}ms threshold`,
          details: {
            loadTime,
            threshold,
          },
        };
      }

      return {
        testName: 'Page Load Time',
        status: 'passed',
        details: {
          loadTime,
          threshold,
          message: `Page loaded in ${loadTime.toFixed(2)}ms`,
        },
      };
    } catch (error) {
      return {
        testName: 'Page Load Time',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to measure load time',
      };
    }
  }

  private async testResourceSizes(context: TestContext): Promise<TestResult> {
    try {
      const response = await fetch(context.previewUrl);
      const html = await response.text();
      const htmlSize = new Blob([html]).size;

      // Check HTML size
      const maxHtmlSize = context.config?.maxHtmlSize || 100000; // 100KB
      
      if (htmlSize > maxHtmlSize) {
        return {
          testName: 'Resource Sizes',
          status: 'warning',
          error: `HTML size ${(htmlSize / 1024).toFixed(2)}KB exceeds recommended ${(maxHtmlSize / 1024).toFixed(2)}KB`,
          details: {
            htmlSize,
            maxHtmlSize,
          },
        };
      }

      return {
        testName: 'Resource Sizes',
        status: 'passed',
        details: {
          htmlSize,
          maxHtmlSize,
          message: `HTML size: ${(htmlSize / 1024).toFixed(2)}KB`,
        },
      };
    } catch (error) {
      return {
        testName: 'Resource Sizes',
        status: 'skipped',
        details: { reason: 'Could not measure resource sizes' },
      };
    }
  }

  private async testCaching(context: TestContext): Promise<TestResult> {
    try {
      const response = await fetch(context.previewUrl);
      const cacheControl = response.headers.get('cache-control');
      const etag = response.headers.get('etag');
      const lastModified = response.headers.get('last-modified');

      const hasCaching = cacheControl || etag || lastModified;

      return {
        testName: 'Caching Headers',
        status: hasCaching ? 'passed' : 'warning',
        details: {
          cacheControl,
          etag,
          lastModified,
          message: hasCaching
            ? 'Caching headers are present'
            : 'Consider adding caching headers for better performance',
        },
      };
    } catch (error) {
      return {
        testName: 'Caching Headers',
        status: 'skipped',
        details: { reason: 'Could not check caching headers' },
      };
    }
  }

  private async testCompression(context: TestContext): Promise<TestResult> {
    try {
      const response = await fetch(context.previewUrl, {
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });
      
      const contentEncoding = response.headers.get('content-encoding');
      const hasCompression = contentEncoding && ['gzip', 'deflate', 'br'].includes(contentEncoding);

      return {
        testName: 'Compression',
        status: hasCompression ? 'passed' : 'warning',
        details: {
          contentEncoding,
          message: hasCompression
            ? `Response is compressed with ${contentEncoding}`
            : 'Consider enabling compression for better performance',
        },
      };
    } catch (error) {
      return {
        testName: 'Compression',
        status: 'skipped',
        details: { reason: 'Could not check compression' },
      };
    }
  }

  private async testResourceCount(context: TestContext): Promise<TestResult> {
    try {
      const response = await fetch(context.previewUrl);
      const html = await response.text();
      
      // Count resources
      const scripts = (html.match(/<script[^>]*>/gi) || []).length;
      const stylesheets = (html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) || []).length;
      const images = (html.match(/<img[^>]*>/gi) || []).length;
      
      const totalResources = scripts + stylesheets + images;
      const maxResources = context.config?.maxResources || 50;

      if (totalResources > maxResources) {
        return {
          testName: 'Resource Count',
          status: 'warning',
          error: `${totalResources} resources exceed recommended ${maxResources}`,
          details: {
            scripts,
            stylesheets,
            images,
            totalResources,
            maxResources,
          },
        };
      }

      return {
        testName: 'Resource Count',
        status: 'passed',
        details: {
          scripts,
          stylesheets,
          images,
          totalResources,
          maxResources,
          message: `Total resources: ${totalResources}`,
        },
      };
    } catch (error) {
      return {
        testName: 'Resource Count',
        status: 'skipped',
        details: { reason: 'Could not count resources' },
      };
    }
  }

  protected generateSuggestions(results: TestResult[]): string[] {
    const suggestions = super.generateSuggestions(results);
    const failures = results.filter(r => r.status === 'failed' || r.status === 'warning');

    for (const failure of failures) {
      switch (failure.testName) {
        case 'Page Load Time':
          suggestions.push('Optimize images and use appropriate formats (WebP, AVIF)');
          suggestions.push('Minimize JavaScript and CSS bundle sizes');
          suggestions.push('Use code splitting and lazy loading');
          break;
        case 'Resource Sizes':
          suggestions.push('Minify HTML, CSS, and JavaScript files');
          suggestions.push('Remove unused code and dependencies');
          break;
        case 'Caching Headers':
          suggestions.push('Add Cache-Control headers for static assets');
          suggestions.push('Implement ETags for dynamic content');
          break;
        case 'Compression':
          suggestions.push('Enable gzip or Brotli compression on the server');
          suggestions.push('Compress text-based resources (HTML, CSS, JS)');
          break;
        case 'Resource Count':
          suggestions.push('Combine multiple CSS/JS files');
          suggestions.push('Use CSS sprites for small images');
          suggestions.push('Lazy load images below the fold');
          break;
      }
    }

    return [...new Set(suggestions)];
  }
}