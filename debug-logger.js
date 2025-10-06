// Debug memory logger
class DebugLogger {
  constructor() {
    this.startTime = Date.now();
    this.operations = [];
    this.memorySnapshots = [];
    this.logCount = 0;
  }

  getMemoryStats() {
    const memUsage = process.memoryUsage();
    return {
      timestamp: Date.now(),
      uptime: ((Date.now() - this.startTime) / 1000).toFixed(1) + 's',
      rss: (memUsage.rss / 1024 / 1024).toFixed(1) + 'MB',
      heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(1) + 'MB',
      heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(1) + 'MB',
      external: (memUsage.external / 1024 / 1024).toFixed(1) + 'MB'
    };
  }

  log(operation, details = '') {
    this.logCount++;
    const stats = this.getMemoryStats();
    const entry = {
      id: this.logCount,
      operation,
      details,
      ...stats
    };
    
    this.operations.push(entry);
    this.memorySnapshots.push(stats);
    
    // Console log with clear formatting
    console.log(`\n[${this.logCount}] ${stats.uptime} - ${operation}`);
    console.log(`  Memory: ${stats.heapUsed}/${stats.heapTotal} (RSS: ${stats.rss})`);
    if (details) console.log(`  Details: ${details}`);
    
    // Alert if memory usage is high
    const heapUsedMB = parseFloat(stats.heapUsed);
    if (heapUsedMB > 1500) {
      console.error(`🚨 HIGH MEMORY WARNING: ${stats.heapUsed} heap used!`);
      this.analyzeMemoryGrowth();
    }
    
    // Keep only last 100 operations to prevent the logger itself from using too much memory
    if (this.operations.length > 100) {
      this.operations.shift();
      this.memorySnapshots.shift();
    }
  }

  analyzeMemoryGrowth() {
    if (this.memorySnapshots.length < 10) return;
    
    console.log('\n📊 MEMORY GROWTH ANALYSIS:');
    const recent = this.memorySnapshots.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    const heapGrowth = parseFloat(last.heapUsed) - parseFloat(first.heapUsed);
    console.log(`  Growth in last 10 operations: ${heapGrowth.toFixed(1)}MB`);
    
    console.log('\n📝 RECENT OPERATIONS:');
    this.operations.slice(-10).forEach(op => {
      console.log(`  [${op.id}] ${op.operation} - ${op.heapUsed}`);
    });
  }

  forceGC() {
    if (global.gc) {
      console.log('🗑️ Forcing garbage collection...');
      const before = this.getMemoryStats();
      global.gc();
      setTimeout(() => {
        const after = this.getMemoryStats();
        console.log(`GC: ${before.heapUsed} → ${after.heapUsed}`);
      }, 100);
    }
  }
}

module.exports = new DebugLogger();