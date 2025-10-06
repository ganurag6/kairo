const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class Storage {
  constructor() {
    this.dataPath = path.join(app.getPath('userData'), 'kairo-data');
    this.tasksFile = path.join(this.dataPath, 'tasks.json');
    this.notesFile = path.join(this.dataPath, 'notes.json');
    this.settingsFile = path.join(this.dataPath, 'settings.json');
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
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
      // Archive old completed tasks
      const completedTasks = tasks.filter(t => t.completed);
      const incompleteTasks = tasks.filter(t => !t.completed);
      
      // Keep all incomplete tasks and recent completed tasks
      if (completedTasks.length > 100) {
        const recentCompleted = completedTasks.slice(0, 100);
        tasks.length = 0;
        tasks.push(...incompleteTasks, ...recentCompleted);
      }
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

  async cleanupOldData() {
    // Clean up old tasks
    const tasks = await this.getTasks();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Remove completed tasks older than 30 days
    const filteredTasks = tasks.filter(task => {
      if (!task.completed) return true;
      const taskDate = new Date(task.completedAt || task.updatedAt || task.createdAt);
      return taskDate > thirtyDaysAgo;
    });
    
    if (filteredTasks.length < tasks.length) {
      await this.saveTasks(filteredTasks);
      console.log(`🧹 Cleaned up ${tasks.length - filteredTasks.length} old tasks`);
    }
    
    // Clean up old notes (keep last 200)
    const notes = await this.getNotes();
    if (notes.length > 200) {
      const recentNotes = notes.slice(0, 200);
      await this.saveNotes(recentNotes);
      console.log(`🧹 Cleaned up ${notes.length - 200} old notes`);
    }
    
    return {
      tasksRemoved: tasks.length - filteredTasks.length,
      notesRemoved: notes.length > 200 ? notes.length - 200 : 0
    };
  }
}

module.exports = new Storage();