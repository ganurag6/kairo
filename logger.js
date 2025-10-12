const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Logger {
  constructor() {
    // Create logs directory in user data
    this.logsDir = path.join(app.getPath('userData'), 'logs');
    this.ensureLogsDirectory();
    
    // Create log file with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    this.logFile = path.join(this.logsDir, `kairo-${timestamp}.log`);
    
    // Keep original console methods
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };
    
    // Override console methods
    this.overrideConsole();
    
    // Log startup
    this.log('=== Kairo Started ===');
    this.log(`Log file: ${this.logFile}`);
    this.log(`Platform: ${process.platform}`);
    this.log(`Electron: ${process.versions.electron}`);
    this.log(`Node: ${process.versions.node}`);
  }
  
  ensureLogsDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
    
    // Clean old logs (keep last 7 days)
    this.cleanOldLogs();
  }
  
  cleanOldLogs() {
    try {
      const files = fs.readdirSync(this.logsDir);
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      
      files.forEach(file => {
        if (file.startsWith('kairo-') && file.endsWith('.log')) {
          const filePath = path.join(this.logsDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtimeMs < sevenDaysAgo) {
            fs.unlinkSync(filePath);
          }
        }
      });
    } catch (error) {
      // Silently ignore cleanup errors
    }
  }
  
  formatMessage(level, args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg, null, 2);
      }
      return String(arg);
    }).join(' ');
    
    return `[${timestamp}] [${level}] ${message}\n`;
  }
  
  writeToFile(message) {
    try {
      fs.appendFileSync(this.logFile, message);
    } catch (error) {
      // If we can't write to file, at least use original console
      this.originalConsole.error('Failed to write to log file:', error);
    }
  }
  
  log(...args) {
    const message = this.formatMessage('INFO', args);
    this.writeToFile(message);
    this.originalConsole.log(...args);
  }
  
  error(...args) {
    const message = this.formatMessage('ERROR', args);
    this.writeToFile(message);
    this.originalConsole.error(...args);
  }
  
  warn(...args) {
    const message = this.formatMessage('WARN', args);
    this.writeToFile(message);
    this.originalConsole.warn(...args);
  }
  
  info(...args) {
    const message = this.formatMessage('INFO', args);
    this.writeToFile(message);
    this.originalConsole.info(...args);
  }
  
  overrideConsole() {
    console.log = this.log.bind(this);
    console.error = this.error.bind(this);
    console.warn = this.warn.bind(this);
    console.info = this.info.bind(this);
  }
  
  // Get log file path for user access
  getLogPath() {
    return this.logFile;
  }
  
  // Get all recent logs
  getRecentLogs(lines = 100) {
    try {
      const content = fs.readFileSync(this.logFile, 'utf8');
      const allLines = content.split('\n');
      return allLines.slice(-lines).join('\n');
    } catch (error) {
      return 'Failed to read logs: ' + error.message;
    }
  }
}

module.exports = Logger;