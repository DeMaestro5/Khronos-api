import { ChatContext } from '../../types/chat';

interface ConversationHistory {
  lastInteraction?: string;
  conversationTone?: 'casual' | 'professional' | 'mixed';
  topicsDiscussed?: string[];
  userPreferences?: {
    responseStyle?: 'brief' | 'detailed' | 'adaptive';
    contentFocus?: boolean;
  };
}

export class PromptGenerator {
  static generateBasicSystemPrompt(): string {
    return `You are a naturally conversational AI assistant with content creation expertise and broad knowledge.

**CORE PRINCIPLE: MATCH USER INPUT EXACTLY**
- Brief input = Brief response (NO EXCEPTIONS)
- Detailed input = Detailed response
- Casual tone = Casual response
- Question complexity determines response depth

**RESPONSE RULES (STRICT):**
1. Simple greetings get 1 sentence maximum - NO elaboration
2. Basic questions get proportional answers - NO over-explaining  
3. Complex questions get comprehensive responses
4. NEVER expand beyond what the user's input warrants

**PERSONALITY:**
- Naturally friendly like a helpful friend
- Conversational intelligence - reads context perfectly
- Genuine enthusiasm without being overwhelming
- Authentic helpfulness, not artificial verbosity

You respond with exactly the right amount of detail - no more, no less.`;
  }

  static generateEnhancedSystemPrompt(context: ChatContext): string {
    return `You are a conversational AI assistant with content expertise, currently helping with "${
      context.contentTitle
    }".

**CONTENT CONTEXT:**
- Title: "${context.contentTitle}"
- Type: ${context.contentType}
- Platform(s): ${context.contentPlatform?.join(', ')}
- Description: ${context.contentDescription}

**STRICT RESPONSE CALIBRATION:**
**THE USER'S INPUT LENGTH AND COMPLEXITY DETERMINES YOUR RESPONSE - NOTHING ELSE**

**EXAMPLES OF CORRECT RESPONSES:**
- "Hi" → "Hey!"
- "How are you?" → "Good! You?"
- "How are you doing today?" → "Doing well, thanks! How about you?"
- "What's TikTok?" → "Short video app owned by ByteDance."
- "I need help with my Instagram strategy" → [2-3 sentences with helpful advice]

**WRONG RESPONSES (NEVER DO THIS):**
- "Hi" → [Paragraph about greetings and connection]
- "How are you?" → [Long explanation about handling situations]
- Simple questions → [Multi-paragraph responses]

**CONTENT VS GENERAL DETECTION:**
- Content questions → Actionable advice for their specific content
- General questions → Right-sized answers to their actual question
- Casual chat → Match their casual energy exactly

**GOLDEN RULES:**
1. Simple greeting = Simple greeting back
2. Short question = Short answer
3. Detailed question = Detailed answer
4. NO unsolicited advice or elaboration
5. Be helpful, not verbose

Your job is to give the perfect amount of response for each input - no more, no less.`;
  }

  static buildDetailedPrompt(
    userMessage: string,
    context: ChatContext,
  ): string {
    const analysis = this.analyzeUserInputComplexity(userMessage);
    const isKhronosQuery = this.isKhronosProjectQuery(userMessage);

    // Handle Khronos queries
    if (isKhronosQuery) {
      return this.buildKhronosResponse(userMessage, analysis);
    }

    // Generate strict response instructions based on input analysis
    switch (analysis.type) {
      case 'simple_greeting':
        return `**SIMPLE GREETING DETECTED**
User: "${userMessage}"

**RESPOND WITH MAXIMUM 1 SENTENCE - NO EXCEPTIONS**

This is a basic social greeting. Examples of correct responses:
- "Hi" → "Hey!"
- "Hello" → "Hello!"
- "How are you?" → "Good! You?"
- "How are you doing?" → "Doing well! How about you?"
- "What's up?" → "Not much, you?"

**DO NOT:**
- Give advice about anything
- Explain concepts
- Ask about their content
- Elaborate on the greeting
- Mention tight situations, breathing, or any topics

**JUST RESPOND NATURALLY TO THE GREETING - THAT'S IT.**`;

      case 'casual_question':
        return `**CASUAL QUESTION DETECTED**
User: "${userMessage}"
Analysis: ${analysis.reasoning}

**RESPOND WITH 2-3 SENTENCES MAXIMUM**

This is a casual question that needs a proportional response:
- Answer their specific question
- Keep it conversational and helpful
- No lengthy explanations unless they ask for more detail
- Optional brief follow-up if natural

Content context available: "${context.contentTitle}" (${context.contentType})
Use content context only if directly relevant to their question.`;

      case 'content_question':
        return `**CONTENT-RELATED QUESTION - RICH VALUE RESPONSE**
User: "${userMessage}"
Analysis: ${analysis.reasoning}

Content Context:
- Title: "${context.contentTitle}"
- Type: ${context.contentType}
- Platform(s): ${context.contentPlatform?.join(', ')}
- Description: ${context.contentDescription}

**DELIVER RICH, TACTICAL ADVICE (4-6 sentences)**

Your response must be:
✅ **DIRECT & SPECIFIC** - No fluff, straight tactical advice
✅ **RICH IN VALUE** - Pack multiple actionable insights
✅ **PLATFORM-TAILORED** - Specific strategies for their platforms
✅ **IMMEDIATELY ACTIONABLE** - They can implement today

**Include specific tactics for their content:**
- Exact hook examples or templates
- Specific hashtag strategies (#specifictags)
- Optimal posting times/frequencies
- Platform-specific optimization tips
- Engagement activation tactics
- Performance tracking methods
- Content variation ideas

**Reference their "${
          context.contentTitle
        }" content specifically and give them tactical gold they can use right now.**`;

      case 'knowledge_question':
        return `**GENERAL KNOWLEDGE QUESTION**
User: "${userMessage}"
Analysis: ${analysis.reasoning}

**RESPOND PROPORTIONALLY TO QUESTION COMPLEXITY**
- ${analysis.wordCount} words input = Match that investment level
- Answer their specific question clearly
- Provide appropriate depth without over-explaining
- Be informative but conversational`;

      case 'detailed_request':
        return `**DETAILED/COMPLEX REQUEST**
User: "${userMessage}"
Analysis: ${analysis.reasoning}

**COMPREHENSIVE RESPONSE WARRANTED**
- Multiple parts to address: ${analysis.complexity_indicators.join(', ')}
- Provide thorough, structured answer
- Address each component of their request
- Give specific examples and actionable advice
- This input justifies a detailed response`;

      default:
        return this.generateFallbackResponse(userMessage, context, analysis);
    }
  }

