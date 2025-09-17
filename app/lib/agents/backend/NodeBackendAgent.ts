import { Subagent, type SubagentTask, type SubagentResult, type SubagentCapability, type SubagentContext } from '../base/Subagent';
import { nodeBackendPrompt } from '~/lib/common/prompts/nodejs-backend-prompt';
import { ActionRunner } from '~/lib/runtime/action-runner';
import { webcontainer } from '~/lib/webcontainer';
import { workbenchStore } from '~/lib/stores/workbench';
import type { BoltShell } from '~/utils/shell';

export class NodeBackendAgent extends Subagent {
  private actionRunner?: ActionRunner;
  private isInitialized: boolean = false;

  constructor(context?: SubagentContext) {
    const capabilities: SubagentCapability[] = [
      {
        name: 'api-creation',
        description: 'Create Express.js RESTful APIs with routing and middleware',
        examples: ['Create user authentication API', 'Build CRUD endpoints', 'Implement JWT authentication'],
      },
      {
        name: 'database-design',
        description: 'Design and implement WebContainer-compatible databases',
        examples: ['LowDB JSON storage', 'SQLite via sql.js', 'NeDB NoSQL', 'PouchDB offline-first'],
      },
      {
        name: 'authentication',
        description: 'Implement authentication and authorization',
        examples: ['JWT tokens', 'Session management', 'Role-based access control'],
      },
      {
        name: 'external-api-integration',
        description: 'Integrate with external APIs',
        examples: ['AWS Bedrock LLM', 'Azure OCR', 'Payment gateways', 'Email services'],
      },
      {
        name: 'realtime',
        description: 'Implement realtime features',
        examples: ['WebSockets', 'Server-sent events', 'Live updates'],
      },
      {
        name: 'webcontainer-execution',
        description: 'Execute Node.js code directly in browser',
        examples: ['Run Express server', 'Execute database operations', 'Hot reload'],
      },
    ];

    super(
      'NodeBackendAgent',
      'Specialized agent for Node.js backend development in WebContainer',
      capabilities,
      context || {}
    );

    this.model = 'claude-3-5-sonnet';
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    this.logger.info('Initializing NodeBackendAgent with ActionRunner');
    
    try {
      const container = await webcontainer;
      const shells = workbenchStore.shells.get();
      const shell = shells.find((s: BoltShell) => s.type === 'default') || shells[0];
      
      if (!shell) {
        throw new Error('No shell available for ActionRunner');
      }

      this.actionRunner = new ActionRunner(
        Promise.resolve(container),
        () => shell,
        (alert) => {
          this.logger.info('Alert from ActionRunner:', alert);
        }
      );
      
      this.isInitialized = true;
      this.logger.info('NodeBackendAgent initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize NodeBackendAgent:', error);
      throw error;
    }
  }

