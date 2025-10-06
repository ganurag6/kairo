// Renderer memory tracker
class RendererMemoryTracker {
  constructor() {
    this.operations = [];
    this.logCount = 0;
  }
  
  log(operation, details = '') {
    this.logCount++;
    
    if (performance && performance.memory) {
      const memory = performance.memory;
      const stats = {
        operation,
        details,
        usedMB: (memory.usedJSHeapSize / 1024 / 1024).toFixed(1),
        totalMB: (memory.totalJSHeapSize / 1024 / 1024).toFixed(1),
        limitMB: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1),
        usage: ((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1)
      };
      
      console.log(`[RENDERER-${this.logCount}] ${operation} - Memory: ${stats.usedMB}MB/${stats.limitMB}MB (${stats.usage}%)`);
      if (details) console.log(`  Details: ${details}`);
      
      this.operations.push(stats);
      if (this.operations.length > 50) this.operations.shift();
      
      // Alert if memory is high
      if (parseFloat(stats.usage) > 80) {
        console.error(`🚨 RENDERER HIGH MEMORY: ${stats.usage}% of limit used!`);
        this.analyzeGrowth();
      }
    }
  }
  
  analyzeGrowth() {
    if (this.operations.length < 5) return;
    console.log('\n📊 RENDERER MEMORY GROWTH:');
    this.operations.slice(-5).forEach((op, i) => {
      console.log(`  ${op.operation}: ${op.usedMB}MB`);
    });
  }
}

const rendererTracker = new RendererMemoryTracker();

