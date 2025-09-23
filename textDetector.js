// AI-Powered Smart Text Detection System
class TextDetector {
  constructor() {
    this.isGeneratingSuggestions = false;
    this.patterns = {
      email: {
        indicators: ['dear', 'hi ', 'hello', 'best regards', 'sincerely', 'thank you', '@', 'subject:', 'cc:', 'bcc:'],
        suggestions: [
          { icon: '📧', text: 'Make more formal', prompt: 'Rewrite this email to be more formal and professional' },
          { icon: '😊', text: 'Make friendlier', prompt: 'Rewrite this email to be more friendly and approachable' },
          { icon: '📞', text: 'Add call-to-action', prompt: 'Add a clear call-to-action to this email' },
          { icon: '✂️', text: 'Make concise', prompt: 'Make this email more concise while keeping all important information' }
        ]
      },
      
      code: {
        indicators: ['function', 'const', 'let', 'var', '=>', 'import', 'export', 'class', 'return', '{}', '();', 'if (', 'for (', 'while ('],
        suggestions: [
          { icon: '💡', text: 'Explain code', prompt: 'Explain what this code does in simple terms' },
          { icon: '🐛', text: 'Find bugs', prompt: 'Analyze this code for potential bugs, errors, or improvements' },
          { icon: '💬', text: 'Add comments', prompt: 'Add helpful comments to explain this code' },
          { icon: '⚡', text: 'Optimize', prompt: 'Suggest optimizations to improve this code\'s performance' }
        ]
      },
      
      academic: {
        indicators: ['therefore', 'furthermore', 'however', 'moreover', 'consequently', 'thesis', 'hypothesis', 'research', 'study', 'analysis', 'conclusion'],
        suggestions: [
          { icon: '💪', text: 'Strengthen argument', prompt: 'Help strengthen the arguments in this academic text' },
          { icon: '📊', text: 'Add evidence', prompt: 'Suggest what kind of evidence would support this academic text' },
          { icon: '🔗', text: 'Improve flow', prompt: 'Improve the transitions and flow between ideas in this text' },
          { icon: '📚', text: 'Academic style', prompt: 'Improve the academic writing style and tone of this text' }
        ]
      },
      
      social: {
        indicators: ['#', '@', '😀', '😊', '👍', '❤️', 'lol', 'omg', 'btw', 'check out', 'follow me'],
        suggestions: [
          { icon: '#️⃣', text: 'Add hashtags', prompt: 'Suggest relevant hashtags for this social media post' },
          { icon: '🔥', text: 'Make engaging', prompt: 'Rewrite this social media post to be more engaging and viral' },
          { icon: '📱', text: 'Call-to-action', prompt: 'Add an effective call-to-action to this social media post' },
          { icon: '📈', text: 'Optimize reach', prompt: 'Optimize this post for maximum social media reach and engagement' }
        ]
      },
      
      business: {
        indicators: ['pursuant to', 'hereby', 'agreement', 'contract', 'terms', 'conditions', 'liability', 'whereas', 'stakeholder'],
        suggestions: [
          { icon: '💼', text: 'Simplify language', prompt: 'Simplify the business language while maintaining professionalism' },
          { icon: '🔍', text: 'Check clarity', prompt: 'Check this business text for ambiguity and improve clarity' },
          { icon: '📋', text: 'Add structure', prompt: 'Improve the structure and organization of this business document' },
          { icon: '⚖️', text: 'Professional tone', prompt: 'Enhance the professional tone of this business text' }
        ]
      },
      
      creative: {
        indicators: ['"', 'said', 'chapter', 'once upon', 'character', 'plot', 'story', 'narrative', 'dialogue'],
        suggestions: [
          { icon: '🎨', text: 'Enhance descriptions', prompt: 'Add more vivid and descriptive language to this creative writing' },
          { icon: '💬', text: 'Improve dialogue', prompt: 'Make the dialogue in this text more natural and engaging' },
          { icon: '👂', text: 'Add sensory details', prompt: 'Add sensory details (sight, sound, smell, touch, taste) to this writing' },
          { icon: '⏱️', text: 'Check pacing', prompt: 'Analyze and suggest improvements to the pacing of this narrative' }
        ]
      },
      
      data: {
        indicators: ['•', '-', '1.', '2.', '3.', '\t', ',', '|', 'total', 'sum', 'average', 'percentage'],
        suggestions: [
          { icon: '📊', text: 'Create table', prompt: 'Convert this data into a well-formatted table' },
          { icon: '🔢', text: 'Sort data', prompt: 'Sort and organize this data in a logical order' },
          { icon: '💡', text: 'Extract insights', prompt: 'Analyze this data and extract key insights and patterns' },
          { icon: '📝', text: 'Summarize', prompt: 'Create a concise summary of the key points from this data' }
        ]
      }
    };
  }
  