  static analyzeUserInputComplexity(message: string): {
    type:
      | 'simple_greeting'
      | 'casual_question'
      | 'content_question'
      | 'knowledge_question'
      | 'detailed_request';
    reasoning: string;
    wordCount: number;
    complexity_indicators: string[];
  } {
    const lowerMessage = message.toLowerCase().trim();
    const wordCount = message.split(/\s+/).length;
    const sentences = message
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0).length;

    // STRICT GREETING DETECTION - These should NEVER get long responses
    const simpleGreetingPatterns = [
      /^(hi|hey|hello)!?$/i,
      /^good (morning|afternoon|evening|night)!?$/i,
      /^how are you(\s+doing)?(\s+today)?[?]?$/i,
      /^how'?s it going[?]?$/i,
      /^what'?s up[?]?$/i,
      /^sup[?]?$/i,
      /^how'?s (your day|everything|work)[?]?$/i,
      /^(thanks?|thank you|thx)!?$/i,
      /^(ok|okay|cool|nice|great|awesome|perfect|yes|no|sure)!?$/i,
      /^(bye|goodbye|see you|later|ttyl)!?$/i,
    ];

    if (simpleGreetingPatterns.some((pattern) => pattern.test(lowerMessage))) {
      return {
        type: 'simple_greeting',
        reasoning: `Simple greeting pattern detected (${wordCount} words) - requires brief social response only`,
        wordCount,
        complexity_indicators: ['greeting'],
      };
    }

    // Content-related question detection - ENHANCED
    const contentKeywords = [
      'content',
      'post',
      'video',
      'instagram',
      'youtube',
      'tiktok',
      'twitter',
      'linkedin',
      'facebook',
      'hashtags',
      'engagement',
      'followers',
      'strategy',
      'optimize',
      'algorithm',
      'viral',
      'caption',
      'thumbnail',
      'title',
      'schedule',
      'posting',
      'reach',
      'views',
      'likes',
      'social media',
      'platform',
      'audience',
      'brand',
      'marketing',
      'seo',
      'trending',
      'hook',
      'comment',
      'share',
      'story',
      'reel',
      'short',
      'long-form',
      'blog',
      'monetize',
      'growth',
      'analytics',
      'insights',
      'performance',
      'conversion',
      'funnel',
      'lead',
      'subscriber',
      'community',
      'niche',
      'target',
      'demographics',
    ];

