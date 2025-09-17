import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentInfo, TaskDelegation } from '~/lib/agents/SubagentManager';

interface SubagentPanelProps {
  agents: AgentInfo[];
  activeTasks: TaskDelegation[];
  completedTasks: TaskDelegation[];
  isVisible?: boolean;
  onClose?: () => void;
}

export function SubagentPanel({
  agents,
  activeTasks,
  completedTasks,
  isVisible = true,
  onClose,
}: SubagentPanelProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const getAgentIcon = (agentName: string): string => {
    const icons: Record<string, string> = {
      BackendAgent: '🔧',
      FrontendAgent: '🎨',
      TestAgent: '🧪',
      IntegrationAgent: '🔌',
      ImageAgent: '🖼️',
      PerformanceAgent: '⚡',
      A11yAgent: '♿',
    };
    return icons[agentName] || '🤖';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'idle': return 'text-green-500';
      case 'busy': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      case 'offline': return 'text-gray-400';
      default: return 'text-gray-500';
    }
  };

  const getTaskStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-gray-200';
      case 'running': return 'bg-yellow-200';
      case 'completed': return 'bg-green-200';
      case 'failed': return 'bg-red-200';
      default: return 'bg-gray-100';
    }
  };

  const formatDuration = (start?: Date, end?: Date): string => {
    if (!start) return '-';
    const endTime = end || new Date();
    const duration = endTime.getTime() - new Date(start).getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="fixed right-4 top-20 w-96 max-h-[80vh] bg-penguin-elements-background-depth-2 rounded-lg shadow-xl border border-penguin-elements-borderColor overflow-hidden z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-penguin-elements-borderColor bg-penguin-elements-background-depth-1">
          <div className="flex items-center gap-2">
            <div className="i-ph:robot text-xl text-penguin-elements-item-contentAccent" />
            <h3 className="text-lg font-semibold text-penguin-elements-textPrimary">Subagent System</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-penguin-elements-background-depth-3 rounded transition-colors"
            >
              <div className="i-ph:x text-penguin-elements-textSecondary" />
            </button>
          )}
        </div>

        {/* Agent List */}
        <div className="p-4 border-b border-penguin-elements-borderColor">
          <h4 className="text-sm font-semibold text-penguin-elements-textSecondary mb-3">Active Agents</h4>
          <div className="space-y-2">
            {agents.map((agent) => (
              <motion.div
                key={agent.name}
                whileHover={{ scale: 1.02 }}
                className={`p-3 rounded-lg bg-penguin-elements-background-depth-3 cursor-pointer transition-all ${
                  selectedAgent === agent.name ? 'ring-2 ring-penguin-elements-item-contentAccent' : ''
                }`}
                onClick={() => setSelectedAgent(agent.name === selectedAgent ? null : agent.name)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">{getAgentIcon(agent.name)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-penguin-elements-textPrimary">{agent.name}</span>
                        <span className={`text-xs ${getStatusColor(agent.status)}`}>
                          ● {agent.status}
                        </span>
                      </div>
                      <p className="text-xs text-penguin-elements-textSecondary mt-1">
                        {agent.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-penguin-elements-textSecondary">
                      Tasks: {agent.tasksCompleted}
                    </div>
                  </div>
                </div>

                {/* Agent Capabilities */}
                {selectedAgent === agent.name && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="mt-3 pt-3 border-t border-penguin-elements-borderColor"
                  >
                    <div className="text-xs text-penguin-elements-textSecondary mb-2">Capabilities:</div>
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-1 bg-penguin-elements-background-depth-2 rounded text-xs text-penguin-elements-textPrimary"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Active Tasks */}
        <div className="p-4 border-b border-penguin-elements-borderColor">
          <h4 className="text-sm font-semibold text-penguin-elements-textSecondary mb-3">
            Active Tasks ({activeTasks.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activeTasks.length === 0 ? (
              <p className="text-xs text-penguin-elements-textSecondary italic">No active tasks</p>
            ) : (
              activeTasks.map((task) => (
                <div
                  key={task.task.id}
                  className={`p-2 rounded ${getTaskStatusColor(task.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getAgentIcon(task.agent)}</span>
                        <span className="text-xs font-medium text-gray-900">
                          {task.task.description.slice(0, 50)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">
                          {task.agent}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDuration(task.startTime)}
                        </span>
                      </div>
                    </div>
                    {task.status === 'running' && (
                      <div className="i-svg-spinners:3-dots-bounce text-yellow-600" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completed Tasks Toggle */}
        <div className="p-4">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center justify-between w-full text-sm text-penguin-elements-textSecondary hover:text-penguin-elements-textPrimary transition-colors"
          >
            <span>Completed Tasks ({completedTasks.length})</span>
            <div className={`i-ph:caret-down transition-transform ${showCompleted ? 'rotate-180' : ''}`} />
          </button>

          {/* Completed Tasks List */}
          {showCompleted && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-3 space-y-2 max-h-48 overflow-y-auto"
            >
              {completedTasks.slice(-10).reverse().map((task) => (
                <div
                  key={task.task.id}
                  className={`p-2 rounded ${getTaskStatusColor(task.status)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getAgentIcon(task.agent)}</span>
                        <span className="text-xs text-gray-700">
                          {task.task.description.slice(0, 40)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">
                          {task.agent}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDuration(task.startTime, task.endTime)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs">
                      {task.status === 'completed' ? (
                        <div className="i-ph:check-circle text-green-600" />
                      ) : (
                        <div className="i-ph:x-circle text-red-600" />
                      )}
                    </div>
                  </div>
                  {task.result?.errors && task.result.errors.length > 0 && (
                    <div className="mt-1 text-xs text-red-600">
                      {task.result.errors[0]}
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Statistics Footer */}
        <div className="p-3 bg-penguin-elements-background-depth-1 border-t border-penguin-elements-borderColor">
          <div className="flex justify-around text-xs">
            <div className="text-center">
              <div className="text-penguin-elements-textSecondary">Agents</div>
              <div className="font-semibold text-penguin-elements-textPrimary">{agents.length}</div>
            </div>
            <div className="text-center">
              <div className="text-penguin-elements-textSecondary">Active</div>
              <div className="font-semibold text-yellow-500">{activeTasks.length}</div>
            </div>
            <div className="text-center">
              <div className="text-penguin-elements-textSecondary">Completed</div>
              <div className="font-semibold text-green-500">{completedTasks.length}</div>
            </div>
            <div className="text-center">
              <div className="text-penguin-elements-textSecondary">Success Rate</div>
              <div className="font-semibold text-penguin-elements-textPrimary">
                {completedTasks.length > 0
                  ? Math.round(
                      (completedTasks.filter((t) => t.status === 'completed').length /
                        completedTasks.length) *
                        100
                    )
                  : 0}
                %
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}