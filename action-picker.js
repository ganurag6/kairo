// Action picker logic
const actionButtons = document.querySelectorAll('.action-btn');
let isScreenshot = false;

// Get DOM elements for custom view
const actionsView = document.getElementById('actions-view');
const customView = document.getElementById('custom-view');
const customInput = document.getElementById('custom-input');
const cancelBtn = document.getElementById('cancel-custom');
const submitBtn = document.getElementById('submit-custom');

// Helper functions need to be defined first
// Show custom input view
function showCustomInput() {
  actionsView.style.display = 'none';
  customView.style.display = 'flex';
  customInput.focus();
}

// Show actions view
function showActionsView() {
  customView.style.display = 'none';
  actionsView.style.display = 'grid';
  customInput.value = ''; // Clear input
}

// Handle custom input submission
function submitCustom() {
  const customText = customInput.value.trim();
  if (customText) {
    console.log('Custom prompt:', customText);
    // For custom prompts, we send the text as both action and prompt
    window.electronAPI.sendAction('custom', customText);
  }
}

// Ensure we start with actions view
document.addEventListener('DOMContentLoaded', () => {
  showActionsView();
  
  // Set up event listeners after DOM is ready
  console.log('Setting up button listeners');
  console.log('Cancel button exists:', !!cancelBtn);
  console.log('Submit button exists:', !!submitBtn);
  
  if (cancelBtn) {
    // Try multiple event types
    ['click', 'mousedown', 'touchstart'].forEach(eventType => {
      cancelBtn.addEventListener(eventType, (e) => {
        console.log(`Cancel button ${eventType}!`);
        if (eventType === 'click') {
          e.preventDefault();
          e.stopPropagation();
          showActionsView();
        }
      });
    });
    
    // Test if element is clickable at all
    cancelBtn.addEventListener('mouseover', () => {
      console.log('Cancel button hover works');
      cancelBtn.style.opacity = '0.8';
    });
    
    cancelBtn.addEventListener('mouseout', () => {
      cancelBtn.style.opacity = '1';
    });
  }
  
  if (submitBtn) {
    // Try multiple event types
    ['click', 'mousedown', 'touchstart'].forEach(eventType => {
      submitBtn.addEventListener(eventType, (e) => {
        console.log(`Submit button ${eventType}!`);
        if (eventType === 'click') {
          e.preventDefault();
          e.stopPropagation();
          submitCustom();
        }
      });
    });
    
    // Test if element is clickable at all
    submitBtn.addEventListener('mouseover', () => {
      console.log('Submit button hover works');
      submitBtn.style.opacity = '0.8';
    });
    
    submitBtn.addEventListener('mouseout', () => {
      submitBtn.style.opacity = '1';
    });
  }
  
  // Handle Enter key in custom input
  customInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCustom();
    } else if (e.key === 'Escape') {
      showActionsView();
    }
  });
});

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
  'expand': 'Extract and transcribe all visible text from the screenshot.',
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
    
    // Reset to actions view when new content is received
    showActionsView();
    
    // Update the expand button text for screenshots
    const expandButton = document.querySelector('[data-action="expand"]');
    if (expandButton && isScreenshot) {
      expandButton.textContent = 'Extract Text';
    } else if (expandButton) {
      expandButton.textContent = 'Expand';
    }
  });
}

// Handle action button clicks
actionButtons.forEach(button => {
  button.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    console.log('Action clicked:', action);
    
    if (action === 'custom') {
      // Switch to custom input view
      showCustomInput();
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
  // Prevent common browser shortcuts
  if (e.key === '/' || e.key === '?') {
    if (document.activeElement !== customInput) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }
  
  // Prevent DevTools shortcuts
  if (e.key === 'F12' || 
      ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  
  if (e.key === 'Escape') {
    // If in custom view, go back to actions
    if (customView.style.display !== 'none') {
      showActionsView();
    } else {
      window.electronAPI.closeActionPicker();
    }
  }
});