    const hasContentKeywords = contentKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );

    // Content question phrases that need rich responses
    const contentQuestionPhrases = [
      'how can i',
      'how do i',
      'how to',
      'best way to',
      'optimize',
      'improve',
      'increase',
      'boost',
      'grow',
      'get more',
      'better',
      'should i',
      'what hashtags',
      'when to post',
      'how often',
      'best time',
      'not working',
      'low engagement',
      'no views',
      'struggling with',
    ];

    const hasContentQuestionPhrase = contentQuestionPhrases.some((phrase) =>
      lowerMessage.includes(phrase),
    );

    // Detailed request indicators
    const complexityIndicators = [];
    if (sentences > 2) complexityIndicators.push('multiple sentences');
    if (wordCount > 25) complexityIndicators.push('long input');
    if (lowerMessage.includes(' and '))
      complexityIndicators.push('multiple topics');
    if (lowerMessage.match(/\?.*\?/))
      complexityIndicators.push('multiple questions');
    if (lowerMessage.includes('help me'))
      complexityIndicators.push('help request');
    if (lowerMessage.includes('explain'))
      complexityIndicators.push('explanation request');

    // Classification logic
    if (wordCount > 30 || sentences > 2 || complexityIndicators.length >= 2) {
      return {
        type: 'detailed_request',
        reasoning: `Complex input requiring comprehensive response (${wordCount} words, ${sentences} sentences)`,
        wordCount,
        complexity_indicators: complexityIndicators,
      };
    }

    if (hasContentKeywords || hasContentQuestionPhrase) {
      return {
        type: 'content_question',
        reasoning: `Content-related question (${wordCount} words) - requires rich, tactical advice with specific strategies`,
        wordCount,
        complexity_indicators: ['content-focused', 'needs-tactical-advice'],
      };
    }

    // Knowledge questions
    const knowledgeIndicators = [
      'what is',
      'what are',
      'how does',
      'why does',
      'explain',
      'tell me about',
      'what do you think',
      'your thoughts on',
      'can you help me understand',
    ];

    if (
      knowledgeIndicators.some((indicator) => lowerMessage.includes(indicator))
    ) {
      return {
        type: 'knowledge_question',
        reasoning: `General knowledge question (${wordCount} words) - provide informative answer`,
        wordCount,
        complexity_indicators: ['knowledge-seeking'],
      };
    }

    // Default to casual question for short inputs
    if (wordCount <= 15) {
      return {
        type: 'casual_question',
        reasoning: `Short casual input (${wordCount} words) - brief helpful response`,
        wordCount,
        complexity_indicators: ['casual'],
      };
    }

    // Fallback
    return {
      type: 'knowledge_question',
      reasoning: `Standard question (${wordCount} words) - proportional response`,
      wordCount,
      complexity_indicators: ['general'],
    };
  }

  private static buildKhronosResponse(message: string, analysis: any): string {
    if (analysis.type === 'simple_greeting') {
      return `**KHRONOS GREETING RESPONSE**
User: "${message}"

**BRIEF RESPONSE ABOUT KHRONOS (1-2 sentences max)**
Just acknowledge the greeting and briefly mention Khronos if relevant.`;
    }

    return `**KHRONOS PLATFORM QUESTION**
User: "${message}"
Complexity: ${analysis.type}

**KHRONOS INFO:**
Comprehensive content creation platform with AI optimization, multi-platform management, analytics, and collaboration tools for creators and businesses.

**RESPOND WITH APPROPRIATE DETAIL FOR "${analysis.type}"**
Show enthusiasm for the platform while matching their input complexity.`;
  }

  private static isKhronosProjectQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return [
      'khronos',
      'this platform',
      'this project',
      'this app',
      'this tool',
      'what is khronos',
      'about khronos',
      'platform features',
    ].some((keyword) => lowerMessage.includes(keyword));
  }

  static generateFallbackResponse(
    userMessage: string,
    context: ChatContext,
    analysis: any,
  ): string {
    return `**FALLBACK RESPONSE**
User: "${userMessage}"
Analysis: ${analysis.reasoning}
Word count: ${analysis.wordCount}

Content: "${context.contentTitle}" (${context.contentType})

**RESPOND PROPORTIONALLY:**
- Match their input complexity exactly
- Brief input → Brief response  
- Detailed input → Comprehensive response
- Be helpful without over-explaining`;
  }

  static generateConversationStarters(hasContent: boolean = false): string[] {
    return hasContent
      ? ['How can I help with your content?', "What's your content goal?"]
      : ['How can I help?', "What's up?"];
  }

  static updateConversationHistory(
    currentMessage: string,
    responseType: string,
    previousHistory?: ConversationHistory,
  ): ConversationHistory {
    return {
      lastInteraction: `"${currentMessage}" (${responseType})`,
      conversationTone: this.detectTone(currentMessage),
      topicsDiscussed: previousHistory?.topicsDiscussed || [],
      userPreferences: previousHistory?.userPreferences || {},
    };
  }

  private static detectTone(
    message: string,
  ): 'casual' | 'professional' | 'mixed' {
    const casual = /hey|hi|what's up|cool|awesome/i;
    const professional = /strategy|optimize|analysis|implement/i;

    if (casual.test(message) && professional.test(message)) return 'mixed';
    if (casual.test(message)) return 'casual';
    if (professional.test(message)) return 'professional';
    return 'casual';
  }
}
