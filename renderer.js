// New Chat-based Kairo Renderer
class KairoApp {
  constructor() {
    console.log('🚀 KairoApp constructor called');
    
    try {
      // Check if TextDetector is available
      if (typeof TextDetector === 'undefined') {
        console.error('❌ TextDetector not found! textDetector.js may not be loaded');
        // Create a fallback
        this.textDetector = {
          getSuggestions: () => [
            { icon: '🔍', text: 'Fix Grammar', prompt: 'Correct all grammar and spelling mistakes in this text' },
            { icon: '✂️', text: 'Make Concise', prompt: 'Make this text more concise while keeping all important information' },
            { icon: '✍️', text: 'Professional Rewrite', prompt: 'Rewrite this text to be more professional and polished' },
            { icon: '📋', text: 'Summarize', prompt: 'Create a clear, concise summary of this text' }
          ]
        };
      } else {
        this.textDetector = new TextDetector();
      }
      
      this.conversation = [];
      this.currentText = '';
      this.isProcessing = false;
      this.isAnalysisRequest = false;
      
      console.log('🔧 Initializing elements...');
      this.initializeElements();
      
      console.log('🎧 Setting up event listeners...');
      this.setupEventListeners();
      
      console.log('⌨️ Setting up keyboard shortcuts...');
      this.setupKeyboardShortcuts();
      
      console.log('✅ KairoApp initialized successfully');
      
      // Add an immediate test message
      setTimeout(() => {
        if (this.chatMessages) {
          console.log('🧪 Adding test message...');
          this.addMessage('system', 'Kairo is ready! Select text and press Cmd+L to start.');
        } else {
          console.error('❌ chatMessages element not found after initialization');
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Error in KairoApp constructor:', error);
    }
  }
  
  initializeElements() {
    console.log('🔍 Initializing DOM elements...');
    
    // Header elements
    this.closeBtn = document.getElementById('close-btn');
    this.minimizeBtn = document.getElementById('minimize-btn');
    
    // Selected text elements
    this.selectedTextDisplay = document.getElementById('selected-text-display');
    this.analyzeBtn = document.getElementById('analyze-btn');
    
    // Smart suggestions
    this.smartSuggestions = document.getElementById('smart-suggestions');
    this.defaultSuggestionsContainer = document.getElementById('default-suggestions');
    this.aiSuggestionsContainer = document.getElementById('ai-suggestions');
    
    // Chat elements
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('send-btn');
    
    // Loading
    this.loadingDiv = document.getElementById('loading');
    
    // Debug: Check if elements exist
    console.log('🔍 Element check:');
    console.log('  chatInput:', !!this.chatInput);
    console.log('  sendBtn:', !!this.sendBtn);
    console.log('  chatMessages:', !!this.chatMessages);
    console.log('  defaultSuggestionsContainer:', !!this.defaultSuggestionsContainer);
    
    if (!this.chatInput) console.error('❌ chatInput not found!');
    if (!this.sendBtn) console.error('❌ sendBtn not found!');
    if (!this.chatMessages) console.error('❌ chatMessages not found!');
    
    // Define default actions
    this.defaultActions = [
      { icon: '🔍', text: 'Fix Grammar', prompt: 'Correct all grammar and spelling mistakes in this text' },
      { icon: '✂️', text: 'Make Concise', prompt: 'Make this text more concise while keeping all important information' },
      { icon: '✍️', text: 'Professional Rewrite', prompt: 'Rewrite this text to be more professional and polished' },
      { icon: '📋', text: 'Summarize', prompt: 'Create a clear, concise summary of this text' },
      { icon: '💬', text: 'Explain Simply', prompt: 'Explain this text in simple terms that anyone can understand' }
    ];
  }
  
  setupEventListeners() {
    console.log('🎧 Setting up event listeners...');
    
    // Header buttons - with null checks
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeWindow());
      console.log('✅ Close button listener added');
    } else {
      console.error('❌ closeBtn not found!');
    }
    
    if (this.minimizeBtn) {
      this.minimizeBtn.addEventListener('click', () => this.minimizeWindow());
      console.log('✅ Minimize button listener added');
    } else {
      console.error('❌ minimizeBtn not found!');
    }
    
    
    // Chat input - with null checks
    if (this.chatInput) {
      this.chatInput.addEventListener('keypress', (e) => {
        console.log('🔤 Key pressed:', e.key);
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          console.log('🚀 Enter pressed, sending message...');
          this.sendMessage();
        }
      });
      
      // Add input event for debugging
      this.chatInput.addEventListener('input', () => {
        console.log('📝 Input changed:', this.chatInput.value);
      });
      
      // Auto-resize chat input
      this.chatInput.addEventListener('input', () => this.autoResizeInput());
      
      console.log('✅ Chat input listeners added');
    } else {
      console.error('❌ chatInput not found!');
    }
    
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => {
        console.log('🖱️ Send button clicked');
        this.sendMessage();
      });
      console.log('✅ Send button listener added');
    } else {
      console.error('❌ sendBtn not found!');
    }
    
    // Listen for captured text
    if (window.electronAPI && window.electronAPI.onCapturedText) {
      window.electronAPI.onCapturedText((text) => this.handleCapturedText(text));
      console.log('✅ Captured text listener added');
    } else {
      console.error('❌ electronAPI.onCapturedText not found!');
    }
    
    // Listen for manual text input in textarea
    if (this.selectedTextDisplay) {
      this.selectedTextDisplay.addEventListener('input', () => {
        console.log('📝 Manual text input detected');
        const text = this.selectedTextDisplay.value;
        if (text.trim()) {
          this.currentText = text;
          this.generateSmartSuggestions(text);
          
          // Enable chat if not already enabled
          if (this.chatInput.disabled) {
            this.chatInput.disabled = false;
            this.sendBtn.disabled = false;
          }
        }
        
        // Enable/disable analyze button based on text
        if (this.analyzeBtn) {
          this.analyzeBtn.disabled = !text.trim();
        }
      });
      
      // Add Enter key support for textarea
      this.selectedTextDisplay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          console.log('🚀 Cmd/Ctrl+Enter pressed in textarea');
          if (this.selectedTextDisplay.value.trim()) {
            this.analyzeBtn.click();
          }
        }
      });
      console.log('✅ Textarea input listener added');
      
      // Also check for enter key in the main window when textarea is focused
      this.selectedTextDisplay.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && this.analyzeBtn && !this.analyzeBtn.disabled) {
          e.preventDefault();
          console.log('🚀 Enter pressed in textarea, triggering analyze');
          this.analyzeBtn.click();
        }
      });
    }
    
    // Analyze button click
    if (this.analyzeBtn) {
      this.analyzeBtn.addEventListener('click', () => {
        console.log('🔍 Analyze button clicked');
        const text = this.selectedTextDisplay.value;
        console.log('📝 Text to analyze:', text);
        
        if (text.trim()) {
          // Clear any previous conversations when analyzing new text
          this.conversation = [];
          this.clearChatMessages();
          
          // Set the current text
          this.currentText = text;
          
          // Show user message - just the text they entered
          this.addMessage('user', text);
          
          // Generate smart suggestions for later use
          this.generateSmartSuggestions(text);
          
          // Enable chat input
          this.chatInput.disabled = false;
          this.sendBtn.disabled = false;
          
          // Send the exact text to ChatGPT
          this.processMessage(text);
          
          // Hide suggestions after analyze
          this.hideSuggestions();
        }
      });
      console.log('✅ Analyze button listener added');
      
      // Initially disable the button if no text
      this.analyzeBtn.disabled = !this.selectedTextDisplay.value.trim();
    }
    
    console.log('✅ Event listeners setup complete');
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Escape to close
      if (e.key === 'Escape') {
        this.closeWindow();
      }
      
      // Cmd/Ctrl + N for new text
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        this.captureNewText();
      }
      
      // Cmd/Ctrl + K to clear chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.clearConversation();
      }
    });
  }
  
  handleCapturedText(text) {
    console.log('📝 New text captured:', text);
    
    this.currentText = text;
    this.conversation = []; // Reset conversation for new text
    
    // Display the full selected text in textarea
    this.selectedTextDisplay.value = text;
    
    // Clear chat and show welcome for new text
    this.clearChatMessages();
    this.addMessage('system', `Ready to analyze your text (${text.length} characters)`);
    
    // Generate smart suggestions
    this.generateSmartSuggestions(text);
    
    // Enable chat input
    this.chatInput.disabled = false;
    this.sendBtn.disabled = false;
    this.chatInput.focus();
  }
  
  async generateSmartSuggestions(text) {
    console.log('🎯 Generating smart suggestions for text:', text.substring(0, 100) + '...');
    
    // First, show default suggestions immediately
    this.showDefaultSuggestions();
    
    // Then generate AI suggestions
    this.generateAISuggestions(text);
    
    // Show suggestions section
    this.smartSuggestions.style.display = 'block';
  }
  
  showDefaultSuggestions() {
    // Clear and populate default suggestions
    this.defaultSuggestionsContainer.innerHTML = '';
    
    this.defaultActions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'suggestion-btn';
      btn.innerHTML = `${action.icon} ${action.text}`;
      
      // Add click handler with debugging
      const clickHandler = () => {
        console.log(`🔧 CLICK DETECTED - Default action: ${action.text}`);
        console.log('Action object:', action);
        console.log('Current text exists:', !!this.currentText);
        this.sendSuggestionMessage(action);
      };
      
      btn.addEventListener('click', clickHandler);
      
      console.log(`✅ Added button for: ${action.text}`);
      this.defaultSuggestionsContainer.appendChild(btn);
    });
  }
  
  async generateAISuggestions(text) {
    // Clear AI suggestions and show loading
    this.aiSuggestionsContainer.innerHTML = '';
    this.showAISuggestionLoading();
    
    try {
      // Get AI-powered suggestions
      const suggestions = await this.textDetector.getSuggestions(text);
      
      console.log('💡 Generated AI suggestions:', suggestions.map(s => s.text));
      
      // Clear loading and show suggestions
      this.aiSuggestionsContainer.innerHTML = '';
      
      // Add new suggestions
      suggestions.forEach((suggestion, index) => {
        const btn = document.createElement('button');
        btn.className = 'suggestion-btn ai-suggestion';
        btn.innerHTML = `${suggestion.icon} ${suggestion.text}`;
        btn.addEventListener('click', () => {
          console.log(`🎯 User clicked AI suggestion: ${suggestion.text}`);
          this.sendSuggestionMessage(suggestion);
        });
        this.aiSuggestionsContainer.appendChild(btn);
      });
      
    } catch (error) {
      console.error('❌ Failed to generate AI suggestions:', error);
      this.showAISuggestionError();
    }
  }
  
  showAISuggestionLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.style.display = 'flex';
    loadingDiv.style.alignItems = 'center';
    loadingDiv.style.gap = '8px';
    loadingDiv.style.padding = '8px 0';
    loadingDiv.style.color = '#667eea';
    loadingDiv.style.fontSize = '12px';
    loadingDiv.innerHTML = `
      <div class="typing-dots" style="scale: 0.6;">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
      <span>🤖 Generating contextual suggestions...</span>
    `;
    this.aiSuggestionsContainer.appendChild(loadingDiv);
  }
  
  showAISuggestionError() {
    this.aiSuggestionsContainer.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.style.padding = '8px 0';
    errorDiv.style.color = '#e53e3e';
    errorDiv.style.fontSize = '12px';
    errorDiv.innerHTML = '❌ AI suggestions unavailable';
    this.aiSuggestionsContainer.appendChild(errorDiv);
  }
  
  sendSuggestionMessage(suggestion) {
    console.log('🎯 Sending suggestion message:', suggestion);
    this.addMessage('user', suggestion.text);
    // Mark this as an analysis request
    this.isAnalysisRequest = true;
    this.processMessage(suggestion.prompt);
    
    // Hide suggestions after selection
    this.hideSuggestions();
  }
  
  sendMessage() {
    console.log('📤 sendMessage() called');
    const message = this.chatInput.value.trim();
    console.log('📝 Message content:', message);
    console.log('🔄 Is processing:', this.isProcessing);
    
    if (!message) {
      console.log('⚠️ No message content, returning');
      return;
    }
    
    if (this.isProcessing) {
      console.log('⚠️ Already processing, returning');
      return;
    }
    
    console.log('✅ Adding user message to chat');
    this.addMessage('user', message);
    this.chatInput.value = '';
    this.autoResizeInput();
    
    console.log('🚀 Starting to process message');
    this.processMessage(message);
    
    // Hide suggestions when user sends a message
    this.hideSuggestions();
  }
  
  async processMessage(prompt) {
    console.log('🚀 Processing message:', prompt);
    console.log('🔄 isProcessing before check:', this.isProcessing);
    console.log('📝 Current text:', this.currentText);
    console.log('📝 Current text length:', this.currentText ? this.currentText.length : 0);
    
    if (!this.currentText || !this.currentText.trim()) {
      console.error('❌ No text to analyze!');
      this.addMessage('assistant', 'Please add some text to analyze first.');
      return;
    }
    
    this.isProcessing = true;
    this.showTypingIndicator();
    this.disableInput();
    
    try {
      // Build context for OpenAI
      const fullPrompt = this.buildContextualPrompt(prompt);
      console.log('📝 Full prompt:', fullPrompt);
      
      const apiKey = await window.electronAPI.getApiKey();
      console.log('🔑 API key exists:', !!apiKey);
      
      if (!apiKey) {
        throw new Error('OpenAI API key not found. Please add OPENAI_API_KEY to your .env file.');
      }
      
      const requestBody = {
        model: 'gpt-3.5-turbo',
        messages: this.buildConversationHistory(fullPrompt),
        temperature: 0.7,
        max_tokens: 1000
      };
      
      console.log('📤 Sending request to OpenAI:', requestBody);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ API Response:', data);
      
      const aiResponse = data.choices[0].message.content.trim();
      console.log('💬 AI Response:', aiResponse);
      
      this.hideTypingIndicator();
      this.addMessage('assistant', aiResponse);
      
      // Add to conversation history
      this.conversation.push(
        { role: 'user', content: prompt },
        { role: 'assistant', content: aiResponse }
      );
      
    } catch (error) {
      console.error('❌ Processing error:', error);
      this.hideTypingIndicator();
      this.addMessage('assistant', `Error: ${error.message}`);
    } finally {
      this.isProcessing = false;
      this.enableInput();
    }
  }
  
  buildContextualPrompt(userPrompt) {
    // Only add context if this is specifically an analysis request from suggestions
    if (this.isAnalysisRequest) {
      this.isAnalysisRequest = false; // Reset the flag
      return `You are analyzing this text: "${this.currentText}"\n\nUser request: ${userPrompt}`;
    }
    
    // For ALL other cases (typed messages, analyze button, etc.), send directly
    return userPrompt;
  }
  
  buildConversationHistory(currentPrompt) {
    const messages = [
      {
        role: 'system',
        content: `You are Kairo, an intelligent AI assistant that acts at the perfect moment. You help users analyze, improve, and understand text. Always provide helpful, accurate, and concise responses. The user has selected this text to analyze: "${this.currentText}"`
      }
    ];
    
    // Add conversation history
    this.conversation.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });
    
    // Add current prompt
    messages.push({
      role: 'user',
      content: currentPrompt
    });
    
    return messages;
  }
  
  addMessage(type, content) {
    console.log(`💬 Adding message - Type: ${type}, Content: ${content.substring(0, 100)}...`);
    console.log(`🔍 chatMessages exists:`, !!this.chatMessages);
    
    if (!this.chatMessages) {
      console.error(`❌ chatMessages element not found! Cannot add message.`);
      return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    if (type === 'assistant') {
      messageDiv.innerHTML = `
        ${content}
        <button class="message-copy-btn" onclick="window.kairoApp.copyMessage('${content.replace(/'/g, "\\'")}')">📋</button>
      `;
    } else if (type === 'system') {
      messageDiv.innerHTML = `<em>${content}</em>`;
      messageDiv.style.fontStyle = 'italic';
      messageDiv.style.opacity = '0.8';
      messageDiv.style.textAlign = 'center';
    } else {
      messageDiv.textContent = content;
    }
    
    console.log(`📝 Created message div:`, messageDiv);
    console.log(`📋 Current chatMessages children:`, this.chatMessages.children.length);
    
    this.chatMessages.appendChild(messageDiv);
    
    console.log(`📋 After append - chatMessages children:`, this.chatMessages.children.length);
    
    this.scrollToBottom();
    
    console.log(`✅ Message added to chat`);
  }
  
  showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    
    this.chatMessages.appendChild(typingDiv);
    this.scrollToBottom();
  }
  
  hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }
  
  async copyMessage(content) {
    try {
      await window.electronAPI.copyToClipboard(content);
      // Show brief success feedback
      const btn = event.target;
      const originalText = btn.textContent;
      btn.textContent = '✅';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }
  
  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }
  
  autoResizeInput() {
    this.chatInput.style.height = 'auto';
    this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
  }
  
  disableInput() {
    this.chatInput.disabled = true;
    this.sendBtn.disabled = true;
  }
  
  enableInput() {
    this.chatInput.disabled = false;
    this.sendBtn.disabled = false;
    this.chatInput.focus();
  }
  
  clearConversation() {
    this.conversation = [];
    this.clearChatMessages();
    if (this.currentText) {
      this.addMessage('system', 'Conversation cleared. You can continue analyzing the same text.');
    }
  }
  
  clearChatMessages() {
    this.chatMessages.innerHTML = '';
  }
  
  captureNewText() {
    // This would trigger the main process to capture new text
    // For now, we'll just show a message
    this.addMessage('system', 'Press Cmd+L to capture new text from anywhere on your screen.');
  }
  
  closeWindow() {
    window.electronAPI.hideWindow();
  }
  
  minimizeWindow() {
    window.electronAPI.minimizeWindow();
  }
  
  hideSuggestions() {
    console.log('👁️ Hiding suggestions section');
    if (this.smartSuggestions) {
      this.smartSuggestions.style.display = 'none';
    }
  }
  
  showSuggestions() {
    console.log('👁️ Showing suggestions section');
    if (this.smartSuggestions) {
      this.smartSuggestions.style.display = 'block';
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, initializing Kairo...');
  window.kairoApp = new KairoApp();
  console.log('✨ Kairo Chat Interface Initialized!');
  
  // Add debug functions to window for debugging
  window.testFunction = () => {
    console.log('✅ Test function works!');
    window.kairoApp.addMessage('system', 'Test message from console');
  };
  
  window.debugChat = () => {
    console.log('=== CHAT DEBUG ===');
    console.log('chatMessages element:', window.kairoApp.chatMessages);
    console.log('chatMessages children count:', window.kairoApp.chatMessages?.children.length);
    console.log('chatMessages innerHTML length:', window.kairoApp.chatMessages?.innerHTML.length);
    console.log('chatMessages visible:', window.getComputedStyle(window.kairoApp.chatMessages).display !== 'none');
    console.log('chatMessages scroll info:', {
      scrollTop: window.kairoApp.chatMessages?.scrollTop,
      scrollHeight: window.kairoApp.chatMessages?.scrollHeight,
      clientHeight: window.kairoApp.chatMessages?.clientHeight
    });
    
    // Log each message
    if (window.kairoApp.chatMessages) {
      Array.from(window.kairoApp.chatMessages.children).forEach((child, index) => {
        console.log(`Message ${index}:`, child.className, child.textContent.substring(0, 50));
      });
    }
  };
  
  console.log('🧪 Debug functions added: testFunction(), debugChat()');
});