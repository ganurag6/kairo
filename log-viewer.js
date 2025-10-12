// Log viewer functionality
let autoRefresh = true;
let refreshInterval = null;

async function loadLogs() {
  try {
    const logs = await window.electronAPI.getRecentLogs(500);
    displayLogs(logs);
    
    // Update log path
    const logPath = await window.electronAPI.getLogPath();
    document.getElementById('log-path').textContent = logPath;
  } catch (error) {
    console.error('Failed to load logs:', error);
  }
}

function displayLogs(logs) {
  const container = document.getElementById('log-content');
  const searchTerm = document.getElementById('search').value.toLowerCase();
  
  const lines = logs.split('\n');
  const filteredLines = searchTerm 
    ? lines.filter(line => line.toLowerCase().includes(searchTerm))
    : lines;
  
  container.innerHTML = filteredLines.map(line => {
    let className = 'log-line';
    if (line.includes('[ERROR]')) className += ' error';
    else if (line.includes('[WARN]')) className += ' warn';
    else if (line.includes('[INFO]')) className += ' info';
    
    return `<div class="${className}">${escapeHtml(line)}</div>`;
  }).join('');
  
  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function refreshLogs() {
  loadLogs();
}

function clearLogs() {
  if (confirm('Are you sure you want to clear the log file?')) {
    // This would need an IPC handler to actually clear the file
    document.getElementById('log-content').innerHTML = '<div class="log-line">Logs cleared</div>';
  }
}

async function openInEditor() {
  const logPath = await window.electronAPI.getLogPath();
  await window.electronAPI.openPath(logPath);
}

// Search functionality
document.getElementById('search').addEventListener('input', (e) => {
  loadLogs();
});

// Auto-refresh every 2 seconds
function startAutoRefresh() {
  refreshInterval = setInterval(() => {
    if (autoRefresh) loadLogs();
  }, 2000);
}

// Initial load
loadLogs();
startAutoRefresh();

// Clean up on window close
window.addEventListener('beforeunload', () => {
  if (refreshInterval) clearInterval(refreshInterval);
});