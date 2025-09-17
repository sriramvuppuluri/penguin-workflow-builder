import { memo, useState } from 'react';

interface BackendInstructionsProps {
  onStartBuilding?: (databaseType: string) => void;
}

export const BackendInstructions = memo(({ onStartBuilding }: BackendInstructionsProps) => {
  const [selectedDatabase, setSelectedDatabase] = useState('sqlite');

  const databaseOptions = [
    {
      id: 'lowdb',
      name: 'LowDB',
      description: 'JSON-based database, perfect for prototypes and WebContainer',
      features: ['No setup required', 'Human readable', 'Fast queries', 'File-based storage'],
      icon: '📄',
    },
    {
      id: 'sqlite',
      name: 'SQLite (sql.js)',
      description: 'Full SQL database running in browser via WebAssembly',
      features: ['SQL queries', 'Transactions', 'Indexes', 'ACID compliant'],
      icon: '💾',
    },
    {
      id: 'nedb',
      name: 'NeDB',
      description: 'MongoDB-like embedded database for Node.js',
      features: ['NoSQL', 'MongoDB API', 'In-memory option', 'Fast queries'],
      icon: '🍃',
    },
    {
      id: 'pouchdb',
      name: 'PouchDB',
      description: 'Offline-first database with sync capabilities',
      features: ['Offline support', 'CouchDB sync', 'IndexedDB storage', 'Replication'],
      icon: '☁️',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] p-8">
      <div className="max-w-4xl w-full bg-penguin-elements-background-depth-2 rounded-lg p-6 border border-penguin-elements-borderColor">
        <div className="flex items-center gap-3 mb-6">
          <div className="i-ph:database text-3xl text-penguin-elements-item-contentAccent" />
          <h2 className="text-xl font-semibold text-penguin-elements-textPrimary">Backend Mode - Database Selection</h2>
        </div>
        
        <div className="space-y-4 text-penguin-elements-textSecondary">
          <p className="text-base">
            Choose the database type for your Node.js backend. The system will automatically generate a complete Express.js backend that runs directly in WebContainer with database support and external API integrations:
          </p>
          
          <div className="bg-penguin-elements-background-depth-3 rounded-md p-4 border border-penguin-elements-borderColor mb-4">
            <h3 className="text-sm font-semibold text-penguin-elements-textPrimary mb-2 flex items-center gap-2">
              <div className="i-ph:plug text-penguin-elements-item-contentAccent" />
              Available External APIs (Auto-configured)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="i-ph:brain text-blue-500 mt-0.5" />
                <div>
                  <strong className="text-penguin-elements-textPrimary">LLM Service (AWS Bedrock)</strong>
                  <p className="text-xs text-penguin-elements-textSecondary mt-0.5">
                    Claude AI for text generation, analysis, and intelligent responses
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="i-ph:scan text-green-500 mt-0.5" />
                <div>
                  <strong className="text-penguin-elements-textPrimary">OCR Service (Azure)</strong>
                  <p className="text-xs text-penguin-elements-textSecondary mt-0.5">
                    Extract text from images and documents
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-2 text-xs text-penguin-elements-textSecondary">
              ✓ API keys loaded from .env.local automatically
            </div>
          </div>
          
          <div className="flex items-start gap-2 text-sm bg-penguin-elements-background-depth-3 rounded-md p-3 border border-penguin-elements-borderColor">
            <div className="i-ph:check-circle text-green-500 mt-0.5" />
            <div>
              <strong>WebContainer Execution:</strong> Your Node.js backend will run entirely in the browser using WebContainer technology. No external setup required!
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
            {databaseOptions.map((db) => (
              <div
                key={db.id}
                className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                  selectedDatabase === db.id
                    ? 'border-penguin-elements-item-contentAccent bg-penguin-elements-background-depth-1'
                    : 'border-penguin-elements-borderColor hover:border-penguin-elements-borderColorHover'
                }`}
                onClick={() => setSelectedDatabase(db.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{db.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-penguin-elements-textPrimary">{db.name}</h3>
                      {selectedDatabase === db.id && (
                        <div className="i-ph:check-circle text-penguin-elements-item-contentAccent" />
                      )}
                    </div>
                    <p className="text-xs text-penguin-elements-textSecondary mt-1">{db.description}</p>
                    <ul className="mt-2 space-y-1">
                      {db.features.map((feature, idx) => (
                        <li key={idx} className="text-xs flex items-center gap-1">
                          <span className="text-penguin-elements-item-contentAccent">•</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-penguin-elements-background-depth-3 rounded-md p-4 border border-penguin-elements-borderColor">
            <h3 className="text-sm font-semibold text-penguin-elements-textPrimary mb-3">What will be generated:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="i-ph:check text-penguin-elements-item-contentAccent mt-0.5" />
                <div>
                  <strong>Database Schema:</strong> Tables, relationships, indexes
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="i-ph:check text-penguin-elements-item-contentAccent mt-0.5" />
                <div>
                  <strong>API Endpoints:</strong> RESTful CRUD + External APIs
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="i-ph:check text-penguin-elements-item-contentAccent mt-0.5" />
                <div>
                  <strong>Comprehensive Tests:</strong> Unit, integration, API tests
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="i-ph:check text-penguin-elements-item-contentAccent mt-0.5" />
                <div>
                  <strong>Data Validation:</strong> Joi schemas, input sanitization
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="i-ph:check text-penguin-elements-item-contentAccent mt-0.5" />
                <div>
                  <strong>Authentication:</strong> JWT tokens, bcrypt hashing
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="i-ph:check text-penguin-elements-item-contentAccent mt-0.5" />
                <div>
                  <strong>Seed Data:</strong> Test data for development
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="i-ph:check text-penguin-elements-item-contentAccent mt-0.5" />
                <div>
                  <strong>Error Handling:</strong> Proper HTTP status codes
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="i-ph:check text-penguin-elements-item-contentAccent mt-0.5" />
                <div>
                  <strong>Auto-fixing:</strong> Tests run and fix issues automatically
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="i-ph:check text-penguin-elements-item-contentAccent mt-0.5" />
                <div>
                  <strong>External API Wrappers:</strong> OCR, LLM with rate limiting
                </div>
              </div>
            </div>
          </div>

          <div className="bg-penguin-elements-alerts-infoBackground border border-penguin-elements-alerts-infoBorder rounded-md p-4">
            <div className="flex items-start gap-2">
              <div className="i-ph:info text-penguin-elements-alerts-infoText mt-0.5" />
              <div className="text-sm text-penguin-elements-alerts-infoText">
                <strong>Node.js Backend:</strong> The system will generate a complete Express.js backend with your selected database. The server will start automatically at http://localhost:8000 with full API documentation available at /api/docs.
              </div>
            </div>
          </div>
          
          {onStartBuilding && (
            <button
              onClick={() => onStartBuilding(selectedDatabase)}
              className="w-full bg-penguin-elements-button-primary-background text-penguin-elements-button-primary-text rounded-md px-4 py-3 hover:bg-penguin-elements-button-primary-backgroundHover transition-colors font-medium flex items-center justify-center gap-2"
            >
              <div className="i-ph:play" />
              Start Building Backend with {databaseOptions.find(db => db.id === selectedDatabase)?.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

BackendInstructions.displayName = 'BackendInstructions';