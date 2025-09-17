import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('backend-loader');

// Cache for the loaded documentation
let cachedApiDocs: string | null = null;

/**
 * Loads backend API documentation from an external file
 * This allows dynamic updates to the API documentation without modifying core prompt files
 * Note: This only works in Node.js environments (server-side)
 */
export function loadBackendApiDocs(): string | null {
  logger.debug('loadBackendApiDocs called');
  
  // Return cached value if already loaded successfully
  if (cachedApiDocs !== null) {
    logger.debug(`Returning cached API docs, length: ${cachedApiDocs.length}`);
    return cachedApiDocs;
  }
  
  // Check Node.js environment
  logger.debug('Checking environment...');
  logger.debug(`typeof process: ${typeof process}`);
  
  if (typeof process === 'undefined' || !process.versions?.node) {
    logger.info('Not in Node.js environment, skipping backend API documentation loading');
    return null;
  }
  
  logger.debug(`Node.js environment detected, version: ${process.versions.node}`);
  
  try {
    // Dynamic imports for Node.js modules (only load when needed)
    const fs = require('fs');
    const path = require('path');
    
    // Path to the backend API documentation file
    // This file should be maintained outside the bolt.diy directory for easy updates
    const docPath = path.resolve('/Users/pgn001/Documents/bolt-1sep/backend-api-docs.md');
    logger.debug(`Looking for file at: ${docPath}`);
    
    // Check if file exists
    if (!fs.existsSync(docPath)) {
      logger.warn(`Backend API documentation file not found at: ${docPath}`);
      return null;
    }
    
    logger.debug('File exists, reading content...');
    
    // Read the file content
    const content = fs.readFileSync(docPath, 'utf-8');
    logger.info(`File read successfully, length: ${content.length}`);
    
    // Basic validation
    if (!content || content.trim().length === 0) {
      logger.warn('Backend API documentation file is empty');
      return null;
    }
    
    logger.debug('Content is valid, wrapping in tags...');
    
    // Cache and wrap the content in XML-like tags for the prompt system
    cachedApiDocs = `
<backend_api_instructions>
  ${content}
</backend_api_instructions>`;
    
    logger.info(`Successfully loaded backend API documentation, final length: ${cachedApiDocs.length}`);
    logger.debug(`First 200 chars: ${cachedApiDocs.substring(0, 200)}`);
    
    // Also write to a debug file for verification
    try {
      const debugPath = '/tmp/bolt-backend-loaded.txt';
      fs.writeFileSync(debugPath, `Loaded at: ${new Date().toISOString()}\nLength: ${cachedApiDocs.length}\nFirst 500 chars:\n${cachedApiDocs.substring(0, 500)}`);
      logger.debug(`Debug file written to ${debugPath}`);
    } catch (e) {
      // Ignore debug file write errors
    }
    
    return cachedApiDocs;
    
  } catch (error) {
    logger.error('Failed to load backend API documentation:', error);
    return null;
  }
}

/**
 * Gets the formatted backend API section for the prompt
 * Returns empty string if no documentation is available
 */
export function getBackendApiSection(): string {
  logger.debug('getBackendApiSection called');
  const apiDocs = loadBackendApiDocs();
  const result = apiDocs || '';
  logger.info(`getBackendApiSection returning: ${result.length} characters`);
  
  // Write to debug file for verification
  try {
    const fs = require('fs');
    const debugPath = '/tmp/bolt-backend-section.txt';
    fs.writeFileSync(debugPath, `Called at: ${new Date().toISOString()}\nLength: ${result.length}\nEmpty: ${result === ''}\nFirst 300 chars:\n${result.substring(0, 300)}`);
  } catch (e) {
    // Ignore debug file write errors
  }
  
  return result;
}

/**
 * Checks if backend API documentation is available
 */
export function hasBackendApiDocs(): boolean {
  // Only works in Node.js environment
  if (typeof process === 'undefined' || !process.versions?.node) {
    return false;
  }
  
  try {
    const fs = require('fs');
    const path = require('path');
    const docPath = path.resolve('/Users/pgn001/Documents/bolt-1sep/backend-api-docs.md');
    return fs.existsSync(docPath);
  } catch {
    return false;
  }
}