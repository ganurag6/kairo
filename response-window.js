// Response window logic
let currentResponse = '';
let currentAction = '';

// Get DOM elements
const actionName = document.getElementById('action-name');
const responseContent = document.getElementById('response-content');
const copyBtn = document.getElementById('copy-btn');
const askBtn = document.getElementById('ask-btn');
const closeBtn = document.getElementById('close-btn');
const chatInputContainer = document.getElementById('chat-input-container');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const copyNotification = document.getElementById('copy-notification');

// Listen for AI responses
window.electronAPI.onResponse((data) => {
  console.log('Received response:', data);
  
  if (data.status === 'processing') {
    currentAction = data.action;
    actionName.textContent = formatActionName(data.action);
    responseContent.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <span>Working on it...</span>
      </div>
    `;
  } else if (data.status === 'complete') {
    currentResponse = data.response;
    responseContent.textContent = data.response;
    
    // Adjust window height based on content
    adjustWindowHeight();
  }
});

// Format action name for display
function formatActionName(action) {
  const names = {
    'fix-grammar': 'Grammar Fixed',
    'make-concise': 'Made Concise',
    'professional': 'Professional Version',
    'summarize': 'Summary',
    'explain': 'Explanation',
    'translate': 'Translation',
    'expand': 'Expanded Version',
    'simplify': 'Simplified Version',
    'key-points': 'Key Points',
    'custom': 'Custom Response'
  };
  return names[action] || action;
}

// Copy button handler
copyBtn.addEventListener('click', async () => {
  try {
    await window.electronAPI.copyToClipboard(currentResponse);
    
    // Show notification
    copyNotification.style.display = 'block';
    setTimeout(() => {
      copyNotification.style.display = 'none';
    }, 2000);
    
    // Update button temporarily
    copyBtn.innerHTML = '<span class="copy-icon">✅</span><span>Copied!</span>';
    setTimeout(() => {
      copyBtn.innerHTML = '<span class="copy-icon">📋</span><span>Copy</span>';
    }, 1500);
  } catch (error) {
    console.error('Copy failed:', error);
  }
});

// Ask button handler
askBtn.addEventListener('click', () => {
  chatInputContainer.style.display = 'flex';
  chatInput.focus();
  askBtn.style.display = 'none';
});

// Chat input handlers
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendFollowUp();
  }
});

sendBtn.addEventListener('click', sendFollowUp);

async function sendFollowUp() {
  const question = chatInput.value.trim();
  if (!question) return;
  
  // Switch to full chat mode
  window.electronAPI.switchToChat();
}

// Close button handler
closeBtn.addEventListener('click', () => {
  window.electronAPI.closeResponseWindow();
});

// Escape key handler
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.electronAPI.closeResponseWindow();
  }
});

// Adjust window height based on content
function adjustWindowHeight() {
  // Get content height
  const contentHeight = responseContent.scrollHeight;
  const totalHeight = contentHeight + 120; // Header + footer + padding
  
  // Limit height
  const finalHeight = Math.min(Math.max(200, totalHeight), 600);
  
  // Request resize through IPC
  window.resizeTo(600, finalHeight);
}