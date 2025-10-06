const storage = require('./storage');

// Simple UUID v4 generator without external dependencies
function generateUUID() {
  return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class TaskManager {
  constructor() {
    this.storage = storage;
  }

  // Create a new task
  async createTask(data) {
    const task = {
      id: generateUUID(),
      text: data.text || '',
      originalText: data.originalText || data.text || '',
      source: {
        app: data.source?.app || 'Unknown',
        timestamp: new Date().toISOString(),
        context: data.source?.context || ''
      },
      status: 'pending',
      priority: data.priority || 'normal',
      dueDate: data.dueDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      tags: data.tags || [],
      reminder: data.reminder || null
    };

    return await this.storage.addTask(task);
  }

  // Get all tasks
  async getAllTasks() {
    return await this.storage.getTasks();
  }

  // Get tasks by status
  async getTasksByStatus(status) {
    const tasks = await this.storage.getTasks();
    return tasks.filter(task => task.status === status);
  }

  // Get today's tasks
  async getTodayTasks() {
    const tasks = await this.storage.getTasks();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= today && dueDate < tomorrow;
    });
  }

  // Update task
  async updateTask(id, updates) {
    return await this.storage.updateTask(id, updates);
  }

  // Complete task
  async completeTask(id) {
    return await this.storage.updateTask(id, {
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  }

  // Delete task
  async deleteTask(id) {
    return await this.storage.deleteTask(id);
  }

  // Search tasks
  async searchTasks(query) {
    const tasks = await this.storage.getTasks();
    const lowerQuery = query.toLowerCase();
    
    return tasks.filter(task => 
      task.text.toLowerCase().includes(lowerQuery) ||
      task.originalText.toLowerCase().includes(lowerQuery) ||
      task.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  // Get task statistics
  async getTaskStats() {
    const tasks = await this.storage.getTasks();
    const now = new Date();
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: tasks.filter(t => {
        if (!t.dueDate || t.status === 'completed') return false;
        return new Date(t.dueDate) < now;
      }).length,
      today: (await this.getTodayTasks()).length
    };
  }

  // Extract due date from text (basic implementation)
  extractDueDate(text) {
    const lowerText = text.toLowerCase();
    const now = new Date();
    
    // Check for specific patterns
    if (lowerText.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(17, 0, 0, 0); // 5 PM
      return tomorrow.toISOString();
    }
    
    if (lowerText.includes('today')) {
      const today = new Date(now);
      today.setHours(17, 0, 0, 0); // 5 PM
      return today.toISOString();
    }
    
    if (lowerText.includes('friday')) {
      const friday = new Date(now);
      const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7;
      friday.setDate(friday.getDate() + daysUntilFriday);
      friday.setHours(17, 0, 0, 0);
      return friday.toISOString();
    }
    
    // Add more patterns as needed
    
    return null;
  }

  // Extract tags from text
  extractTags(text) {
    const tags = [];
    const lowerText = text.toLowerCase();
    
    // Auto-tag based on keywords
    if (lowerText.includes('email') || lowerText.includes('send') || lowerText.includes('reply')) {
      tags.push('email');
    }
    
    if (lowerText.includes('meeting') || lowerText.includes('call') || lowerText.includes('discuss')) {
      tags.push('meeting');
    }
    
    if (lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('important')) {
      tags.push('urgent');
    }
    
    if (lowerText.includes('bug') || lowerText.includes('fix') || lowerText.includes('error')) {
      tags.push('bug');
    }
    
    // Extract hashtags
    const hashtagMatches = text.match(/#\w+/g);
    if (hashtagMatches) {
      tags.push(...hashtagMatches.map(tag => tag.slice(1)));
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }
}

module.exports = new TaskManager();