// New Chat-based Kairo Renderer
class KairoApp {
  constructor() {
    console.log('🚀 KairoApp constructor called');
    rendererTracker.log('KairoApp:constructor:start');
    
    try {
      // Check if TextDetector is available
      if (typeof TextDetector === 'undefined') {
        console.error('❌ TextDetector not found! textDetector.js may not be loaded');
        // Create a fallback
        this.textDetector = {
          getSuggestions: () => [
            { text: 'Make Concise', prompt: 'Make this text more concise while keeping all important information' },
            { text: 'Explain', prompt: 'Explain this text in simple, easy-to-understand terms' },
            { text: 'Save Task', prompt: 'save-task' },
            { text: 'Save Note', prompt: 'save-note' },
            { text: 'Custom', prompt: 'custom' }
          ]
        };
      } else {
        this.textDetector = new TextDetector();
      }
      
      this.conversation = [];
      this.maxConversationLength = 20; // Limit conversation history to prevent memory issues
      this.currentText = '';
      this.isProcessing = false;
      this.isAnalysisRequest = false;
      
      console.log('🔧 Initializing elements...');
      rendererTracker.log('initializeElements:start');
      this.initializeElements();
      rendererTracker.log('initializeElements:complete');
      
      console.log('🎧 Setting up event listeners...');
      rendererTracker.log('setupEventListeners:start');
      this.setupEventListeners();
      rendererTracker.log('setupEventListeners:complete');
      
      console.log('⌨️ Setting up keyboard shortcuts...');
      rendererTracker.log('setupKeyboardShortcuts:start');
      this.setupKeyboardShortcuts();
      rendererTracker.log('setupKeyboardShortcuts:complete');
      
      console.log('✅ KairoApp initialized successfully');
      
      // Add an immediate test message
      setTimeout(() => {
        if (this.chatMessages) {
          console.log('🧪 Adding test message...');
          rendererTracker.log('addTestMessage:start');
          this.addMessage('system', 'Kairo is ready! Select text and press Cmd+K to start.');
          rendererTracker.log('addTestMessage:complete');
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
    this.clearBtn = document.getElementById('clear-btn');
    
    // Selected text elements
    this.selectedTextDisplay = document.getElementById('selected-text-display');
    this.analyzeBtn = document.getElementById('analyze-btn');
    
    // Smart suggestions
    this.smartSuggestions = document.getElementById('smart-suggestions');
    this.defaultSuggestionsContainer = document.getElementById('default-suggestions');
    this.aiSuggestionsContainer = document.getElementById('ai-suggestions');
    
    // Tab elements
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabPanes = document.querySelectorAll('.tab-pane');
    
    // Chat elements
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('send-btn');
    
    // Tasks elements
    this.tasksList = document.getElementById('tasks-list');
    this.refreshTasksBtn = document.getElementById('refresh-tasks');
    
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
    
    // Define default actions (matching the 5 options from textDetector)
    this.defaultActions = [
      { text: 'Make Concise', prompt: 'Make this text more concise while keeping all important information' },
      { text: 'Explain', prompt: 'Explain this text in simple, easy-to-understand terms' },
      { text: 'Save Task', prompt: 'save-task' },
      { text: 'Save Note', prompt: 'save-note' },
      { text: 'Custom', prompt: 'custom' }
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
    
    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => this.clearChat());
      console.log('✅ Clear button listener added');
    } else {
      console.error('❌ clearBtn not found!');
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
    
    // Listen for suggestion clicks from action picker
    if (window.electronAPI && window.electronAPI.onSuggestionClicked) {
      window.electronAPI.onSuggestionClicked((suggestion) => this.handleSuggestionFromActionPicker(suggestion));
      console.log('✅ Suggestion clicked listener added');
    }
    
    // Tab switching
    this.tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const targetTab = e.target.dataset.tab;
        this.switchTab(targetTab);
      });
    });
    
    // Tasks refresh button
    if (this.refreshTasksBtn) {
      // Temporarily disabled to test memory issue
      // this.refreshTasksBtn.addEventListener('click', () => this.loadTasks());
      console.log('✅ Refresh tasks button listener disabled for testing');
    }
    
    // DISABLED - Listen for task saved events
    // if (window.electronAPI && window.electronAPI.onTaskSaved) {
    //   window.electronAPI.onTaskSaved((task) => {
    //     console.log('📌 Task saved event received:', task);
    //     // Temporarily disabled to test memory issue
    //     // this.loadTasks(); // Refresh task list
    //   });
    //   console.log('✅ Task saved listener added (but loadTasks disabled for testing)');
    // }
    
    // Listen for manual text input in textarea
    if (this.selectedTextDisplay) {
      // Input event listener - only enable/disable analyze button
      this.selectedTextDisplay.addEventListener('input', () => {
        console.log('📝 Manual text input detected');
        const text = this.selectedTextDisplay.value;
        
        // Just enable/disable analyze button - no suggestions
        if (this.analyzeBtn) {
          this.analyzeBtn.disabled = !text.trim();
        }
        
        // Update current text for analyze button to use
        this.currentText = text;
        
        // Auto-resize the textarea
        this.autoResizeTextArea();
        
        // Enable chat if not already enabled
        if (this.chatInput && this.chatInput.disabled) {
          this.chatInput.disabled = false;
        }
        if (this.sendBtn && this.sendBtn.disabled) {
          this.sendBtn.disabled = false;
        }
      });
      
      // Add Enter key handler for analyze
      this.selectedTextDisplay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const text = this.selectedTextDisplay.value.trim();
          if (text && this.analyzeBtn && !this.analyzeBtn.disabled) {
            console.log('🚀 Enter pressed in textarea, triggering analyze');
            this.analyzeBtn.click();
          }
        }
      });
      console.log('✅ Textarea enter key listener added');
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
    
    // Auto-resize the textarea based on content
    this.autoResizeTextArea();
    
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
  
  handleSuggestionFromActionPicker(suggestion) {
    console.log('🎯 Suggestion clicked from action picker:', suggestion);
    
    // Show the action as a user message
    this.addMessage('user', suggestion.text);
    
    // Mark this as an analysis request and process it
    this.isAnalysisRequest = true;
    this.processMessage(suggestion.prompt);
    
    // Hide suggestions after selection
    this.hideSuggestions();
  }
  
  async generateSmartSuggestions(text) {
    console.log('🎯 Generating smart suggestions for text:', text.substring(0, 100) + '...');
    
    // First, show default suggestions immediately
    this.showDefaultSuggestions();
    
    // Then generate AI suggestions
    this.generateAISuggestions(text);
    
    // Show suggestions section
    this.smartSuggestions.style.display = 'block';
    
    // Show AI Actions section
    const aiActionsSection = document.getElementById('ai-actions');
    if (aiActionsSection) {
      aiActionsSection.style.display = 'block';
    }
  }
  
  showDefaultSuggestions() {
    // Clear and populate default suggestions
    this.defaultSuggestionsContainer.innerHTML = '';
    
    this.defaultActions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'suggestion-btn';
      btn.textContent = action.text;
      
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
        btn.textContent = suggestion.text;
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
    rendererTracker.log('processMessage:start', `prompt: ${prompt.substring(0, 50)}...`);
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
      console.log('🔑 API key length:', apiKey?.length);
      console.log('🔑 API key preview:', apiKey?.substring(0, 10) + '...' + apiKey?.substring(apiKey.length - 10));
      
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
      
      // Add to conversation history with memory management
      this.conversation.push(
        { role: 'user', content: prompt },
        { role: 'assistant', content: aiResponse }
      );
      
      // Trim conversation history to prevent memory overflow
      if (this.conversation.length > this.maxConversationLength) {
        // Keep system message if present, then trim oldest messages
        const hasSystemMessage = this.conversation[0]?.role === 'system';
        if (hasSystemMessage) {
          this.conversation = [this.conversation[0], ...this.conversation.slice(-this.maxConversationLength + 1)];
        } else {
          this.conversation = this.conversation.slice(-this.maxConversationLength);
        }
      }
      
    } catch (error) {
      console.error('❌ Processing error:', error);
      this.hideTypingIndicator();
      this.addMessage('assistant', `Error: ${error.message}`);
    } finally {
      this.isProcessing = false;
      this.enableInput();
      rendererTracker.log('processMessage:complete');
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
    
    // Limit DOM messages to prevent memory issues
    const maxDomMessages = 50;
    const currentMessages = this.chatMessages.querySelectorAll('.message');
    if (currentMessages.length >= maxDomMessages) {
      // Remove oldest messages, keeping at least the last 40
      const messagesToRemove = currentMessages.length - 40;
      for (let i = 0; i < messagesToRemove; i++) {
        const oldMessage = currentMessages[i];
        // Remove event listeners before removing element
        const copyBtn = oldMessage.querySelector('.message-copy-btn');
        if (copyBtn) {
          copyBtn.replaceWith(copyBtn.cloneNode(true));
        }
        oldMessage.remove();
      }
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    if (type === 'assistant') {
      messageDiv.innerHTML = `
        ${content}
        <button class="message-copy-btn" data-copy-text="${content.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}">📋</button>
      `;
      
      // Add event listener to the copy button
      const copyBtn = messageDiv.querySelector('.message-copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
          const textToCopy = e.target.getAttribute('data-copy-text');
          this.copyMessage(e, textToCopy);
        });
      }
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
  
  async copyMessage(event, content) {
    console.log('📋 Copy button clicked, content:', content);
    try {
      // Decode HTML entities and clean content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const cleanContent = tempDiv.textContent || tempDiv.innerText || '';
      
      console.log('📋 Cleaned content for copying:', cleanContent);
      
      await window.electronAPI.copyToClipboard(cleanContent);
      console.log('✅ Content copied to clipboard successfully');
      
      // Show brief success feedback on button
      const btn = event.target;
      const originalText = btn.textContent;
      btn.textContent = '✅';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1000);
      
      // Show "Copied!" notification
      this.showCopiedNotification();
      
    } catch (error) {
      console.error('❌ Copy failed:', error);
      // Show error feedback
      const btn = event.target;
      const originalText = btn.textContent;
      btn.textContent = '❌';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1000);
    }
  }
  
  showCopiedNotification() {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = 'Copied to clipboard!';
    
    // Add to container
    document.body.appendChild(notification);
    
    // Remove after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 2000);
  }
  
  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }
  
  autoResizeInput() {
    this.chatInput.style.height = 'auto';
    this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
  }
  
  autoResizeTextArea() {
    if (!this.selectedTextDisplay) return;
    
    // Reset height to auto to get accurate scrollHeight
    this.selectedTextDisplay.style.height = 'auto';
    
    // Calculate the desired height based on content
    let desiredHeight = this.selectedTextDisplay.scrollHeight;
    
    // Set min and max constraints
    const minHeight = 80; // Minimum height in pixels
    const maxHeight = 250; // Maximum height in pixels (increased from CSS 150px for very long texts)
    
    // Apply the calculated height with constraints
    const finalHeight = Math.max(minHeight, Math.min(desiredHeight, maxHeight));
    this.selectedTextDisplay.style.height = finalHeight + 'px';
    
    console.log(`📐 Text area resized: content=${desiredHeight}px, final=${finalHeight}px`);
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
    this.addMessage('system', 'Press Cmd+K to capture new text from anywhere on your screen.');
  }
  
  closeWindow() {
    window.electronAPI.hideWindow();
  }
  
  minimizeWindow() {
    window.electronAPI.minimizeWindow();
  }
  
  clearChat() {
    console.log('🗑️ Clearing chat...');
    // Clear conversation history
    this.conversation = [];
    
    // Clear chat messages display
    if (this.chatMessages) {
      this.chatMessages.innerHTML = '';
    }
    
    // Clear current text
    this.currentText = '';
    if (this.selectedTextDisplay) {
      this.selectedTextDisplay.value = '';
    }
    
    // Show smart suggestions section but hide AI suggestions
    if (this.smartSuggestions) {
      this.smartSuggestions.style.display = 'flex';
    }
    
    // Hide AI Actions section when no text
    const aiActionsSection = document.getElementById('ai-actions');
    if (aiActionsSection) {
      aiActionsSection.style.display = 'none';
    }
    
    // Clear AI suggestions
    if (this.aiSuggestionsContainer) {
      this.aiSuggestionsContainer.innerHTML = '<p class="loading">Ready to analyze text...</p>';
    }
    
    console.log('✅ Chat cleared');
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
  
  // Tab Management
  switchTab(tabName) {
    console.log('🔄 Switching to tab:', tabName);
    
    // Update tab buttons
    this.tabButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      }
    });
    
    // Update tab panes
    this.tabPanes.forEach(pane => {
      pane.classList.remove('active');
      if (pane.id === `${tabName}-tab`) {
        pane.classList.add('active');
      }
    });
    
    // Load data for specific tabs
    // Temporarily disabled to test memory issue
    // if (tabName === 'tasks') {
    //   this.loadTasks();
    // }
  }
  
  // Task Management
  async loadTasks() {
    console.log('📋 Loading tasks...');
    
    if (!this.tasksList) {
      console.error('❌ Tasks list element not found');
      return;
    }
    
    try {
      // Show loading state
      this.tasksList.innerHTML = '<div class="tasks-loading">Loading tasks...</div>';
      
      const result = await window.electronAPI.getTasks();
      
      if (result.success) {
        this.displayTasks(result.tasks);
      } else {
        console.error('❌ Failed to load tasks:', result.error);
        this.tasksList.innerHTML = '<div class="tasks-empty">Failed to load tasks</div>';
      }
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      this.tasksList.innerHTML = '<div class="tasks-empty">Error loading tasks</div>';
    }
  }
  
  displayTasks(tasks) {
    console.log('📋 Displaying tasks:', tasks.length);
    
    if (!tasks || tasks.length === 0) {
      this.tasksList.innerHTML = '<div class="tasks-empty">No tasks yet. Select text and click "Save Task" to get started!</div>';
      return;
    }
    
    // Group tasks by status and date
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    let html = '';
    
    if (pendingTasks.length > 0) {
      html += '<div class="task-section"><h4>Pending Tasks</h4>';
      pendingTasks.forEach(task => {
        html += this.createTaskHTML(task);
      });
      html += '</div>';
    }
    
    if (completedTasks.length > 0) {
      html += '<div class="task-section"><h4>Completed</h4>';
      completedTasks.forEach(task => {
        html += this.createTaskHTML(task);
      });
      html += '</div>';
    }
    
    this.tasksList.innerHTML = html;
    
    // Add event listeners to checkboxes
    this.tasksList.querySelectorAll('.task-checkbox').forEach(checkbox => {
      checkbox.addEventListener('click', (e) => {
        const taskId = e.target.dataset.taskId;
        const isCompleted = e.target.classList.contains('completed');
        this.toggleTask(taskId, !isCompleted);
      });
    });
  }
  
  createTaskHTML(task) {
    const isCompleted = task.status === 'completed';
    const dueInfo = this.formatDueDate(task.dueDate);
    
    return `
      <div class="task-item">
        <div class="task-header">
          <div class="task-checkbox ${isCompleted ? 'completed' : ''}" data-task-id="${task.id}"></div>
          <div class="task-text ${isCompleted ? 'completed' : ''}">${task.text}</div>
        </div>
        <div class="task-meta">
          ${dueInfo ? `<span class="task-due ${dueInfo.class}">${dueInfo.text}</span>` : ''}
          ${task.tags && task.tags.length > 0 ? task.tags.map(tag => `<span class="task-tag">${tag}</span>`).join('') : ''}
          <span class="task-created">${this.formatDate(task.createdAt)}</span>
        </div>
      </div>
    `;
  }
  
  formatDueDate(dueDate) {
    if (!dueDate) return null;
    
    const due = new Date(dueDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    
    if (dueDay.getTime() === today.getTime()) {
      return { text: 'Due Today', class: 'today' };
    } else if (dueDay < today) {
      return { text: 'Overdue', class: 'overdue' };
    } else {
      const diffDays = Math.ceil((dueDay - today) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        return { text: 'Due Tomorrow', class: '' };
      } else if (diffDays <= 7) {
        return { text: `Due in ${diffDays} days`, class: '' };
      } else {
        return { text: due.toLocaleDateString(), class: '' };
      }
    }
  }
  
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  async toggleTask(taskId, completed) {
    try {
      const result = await window.electronAPI.updateTask(taskId, {
        status: completed ? 'completed' : 'pending'
      });
      
      if (result.success) {
        console.log('✅ Task updated successfully');
        // Temporarily disabled to test memory issue
        // this.loadTasks(); // Refresh the list
      } else {
        console.error('❌ Failed to update task:', result.error);
      }
    } catch (error) {
      console.error('❌ Error updating task:', error);
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM loaded, initializing Kairo...');
  rendererTracker.log('DOM:loaded');
  window.kairoApp = new KairoApp();
  console.log('✨ Kairo Chat Interface Initialized!');
  rendererTracker.log('KairoApp:initialized');
  
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