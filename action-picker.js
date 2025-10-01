// Action picker logic
const actionButtons = document.querySelectorAll('.action-btn');

// Define actions with their prompts
const actions = {
  'fix-grammar': 'Fix all grammar and spelling mistakes in this text. If the text contains multiple points or paragraphs starting with similar patterns, preserve the list structure with proper numbering (1. 2. etc) and add a blank line between each numbered item. Return only the corrected text with proper spacing.',
  'make-concise': 'Make this text more concise while keeping all important information. If the text contains multiple points, preserve the numbered list format with blank lines between items. Return only the concise version with proper spacing.',
  'professional': 'Rewrite this text to be more professional and polished. If the text contains multiple points, preserve the numbered list format. Return only the rewritten text.',
  'summarize': 'Create a clear, concise summary of this text. If the original has multiple points, summarize as a numbered list. Return only the summary.',
  'explain': 'Explain this text in simple terms that anyone can understand. If there are multiple points, keep them numbered. Be brief and clear.',
  'translate': 'Translate this text to [target language]. Preserve any numbered list formatting. Return only the translation.',
  'expand': 'Expand this text with more detail and context while maintaining the same tone. If the text has multiple points, keep the numbered format. Return only the expanded text.',
  'simplify': 'Simplify this text to be easily understood by a general audience. If the text has multiple points, keep them numbered. Return only the simplified text.',
  'key-points': 'Extract the key points from this text as a numbered list (1. 2. 3. etc). Return only the numbered points.',
  'custom': null // Will prompt for custom input
};

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