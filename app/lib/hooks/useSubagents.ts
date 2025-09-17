import { useState, useEffect, useCallback } from 'react';
import { SubagentManager, type AgentInfo, type TaskDelegation } from '~/lib/agents/SubagentManager';
import { NodeBackendAgent } from '~/lib/agents/backend/NodeBackendAgent';
import { FrontendAgent } from '~/lib/agents/frontend/FrontendAgent';
import type { SubagentTask, SubagentResult } from '~/lib/agents/base/Subagent';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('useSubagents');

export interface UseSubagentsReturn {
  manager: SubagentManager | null;
  isInitialized: boolean;
  agents: AgentInfo[];
  activeTasks: TaskDelegation[];
  completedTasks: TaskDelegation[];
  delegateTask: (task: SubagentTask) => Promise<SubagentResult | null>;
  cancelTask: (taskId: string) => boolean;
  getTaskStatus: (taskId: string) => TaskDelegation | undefined;
}

export function useSubagents(context?: any): UseSubagentsReturn {
  const [manager, setManager] = useState<SubagentManager | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [activeTasks, setActiveTasks] = useState<TaskDelegation[]>([]);
  const [completedTasks, setCompletedTasks] = useState<TaskDelegation[]>([]);
  const [updateCounter, setUpdateCounter] = useState(0);

  // Initialize manager and agents
  useEffect(() => {
    async function initialize() {
      try {
        logger.info('Initializing subagent system...');
        
        // Create manager
        const subagentManager = new SubagentManager(context);
        
        // Create and register agents
        const backendAgent = new NodeBackendAgent(context);
        const frontendAgent = new FrontendAgent(context);
        
        subagentManager.registerAgent(backendAgent);
        subagentManager.registerAgent(frontendAgent);
        
        // Initialize all agents
        await subagentManager.initializeAll();
        
        setManager(subagentManager);
        setIsInitialized(true);
        
        // Update agent list
        setAgents(subagentManager.getAvailableAgents());
        
        logger.info('Subagent system initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize subagent system:', error);
      }
    }
    
    initialize();
    
    // Cleanup on unmount
    return () => {
      if (manager) {
        logger.info('Cleaning up subagent system...');
        manager.cleanupAll().catch(error => {
          logger.error('Error during cleanup:', error);
        });
      }
    };
  }, []); // Run once on mount

  // Update status periodically
  useEffect(() => {
    if (!manager || !isInitialized) return;
    
    const updateStatus = () => {
      setAgents(manager.getAvailableAgents());
      setActiveTasks(manager.getActiveTasks());
      setCompletedTasks(manager.getCompletedTasks());
      setUpdateCounter(prev => prev + 1);
    };
    
    // Initial update
    updateStatus();
    
    // Set up periodic updates
    const interval = setInterval(updateStatus, 1000);
    
    return () => clearInterval(interval);
  }, [manager, isInitialized]);

  // Delegate task to appropriate agent
  const delegateTask = useCallback(async (task: SubagentTask): Promise<SubagentResult | null> => {
    if (!manager || !isInitialized) {
      logger.warn('Cannot delegate task: Manager not initialized');
      return null;
    }
    
    try {
      logger.info(`Delegating task: ${task.id} - ${task.description}`);
      const result = await manager.delegateTask(task);
      
      // Force status update
      setActiveTasks(manager.getActiveTasks());
      setCompletedTasks(manager.getCompletedTasks());
      
      return result;
    } catch (error) {
      logger.error('Error delegating task:', error);
      return null;
    }
  }, [manager, isInitialized]);

  // Cancel a task
  const cancelTask = useCallback((taskId: string): boolean => {
    if (!manager) return false;
    
    const success = manager.cancelTask(taskId);
    
    if (success) {
      // Force status update
      setActiveTasks(manager.getActiveTasks());
      setCompletedTasks(manager.getCompletedTasks());
    }
    
    return success;
  }, [manager]);

  // Get task status
  const getTaskStatus = useCallback((taskId: string): TaskDelegation | undefined => {
    if (!manager) return undefined;
    return manager.getTaskStatus(taskId);
  }, [manager]);

  return {
    manager,
    isInitialized,
    agents,
    activeTasks,
    completedTasks,
    delegateTask,
    cancelTask,
    getTaskStatus,
  };
}