  detectTextType(text) {
    const lowercaseText = text.toLowerCase();
    const scores = {};
    
    console.log('🔍 Analyzing text:', text.substring(0, 50) + '...');
    
    // Calculate confidence scores for each type
    for (const [type, config] of Object.entries(this.patterns)) {
      let score = 0;
      let matches = 0;
      let matchedIndicators = [];
      
      for (const indicator of config.indicators) {
        if (lowercaseText.includes(indicator.toLowerCase())) {
          matches++;
          matchedIndicators.push(indicator);
          // Give higher weight to longer, more specific indicators
          score += indicator.length > 3 ? 2 : 1;
        }
      }
      
      // Boost score for text type specific patterns
      if (type === 'email' && (text.includes('@') || lowercaseText.includes('subject:'))) {
        score += 5;
      }
      if (type === 'code' && (text.includes('()') || text.includes('{') || text.includes(';'))) {
        score += 3;
      }
      if (type === 'social' && text.length < 280) { // Twitter-like length
        score += 2;
      }
      
      // Normalize score based on text length and number of possible indicators
      const confidence = Math.min(score / Math.max(Math.sqrt(text.length / 100), 1), 1);
      
      scores[type] = {
        score: score,
        matches: matches,
        confidence: confidence,
        matchedIndicators: matchedIndicators,
        suggestions: config.suggestions
      };
      
      console.log(`📊 ${type}: score=${score}, matches=${matches}, confidence=${confidence.toFixed(2)}, indicators=[${matchedIndicators.join(', ')}]`);
    }
    
    // Find the best match
    const bestMatch = Object.entries(scores).reduce((best, [type, data]) => {
      return data.score > best.score ? { type, ...data } : best;
    }, { score: 0, type: 'general', confidence: 0 });
    
    console.log(`🏆 Best match: ${bestMatch.type} (score: ${bestMatch.score}, confidence: ${bestMatch.confidence?.toFixed(2)})`);
    
    // Return general suggestions if confidence is too low
    if (bestMatch.confidence < 0.2) {
      console.log('📝 Using general suggestions due to low confidence');
      return {
        type: 'general',
        confidence: 1,
        suggestions: [
          { icon: '🔍', text: 'Fix Grammar', prompt: 'Correct the grammar and spelling in this text' },
          { icon: '✍️', text: 'Rewrite', prompt: 'Rewrite this text to be more polite and professional' },
          { icon: '💡', text: 'Explain', prompt: 'Explain the main points of this text in simple terms' },
          { icon: '📋', text: 'Summarize', prompt: 'Create a concise summary of this text' }
        ]
      };
    }
    
    return bestMatch;
  }
  
  // AI-powered suggestion generation
  async generateAISuggestions(text) {
    if (this.isGeneratingSuggestions) {
      return this.getFallbackSuggestions();
    }
    
    this.isGeneratingSuggestions = true;
    
    try {
      console.log('🤖 Generating AI-powered suggestions for text...');
      
      const apiKey = await window.electronAPI.getApiKey();
      if (!apiKey) {
        console.log('⚠️ No API key found, using fallback suggestions');
        return this.getFallbackSuggestions();
      }
      
      const prompt = `Analyze this text and suggest 4 specific, actionable tasks I could perform on it. Each suggestion should be:
1. Specific to the content and context
2. Practically useful for improving or working with this text
3. Different from each other
4. Concise (2-4 words max)

Text to analyze: "${text}"

Respond with a JSON array in this exact format:
[
  {"icon": "🔍", "text": "Action Name", "prompt": "Detailed instruction for AI"},
  {"icon": "✍️", "text": "Action Name", "prompt": "Detailed instruction for AI"},
  {"icon": "💡", "text": "Action Name", "prompt": "Detailed instruction for AI"},
  {"icon": "🎯", "text": "Action Name", "prompt": "Detailed instruction for AI"}
]

Choose appropriate icons from: 🔍📝✍️💡🎯📊🔧⚡📋🌟💬🎨📈🔀🎪📚⚖️🌍🎵`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at analyzing text and suggesting useful actions. Always respond with valid JSON only, no additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        console.error('❌ AI suggestion API failed:', response.status);
        return this.getFallbackSuggestions();
      }
      
      const data = await response.json();
      const aiResponse = data.choices[0].message.content.trim();
      
      try {
        const suggestions = JSON.parse(aiResponse);
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          console.log('✅ AI suggestions generated:', suggestions.map(s => s.text));
          return suggestions;
        } else {
          console.error('❌ Invalid AI response format');
          return this.getFallbackSuggestions();
        }
      } catch (parseError) {
        console.error('❌ Failed to parse AI response:', parseError);
        console.log('Raw response:', aiResponse);
        return this.getFallbackSuggestions();
      }
      
    } catch (error) {
      console.error('❌ AI suggestion generation failed:', error);
      return this.getFallbackSuggestions();
    } finally {
      this.isGeneratingSuggestions = false;
    }
  }
  
  getFallbackSuggestions() {
    return [
      { icon: '🔍', text: 'Fix Grammar', prompt: 'Correct the grammar and spelling in this text' },
      { icon: '✍️', text: 'Rewrite', prompt: 'Rewrite this text to be more clear and professional' },
      { icon: '💡', text: 'Explain', prompt: 'Explain the main points of this text in simple terms' },
      { icon: '📋', text: 'Summarize', prompt: 'Create a concise summary of this text' }
    ];
  }
  
  // Get suggestions for a specific text (now AI-powered!)
  async getSuggestions(text) {
    // First try AI-powered suggestions
    const aiSuggestions = await this.generateAISuggestions(text);
    if (aiSuggestions && aiSuggestions.length > 0) {
      return aiSuggestions;
    }
    
    // Fallback to pattern-based if AI fails
    const detection = this.detectTextType(text);
    console.log(`Detected text type: ${detection.type} (confidence: ${detection.confidence.toFixed(2)})`);
    return detection.suggestions;
  }
}

// Export for use in renderer
window.TextDetector = TextDetector;