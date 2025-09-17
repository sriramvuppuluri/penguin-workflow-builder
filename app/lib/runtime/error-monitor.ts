import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('ErrorMonitor');

export interface CompilationError {
  type: 'syntax' | 'import' | 'typescript' | 'runtime' | 'build';
  file: string;
  line?: number;
  column?: number;
  message: string;
  rawError: string;
  suggestion?: string;
  timestamp: number;
}

export class ErrorMonitor {
  private static instance: ErrorMonitor;
  private errorBuffer: CompilationError[] = [];
  private errorPatterns = {
    // Vite/Babel errors
    viteError: /\[plugin:vite:.*?\]/,
    // Syntax errors with file location
    syntaxError: /(.+?):(\d+):(\d+)[\s\S]*?(SyntaxError|Unexpected token|Unexpected identifier)/,
    // Import errors
    importError: /Cannot find module|Module not found|Failed to resolve import/,
    // TypeScript errors
    tsError: /TS\d+:/,
    // General compilation errors
    compilationError: /Failed to compile|Compilation failed|Build failed/,
    // React specific errors
    reactError: /Invalid hook call|Hooks can only be called/,
    // Missing dependencies
    missingDep: /Cannot resolve '(.+?)'/,
  };

  static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor();
    }
    return ErrorMonitor.instance;
  }

  /**
   * Monitor output stream for compilation errors
   */
  monitorOutput(output: string): CompilationError[] {
    const detectedErrors: CompilationError[] = [];

    // Check for Vite/Babel errors with file location
    const viteErrorMatch = output.match(/\[plugin:vite:.*?\]\s+(.+?):(\d+):(\d+)[\s\S]*?$/m);
    if (viteErrorMatch) {
      const [, file, line, column] = viteErrorMatch;
      const errorMessage = this.extractErrorMessage(output, parseInt(line));
      
      detectedErrors.push({
        type: 'syntax',
        file: file.replace(/^\/home\/project/, ''),
        line: parseInt(line),
        column: parseInt(column),
        message: errorMessage,
        rawError: output,
        suggestion: this.generateSuggestion(errorMessage, output),
        timestamp: Date.now(),
      });
    }

    // Check for TypeScript errors
    const tsErrorMatch = output.match(/(.*?)\((\d+),(\d+)\):\s+error\s+TS(\d+):\s+(.+)/);
    if (tsErrorMatch) {
      const [, file, line, column, errorCode, message] = tsErrorMatch;
      detectedErrors.push({
        type: 'typescript',
        file: file.replace(/^\/home\/project/, ''),
        line: parseInt(line),
        column: parseInt(column),
        message: `TS${errorCode}: ${message}`,
        rawError: output,
        suggestion: this.generateTypeScriptSuggestion(errorCode, message),
        timestamp: Date.now(),
      });
    }

    // Check for import errors
    if (this.errorPatterns.importError.test(output)) {
      const moduleMatch = output.match(/Cannot resolve '(.+?)'/);
      const fileMatch = output.match(/in '(.+?)'/);
      
      detectedErrors.push({
        type: 'import',
        file: fileMatch ? fileMatch[1].replace(/^\/home\/project/, '') : 'unknown',
        message: `Import error: ${moduleMatch ? moduleMatch[1] : 'module'} not found`,
        rawError: output,
        suggestion: 'Check that the import path is correct and the module is installed',
        timestamp: Date.now(),
      });
    }

    // Add to buffer and return
    this.errorBuffer.push(...detectedErrors);
    return detectedErrors;
  }

  /**
   * Extract the actual error message from the output
   */
  private extractErrorMessage(output: string, lineNumber?: number): string {
    const lines = output.split('\n');
    
    // Look for common error indicators
    for (const line of lines) {
      if (line.includes('Unexpected token')) {
        return 'Syntax Error: Unexpected token - likely missing closing bracket, parenthesis, or incomplete statement';
      }
      if (line.includes('Unexpected identifier')) {
        return 'Syntax Error: Unexpected identifier - check for missing commas or operators';
      }
      if (line.includes('Declaration or statement expected')) {
        return 'Syntax Error: Declaration or statement expected - check for incomplete code blocks';
      }
    }

    // Extract context around the error line if available
    if (lineNumber && lines.length > lineNumber) {
      const errorLine = lines[lineNumber - 1];
      return `Error at line ${lineNumber}: ${errorLine.trim()}`;
    }

    return 'Compilation error detected';
  }

  /**
   * Generate suggestions based on error type
   */
  private generateSuggestion(errorMessage: string, fullError: string): string {
    // Check for incomplete import
    if (fullError.includes('import') && fullError.includes('Unexpected token')) {
      return 'Complete the import statement. Ensure all imported items are listed and the statement ends with a proper source module.';
    }

    // Check for missing closing brackets
    if (errorMessage.includes('closing')) {
      return 'Add the missing closing bracket, brace, or parenthesis.';
    }

    // Check for JSX errors
    if (fullError.includes('JSX')) {
      return 'Check JSX syntax - ensure all tags are properly closed and attributes are correctly formatted.';
    }

    return 'Review the syntax at the specified line and fix any formatting issues.';
  }

  /**
   * Generate TypeScript-specific suggestions
   */
  private generateTypeScriptSuggestion(errorCode: string, message: string): string {
    const suggestions: Record<string, string> = {
      '2307': 'Install the missing module or check the import path',
      '2304': 'Define the variable or import it from the appropriate module',
      '2339': 'Check if the property exists on the type or add it to the interface',
      '2345': 'Fix the type mismatch - ensure the argument types match the expected parameters',
      '2322': 'Fix the type assignment - the types are not compatible',
    };

    return suggestions[errorCode] || 'Fix the TypeScript error based on the message';
  }

  /**
   * Get all errors from buffer
   */
  getErrors(): CompilationError[] {
    return [...this.errorBuffer];
  }

  /**
   * Clear error buffer
   */
  clearErrors(): void {
    this.errorBuffer = [];
  }

  /**
   * Get latest error
   */
  getLatestError(): CompilationError | null {
    return this.errorBuffer[this.errorBuffer.length - 1] || null;
  }

  /**
   * Check if there are any critical errors
   */
  hasCriticalErrors(): boolean {
    return this.errorBuffer.some(error => 
      error.type === 'syntax' || error.type === 'build'
    );
  }

  /**
   * Format errors for display
   */
  formatErrorsForDisplay(): string {
    if (this.errorBuffer.length === 0) {
      return 'No errors detected';
    }

    return this.errorBuffer.map(error => {
      const location = error.line ? ` at line ${error.line}${error.column ? `:${error.column}` : ''}` : '';
      return `❌ ${error.type.toUpperCase()} Error in ${error.file}${location}\n   ${error.message}${error.suggestion ? `\n   💡 Suggestion: ${error.suggestion}` : ''}`;
    }).join('\n\n');
  }

  /**
   * Format errors for LLM consumption
   */
  formatErrorsForLLM(): string {
    if (this.errorBuffer.length === 0) {
      return '';
    }

    const errorReport = [
      '## Compilation Errors Detected',
      '',
      'The following errors were detected during compilation. Please fix them:',
      '',
    ];

    this.errorBuffer.forEach((error, index) => {
      errorReport.push(`### Error ${index + 1}: ${error.type.toUpperCase()} Error`);
      errorReport.push(`**File:** ${error.file}`);
      if (error.line) {
        errorReport.push(`**Location:** Line ${error.line}${error.column ? `, Column ${error.column}` : ''}`);
      }
      errorReport.push(`**Message:** ${error.message}`);
      if (error.suggestion) {
        errorReport.push(`**Suggestion:** ${error.suggestion}`);
      }
      errorReport.push('');
      errorReport.push('**Raw Error Output:**');
      errorReport.push('```');
      errorReport.push(error.rawError.substring(0, 500)); // Limit raw error length
      errorReport.push('```');
      errorReport.push('');
    });

    errorReport.push('Please analyze these errors and fix them in the appropriate files.');
    
    return errorReport.join('\n');
  }
}