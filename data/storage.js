const fs = require('fs').promises;
const path = require('path');

class Storage {
  constructor() {
    // Don't require app module here - it will be passed in
    this.dataPath = null;
    this.tasksFile = null;
    this.notesFile = null;
    this.settingsFile = null;
    this.initialized = false;
  }

  setDataPath(userDataPath) {
    this.dataPath = path.join(userDataPath, 'kairo-data');
    this.tasksFile = path.join(this.dataPath, 'tasks.json');
    this.notesFile = path.join(this.dataPath, 'notes.json');
    this.settingsFile = path.join(this.dataPath, 'settings.json');
  }

  async initialize() {
    if (this.initialized) return;
    
    if (!this.dataPath) {
      throw new Error('Data path not set. Call setDataPath first.');
    }
    
    try {
      // Create directory if doesn't exist
      await fs.mkdir(this.dataPath, { recursive: true });
      
      // Initialize files if don't exist
      if (!(await this.fileExists(this.tasksFile))) {
        await this.saveTasks([]);
      }
      
      if (!(await this.fileExists(this.notesFile))) {
        await this.saveNotes([]);
      }
      
      if (!(await this.fileExists(this.settingsFile))) {
        await this.saveSettings({
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });
      }
      
      this.initialized = true;
      console.log('✅ Storage initialized at:', this.dataPath);
    } catch (error) {
      console.error('❌ Storage initialization failed:', error);
      throw error;
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Tasks methods
  async getTasks() {
    await this.initialize();
    try {
      const data = await fs.readFile(this.tasksFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading tasks:', error);
      return [];
    }
  }

  async saveTasks(tasks) {
    await this.initialize();
    await fs.writeFile(this.tasksFile, JSON.stringify(tasks, null, 2));
  }

  async addTask(task) {
    const tasks = await this.getTasks();
    tasks.unshift(task); // Add to beginning for most recent first
    
    // Limit tasks to prevent memory issues
    const maxTasks = 500;
    if (tasks.length > maxTasks) {
      // Keep only the most recent tasks
      tasks.length = maxTasks;
    }
    
    await this.saveTasks(tasks);
    return task;
  }

  async updateTask(id, updates) {
    const tasks = await this.getTasks();
    const index = tasks.findIndex(t => t.id === id);
    
    if (index !== -1) {
      tasks[index] = { 
        ...tasks[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      await this.saveTasks(tasks);
      return tasks[index];
    }
    
    return null;
  }

  async deleteTask(id) {
    const tasks = await this.getTasks();
    const filtered = tasks.filter(t => t.id !== id);
    await this.saveTasks(filtered);
    return filtered.length < tasks.length;
  }

  // Notes methods
  async getNotes() {
    await this.initialize();
    try {
      const data = await fs.readFile(this.notesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading notes:', error);
      return [];
    }
  }

  async saveNotes(notes) {
    await this.initialize();
    await fs.writeFile(this.notesFile, JSON.stringify(notes, null, 2));
  }

  async addNote(note) {
    const notes = await this.getNotes();
    notes.unshift(note); // Add to beginning
    
    // Limit notes
    const maxNotes = 200;
    if (notes.length > maxNotes) {
      notes.length = maxNotes;
    }
    
    await this.saveNotes(notes);
    return note;
  }

  // Settings methods
  async getSettings() {
    await this.initialize();
    try {
      const data = await fs.readFile(this.settingsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading settings:', error);
      return {};
    }
  }

  async saveSettings(settings) {
    await this.initialize();
    await fs.writeFile(this.settingsFile, JSON.stringify(settings, null, 2));
  }

  // Utility methods
  async exportData() {
    const tasks = await this.getTasks();
    const notes = await this.getNotes();
    const settings = await this.getSettings();
    
    return {
      tasks,
      notes,
      settings,
      exportedAt: new Date().toISOString()
    };
  }

  async getStorageInfo() {
    const tasks = await this.getTasks();
    const notes = await this.getNotes();
    
    return {
      dataPath: this.dataPath,
      taskCount: tasks.length,
      noteCount: notes.length,
      totalSize: await this.getFileSize()
    };
  }

  async getFileSize() {
    try {
      const tasksStats = await fs.stat(this.tasksFile);
      const notesStats = await fs.stat(this.notesFile);
      const settingsStats = await fs.stat(this.settingsFile);
      
      return tasksStats.size + notesStats.size + settingsStats.size;
    } catch {
      return 0;
    }
  }
}

module.exports = new Storage();