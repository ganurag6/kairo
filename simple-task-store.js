const fs = require('fs').promises;
const path = require('path');

class SimpleTaskStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async save(task) {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      
      // Read existing tasks
      let tasks = [];
      try {
        const data = await fs.readFile(this.filePath, 'utf8');
        tasks = JSON.parse(data);
      } catch (err) {
        // File doesn't exist, start with empty array
      }
      
      // Add new task
      tasks.unshift(task);
      
      // Limit to 100 most recent tasks
      if (tasks.length > 100) {
        tasks = tasks.slice(0, 100);
      }
      
      // Write back
      await fs.writeFile(this.filePath, JSON.stringify(tasks, null, 2));
      
      // Important: Clear the reference
      tasks = null;
      
      return true;
    } catch (error) {
      console.error('Error saving task:', error);
      return false;
    }
  }
}

module.exports = SimpleTaskStore;