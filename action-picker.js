// Action picker logic
const actionButtons = document.querySelectorAll('.action-btn');

// Define actions with their prompts
const actions = {
  'make-concise': 'Make this text more concise while keeping all important information. If the text contains multiple points, preserve the numbered list format with blank lines between items. Return only the concise version with proper spacing.',
  'explain': 'Explain this text in simple terms that anyone can understand. If there are multiple points, keep them numbered. Be brief and clear.',
  'save-task': null, // Special action for task saving
  'save-note': null, // Special action for note saving
  'custom': null // Will prompt for custom input
};

// Handle action button clicks
actionButtons.forEach(button => {
  button.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;
    console.log('Action clicked:', action);
    
    if (action === 'save-task') {
      await handleSaveTask();
    } else if (action === 'save-note') {
      await handleSaveNote();
    } else if (action === 'custom') {
      // Send message to main process to show custom prompt input
      window.electronAPI.sendAction('custom', null);
    } else {
      // Send the action and its prompt to main process
      const prompt = actions[action];
      window.electronAPI.sendAction(action, prompt);
    }
  });
});

// Handle Save Task action
async function handleSaveTask() {
  try {
    console.log('📌 Saving task...');
    
    // Get the current selected text from main process (via currentSelectedText)
    // For now, we'll use a simple approach - the text is already available in main.js
    const result = await window.electronAPI.saveTask({
      text: 'Task from selected text', // This will be replaced with actual selected text
      priority: 'normal'
    });
    
    if (result.success) {
      console.log('✅ Task saved successfully:', result.task);
      
      // Show brief feedback
      showFeedback('Task saved!');
      
      // Close action picker after short delay
      setTimeout(() => {
        window.electronAPI.closeActionPicker();
      }, 800);
    } else {
      console.error('❌ Failed to save task:', result.error);
      showFeedback('Failed to save task');
    }
  } catch (error) {
    console.error('❌ Error saving task:', error);
    showFeedback('Error saving task');
  }
}

// Handle Save Note action (placeholder for now)
async function handleSaveNote() {
  console.log('📝 Save Note clicked - not implemented yet');
  showFeedback('Save Note coming soon!');
}

// Show feedback message
function showFeedback(message) {
  // Create or get feedback element
  let feedback = document.querySelector('.feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.className = 'feedback';
    document.body.appendChild(feedback);
  }
  
  feedback.textContent = message;
  feedback.style.display = 'block';
  
  // Hide after 2 seconds
  setTimeout(() => {
    feedback.style.display = 'none';
  }, 2000);
}

// Listen for escape key to close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.electronAPI.closeActionPicker();
  }
});