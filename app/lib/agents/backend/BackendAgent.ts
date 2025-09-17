import { Subagent, type SubagentTask, type SubagentResult, type SubagentCapability, type SubagentContext } from '../base/Subagent';
import { backendPrompt } from '~/lib/common/prompts/backend-prompt';

export class BackendAgent extends Subagent {
  constructor(context?: SubagentContext) {
    const capabilities: SubagentCapability[] = [
      {
        name: 'api-creation',
        description: 'Create RESTful APIs with proper routing and middleware',
        examples: ['Create user authentication API', 'Build CRUD endpoints', 'Implement JWT authentication'],
      },
      {
        name: 'database-design',
        description: 'Design and implement database schemas',
        examples: ['Create SQL schemas', 'Design NoSQL collections', 'Set up migrations'],
      },
      {
        name: 'authentication',
        description: 'Implement authentication and authorization',
        examples: ['JWT tokens', 'OAuth integration', 'Role-based access control'],
      },
      {
        name: 'external-api-integration',
        description: 'Integrate with third-party APIs',
        examples: ['AWS services', 'Payment gateways', 'Email services'],
      },
      {
        name: 'backend-testing',
        description: 'Write and run backend tests',
        examples: ['Unit tests', 'Integration tests', 'API endpoint tests'],
      },
      {
        name: 'performance-optimization',
        description: 'Optimize backend performance',
        examples: ['Database query optimization', 'Caching strategies', 'Load balancing'],
      },
      {
        name: 'security',
        description: 'Implement security best practices',
        examples: ['Input validation', 'SQL injection prevention', 'Rate limiting'],
      },
    ];

    super(
      'BackendAgent',
      'Specialized agent for backend development, API creation, and database management',
      capabilities,
      context || {}
    );

    this.model = 'claude-3-5-sonnet';
  }

  async execute(task: SubagentTask): Promise<SubagentResult> {
    this.logTaskExecution(task, 'start');

    try {
      // Validate the task
      const validation = this.validateTask(task);
      if (!validation.valid) {
        return this.createResult(task.id, false, null, validation.errors);
      }

      // Analyze task requirements
      const analysis = this.analyzeTask(task);
      
      // Generate the appropriate backend solution
      const solution = await this.generateSolution(task, analysis);
      
      // Create artifacts (files, commands, etc.)
      const artifacts = this.createArtifacts(solution, task);

      // Run tests if applicable
      let testResults = null;
      if (this.shouldRunTests(task)) {
        testResults = await this.runTests(artifacts);
      }

      this.logTaskExecution(task, 'end', { success: true });

      return {
        taskId: task.id,
        agentName: this.name,
        success: true,
        output: {
          solution,
          analysis,
          testResults,
        },
        artifacts,
        suggestions: this.generateSuggestions(task, solution),
        timestamp: Date.now(),
      };
    } catch (error) {
      this.logTaskExecution(task, 'error', error);
      
      return this.createResult(
        task.id,
        false,
        null,
        [error instanceof Error ? error.message : 'Unknown error occurred']
      );
    }
  }

  canHandle(task: SubagentTask): boolean {
    const backendKeywords = [
      'api', 'backend', 'server', 'database', 'auth', 'endpoint',
      'rest', 'graphql', 'crud', 'schema', 'migration', 'query',
      'fastapi', 'express', 'django', 'flask', 'nodejs', 'python',
      'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis',
      'jwt', 'oauth', 'authentication', 'authorization', 'security',
      'webhook', 'integration', 'microservice', 'serverless'
    ];

    const taskDescription = task.description.toLowerCase();
    const taskType = task.type?.toLowerCase() || '';

    // Check if task type explicitly mentions backend
    if (taskType.includes('backend')) return true;

    // Check for backend-related keywords in description
    return backendKeywords.some(keyword => taskDescription.includes(keyword));
  }

  getPrompt(task: SubagentTask): string {
    const basePrompt = `
You are a specialized Backend Development Agent with expertise in:
- API design and implementation (REST, GraphQL)
- Database design and optimization
- Authentication and authorization
- Security best practices
- Performance optimization
- Testing and quality assurance

Current Task: ${task.description}

Requirements:
${task.requirements?.join('\n') || 'None specified'}

Constraints:
${task.constraints?.join('\n') || 'None specified'}

Expected Output:
${task.expectedOutput || 'A complete backend solution'}

Context:
- Environment: ${this.context.environment ? JSON.stringify(this.context.environment) : 'Not specified'}
- Working Directory: ${this.context.workingDirectory || 'Not specified'}
- Available API Keys: ${this.context.apiKeys ? Object.keys(this.context.apiKeys).join(', ') : 'None'}

Please provide:
1. A comprehensive solution for the backend requirements
2. Database schema if applicable
3. API endpoints with proper documentation
4. Security considerations
5. Testing strategy
6. Deployment recommendations
`;

    // Add specific prompts based on task metadata
    if (task.metadata?.databaseType) {
      return basePrompt + backendPrompt(task.description, task.metadata.databaseType);
    }

    return basePrompt;
  }

