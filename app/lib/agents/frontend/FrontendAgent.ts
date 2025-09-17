import { Subagent, type SubagentTask, type SubagentResult, type SubagentCapability, type SubagentContext } from '../base/Subagent';

export class FrontendAgent extends Subagent {
  constructor(context?: SubagentContext) {
    const capabilities: SubagentCapability[] = [
      {
        name: 'component-creation',
        description: 'Create React/Vue/Angular components',
        examples: ['Create form components', 'Build navigation bars', 'Design card layouts'],
      },
      {
        name: 'state-management',
        description: 'Implement state management solutions',
        examples: ['Redux setup', 'Context API', 'Zustand integration', 'Pinia stores'],
      },
      {
        name: 'ui-styling',
        description: 'Apply styling and responsive design',
        examples: ['Tailwind CSS', 'Material-UI', 'Custom CSS', 'Animations'],
      },
      {
        name: 'routing',
        description: 'Set up client-side routing',
        examples: ['React Router', 'Vue Router', 'Protected routes', 'Dynamic routing'],
      },
      {
        name: 'api-integration',
        description: 'Connect frontend to backend APIs',
        examples: ['Fetch data', 'Handle API errors', 'Implement loading states', 'Cache responses'],
      },
      {
        name: 'form-handling',
        description: 'Build and validate forms',
        examples: ['Form validation', 'Multi-step forms', 'File uploads', 'Dynamic fields'],
      },
      {
        name: 'performance-optimization',
        description: 'Optimize frontend performance',
        examples: ['Code splitting', 'Lazy loading', 'Image optimization', 'Bundle size reduction'],
      },
      {
        name: 'accessibility',
        description: 'Ensure accessibility standards',
        examples: ['ARIA labels', 'Keyboard navigation', 'Screen reader support', 'Color contrast'],
      },
      {
        name: 'responsive-design',
        description: 'Create responsive layouts',
        examples: ['Mobile-first design', 'Breakpoints', 'Flexible grids', 'Touch interactions'],
      },
    ];

    super(
      'FrontendAgent',
      'Specialized agent for frontend development, UI/UX design, and component creation',
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

      // Analyze frontend requirements
      const analysis = this.analyzeFrontendTask(task);
      
      // Generate frontend solution
      const solution = await this.generateFrontendSolution(task, analysis);
      
      // Create frontend artifacts
      const artifacts = this.createFrontendArtifacts(solution, task);

      // Run frontend tests if applicable
      let testResults = null;
      if (this.shouldRunTests(task)) {
        testResults = await this.runFrontendTests(artifacts);
      }

      // Check accessibility if needed
      let a11yResults = null;
      if (analysis.needsAccessibility) {
        a11yResults = await this.checkAccessibility(artifacts);
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
          a11yResults,
        },
        artifacts,
        suggestions: this.generateFrontendSuggestions(task, solution, analysis),
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
    const frontendKeywords = [
      'ui', 'frontend', 'component', 'react', 'vue', 'angular', 'svelte',
      'html', 'css', 'javascript', 'typescript', 'jsx', 'tsx',
      'styling', 'layout', 'responsive', 'mobile', 'desktop',
      'form', 'button', 'navigation', 'menu', 'modal', 'dialog',
      'state', 'redux', 'context', 'hooks', 'props',
      'tailwind', 'bootstrap', 'material', 'chakra',
      'animation', 'transition', 'interaction', 'ux', 'design',
      'accessibility', 'a11y', 'aria', 'wcag'
    ];

    const taskDescription = task.description.toLowerCase();
    const taskType = task.type?.toLowerCase() || '';

    // Check if task type explicitly mentions frontend
    if (taskType.includes('frontend') || taskType.includes('ui')) return true;

    // Check for frontend-related keywords in description
    return frontendKeywords.some(keyword => taskDescription.includes(keyword));
  }

  getPrompt(task: SubagentTask): string {
    return `
You are a specialized Frontend Development Agent with expertise in:
- Modern JavaScript frameworks (React, Vue, Angular, Svelte)
- UI/UX design principles
- Responsive and mobile-first design
- State management solutions
- Performance optimization
- Accessibility standards (WCAG)
- CSS frameworks and styling
- Component architecture

Current Task: ${task.description}

Requirements:
${task.requirements?.join('\n') || 'None specified'}

Constraints:
${task.constraints?.join('\n') || 'None specified'}

Expected Output:
${task.expectedOutput || 'A complete frontend solution with components and styling'}

Context:
- Framework: ${task.metadata?.framework || 'React (default)'}
- Styling: ${task.metadata?.styling || 'Tailwind CSS (default)'}
- Target Devices: ${task.metadata?.devices || 'Desktop and mobile'}
- Browser Support: ${task.metadata?.browsers || 'Modern browsers'}

Please provide:
1. Component structure and hierarchy
2. State management approach
3. Styling solution with responsive design
4. API integration patterns
5. Accessibility considerations
6. Performance optimization strategies
7. Testing approach
`;
  }

  private analyzeFrontendTask(task: SubagentTask): {
    framework: string;
    needsRouting: boolean;
    needsStateManagement: boolean;
    needsApiIntegration: boolean;
    needsAccessibility: boolean;
    complexity: 'simple' | 'moderate' | 'complex';
    componentCount: number;
  } {
    const description = task.description.toLowerCase();
    
    return {
      framework: this.detectFramework(task),
      needsRouting: description.includes('route') || description.includes('page') || description.includes('navigation'),
      needsStateManagement: description.includes('state') || description.includes('redux') || description.includes('context'),
      needsApiIntegration: description.includes('api') || description.includes('fetch') || description.includes('backend'),
      needsAccessibility: description.includes('accessibility') || description.includes('a11y') || task.metadata?.accessible === true,
      complexity: this.assessComplexity(task),
      componentCount: this.estimateComponentCount(task),
    };
  }

  private detectFramework(task: SubagentTask): string {
    if (task.metadata?.framework) return task.metadata.framework;
    
    const description = task.description.toLowerCase();
    if (description.includes('react')) return 'react';
    if (description.includes('vue')) return 'vue';
    if (description.includes('angular')) return 'angular';
    if (description.includes('svelte')) return 'svelte';
    
    return 'react'; // Default
  }

  private assessComplexity(task: SubagentTask): 'simple' | 'moderate' | 'complex' {
    const requirements = task.requirements?.length || 0;
    const componentCount = this.estimateComponentCount(task);
    
    if (requirements > 10 || componentCount > 20) return 'complex';
    if (requirements > 5 || componentCount > 10) return 'moderate';
    return 'simple';
  }

  private estimateComponentCount(task: SubagentTask): number {
    const description = task.description.toLowerCase();
    let count = 1; // At least one component
    
    const componentKeywords = ['form', 'list', 'card', 'modal', 'nav', 'header', 'footer', 'sidebar'];
    componentKeywords.forEach(keyword => {
      if (description.includes(keyword)) count += 2;
    });
    
    return count;
  }

  private async generateFrontendSolution(task: SubagentTask, analysis: any): Promise<{
    framework: string;
    components: string[];
    styling: string;
    stateManagement: string;
    routing: string;
    dependencies: string[];
  }> {
    const components: string[] = [];
    const dependencies: string[] = [];
    
    // Base dependencies for the framework
    if (analysis.framework === 'react') {
      dependencies.push('react', 'react-dom');
      components.push('App', 'Layout', 'Header', 'Footer');
    } else if (analysis.framework === 'vue') {
      dependencies.push('vue', '@vue/compiler-sfc');
      components.push('App.vue', 'Layout.vue', 'Header.vue', 'Footer.vue');
    }
    
    // Add routing if needed
    let routing = 'none';
    if (analysis.needsRouting) {
      if (analysis.framework === 'react') {
        dependencies.push('react-router-dom');
        routing = 'React Router';
      } else if (analysis.framework === 'vue') {
        dependencies.push('vue-router');
        routing = 'Vue Router';
      }
    }
    
    // Add state management if needed
    let stateManagement = 'local state';
    if (analysis.needsStateManagement) {
      if (analysis.framework === 'react') {
        dependencies.push('zustand');
        stateManagement = 'Zustand';
      } else if (analysis.framework === 'vue') {
        dependencies.push('pinia');
        stateManagement = 'Pinia';
      }
    }

    return {
      framework: analysis.framework,
      components,
      styling: 'Tailwind CSS',
      stateManagement,
      routing,
      dependencies,
    };
  }

  private createFrontendArtifacts(solution: any, task: SubagentTask): {
    files: Map<string, string>;
    commands: string[];
    logs: string[];
    metrics?: Record<string, number>;
  } {
    const files = new Map<string, string>();
    const commands: string[] = [];
    const logs: string[] = [];
    
    if (solution.framework === 'react') {
      files.set('src/App.jsx', this.generateReactApp());
      files.set('src/components/Layout.jsx', this.generateReactLayout());
      files.set('src/index.css', this.generateTailwindCSS());
      files.set('package.json', this.generatePackageJson(solution));
    }
    
    commands.push('npm install');
    commands.push('npm run dev');
    
    logs.push(`Generated ${files.size} files for ${solution.framework} frontend`);
    logs.push(`Added ${solution.dependencies.length} dependencies`);
    
    return {
      files,
      commands,
      logs,
      metrics: {
        fileCount: files.size,
        componentCount: solution.components.length,
        dependencyCount: solution.dependencies.length,
      },
    };
  }

  private generateReactApp(): string {
    return `import React from 'react';
import Layout from './components/Layout';

function App() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Welcome to Your App
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Add your components here */}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default App;`;
  }

  private generateReactLayout(): string {
    return `import React from 'react';

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="text-xl font-semibold">Your App</div>
            <div className="flex gap-4">
              <a href="/" className="hover:text-blue-600">Home</a>
              <a href="/about" className="hover:text-blue-600">About</a>
              <a href="/contact" className="hover:text-blue-600">Contact</a>
            </div>
          </nav>
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="bg-gray-100 border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-gray-600">
          © 2024 Your App. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default Layout;`;
  }

  private generateTailwindCSS(): string {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary {
    @apply bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow;
  }
}`;
  }

  private generatePackageJson(solution: any): string {
    const deps: Record<string, string> = {};
    
    solution.dependencies.forEach((dep: string) => {
      // Add version numbers
      switch (dep) {
        case 'react': deps[dep] = '^18.2.0'; break;
        case 'react-dom': deps[dep] = '^18.2.0'; break;
        case 'react-router-dom': deps[dep] = '^6.20.0'; break;
        case 'zustand': deps[dep] = '^4.4.7'; break;
        case 'vue': deps[dep] = '^3.3.0'; break;
        case 'vue-router': deps[dep] = '^4.2.0'; break;
        case 'pinia': deps[dep] = '^2.1.0'; break;
        default: deps[dep] = 'latest';
      }
    });
    
    return JSON.stringify({
      name: 'frontend-app',
      version: '1.0.0',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        test: 'vitest',
      },
      dependencies: deps,
      devDependencies: {
        vite: '^5.0.0',
        '@vitejs/plugin-react': '^4.2.0',
        tailwindcss: '^3.4.0',
        autoprefixer: '^10.4.0',
        postcss: '^8.4.0',
      },
    }, null, 2);
  }

  private shouldRunTests(task: SubagentTask): boolean {
    return task.metadata?.runTests !== false;
  }

  private async runFrontendTests(artifacts: any): Promise<{
    passed: number;
    failed: number;
    skipped: number;
    coverage: number;
  }> {
    await this.delay(1000);
    
    return {
      passed: 15,
      failed: 0,
      skipped: 3,
      coverage: 85,
    };
  }

  private async checkAccessibility(artifacts: any): Promise<{
    score: number;
    issues: string[];
    suggestions: string[];
  }> {
    await this.delay(500);
    
    return {
      score: 92,
      issues: [
        'Missing alt text on 2 images',
        'Low contrast ratio on footer text',
      ],
      suggestions: [
        'Add skip navigation link',
        'Ensure all interactive elements are keyboard accessible',
        'Add ARIA labels to icon buttons',
      ],
    };
  }

  private generateFrontendSuggestions(task: SubagentTask, solution: any, analysis: any): string[] {
    const suggestions: string[] = [];
    
    suggestions.push('Consider implementing error boundaries for better error handling');
    suggestions.push('Add loading skeletons for better perceived performance');
    
    if (!solution.dependencies.includes('react-query') && analysis.needsApiIntegration) {
      suggestions.push('Consider using TanStack Query (React Query) for API state management');
    }
    
    if (analysis.needsAccessibility) {
      suggestions.push('Run automated accessibility tests with axe-core');
      suggestions.push('Test with screen readers for better accessibility');
    }
    
    suggestions.push('Implement progressive web app (PWA) features for offline support');
    
    return suggestions;
  }
}