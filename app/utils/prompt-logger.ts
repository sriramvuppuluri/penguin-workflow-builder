import { Chalk } from 'chalk';
import fs from 'fs';
import path from 'path';

const chalk = new Chalk({ level: 3 });

interface PromptLogOptions {
  enabled: boolean;
  saveToFile: boolean;
  filePath?: string;
}

class PromptLogger {
  private options: PromptLogOptions;
  private logFile?: string;

  constructor() {
    this.options = {
      enabled: process.env.VITE_LOG_PROMPTS === 'true' || process.env.LOG_PROMPTS === 'true',
      saveToFile: process.env.VITE_SAVE_PROMPTS === 'true' || process.env.SAVE_PROMPTS === 'true',
      filePath: process.env.VITE_PROMPTS_LOG_PATH || process.env.PROMPTS_LOG_PATH
    };

    if (this.options.saveToFile && this.options.enabled) {
      this.initializeLogFile();
    }
  }

  private initializeLogFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logDir = this.options.filePath || path.join(process.cwd(), 'logs', 'prompts');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.logFile = path.join(logDir, `prompts-${timestamp}.log`);
    this.writeToFile(`=== Prompt Logging Started at ${new Date().toISOString()} ===\n\n`);
  }

  private writeToFile(content: string) {
    if (this.logFile && this.options.saveToFile) {
      fs.appendFileSync(this.logFile, content);
    }
  }

  private formatTimestamp(): string {
    return new Date().toISOString().substring(11, 23);
  }

  private truncateContent(content: string, maxLength: number = 500): string {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '... [truncated]';
  }

  logUserMessage(content: string, metadata?: any) {
    if (!this.options.enabled) return;

    const timestamp = this.formatTimestamp();
    const header = chalk.cyan(`\n[${timestamp}] USER MESSAGE`);
    const divider = chalk.gray('─'.repeat(80));

    console.log(header);
    console.log(divider);

    // Always show full content - no truncation
    console.log(chalk.white(content));
    
    if (metadata) {
      console.log(chalk.gray(`Metadata: ${JSON.stringify(metadata, null, 2)}`));
    }

    console.log(divider);

    if (this.options.saveToFile) {
      this.writeToFile(`\n[${timestamp}] USER MESSAGE\n${content}\n${JSON.stringify(metadata || {})}\n\n`);
    }
  }

  logSystemPrompt(prompt: string, metadata?: any) {
    if (!this.options.enabled) return;

    const timestamp = this.formatTimestamp();
    const header = chalk.yellow(`\n[${timestamp}] SYSTEM PROMPT`);
    const divider = chalk.gray('─'.repeat(80));

    console.log(header);
    console.log(divider);

    // Check if backend API is included
    const hasBackendAPI = prompt.includes('<backend_api_instructions>');
    if (hasBackendAPI) {
      console.log(chalk.green('✓ Backend API instructions included in prompt'));
    }

    console.log(chalk.gray(`Length: ${prompt.length} characters`));
    
    // Always show full prompt - no truncation
    console.log(chalk.white(prompt));
    
    if (metadata) {
      console.log(chalk.gray(`\nMetadata: ${JSON.stringify(metadata, null, 2)}`));
    }

    console.log(divider);

    if (this.options.saveToFile) {
      this.writeToFile(`\n[${timestamp}] SYSTEM PROMPT\n${prompt}\n${JSON.stringify(metadata || {})}\n\n`);
    }
  }

  logAssistantResponse(content: string, metadata?: any) {
    if (!this.options.enabled) return;

    const timestamp = this.formatTimestamp();
    const header = chalk.green(`\n[${timestamp}] ASSISTANT RESPONSE`);
    const divider = chalk.gray('─'.repeat(80));

    console.log(header);
    console.log(divider);

    // Always show full response - no truncation
    console.log(chalk.white(content));
    
    if (metadata) {
      console.log(chalk.gray(`\nMetadata: ${JSON.stringify(metadata, null, 2)}`));
    }

    console.log(divider);

    if (this.options.saveToFile) {
      this.writeToFile(`\n[${timestamp}] ASSISTANT RESPONSE\n${content}\n${JSON.stringify(metadata || {})}\n\n`);
    }
  }

  logStreamChunk(chunk: string) {
    if (!this.options.enabled) return;

    // Always log chunks for real-time streaming visibility
    process.stdout.write(chalk.green(chunk));

    if (this.options.saveToFile) {
      this.writeToFile(chunk);
    }
  }

  logError(error: any) {
    if (!this.options.enabled) return;

    const timestamp = this.formatTimestamp();
    const header = chalk.red(`\n[${timestamp}] ERROR`);
    const divider = chalk.gray('─'.repeat(80));

    console.log(header);
    console.log(divider);
    console.log(chalk.red(error.message || error));
    if (error.stack) {
      console.log(chalk.gray(error.stack));
    }
    console.log(divider);

    if (this.options.saveToFile) {
      this.writeToFile(`\n[${timestamp}] ERROR\n${error.message || error}\n${error.stack || ''}\n\n`);
    }
  }

  logTokenUsage(usage: any) {
    if (!this.options.enabled) return;

    const timestamp = this.formatTimestamp();
    const header = chalk.magenta(`\n[${timestamp}] TOKEN USAGE`);
    
    console.log(header);
    console.log(chalk.gray(`Completion: ${usage.completionTokens || 0}`));
    console.log(chalk.gray(`Prompt: ${usage.promptTokens || 0}`));
    console.log(chalk.gray(`Total: ${usage.totalTokens || 0}`));

    if (this.options.saveToFile) {
      this.writeToFile(`\n[${timestamp}] TOKEN USAGE\n${JSON.stringify(usage, null, 2)}\n\n`);
    }
  }

  logMessages(messages: any[]) {
    if (!this.options.enabled) return;

    const timestamp = this.formatTimestamp();
    const header = chalk.blue(`\n[${timestamp}] MESSAGE HISTORY (${messages.length} messages)`);
    const divider = chalk.gray('─'.repeat(80));

    console.log(header);
    console.log(divider);

    messages.forEach((msg, index) => {
      const role = msg.role?.toUpperCase() || 'UNKNOWN';
      const roleColor = role === 'USER' ? chalk.cyan : role === 'ASSISTANT' ? chalk.green : chalk.gray;
      
      console.log(roleColor(`[${index + 1}] ${role}:`));
      
      // Always show full message content - no truncation
      console.log(chalk.white(msg.content || ''));
    });

    console.log(divider);

    if (this.options.saveToFile) {
      this.writeToFile(`\n[${timestamp}] MESSAGE HISTORY\n${JSON.stringify(messages, null, 2)}\n\n`);
    }
  }

  isEnabled(): boolean {
    return this.options.enabled;
  }

  getLogFile(): string | undefined {
    return this.logFile;
  }
}

// Export singleton instance
export const promptLogger = new PromptLogger();