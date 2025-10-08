// Action picker logic
const actionButtons = document.querySelectorAll('.action-btn');
let isScreenshot = false;

// Define actions with their prompts for text
const textActions = {
  'fix-grammar': 'Fix all grammar and spelling mistakes in this text.',
  'make-concise': 'Make this text more concise while keeping all important information.',
  'professional': 'Rewrite this text to be more professional and polished.',
  'summarize': 'Create a clear, concise summary of this text.',
  'explain': 'Explain this text in simple terms that anyone can understand.',
  'translate': 'Translate this text to [target language].',
  'expand': 'Expand this text with more detail and context while maintaining the same tone.',
  'simplify': 'Simplify this text to be easily understood by a general audience.',
  'key-points': 'Extract the key points from this text.',
  'custom': null // Will prompt for custom input
};

// Define actions with their prompts for screenshots
const screenshotActions = {
  'fix-grammar': 'Analyze the screenshot and fix any grammar or spelling mistakes in the visible text.',
  'make-concise': 'Analyze the screenshot and provide a concise version of the content shown.',
  'professional': 'Analyze the screenshot and suggest how to make the content more professional.',
  'summarize': 'Analyze the screenshot and create a clear summary of what is shown.',
  'explain': 'Analyze the screenshot and explain what is shown in simple terms.',
  'translate': 'Analyze the screenshot and translate any visible text to [target language].',
  'expand': 'Analyze the screenshot and provide more detail about what is shown.',
  'simplify': 'Analyze the screenshot and simplify the content for a general audience.',
  'key-points': 'Analyze the screenshot and extract the key points from what is shown.',
  'custom': null // Will prompt for custom input
};

// Get the appropriate actions based on content type
function getActions() {
  return isScreenshot ? screenshotActions : textActions;
}

// Listen for content type from main process
if (window.electronAPI && window.electronAPI.onContentType) {
  window.electronAPI.onContentType((data) => {
    isScreenshot = data.isScreenshot;
    console.log('Content type received:', isScreenshot ? 'screenshot' : 'text');
  });
}

// Handle action button clicks
actionButtons.forEach(button => {
  button.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    console.log('Action clicked:', action);
    
    if (action === 'custom') {
      // Send message to main process to show custom prompt input
      window.electronAPI.sendAction('custom', null);
    } else {
      // Send the action and its prompt to main process
      const actions = getActions();
      const prompt = actions[action];
      window.electronAPI.sendAction(action, prompt);
    }
  });
});

// Listen for escape key to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.electronAPI.closeActionPicker();
  }
});