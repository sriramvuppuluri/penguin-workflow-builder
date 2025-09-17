import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface BackendBuildingStatusProps {
  databaseType?: string;
  isBuilding?: boolean;
  hasBackend?: boolean;
}

export const BackendBuildingStatus = memo(({ databaseType = 'LowDB', isBuilding = false, hasBackend = false }: BackendBuildingStatusProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [buildingSteps, setBuildingSteps] = useState([
    { icon: '📦', label: 'Installing npm packages', status: 'pending' },
    { icon: '🏗️', label: 'Setting up Express.js server', status: 'pending' },
    { icon: '💾', label: `Configuring ${databaseType} database`, status: 'pending' },
    { icon: '🔌', label: 'Integrating external APIs (LLM, OCR)', status: 'pending' },
    { icon: '🛡️', label: 'Setting up JWT authentication', status: 'pending' },
    { icon: '🚏', label: 'Creating API routes', status: 'pending' },
    { icon: '🚀', label: 'Starting Node.js server on port 8000', status: 'pending' },
  ]);

  useEffect(() => {
    if (isBuilding && currentStep < buildingSteps.length) {
      const timer = setTimeout(() => {
        setBuildingSteps(prev => prev.map((step, idx) => {
          if (idx === currentStep) {
            return { ...step, status: 'completed' };
          }
          if (idx === currentStep + 1) {
            return { ...step, status: 'active' };
          }
          return step;
        }));
        setCurrentStep(prev => prev + 1);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isBuilding, currentStep, buildingSteps.length]);

  useEffect(() => {
    if (isBuilding && buildingSteps[0].status === 'pending') {
      setBuildingSteps(prev => prev.map((step, idx) => 
        idx === 0 ? { ...step, status: 'active' } : step
      ));
    }
  }, [isBuilding]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <div className="bg-penguin-elements-background-depth-2 rounded-lg p-6 border border-penguin-elements-borderColor">
          <div className="flex items-center gap-3 mb-6">
            <div className="i-svg-spinners:3-dots-fade text-3xl text-penguin-elements-item-contentAccent" />
            <div>
              <h2 className="text-xl font-semibold text-penguin-elements-textPrimary">Building Your Backend</h2>
              <p className="text-sm text-penguin-elements-textSecondary mt-1">
                Creating a complete Node.js/Express backend with database and external APIs...
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {buildingSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-md transition-all ${
                  step.status === 'active'
                    ? 'bg-penguin-elements-item-backgroundAccent border border-penguin-elements-item-borderAccent'
                    : step.status === 'completed'
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-penguin-elements-background-depth-3 border border-transparent opacity-50'
                }`}
              >
                <span className="text-xl">{step.icon}</span>
                <div className="flex-1">
                  <span className={`text-sm ${
                    step.status === 'active' 
                      ? 'text-penguin-elements-item-contentAccent font-medium' 
                      : step.status === 'completed'
                      ? 'text-green-500 font-medium'
                      : 'text-penguin-elements-textSecondary'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {step.status === 'active' && (
                  <div className="i-svg-spinners:3-dots-bounce text-penguin-elements-item-contentAccent" />
                )}
                {step.status === 'completed' && (
                  <div className="i-ph:check-circle-fill text-green-500" />
                )}
              </motion.div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-penguin-elements-background-depth-3 rounded-md border border-penguin-elements-borderColor">
            <h3 className="text-sm font-semibold text-penguin-elements-textPrimary mb-2">What's being created:</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-penguin-elements-textSecondary">
              <div className="flex items-center gap-1">
                <span className="text-green-500">✓</span> RESTful API endpoints
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-500">✓</span> {databaseType} database
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-500">✓</span> LLM service (AWS Bedrock)
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-500">✓</span> OCR service (Azure)
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-500">✓</span> CORS configuration
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-500">✓</span> API documentation
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-penguin-elements-textSecondary">
            <div className="i-ph:info" />
            <span>The Node.js backend will run entirely in WebContainer (browser environment)</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

BackendBuildingStatus.displayName = 'BackendBuildingStatus';