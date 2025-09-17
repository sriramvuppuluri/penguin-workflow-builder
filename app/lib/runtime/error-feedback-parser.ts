import type { CompilationError } from './error-monitor';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('ErrorFeedbackParser');

const ERROR_RESULT_TAG_OPEN = '<boltCompilationError';
const ERROR_RESULT_TAG_CLOSE = '</boltCompilationError>';
const ERROR_FEEDBACK_TAG_OPEN = '<boltErrorFeedback';
const ERROR_FEEDBACK_TAG_CLOSE = '</boltErrorFeedback>';

export interface ErrorFeedbackData {
  errors: CompilationError[];
  formattedMessage: string;
  llmPrompt: string;
  severity: 'warning' | 'error' | 'critical';
  timestamp: number;
}

export class ErrorFeedbackParser {
  /**
   * Parse compilation errors and generate structured feedback for LLM
   */
  static generateFeedback(errors: CompilationError[]): ErrorFeedbackData {
    const severity = this.calculateSeverity(errors);
    const formattedMessage = this.formatErrorsForDisplay(errors);
    const llmPrompt = this.generateLLMPrompt(errors);

    return {
      errors,
      formattedMessage,
      llmPrompt,
      severity,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate severity based on error types
   */
  private static calculateSeverity(errors: CompilationError[]): 'warning' | 'error' | 'critical' {
    const hasSyntaxError = errors.some(e => e.type === 'syntax');
    const hasBuildError = errors.some(e => e.type === 'build');
    
    if (hasBuildError || hasSyntaxError) {
      return 'critical';
    } else if (errors.length > 3) {
      return 'error';
    } else {
      return 'warning';
    }
  }

  /**
   * Format errors for display in UI
   */
  private static formatErrorsForDisplay(errors: CompilationError[]): string {
    const lines: string[] = [];
    
    // Header
    lines.push(`## Compilation Errors Detected`);
    lines.push('');
    
    // Summary
    lines.push(`### ${errors.length} Error${errors.length !== 1 ? 's' : ''} Found`);
    lines.push('');

    // Group errors by file
    const errorsByFile = new Map<string, CompilationError[]>();
    errors.forEach(error => {
      if (!errorsByFile.has(error.file)) {
        errorsByFile.set(error.file, []);
      }
      errorsByFile.get(error.file)!.push(error);
    });

    // Display errors grouped by file
    errorsByFile.forEach((fileErrors, file) => {
      lines.push(`#### 📄 ${file}`);
      fileErrors.forEach(error => {
        const location = error.line ? ` at line ${error.line}${error.column ? `:${error.column}` : ''}` : '';
        lines.push(`\n❌ **${error.type.toUpperCase()} Error**${location}`);
        lines.push(`   ${error.message}`);
        if (error.suggestion) {
          lines.push(`   💡 **Suggestion:** ${error.suggestion}`);
        }
      });
      lines.push('');
    });

    // Action required
    lines.push('### Action Required');
    lines.push('The AI will automatically attempt to fix these errors.');
    
    return lines.join('\n');
  }

  /**
   * Generate LLM prompt based on compilation errors
   */
  private static generateLLMPrompt(errors: CompilationError[]): string {
    const lines: string[] = [
      '## Compilation Errors Auto-Fix Required',
      '',
      'The following compilation errors were detected when starting the development server. Please fix them immediately:',
      '',
    ];

    // Group errors by file for organized fixing
    const errorsByFile = new Map<string, CompilationError[]>();
    errors.forEach(error => {
      if (!errorsByFile.has(error.file)) {
        errorsByFile.set(error.file, []);
      }
      errorsByFile.get(error.file)!.push(error);
    });

    // Generate detailed error information for each file
    errorsByFile.forEach((fileErrors, file) => {
      lines.push(`### File: ${file}`);
      lines.push('');
      
      fileErrors.forEach((error, index) => {
        lines.push(`#### Error ${index + 1}: ${error.type.toUpperCase()}`);
        if (error.line) {
          lines.push(`**Location:** Line ${error.line}${error.column ? `, Column ${error.column}` : ''}`);
        }
        lines.push(`**Error Message:** ${error.message}`);
        
        if (error.suggestion) {
          lines.push(`**Suggested Fix:** ${error.suggestion}`);
        }
        
        // Add specific instructions based on error type
        lines.push('**Fix Instructions:**');
        lines.push(...this.getFixInstructions(error));
        lines.push('');
        
        // Include part of the raw error for context
        if (error.rawError) {
          lines.push('**Raw Error Context:**');
          lines.push('```');
          lines.push(error.rawError.substring(0, 300));
          lines.push('```');
          lines.push('');
        }
      });
    });

    // Add general instructions
    lines.push('## Instructions for Fixing:');
    lines.push('1. Read each error carefully and understand what is wrong');
    lines.push('2. Navigate to the specified file and line number');
    lines.push('3. Apply the appropriate fix based on the error type');
    lines.push('4. Ensure the fix maintains code functionality');
    lines.push('5. Verify no new errors are introduced');
    lines.push('');
    lines.push('Please fix these errors now to ensure the application can run properly.');

    return lines.join('\n');
  }

  /**
   * Get specific fix instructions based on error type
   */
  private static getFixInstructions(error: CompilationError): string[] {
    const instructions: string[] = [];

    switch (error.type) {
      case 'syntax':
        if (error.message.includes('Unexpected token')) {
          instructions.push('- Check for missing closing brackets, braces, or parentheses');
          instructions.push('- Verify all statements are properly terminated');
          instructions.push('- Ensure JSX tags are properly closed');
        } else if (error.message.includes('Declaration or statement expected')) {
          instructions.push('- Complete any incomplete code blocks');
          instructions.push('- Check for missing return statements');
          instructions.push('- Verify function bodies are properly defined');
        } else if (error.message.includes('incomplete')) {
          instructions.push('- Complete the import statement with all necessary items');
          instructions.push('- Ensure the import path is correct and complete');
          instructions.push('- Add the missing module source');
        }
        break;

      case 'import':
        instructions.push('- Verify the import path is correct');
        instructions.push('- Check if the module is installed in package.json');
        instructions.push('- Ensure the file extension is correct (.ts, .tsx, .js, .jsx)');
        instructions.push('- Use relative paths starting with ./ or ../');
        break;

      case 'typescript':
        instructions.push('- Fix type mismatches or missing type definitions');
        instructions.push('- Add appropriate type annotations');
        instructions.push('- Ensure interfaces and types are properly defined');
        instructions.push('- Check for any undefined variables or properties');
        break;

      case 'runtime':
        instructions.push('- Check for undefined variables or functions');
        instructions.push('- Verify all dependencies are properly imported');
        instructions.push('- Ensure async/await is used correctly');
        break;

      case 'build':
        instructions.push('- Review build configuration');
        instructions.push('- Check for circular dependencies');
        instructions.push('- Verify all required files exist');
        break;

      default:
        instructions.push('- Review the error message carefully');
        instructions.push('- Apply the suggested fix if available');
        instructions.push('- Ensure code syntax is correct');
    }

    return instructions;
  }

  /**
   * Parse error feedback from LLM message
   */
  static parseErrorFeedback(message: string): ErrorFeedbackData | null {
    const startIndex = message.indexOf(ERROR_RESULT_TAG_OPEN);
    const endIndex = message.indexOf(ERROR_RESULT_TAG_CLOSE);

    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    try {
      const xmlContent = message.substring(
        startIndex,
        endIndex + ERROR_RESULT_TAG_CLOSE.length
      );

      // Extract content
      const contentStart = xmlContent.indexOf('>') + 1;
      const contentEnd = xmlContent.lastIndexOf('<');
      const content = xmlContent.substring(contentStart, contentEnd);

      // Parse JSON content
      const feedbackData = JSON.parse(content) as ErrorFeedbackData;
      return feedbackData;
    } catch (error) {
      logger.error('Failed to parse error feedback:', error);
      return null;
    }
  }

  /**
   * Format error feedback for inclusion in LLM message
   */
  static formatForMessage(errors: CompilationError[]): string {
    const feedbackData = this.generateFeedback(errors);
    return `${ERROR_RESULT_TAG_OPEN}>
${JSON.stringify(feedbackData, null, 2)}
${ERROR_RESULT_TAG_CLOSE}`;
  }

  /**
   * Create a user-friendly error summary
   */
  static createErrorSummary(errors: CompilationError[]): string {
    const errorTypes = new Map<string, number>();
    errors.forEach(error => {
      errorTypes.set(error.type, (errorTypes.get(error.type) || 0) + 1);
    });

    const summary: string[] = [];
    errorTypes.forEach((count, type) => {
      summary.push(`${count} ${type} error${count !== 1 ? 's' : ''}`);
    });

    return summary.join(', ');
  }

  /**
   * Check if errors are auto-fixable
   */
  static areErrorsAutoFixable(errors: CompilationError[]): boolean {
    // Most syntax and import errors are auto-fixable
    return errors.every(error => 
      error.type === 'syntax' || 
      error.type === 'import' || 
      error.type === 'typescript'
    );
  }

  /**
   * Extract context for error fixing
   */
  static extractErrorContext(errors: CompilationError[]): string {
    const lines: string[] = [
      'Error Context for Auto-Fix:',
      '===========================',
      '',
    ];

    // Statistics
    lines.push(`Total Errors: ${errors.length}`);
    
    // Group by type
    const errorsByType = new Map<string, CompilationError[]>();
    errors.forEach(error => {
      if (!errorsByType.has(error.type)) {
        errorsByType.set(error.type, []);
      }
      errorsByType.get(error.type)!.push(error);
    });

    lines.push('');
    lines.push('Error Distribution:');
    errorsByType.forEach((typeErrors, type) => {
      lines.push(`- ${type.toUpperCase()}: ${typeErrors.length} error(s)`);
    });

    // Files affected
    const filesAffected = new Set(errors.map(e => e.file));
    lines.push('');
    lines.push(`Files Affected: ${filesAffected.size}`);
    filesAffected.forEach(file => {
      lines.push(`- ${file}`);
    });

    return lines.join('\n');
  }
}