  async execute(task: SubagentTask): Promise<SubagentResult> {
    this.logTaskExecution(task, 'start');

    try {
      // Ensure initialization
      await this.initialize();

      // Validate the task
      const validation = this.validateTask(task);
      if (!validation.valid) {
        return this.createResult(task.id, false, null, validation.errors);
      }

      // Analyze task requirements
      const analysis = this.analyzeTask(task);
      
      // Generate Node.js backend solution
      const backend = await this.generateNodeBackend(task, analysis);
      
      // Write files to WebContainer
      this.logger.info('Writing backend files to WebContainer');
      for (const [path, content] of backend.files) {
        await this.writeFile(path, content);
      }

      // Install dependencies and start server
      this.logger.info('Installing dependencies and starting server');
      await this.executeCommands(backend.commands);

      // Wait for server to start
      await this.waitForServer();

      this.logTaskExecution(task, 'end', { success: true });

      return {
        taskId: task.id,
        agentName: this.name,
        success: true,
        output: {
          type: 'webcontainer-execution',
          running: true,
          endpoint: 'http://localhost:8000',
          database: analysis.database,
          features: analysis.features,
        },
        artifacts: {
          files: backend.files,
          commands: backend.commands,
          logs: [`Backend server started at http://localhost:8000`],
        },
        suggestions: this.generateSuggestions(task, analysis),
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
      'rest', 'graphql', 'crud', 'express', 'node', 'nodejs',
      'lowdb', 'sqlite', 'nedb', 'pouchdb', 'jwt', 'authentication'
    ];

    const taskDescription = task.description.toLowerCase();
    const taskType = task.type?.toLowerCase() || '';

    if (taskType.includes('backend')) return true;
    return backendKeywords.some(keyword => taskDescription.includes(keyword));
  }

  getPrompt(task: SubagentTask): string {
    const databaseType = task.metadata?.databaseType || 'lowdb';
    return nodeBackendPrompt(task.description, databaseType);
  }

  private analyzeTask(task: SubagentTask): {
    database: string;
    needsAuth: boolean;
    needsExternalAPIs: boolean;
    features: string[];
  } {
    const description = task.description.toLowerCase();
    
    // Determine database type
    let database = 'lowdb'; // default
    if (description.includes('sql') || description.includes('relational')) {
      database = 'sqlite';
    } else if (description.includes('nosql') || description.includes('mongodb')) {
      database = 'nedb';
    } else if (description.includes('offline') || description.includes('sync')) {
      database = 'pouchdb';
    }
    
    const features: string[] = [];
    if (description.includes('auth') || description.includes('login')) {
      features.push('authentication');
    }
    if (description.includes('api') || description.includes('external')) {
      features.push('external-apis');
    }
    if (description.includes('realtime') || description.includes('websocket')) {
      features.push('realtime');
    }
    
    return {
      database,
      needsAuth: features.includes('authentication'),
      needsExternalAPIs: features.includes('external-apis'),
      features,
    };
  }

  private async generateNodeBackend(task: SubagentTask, analysis: any): Promise<{
    files: Map<string, string>;
    commands: string[];
  }> {
    const files = new Map<string, string>();
    
    // Generate package.json
    files.set('backend/package.json', this.generatePackageJson(analysis));
    
    // Generate main server file
    files.set('backend/server.js', this.generateServerFile(analysis));
    
    // Generate database initialization
    files.set('backend/db/database.js', this.generateDatabaseFile(analysis.database));
    
    // Generate user routes
    files.set('backend/routes/users.js', this.generateUserRoutes());
    
    // Generate main routes file
    files.set('backend/routes/index.js', this.generateRoutesIndex());
    
    // Generate middleware
    files.set('backend/middleware/errorHandler.js', this.generateErrorHandler());
    files.set('backend/middleware/validation.js', this.generateValidationMiddleware());
    
    // Generate authentication if needed
    if (analysis.needsAuth) {
      files.set('backend/middleware/auth.js', this.generateAuthMiddleware());
      files.set('backend/routes/auth.js', this.generateAuthRoutes());
    }
    
    // Generate external API services if needed
    if (analysis.needsExternalAPIs) {
      files.set('backend/services/llmService.js', this.generateLLMService());
      files.set('backend/services/ocrService.js', this.generateOCRService());
      files.set('backend/routes/external.js', this.generateExternalRoutes());
    }
    
    // Generate environment file
    files.set('backend/.env', this.generateEnvFile());
    
    // Generate seed data script
    files.set('backend/db/seed.js', this.generateSeedScript(analysis.database));
    
    const commands = [
      'cd backend && npm install',
      'cd backend && npm run seed',
      'cd backend && npm run dev'
    ];
    
    return { files, commands };
  }

  private generatePackageJson(analysis: any): string {
    const dependencies: Record<string, string> = {
      'express': '^4.18.2',
      'cors': '^2.8.5',
      'helmet': '^7.1.0',
      'morgan': '^1.10.0',
      'dotenv': '^16.3.1',
      'uuid': '^9.0.1',
      'joi': '^17.11.0',
    };
    
    // Add database dependencies
    switch (analysis.database) {
      case 'lowdb':
        dependencies['lowdb'] = '^6.1.1';
        break;
      case 'sqlite':
        dependencies['sql.js'] = '^1.8.0';
        break;
      case 'nedb':
        dependencies['@seald-io/nedb'] = '^4.0.2';
        break;
      case 'pouchdb':
        dependencies['pouchdb'] = '^8.0.1';
        dependencies['pouchdb-find'] = '^8.0.1';
        break;
    }
    
    // Add auth dependencies
    if (analysis.needsAuth) {
      dependencies['jsonwebtoken'] = '^9.0.2';
      dependencies['bcrypt'] = '^5.1.1';
    }
    
    // Add external API dependencies
    if (analysis.needsExternalAPIs) {
      dependencies['@aws-sdk/client-bedrock-runtime'] = '^3.400.0';
      dependencies['axios'] = '^1.6.2';
    }
    
    return JSON.stringify({
      name: 'backend-api',
      version: '1.0.0',
      type: 'module',
      scripts: {
        start: 'node server.js',
        dev: 'node server.js',
        seed: 'node db/seed.js'
      },
      dependencies,
      devDependencies: {
        'nodemon': '^3.0.2'
      }
    }, null, 2);
  }

  private generateServerFile(analysis: any): string {
    return `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { initDatabase } from './db/database.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config({ path: '../.env.local' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Initialize database
console.log('Initializing database...');
const db = await initDatabase();
app.locals.db = db;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: ['http://localhost:5173', 'https://*.webcontainer.io', 'http://localhost:*'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: '${analysis.database}',
    features: ${JSON.stringify(analysis.features || [])}
  });
});

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(\`🚀 Backend server running at http://localhost:\${PORT}\`);
  console.log(\`📚 API Documentation at http://localhost:\${PORT}/api/docs\`);
  console.log(\`💾 Database: ${analysis.database}\`);
  ${analysis.needsAuth ? "console.log('🔐 Authentication: Enabled');" : ''}
  ${analysis.needsExternalAPIs ? "console.log('🔌 External APIs: Connected');" : ''}
});`;
  }

  private generateDatabaseFile(databaseType: string): string {
    switch (databaseType) {
      case 'sqlite':
        return this.generateSQLiteDatabase();
      case 'nedb':
        return this.generateNeDBDatabase();
      case 'pouchdb':
        return this.generatePouchDBDatabase();
      default: // lowdb
        return this.generateLowDBDatabase();
    }
  }

  private generateLowDBDatabase(): string {
    return `import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';

export async function initDatabase() {
  const db = new Low(new JSONFile('db.json'));
  
  await db.read();
  
  // Initialize with default structure
  db.data ||= {
    users: [],
    posts: [],
    comments: [],
    sessions: []
  };
  
  await db.write();
  
  console.log('✅ LowDB database initialized');
  return db;
}

export function createModel(db, modelName) {
  return {
    async findAll(filter = {}) {
      await db.read();
      let items = db.data[modelName] || [];
      
      // Apply filters
      if (Object.keys(filter).length > 0) {
        items = items.filter(item => 
          Object.entries(filter).every(([key, value]) => 
            item[key] === value
          )
        );
      }
      
      return items;
    },
    
    async findById(id) {
      await db.read();
      return db.data[modelName]?.find(item => item.id === id);
    },
    
    async create(data) {
      await db.read();
      
      const item = {
        id: uuidv4(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (!db.data[modelName]) {
        db.data[modelName] = [];
      }
      
      db.data[modelName].push(item);
      await db.write();
      
      return item;
    },
    
    async update(id, data) {
      await db.read();
      const items = db.data[modelName] || [];
      const index = items.findIndex(item => item.id === id);
      
      if (index === -1) {
        throw new Error(\`\${modelName} not found\`);
      }
      
      items[index] = {
        ...items[index],
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      await db.write();
      return items[index];
    },
    
    async delete(id) {
      await db.read();
      const items = db.data[modelName] || [];
      const initialLength = items.length;
      
      db.data[modelName] = items.filter(item => item.id !== id);
      
      if (db.data[modelName].length === initialLength) {
        throw new Error(\`\${modelName} not found\`);
      }
      
      await db.write();
      return true;
    }
  };
}`;
  }

  private generateSQLiteDatabase(): string {
    return `import initSqlJs from 'sql.js';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';

let db;

export async function initDatabase() {
  const SQL = await initSqlJs();
  
  try {
    // Try to load existing database
    const data = await fs.readFile('./database.sqlite');
    db = new SQL.Database(data);
  } catch {
    // Create new database
    db = new SQL.Database();
    
    // Create tables
    db.run(\`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    \`);
    
    db.run(\`
      CREATE TABLE posts (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT NOT NULL,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    \`);
    
    await saveDatabase();
  }
  
  console.log('✅ SQLite database initialized');
  return db;
}

async function saveDatabase() {
  const data = db.export();
  await fs.writeFile('./database.sqlite', Buffer.from(data));
}

export function createModel(db, tableName) {
  return {
    async findAll(filter = {}) {
      let sql = \`SELECT * FROM \${tableName}\`;
      const params = [];
      
      if (Object.keys(filter).length > 0) {
        const conditions = Object.entries(filter).map(([key]) => \`\${key} = ?\`);
        sql += \` WHERE \${conditions.join(' AND ')}\`;
        params.push(...Object.values(filter));
      }
      
      const stmt = db.prepare(sql);
      stmt.bind(params);
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      
      return results;
    },
    
    async findById(id) {
      const stmt = db.prepare(\`SELECT * FROM \${tableName} WHERE id = ?\`);
      stmt.bind([id]);
      
      if (stmt.step()) {
        const result = stmt.getAsObject();
        stmt.free();
        return result;
      }
      
      stmt.free();
      return null;
    },
    
    async create(data) {
      const item = {
        id: uuidv4(),
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const columns = Object.keys(item).join(', ');
      const placeholders = Object.keys(item).map(() => '?').join(', ');
      const values = Object.values(item);
      
      db.run(
        \`INSERT INTO \${tableName} (\${columns}) VALUES (\${placeholders})\`,
        values
      );
      
      await saveDatabase();
      return item;
    },
    
    async update(id, data) {
      const updates = { ...data, updated_at: new Date().toISOString() };
      const setClause = Object.keys(updates).map(key => \`\${key} = ?\`).join(', ');
      const values = [...Object.values(updates), id];
      
      db.run(
        \`UPDATE \${tableName} SET \${setClause} WHERE id = ?\`,
        values
      );
      
      await saveDatabase();
      return this.findById(id);
    },
    
    async delete(id) {
      const result = db.run(\`DELETE FROM \${tableName} WHERE id = ?\`, [id]);
      await saveDatabase();
      return result.changes > 0;
    }
  };
}`;
  }

  private generateNeDBDatabase(): string {
    return `import Datastore from '@seald-io/nedb';
import { v4 as uuidv4 } from 'uuid';

const databases = {};

export async function initDatabase() {
  // Create datastores for each collection
  databases.users = new Datastore({ filename: './data/users.db', autoload: true });
  databases.posts = new Datastore({ filename: './data/posts.db', autoload: true });
  databases.comments = new Datastore({ filename: './data/comments.db', autoload: true });
  
  // Create indexes
  databases.users.ensureIndex({ fieldName: 'email', unique: true });
  
  console.log('✅ NeDB database initialized');
  return databases;
}

export function createModel(dbs, modelName) {
  const db = dbs[modelName];
  
  return {
    async findAll(filter = {}) {
      return new Promise((resolve, reject) => {
        db.find(filter, (err, docs) => {
          if (err) reject(err);
          else resolve(docs);
        });
      });
    },
    
    async findById(id) {
      return new Promise((resolve, reject) => {
        db.findOne({ id }, (err, doc) => {
          if (err) reject(err);
          else resolve(doc);
        });
      });
    },
    
    async create(data) {
      const item = {
        id: uuidv4(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return new Promise((resolve, reject) => {
        db.insert(item, (err, newDoc) => {
          if (err) reject(err);
          else resolve(newDoc);
        });
      });
    },
    
    async update(id, data) {
      const updates = { 
        ...data, 
        updatedAt: new Date().toISOString() 
      };
      
      return new Promise((resolve, reject) => {
        db.update(
          { id },
          { $set: updates },
          { returnUpdatedDocs: true },
          (err, numReplaced, affectedDoc) => {
            if (err) reject(err);
            else if (numReplaced === 0) reject(new Error(\`\${modelName} not found\`));
            else resolve(affectedDoc);
          }
        );
      });
    },
    
    async delete(id) {
      return new Promise((resolve, reject) => {
        db.remove({ id }, {}, (err, numRemoved) => {
          if (err) reject(err);
          else if (numRemoved === 0) reject(new Error(\`\${modelName} not found\`));
          else resolve(true);
        });
      });
    }
  };
}`;
  }

  private generatePouchDBDatabase(): string {
    return `import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';
import { v4 as uuidv4 } from 'uuid';

PouchDB.plugin(PouchFind);

const databases = {};

export async function initDatabase() {
  // Create databases for each collection
  databases.users = new PouchDB('users');
  databases.posts = new PouchDB('posts');
  databases.comments = new PouchDB('comments');
  
  // Create indexes
  await databases.users.createIndex({
    index: { fields: ['email'] }
  });
  
  console.log('✅ PouchDB database initialized');
  return databases;
}

export function createModel(dbs, modelName) {
  const db = dbs[modelName];
  
  return {
    async findAll(filter = {}) {
      const result = await db.find({
        selector: filter.length === 0 ? { _id: { $gt: null } } : filter
      });
      return result.docs;
    },
    
    async findById(id) {
      try {
        const doc = await db.get(id);
        return doc;
      } catch (err) {
        if (err.status === 404) return null;
        throw err;
      }
    },
    
    async create(data) {
      const item = {
        _id: uuidv4(),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const result = await db.put(item);
      return { ...item, _rev: result.rev };
    },
    
    async update(id, data) {
      const doc = await db.get(id);
      const updated = {
        ...doc,
        ...data,
        updatedAt: new Date().toISOString()
      };
      
      const result = await db.put(updated);
      return { ...updated, _rev: result.rev };
    },
    
    async delete(id) {
      const doc = await db.get(id);
      await db.remove(doc);
      return true;
    }
  };
}`;
  }

  private generateUserRoutes(): string {
    return `import { Router } from 'express';
import { createModel } from '../db/database.js';

const router = Router();

// Get all users
router.get('/', async (req, res, next) => {
  try {
    const User = createModel(req.app.locals.db, 'users');
    const users = await User.findAll();
    
    // Remove passwords from response
    const sanitizedUsers = users.map(({ password, ...user }) => user);
    
    res.json({
      success: true,
      data: sanitizedUsers,
      count: sanitizedUsers.length
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const User = createModel(req.app.locals.db, 'users');
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const { password, ...sanitizedUser } = user;
    res.json({
      success: true,
      data: sanitizedUser
    });
  } catch (error) {
    next(error);
  }
});

// Create user
router.post('/', async (req, res, next) => {
  try {
    const User = createModel(req.app.locals.db, 'users');
    
    // Basic validation
    if (!req.body.username || !req.body.email) {
      return res.status(400).json({
        success: false,
        error: 'Username and email are required'
      });
    }
    
    // Create user
    const user = await User.create(req.body);
    
    const { password, ...sanitizedUser } = user;
    res.status(201).json({
      success: true,
      data: sanitizedUser
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', async (req, res, next) => {
  try {
    const User = createModel(req.app.locals.db, 'users');
    const user = await User.update(req.params.id, req.body);
    
    const { password, ...sanitizedUser } = user;
    res.json({
      success: true,
      data: sanitizedUser
    });
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/:id', async (req, res, next) => {
  try {
    const User = createModel(req.app.locals.db, 'users');
    await User.delete(req.params.id);
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;`;
  }

  private generateRoutesIndex(): string {
    return `import { Router } from 'express';
import userRoutes from './users.js';

const router = Router();

// API Documentation
router.get('/docs', (req, res) => {
  res.json({
    title: 'Backend API Documentation',
    version: '1.0.0',
    baseUrl: \`http://localhost:\${process.env.PORT || 8000}/api\`,
    endpoints: {
      health: {
        GET: '/health - Check server health'
      },
      users: {
        'GET /users': 'Get all users',
        'POST /users': 'Create new user',
        'GET /users/:id': 'Get user by ID',
        'PUT /users/:id': 'Update user',
        'DELETE /users/:id': 'Delete user'
      }
    }
  });
});

// Mount routes
router.use('/users', userRoutes);

export default router;`;
  }

  private generateErrorHandler(): string {
    return `export function errorHandler(err, req, res, next) {
  console.error('Error:', err);
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}`;
  }

  private generateValidationMiddleware(): string {
    return `export function validate(schema) {
  return async (req, res, next) => {
    try {
      const validated = await schema.validateAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details?.map(d => d.message)
      });
    }
  };
}`;
  }

  private generateAuthMiddleware(): string {
    return `import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'No token provided'
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
}`;
  }

  private generateAuthRoutes(): string {
    return `import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createModel } from '../db/database.js';

const router = Router();

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    const User = createModel(req.app.locals.db, 'users');
    const users = await User.findAll({ email });
    const user = users[0];
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, username: user.username }
    });
  } catch (error) {
    next(error);
  }
});

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, username } = req.body;
    
    if (!email || !password || !username) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and username are required'
      });
    }
    
    const User = createModel(req.app.locals.db, 'users');
    
    // Check if user exists
    const existingUsers = await User.findAll({ email });
    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await User.create({
      email,
      username,
      password: hashedPassword
    });
    
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, email: user.email, username: user.username }
    });
  } catch (error) {
    next(error);
  }
});

export default router;`;
  }

  private generateLLMService(): string {
    return `// Note: AWS SDK might not work directly in WebContainer
// This is a placeholder that would need adaptation for WebContainer environment

export class LLMService {
  async generateText(prompt, options = {}) {
    try {
      // In WebContainer, you might need to proxy through a server endpoint
      // or use a different approach for AWS Bedrock
      
      console.log('LLM Service called with prompt:', prompt);
      
      return {
        success: true,
        text: 'Generated response (placeholder in WebContainer)',
        note: 'AWS Bedrock requires server-side execution'
      };
    } catch (error) {
      console.error('LLM Service Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const llmService = new LLMService();`;
  }

  private generateOCRService(): string {
    return `import axios from 'axios';

export class OCRService {
  async extractText(imageBuffer) {
    try {
      // Note: Direct Azure API calls might be restricted in WebContainer
      // Consider using a proxy endpoint
      
      console.log('OCR Service called');
      
      return {
        success: true,
        text: 'Extracted text (placeholder in WebContainer)',
        note: 'Azure OCR requires server-side execution or CORS proxy'
      };
    } catch (error) {
      console.error('OCR Service Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const ocrService = new OCRService();`;
  }

  private generateExternalRoutes(): string {
    return `import { Router } from 'express';
import { llmService } from '../services/llmService.js';
import { ocrService } from '../services/ocrService.js';

const router = Router();

// Generate text using LLM
router.post('/llm/generate', async (req, res, next) => {
  try {
    const { prompt, options } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    const result = await llmService.generateText(prompt, options);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Extract text from image
router.post('/ocr/extract', async (req, res, next) => {
  try {
    // Note: File upload handling would need to be added
    const result = await ocrService.extractText(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;`;
  }

  private generateEnvFile(): string {
    return `# Server Configuration
PORT=8000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your-secret-key-here-change-in-production

# Database
DATABASE_TYPE=lowdb

# External APIs (loaded from parent .env.local)
# AWS_BEDROCK_REGION=
# AWS_BEDROCK_ACCESS_KEY_ID=
# AWS_BEDROCK_SECRET_ACCESS_KEY=
# AZURE_OCR_ENDPOINT=
# AZURE_OCR_SECRET_KEY=`;
  }

  private generateSeedScript(databaseType: string): string {
    return `import { initDatabase, createModel } from './database.js';

async function seedDatabase() {
  console.log('🌱 Seeding database...');
  
  const db = await initDatabase();
  const User = createModel(db, 'users');
  const Post = createModel(db, 'posts');
  
  // Create sample users
  const users = [
    { username: 'john_doe', email: 'john@example.com', role: 'admin' },
    { username: 'jane_smith', email: 'jane@example.com', role: 'user' },
    { username: 'bob_wilson', email: 'bob@example.com', role: 'user' }
  ];
  
  for (const userData of users) {
    await User.create(userData);
    console.log(\`Created user: \${userData.username}\`);
  }
  
  console.log('✅ Database seeded successfully!');
  process.exit(0);
}

seedDatabase().catch(error => {
  console.error('Error seeding database:', error);
  process.exit(1);
});`;
  }

  private async writeFile(path: string, content: string): Promise<void> {
    if (!this.actionRunner) {
      throw new Error('ActionRunner not initialized');
    }

    await this.actionRunner.runAction({
      id: `write-${path}-${Date.now()}`,
      messageId: `msg-${Date.now()}`,
      action: {
        type: 'file',
        filePath: path,
        content,
      },
    });
  }

  private async executeCommands(commands: string[]): Promise<void> {
    if (!this.actionRunner) {
      throw new Error('ActionRunner not initialized');
    }

    for (const command of commands) {
      this.logger.info(`Executing command: ${command}`);
      
      await this.actionRunner.runAction({
        id: `cmd-${Date.now()}`,
        messageId: `msg-${Date.now()}`,
        action: {
          type: 'shell',
          content: command,
        },
      });
      
      // Wait a bit between commands
      await this.delay(1000);
    }
  }

  private async waitForServer(maxAttempts: number = 30): Promise<void> {
    this.logger.info('Waiting for server to start...');
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Try to check if server is responding
        // In WebContainer, we can't directly fetch, but we can check if process is running
        await this.delay(1000);
        
        // For now, just wait a reasonable amount of time
        if (i === 5) {
          this.logger.info('Server should be starting up...');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }
    }
    
    this.logger.warn('Server startup timeout - it may still be starting');
  }

  private generateSuggestions(task: SubagentTask, analysis: any): string[] {
    const suggestions: string[] = [];
    
    suggestions.push('Add API rate limiting for production');
    suggestions.push('Implement request logging and monitoring');
    
    if (!analysis.needsAuth) {
      suggestions.push('Consider adding authentication for secure endpoints');
    }
    
    if (analysis.database === 'lowdb') {
      suggestions.push('For production, consider upgrading to PostgreSQL via Supabase');
    }
    
    suggestions.push('Add input validation using Joi or express-validator');
    suggestions.push('Implement API versioning (e.g., /api/v1/)');
    suggestions.push('Add Swagger/OpenAPI documentation');
    
    return suggestions;
  }
}