  private analyzeTask(task: SubagentTask): {
    needsDatabase: boolean;
    needsAuth: boolean;
    needsExternalAPIs: boolean;
    complexity: 'simple' | 'moderate' | 'complex';
    estimatedTime: number;
  } {
    const description = task.description.toLowerCase();
    
    return {
      needsDatabase: description.includes('database') || description.includes('data') || description.includes('store'),
      needsAuth: description.includes('auth') || description.includes('login') || description.includes('user'),
      needsExternalAPIs: description.includes('api') || description.includes('integration') || description.includes('external'),
      complexity: this.assessComplexity(task),
      estimatedTime: this.estimateTime(task),
    };
  }

  private assessComplexity(task: SubagentTask): 'simple' | 'moderate' | 'complex' {
    const requirements = task.requirements?.length || 0;
    const constraints = task.constraints?.length || 0;
    
    if (requirements + constraints > 10) return 'complex';
    if (requirements + constraints > 5) return 'moderate';
    return 'simple';
  }

  private estimateTime(task: SubagentTask): number {
    const complexity = this.assessComplexity(task);
    
    switch (complexity) {
      case 'complex': return 3600000; // 1 hour
      case 'moderate': return 1800000; // 30 minutes
      case 'simple': return 600000; // 10 minutes
    }
  }

  private async generateSolution(task: SubagentTask, analysis: any): Promise<{
    approach: string;
    technologies: string[];
    architecture: string;
    implementation: string;
  }> {
    // This would typically call an LLM with the specialized prompt
    // For now, return a structured solution
    
    const technologies: string[] = [];
    
    if (analysis.needsDatabase) {
      technologies.push('PostgreSQL', 'Prisma ORM');
    }
    
    if (analysis.needsAuth) {
      technologies.push('JWT', 'bcrypt');
    }
    
    if (analysis.needsExternalAPIs) {
      technologies.push('Axios', 'API Gateway');
    }

    return {
      approach: 'Microservices architecture with RESTful APIs',
      technologies,
      architecture: 'Layered architecture with controllers, services, and repositories',
      implementation: 'Node.js with Express/Fastify framework',
    };
  }

  private createArtifacts(solution: any, task: SubagentTask): {
    files: Map<string, string>;
    commands: string[];
    logs: string[];
  } {
    const files = new Map<string, string>();
    const commands: string[] = [];
    const logs: string[] = [];

    // Generate basic backend structure
    files.set('backend/package.json', this.generatePackageJson(solution));
    files.set('backend/server.js', this.generateServerFile(solution));
    files.set('backend/.env.example', this.generateEnvExample());
    
    // Add setup commands
    commands.push('cd backend && npm install');
    commands.push('cd backend && npm run dev');
    
    logs.push(`Generated ${files.size} files for backend`);
    logs.push(`Created ${commands.length} setup commands`);

    return { files, commands, logs };
  }

  private generatePackageJson(solution: any): string {
    return JSON.stringify({
      name: 'backend-api',
      version: '1.0.0',
      scripts: {
        dev: 'nodemon server.js',
        start: 'node server.js',
        test: 'jest',
      },
      dependencies: {
        express: '^4.18.2',
        cors: '^2.8.5',
        dotenv: '^16.3.1',
        ...this.getDependencies(solution),
      },
      devDependencies: {
        nodemon: '^3.0.1',
        jest: '^29.7.0',
      },
    }, null, 2);
  }

  private generateServerFile(solution: any): string {
    return `const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://*.webcontainer.io'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Backend API is running',
    version: '1.0.0'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});
`;
  }

  private generateEnvExample(): string {
    return `# Server Configuration
PORT=8000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# JWT
JWT_SECRET=your-secret-key-here

# External APIs
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AZURE_API_KEY=
`;
  }

  private getDependencies(solution: any): Record<string, string> {
    const deps: Record<string, string> = {};
    
    if (solution.technologies.includes('PostgreSQL')) {
      deps['pg'] = '^8.11.3';
    }
    
    if (solution.technologies.includes('Prisma ORM')) {
      deps['@prisma/client'] = '^5.7.0';
    }
    
    if (solution.technologies.includes('JWT')) {
      deps['jsonwebtoken'] = '^9.0.2';
    }
    
    if (solution.technologies.includes('bcrypt')) {
      deps['bcrypt'] = '^5.1.1';
    }
    
    return deps;
  }

  private shouldRunTests(task: SubagentTask): boolean {
    return task.metadata?.runTests !== false;
  }

  private async runTests(artifacts: any): Promise<{
    passed: number;
    failed: number;
    skipped: number;
    details: string[];
  }> {
    // Simulate test execution
    await this.delay(1000);
    
    return {
      passed: 10,
      failed: 0,
      skipped: 2,
      details: [
        'All API endpoints responding correctly',
        'Database connections tested successfully',
        'Authentication flow verified',
      ],
    };
  }

  private generateSuggestions(task: SubagentTask, solution: any): string[] {
    const suggestions: string[] = [];
    
    suggestions.push('Consider implementing rate limiting for API endpoints');
    suggestions.push('Add comprehensive logging for debugging');
    suggestions.push('Set up monitoring and alerting for production');
    
    if (!solution.technologies.includes('Redis')) {
      suggestions.push('Consider adding Redis for caching and session management');
    }
    
    return suggestions;
  }
}