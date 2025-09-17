import { createScopedLogger } from '~/utils/logger';
import type { Subagent, SubagentTask, SubagentResult, SubagentContext } from './base/Subagent';
import type { WebContainer } from '@webcontainer/api';

export interface AgentInfo {
  name: string;
  description: string;
  capabilities: string[];
  status: 'idle' | 'busy' | 'error' | 'offline';
  tasksCompleted: number;
  lastActivity?: Date;
}

export interface TaskDelegation {
  task: SubagentTask;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: SubagentResult;
  startTime?: Date;
  endTime?: Date;
}

export class SubagentManager {
  private agents: Map<string, Subagent> = new Map();
  private taskQueue: SubagentTask[] = [];
  private activeTasks: Map<string, TaskDelegation> = new Map();
  private completedTasks: TaskDelegation[] = [];
  private logger = createScopedLogger('SubagentManager');
  private context: SubagentContext = {};
  private maxConcurrentTasks: number = 5;

  constructor(context?: SubagentContext) {
    if (context) {
      this.context = context;
    }
  }

  /**
   * Register a new agent with the manager
   */
  registerAgent(agent: Subagent): void {
    const info = agent.getInfo();
    this.logger.info(`Registering agent: ${info.name}`);
    
    agent.updateContext(this.context);
    this.agents.set(info.name, agent);
    
    this.logger.info(`Agent registered successfully: ${info.name}`, {
      capabilities: info.capabilities.map(c => c.name),
    });
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentName: string): void {
    if (this.agents.has(agentName)) {
      const agent = this.agents.get(agentName);
      agent?.cleanup();
      this.agents.delete(agentName);
      this.logger.info(`Agent unregistered: ${agentName}`);
    }
  }

  /**
   * Get list of available agents
   */
  getAvailableAgents(): AgentInfo[] {
    const agentInfos: AgentInfo[] = [];

    for (const [name, agent] of this.agents) {
      const info = agent.getInfo();
      const tasksCompleted = this.completedTasks.filter(t => t.agent === name).length;
      const isActive = Array.from(this.activeTasks.values()).some(t => t.agent === name);

      agentInfos.push({
        name: info.name,
        description: info.description,
        capabilities: info.capabilities.map(c => c.name),
        status: isActive ? 'busy' : 'idle',
        tasksCompleted,
        lastActivity: this.getLastActivity(name),
      });
    }

    return agentInfos;
  }

