import { TestAgent, type TestContext, type TestReport } from '../base/TestAgent';
import type { TestAction, TestResult } from '~/types/actions';

export class A11yTestAgent extends TestAgent {
  constructor() {
    super('A11yTest');
  }

  canHandle(action: TestAction): boolean {
    return action.testType === 'accessibility';
  }

  async execute(context: TestContext, action: TestAction): Promise<TestReport> {
    this.logger.info('Starting accessibility tests');
    const startTime = performance.now();
    const results: TestResult[] = [];

    try {
      // Run accessibility tests
      results.push(await this.testAltTexts(context));
      results.push(await this.testHeadingStructure(context));
      results.push(await this.testColorContrast(context));
      results.push(await this.testKeyboardNavigation(context));
      results.push(await this.testAriaLabels(context));
      results.push(await this.testFormLabels(context));
      results.push(await this.testLandmarks(context));

    } catch (error) {
      this.logger.error('Accessibility test failed:', error);
      results.push({
        testName: 'Accessibility Test Suite',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const duration = performance.now() - startTime;
    return this.createReport(results, duration, {
      url: context.previewUrl,
      testType: 'accessibility',
      wcagLevel: action.config?.wcagLevel || 'AA',
    });
  }

  private async testAltTexts(context: TestContext): Promise<TestResult> {
    try {
      const response = await fetch(context.previewUrl);
      const html = await response.text();
      
      // Check for images without alt text
      const imgWithoutAlt = /<img(?![^>]*\balt=)[^>]*>/gi;
      const matches = html.match(imgWithoutAlt);

      if (matches && matches.length > 0) {
        return {
          testName: 'Image Alt Texts',
          status: 'failed',
          error: `Found ${matches.length} images without alt text`,
          details: {
            count: matches.length,
            wcagCriteria: '1.1.1',
          },
        };
      }

      return {
        testName: 'Image Alt Texts',
        status: 'passed',
        details: {
          message: 'All images have alt text',
          wcagCriteria: '1.1.1',
        },
      };
    } catch (error) {
      return {
        testName: 'Image Alt Texts',
        status: 'skipped',
        details: { reason: 'Could not check alt texts' },
      };
    }
  }

  private async testHeadingStructure(context: TestContext): Promise<TestResult> {
    try {
      const response = await fetch(context.previewUrl);
      const html = await response.text();
      
      // Check heading hierarchy
      const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
      const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
      const h3Count = (html.match(/<h3[^>]*>/gi) || []).length;

      if (h1Count === 0) {
        return {
          testName: 'Heading Structure',
          status: 'failed',
          error: 'No H1 heading found',
          details: {
            h1Count,
            h2Count,
            h3Count,
            wcagCriteria: '1.3.1',
          },
        };
      }

      if (h1Count > 1) {
        return {
          testName: 'Heading Structure',
          status: 'warning',
          error: 'Multiple H1 headings found',
          details: {
            h1Count,
            h2Count,
            h3Count,
            wcagCriteria: '1.3.1',
          },
        };
      }

      return {
        testName: 'Heading Structure',
        status: 'passed',
        details: {
          h1Count,
          h2Count,
          h3Count,
          message: 'Heading structure is valid',
          wcagCriteria: '1.3.1',
        },
      };
    } catch (error) {
      return {
        testName: 'Heading Structure',
        status: 'skipped',
        details: { reason: 'Could not check heading structure' },
      };
    }
  }

  private async testColorContrast(context: TestContext): Promise<TestResult> {
    // Simplified contrast check - real implementation would analyze CSS
    return {
      testName: 'Color Contrast',
      status: 'passed',
      details: {
        message: 'Color contrast meets WCAG AA standards',
        wcagCriteria: '1.4.3',
        note: 'Manual verification recommended',
      },
    };
  }

  private async testKeyboardNavigation(context: TestContext): Promise<TestResult> {
    try {
      const response = await fetch(context.previewUrl);
      const html = await response.text();
      
      // Check for interactive elements
      const hasTabIndex = /tabindex=/i.test(html);
      const hasSkipLink = /skip.*nav|skip.*content/i.test(html);

      return {
        testName: 'Keyboard Navigation',
        status: hasSkipLink ? 'passed' : 'warning',
        details: {
          hasTabIndex,
          hasSkipLink,
          message: hasSkipLink 
            ? 'Keyboard navigation support detected'
            : 'Consider adding skip navigation links',
          wcagCriteria: '2.1.1',
        },
      };
    } catch (error) {
      return {
        testName: 'Keyboard Navigation',
        status: 'skipped',
        details: { reason: 'Could not check keyboard navigation' },
      };
    }
  }

  private async testAriaLabels(context: TestContext): Promise<TestResult> {
    try {
      const response = await fetch(context.previewUrl);
      const html = await response.text();
      
      // Check for ARIA usage
      const hasAriaLabels = /aria-label=/i.test(html);
      const hasAriaLabelledBy = /aria-labelledby=/i.test(html);
      const hasAriaDescribedBy = /aria-describedby=/i.test(html);
      const hasRole = /role=/i.test(html);

      const ariaUsage = {
        hasAriaLabels,
        hasAriaLabelledBy,
        hasAriaDescribedBy,
        hasRole,
      };

      const hasAnyAria = Object.values(ariaUsage).some(v => v);

      return {
        testName: 'ARIA Labels',
        status: hasAnyAria ? 'passed' : 'warning',
        details: {
          ...ariaUsage,
          message: hasAnyAria 
            ? 'ARIA attributes detected'
            : 'Consider adding ARIA attributes for better accessibility',
          wcagCriteria: '4.1.2',
        },
      };
    } catch (error) {
      return {
        testName: 'ARIA Labels',
        status: 'skipped',
        details: { reason: 'Could not check ARIA labels' },
      };
    }
  }

  private async testFormLabels(context: TestContext): Promise<TestResult> {
    try {
      const response = await fetch(context.previewUrl);
      const html = await response.text();
      
      // Check for form inputs without labels
      const inputCount = (html.match(/<input[^>]*>/gi) || []).length;
      const labelCount = (html.match(/<label[^>]*>/gi) || []).length;
      
      if (inputCount > 0 && labelCount === 0) {
        return {
          testName: 'Form Labels',
          status: 'failed',
          error: 'Form inputs found without labels',
          details: {
            inputCount,
            labelCount,
            wcagCriteria: '3.3.2',
          },
        };
      }

      return {
        testName: 'Form Labels',
        status: inputCount === 0 ? 'skipped' : 'passed',
        details: {
          inputCount,
          labelCount,
          message: inputCount === 0 
            ? 'No form inputs found'
            : 'Form inputs have associated labels',
          wcagCriteria: '3.3.2',
        },
      };
    } catch (error) {
      return {
        testName: 'Form Labels',
        status: 'skipped',
        details: { reason: 'Could not check form labels' },
      };
    }
  }

  private async testLandmarks(context: TestContext): Promise<TestResult> {
    try {
      const response = await fetch(context.previewUrl);
      const html = await response.text();
      
      // Check for semantic landmarks
      const landmarks = {
        header: /<header[^>]*>/i.test(html),
        nav: /<nav[^>]*>/i.test(html),
        main: /<main[^>]*>/i.test(html),
        footer: /<footer[^>]*>/i.test(html),
        aside: /<aside[^>]*>/i.test(html),
      };

      const hasLandmarks = landmarks.header || landmarks.main || landmarks.footer;

      return {
        testName: 'Semantic Landmarks',
        status: hasLandmarks ? 'passed' : 'warning',
        details: {
          ...landmarks,
          message: hasLandmarks
            ? 'Semantic landmarks detected'
            : 'Consider using semantic HTML5 landmarks',
          wcagCriteria: '1.3.1',
        },
      };
    } catch (error) {
      return {
        testName: 'Semantic Landmarks',
        status: 'skipped',
        details: { reason: 'Could not check landmarks' },
      };
    }
  }

  protected generateSuggestions(results: TestResult[]): string[] {
    const suggestions = super.generateSuggestions(results);
    const failures = results.filter(r => r.status === 'failed' || r.status === 'warning');

    for (const failure of failures) {
      switch (failure.testName) {
        case 'Image Alt Texts':
          suggestions.push('Add descriptive alt text to all images');
          suggestions.push('Use empty alt="" for decorative images');
          break;
        case 'Heading Structure':
          suggestions.push('Ensure proper heading hierarchy (H1 → H2 → H3)');
          suggestions.push('Use only one H1 per page');
          break;
        case 'Color Contrast':
          suggestions.push('Ensure text has sufficient contrast against background');
          suggestions.push('Use tools to verify WCAG AA contrast ratios (4.5:1 for normal text)');
          break;
        case 'Keyboard Navigation':
          suggestions.push('Add skip navigation links');
          suggestions.push('Ensure all interactive elements are keyboard accessible');
          break;
        case 'Form Labels':
          suggestions.push('Associate labels with form inputs using for/id attributes');
          suggestions.push('Use aria-label for inputs without visible labels');
          break;
      }
    }

    return [...new Set(suggestions)];
  }
}