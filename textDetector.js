// Simplified Text Detection System
class TextDetector {
  constructor() {
    // No longer needed
  }
  
  // Get the 5 default suggestions
  getSuggestions() {
    return [
      { text: 'Make Concise', prompt: 'Make this text more concise while keeping all important information' },
      { text: 'Explain', prompt: 'Explain this text in simple, easy-to-understand terms' },
      { text: 'Save Task', prompt: 'save-task' },
      { text: 'Save Note', prompt: 'save-note' },
      { text: 'Custom', prompt: 'custom' }
    ];
  }
}

// Export for use in renderer
window.TextDetector = TextDetector;