  /**
   * Delegate a task to an appropriate agent
   */
  async delegateTask(task: SubagentTask): Promise<SubagentResult> {
    this.logger.info(`Delegating task: ${task.id} - ${task.description}`);

    // Find suitable agent
    const agent = this.findSuitableAgent(task);
    
    if (!agent) {
      this.logger.error(`No suitable agent found for task: ${task.id}`);
      return {
        taskId: task.id,
        agentName: 'SubagentManager',
        success: false,
        errors: ['No suitable agent found for this task type'],
        timestamp: Date.now(),
      };
    }

    const agentInfo = agent.getInfo();
    this.logger.info(`Task ${task.id} assigned to agent: ${agentInfo.name}`);

    // Create task delegation record
    const delegation: TaskDelegation = {
      task,
      agent: agentInfo.name,
      status: 'running',
      startTime: new Date(),
    };

    this.activeTasks.set(task.id, delegation);

    try {
      // Execute task
      const result = await agent.execute(task);
      
      // Update delegation record
      delegation.status = result.success ? 'completed' : 'failed';
      delegation.result = result;
      delegation.endTime = new Date();
      
      // Move to completed tasks
      this.activeTasks.delete(task.id);
      this.completedTasks.push(delegation);
      
      this.logger.info(`Task ${task.id} completed by ${agentInfo.name}`, {
        success: result.success,
        duration: delegation.endTime.getTime() - delegation.startTime!.getTime(),
      });

      return result;
    } catch (error) {
      this.logger.error(`Task ${task.id} failed with error:`, error);
      
      delegation.status = 'failed';
      delegation.endTime = new Date();
      
      this.activeTasks.delete(task.id);
      this.completedTasks.push(delegation);

      return {
        taskId: task.id,
        agentName: agentInfo.name,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Delegate multiple tasks in parallel
   */
  async delegateTasks(tasks: SubagentTask[]): Promise<SubagentResult[]> {
    this.logger.info(`Delegating ${tasks.length} tasks`);
    
    const results: SubagentResult[] = [];
    const chunks = this.chunkArray(tasks, this.maxConcurrentTasks);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(task => this.delegateTask(task))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Find the most suitable agent for a task
   */
  private findSuitableAgent(task: SubagentTask): Subagent | null {
    const suitableAgents: { agent: Subagent; score: number }[] = [];

    for (const [_, agent] of this.agents) {
      if (agent.canHandle(task)) {
        // Calculate suitability score
        const score = this.calculateAgentScore(agent, task);
        suitableAgents.push({ agent, score });
      }
    }

    if (suitableAgents.length === 0) {
      return null;
    }

    // Sort by score and return the best agent
    suitableAgents.sort((a, b) => b.score - a.score);
    return suitableAgents[0].agent;
  }

  /**
   * Calculate agent suitability score for a task
   */
  private calculateAgentScore(agent: Subagent, task: SubagentTask): number {
    let score = 100; // Base score

    // Check if agent is busy
    const isBusy = Array.from(this.activeTasks.values()).some(
      t => t.agent === agent.getInfo().name
    );
    if (isBusy) {
      score -= 20;
    }

    // Check agent's success rate
    const agentTasks = this.completedTasks.filter(t => t.agent === agent.getInfo().name);
    if (agentTasks.length > 0) {
      const successRate = agentTasks.filter(t => t.status === 'completed').length / agentTasks.length;
      score += successRate * 20;
    }

    // Priority boost
    if (task.priority === 'critical') {
      score += 30;
    } else if (task.priority === 'high') {
      score += 20;
    }

    return score;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): TaskDelegation | undefined {
    return this.activeTasks.get(taskId) || 
           this.completedTasks.find(t => t.task.id === taskId);
  }

  /**
   * Get active tasks
   */
  getActiveTasks(): TaskDelegation[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Get completed tasks
   */
  getCompletedTasks(): TaskDelegation[] {
    return this.completedTasks;
  }

  /**
   * Cancel a task
   */
  cancelTask(taskId: string): boolean {
    if (this.activeTasks.has(taskId)) {
      const delegation = this.activeTasks.get(taskId)!;
      delegation.status = 'failed';
      delegation.endTime = new Date();
      
      this.activeTasks.delete(taskId);
      this.completedTasks.push(delegation);
      
      this.logger.info(`Task ${taskId} cancelled`);
      return true;
    }
    return false;
  }

  /**
   * Update global context for all agents
   */
  updateGlobalContext(context: Partial<SubagentContext>): void {
    this.context = { ...this.context, ...context };
    
    // Update context for all registered agents
    for (const [_, agent] of this.agents) {
      agent.updateContext(context);
    }
    
    this.logger.info('Global context updated for all agents');
  }

  /**
   * Initialize all agents
   */
  async initializeAll(): Promise<void> {
    this.logger.info('Initializing all agents...');
    
    const initPromises = Array.from(this.agents.values()).map(agent => 
      agent.initialize().catch(error => {
        this.logger.error(`Failed to initialize ${agent.getInfo().name}:`, error);
      })
    );
    
    await Promise.all(initPromises);
    this.logger.info('All agents initialized');
  }

  /**
   * Cleanup all agents
   */
  async cleanupAll(): Promise<void> {
    this.logger.info('Cleaning up all agents...');
    
    const cleanupPromises = Array.from(this.agents.values()).map(agent =>
      agent.cleanup().catch(error => {
        this.logger.error(`Failed to cleanup ${agent.getInfo().name}:`, error);
      })
    );
    
    await Promise.all(cleanupPromises);
    this.agents.clear();
    this.logger.info('All agents cleaned up');
  }

  /**
   * Get agent by name
   */
  getAgent(name: string): Subagent | undefined {
    return this.agents.get(name);
  }

  /**
   * Get last activity for an agent
   */
  private getLastActivity(agentName: string): Date | undefined {
    const tasks = this.completedTasks.filter(t => t.agent === agentName);
    if (tasks.length === 0) return undefined;
    
    return tasks.reduce((latest, task) => {
      const taskTime = task.endTime || task.startTime;
      return !latest || (taskTime && taskTime > latest) ? taskTime : latest;
    }, undefined as Date | undefined);
  }

  /**
   * Helper to chunk array for parallel processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get manager statistics
   */
  getStatistics(): {
    totalAgents: number;
    activeAgents: number;
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    successRate: number;
  } {
    const activeAgentNames = new Set(
      Array.from(this.activeTasks.values()).map(t => t.agent)
    );
    
    const successfulTasks = this.completedTasks.filter(t => t.status === 'completed').length;
    const totalCompleted = this.completedTasks.length;
    
    return {
      totalAgents: this.agents.size,
      activeAgents: activeAgentNames.size,
      totalTasks: this.activeTasks.size + this.completedTasks.length,
      activeTasks: this.activeTasks.size,
      completedTasks: totalCompleted,
      successRate: totalCompleted > 0 ? (successfulTasks / totalCompleted) * 100 : 0,
    };
  }
}