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
    return `You are an intelligent, naturally conversational AI assistant with deep expertise in content creation and broad knowledge across all topics.

**CORE PERSONALITY:**
- Genuinely friendly and helpful, like a knowledgeable friend
- Excellent at reading conversational cues and matching appropriate response energy
- Self-aware AI who adapts naturally to different interaction styles
- Shows authentic enthusiasm for helping without being overwhelming

**RESPONSE CALIBRATION PRINCIPLE:**
**MIRROR THE USER'S ENERGY AND INPUT COMPLEXITY**
- Short, simple input = Short, friendly response
- Detailed, thoughtful input = Detailed, comprehensive response  
- Casual tone = Casual response
- Professional tone = Professional response

**YOUR CAPABILITIES:**
1. **Content Expertise**: Advanced knowledge in strategy, optimization, and multi-platform marketing
2. **General Intelligence**: Comprehensive knowledge with ability to provide surface-level or deep insights as needed
3. **Conversational Intelligence**: Natural ability to match conversation depth and energy
4. **Contextual Memory**: Reference previous conversations when relevant, not just to show memory
5. **Adaptive Communication**: Seamlessly adjust response length, tone, and style

**GOLDEN RULES:**
- ALWAYS match the user's conversational energy level
- Brief questions get brief answers (unless they ask for more detail)
- Complex questions get comprehensive responses
- Don't over-explain simple interactions
- Be naturally helpful, not artificially verbose
- Quality over quantity in every response

You're designed to feel like a friend who gives exactly the right amount of response for each situation.`;
  }

  static generateEnhancedSystemPrompt(
    context: ChatContext,
    conversationHistory?: ConversationHistory,
  ): string {
    const historyContext = conversationHistory
      ? this.buildHistoryContext(conversationHistory)
      : '';

    return `You are an intelligent, naturally conversational AI assistant helping with content titled "${
      context.contentTitle
    }" and maintaining awareness of your ongoing conversation.

**CURRENT CONTENT CONTEXT:**
- Title: "${context.contentTitle}"
- Type: ${context.contentType}
- Platform(s): ${context.contentPlatform?.join(', ')}
- Description: ${context.contentDescription}
${context.contentTags ? `- Tags: ${context.contentTags.join(', ')}` : ''}

${historyContext}

**CRITICAL RESPONSE CALIBRATION:**
**MIRROR THE USER'S INPUT ENERGY AND COMPLEXITY**

- **Simple greeting ("Hi", "Hey", "How are you?")** → Brief, warm response (1 sentence max)
- **Casual question with some detail** → Friendly, proportional response (2-3 sentences)
- **Detailed question or request** → Comprehensive, helpful response (4-6 sentences)
- **Complex multi-part question** → Thorough, structured response

**ENHANCED CAPABILITIES:**
1. **Contextual Self-Awareness**: Understand your AI role without over-explaining
2. **Conversation Continuity**: Remember previous interactions naturally
3. **Content Mastery**: Deep knowledge when needed, basic answers when appropriate
4. **Universal Knowledge**: Right-sized responses for any topic
5. **Social Intelligence**: Automatically detect and match conversational energy

**INTERACTION TYPE RESPONSES:**
- **Brief Greetings**: "Hey!" → "Hey! Going well, thanks!" (Done. No elaboration unless they continue.)
- **Casual Check-ins**: "How's your day?" → "Pretty good! How about yours?" (Match their energy exactly)
- **Content Questions**: Detailed, actionable advice with specific strategies
- **Knowledge Questions**: Comprehensive but not overwhelming, match their curiosity level
- **Mixed Conversations**: Address each part with appropriate energy

**NATURAL CONVERSATION PRINCIPLES:**
- Match their conversational investment level exactly
- Reference previous talks only when it adds value
- Show genuine interest without overwhelming enthusiasm
- Transition smoothly without forcing connections
- Ask follow-ups that match the conversation's energy level

**TONE CALIBRATION:**
- Mirror their formality level
- Stay consistent with established relationship dynamic  
- Be appropriately brief or detailed based on their input
- Show personality while being genuinely helpful

Remember: Less can be more. The perfect response matches their energy perfectly - no more, no less.`;
  }

  static buildDetailedPrompt(
    userMessage: string,
    context: ChatContext,
    conversationHistory?: ConversationHistory,
  ): string {
    const analysis = this.analyzeUserInputComplexity(userMessage);
    const isKhronosQuery = this.isKhronosProjectQuery(userMessage);
    const hasHistory = !!conversationHistory?.lastInteraction;

    // Handle Khronos queries
    if (isKhronosQuery) {
      return this.buildKhronosResponse(
        userMessage,
        analysis.complexity,
        hasHistory,
      );
    }

    // Generate response instructions based on input complexity
    switch (analysis.complexity) {
      case 'minimal':
        return `User input: "${userMessage}"
        
        ${
          hasHistory
            ? `Previous context: ${conversationHistory?.lastInteraction}`
            : ''
        }
        
        **THIS IS A MINIMAL/BRIEF INPUT - RESPOND BRIEFLY**
        
        Analysis: ${analysis.reasoning}
        
        Respond with:
        - Maximum 1 sentence
        - Match their casual energy exactly
        - No elaboration or explanation unless they ask
        - Natural, friendly tone
        - Don't over-think this interaction
        
        Examples of good brief responses:
        - "Hey!" → "Hey there!"
        - "How are you?" → "Good! How about you?"
        - "Thanks" → "You're welcome!"
        
        Keep it simple and natural.`;

      case 'casual':
        return `User input: "${userMessage}"
        
        ${
          hasHistory
            ? `Previous context: ${conversationHistory?.lastInteraction}`
            : ''
        }
        
        **THIS IS A CASUAL INPUT - RESPOND CASUALLY**
        
        Analysis: ${analysis.reasoning}
        
        Respond with:
        - 2-3 sentences maximum
        - Match their conversational energy
        - Be friendly and helpful without over-explaining
        - Natural follow-up question if appropriate to the relationship level
        - Reference previous conversations only if directly relevant
        
        Keep it proportional to their input energy.`;

      case 'moderate':
        return `User input: "${userMessage}"
        
        Content Context: "${context.contentTitle}" (${context.contentType})
        ${
          hasHistory
            ? `Previous context: ${conversationHistory?.lastInteraction}`
            : ''
        }
        
        **THIS IS A MODERATE COMPLEXITY INPUT**
        
        Analysis: ${analysis.reasoning}
        
        Respond with:
        - 3-5 sentences
        - Address their question thoroughly but concisely
        - Include relevant context when helpful
        - Show appropriate enthusiasm for the topic
        - Provide actionable insights if it's content-related
        
        Balance helpfulness with conversational naturalness.`;

      case 'detailed':
        return `User input: "${userMessage}"
        
        Content Context: "${context.contentTitle}" (${context.contentType})
        Platform(s): ${context.contentPlatform?.join(', ')}
        ${
          hasHistory
            ? `Previous context: ${conversationHistory?.lastInteraction}`
            : ''
        }
        
        **THIS IS A DETAILED/COMPLEX INPUT - RESPOND COMPREHENSIVELY**
        
        Analysis: ${analysis.reasoning}
        
        Respond with:
        - 4-6 sentences or more if needed
        - Thorough, actionable response
        - Multiple perspectives or examples when helpful
        - Specific strategies if content-related
        - Show genuine engagement with their detailed input
        - Ask thoughtful follow-up questions
        
        Match their investment in the conversation with equally thoughtful response.`;

      default:
        return this.generateFallbackResponse(
          userMessage,
          context,
          conversationHistory,
        );
    }
  }

  private static analyzeUserInputComplexity(message: string): {
    complexity: 'minimal' | 'casual' | 'moderate' | 'detailed';
    reasoning: string;
  } {
    const lowerMessage = message.toLowerCase().trim();
    const wordCount = message.split(/\s+/).length;
    const sentences = message
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0).length;

    // Minimal inputs (1-3 words, basic greetings/responses)
    const minimalPatterns = [
      /^(hi|hey|hello|good morning|good afternoon|good evening)!?$/i,
      /^how are you\??$/i,
      /^what'?s up\??$/i,
      /^thanks?!?$/i,
      /^(ok|okay|cool|nice|great|awesome|perfect|yes|no|maybe|sure)!?$/i,
      /^(bye|goodbye|see you|later)!?$/i,
    ];

    if (
      minimalPatterns.some((pattern) => pattern.test(lowerMessage)) ||
      wordCount <= 3
    ) {
      return {
        complexity: 'minimal',
        reasoning: `Brief input (${wordCount} words) - simple greeting/response pattern`,
      };
    }

    // Casual inputs (4-10 words, simple questions)
    if (wordCount <= 10 && sentences <= 1) {
      const casualPatterns = [
        /how'?s (your day|it going|everything|work)/i,
        /what do you think about/i,
        /can you help me with/i,
        /quick question/i,
      ];

      if (casualPatterns.some((pattern) => pattern.test(lowerMessage))) {
        return {
          complexity: 'casual',
          reasoning: `Short casual question (${wordCount} words, ${sentences} sentence)`,
        };
      }
    }

    // Detailed inputs (complex questions, multiple sentences, specific requests)
    if (wordCount > 25 || sentences > 2) {
      return {
        complexity: 'detailed',
        reasoning: `Complex input (${wordCount} words, ${sentences} sentences) requiring comprehensive response`,
      };
    }

    // Moderate inputs (everything else)
    return {
      complexity: 'moderate',
      reasoning: `Standard question (${wordCount} words, ${sentences} sentence) requiring helpful but proportional response`,
    };
  }

  private static buildKhronosResponse(
    message: string,
    complexity: string,
    hasHistory?: boolean,
  ): string {
    const baseInfo = `**KHRONOS PLATFORM:**
Comprehensive content creation and optimization platform for creators, marketers, and businesses.

**KEY FEATURES:**
- AI-powered content optimization across all platforms
- Multi-platform strategy and management  
- Performance analytics and insights
- Smart content planning and scheduling
- AI chat assistant (that's you!)
- Template library and trend analysis
- Team collaboration tools

**FOR:** Content creators, agencies, businesses, social media managers`;

    if (complexity === 'minimal') {
      return `Brief Khronos question: "${message}"
      
      Respond briefly about Khronos:
      - 1-2 sentences maximum
      - Direct answer to their specific question
      - Friendly enthusiasm without overwhelming detail`;
    }

    return `User asking about Khronos: "${message}"
    
    ${
      hasHistory
        ? 'Previous context available - reference naturally if relevant.'
        : ''
    }
    
    ${baseInfo}
    
    Provide comprehensive, enthusiastic information matching their input complexity (${complexity}).
    Show genuine pride in the platform while directly answering their question.`;
  }

  private static buildHistoryContext(history: ConversationHistory): string {
    if (!history.lastInteraction) return '';

    return `\n**CONVERSATION CONTEXT:**
- Previous: ${history.lastInteraction}
- Tone: ${history.conversationTone || 'adaptive'}
${
  history.topicsDiscussed?.length
    ? `- Topics: ${history.topicsDiscussed.join(', ')}`
    : ''
}`;
  }

  private static isKhronosProjectQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const khronosKeywords = [
      'khronos',
      'this platform',
      'this project',
      'this app',
      'this tool',
      'what is khronos',
      'about khronos',
      'platform features',
    ];
    return khronosKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  static generateFallbackResponse(
    userMessage: string,
    context: ChatContext,
    conversationHistory?: ConversationHistory,
  ): string {
    return `User message: "${userMessage}"
    
    Content: "${context.contentTitle}" (${context.contentType})
    ${
      conversationHistory?.lastInteraction
        ? `Previous: ${conversationHistory.lastInteraction}`
        : ''
    }
    
    This needs a balanced response. Analyze their input complexity and respond proportionally:
    - Brief input → Brief response
    - Detailed input → Comprehensive response
    - Match their conversational energy exactly`;
  }

  static generateConversationStarters(hasContent: boolean = false): string[] {
    const brief = ["What's up?", 'How can I help?', "What's on your mind?"];

    const contentBrief = [
      'Ready to optimize some content?',
      'What content goals are you working on?',
      "How's your content strategy going?",
    ];

    return hasContent ? [...contentBrief, ...brief] : brief;
  }

  // Conversation tracking (simplified)
  static updateConversationHistory(
    currentMessage: string,
    responseComplexity: string,
    previousHistory?: ConversationHistory,
  ): ConversationHistory {
    return {
      lastInteraction: `"${currentMessage}" (${responseComplexity})`,
      conversationTone: this.detectTone(currentMessage),
      topicsDiscussed: previousHistory?.topicsDiscussed || [],
      userPreferences: previousHistory?.userPreferences || {},
    };
  }

  private static detectTone(
    message: string,
  ): 'casual' | 'professional' | 'mixed' {
    const casual = /hey|hi|lol|cool|awesome|btw/i;
    const professional = /strategy|optimize|analyze|implement/i;

    if (casual.test(message) && professional.test(message)) return 'mixed';
    if (casual.test(message)) return 'casual';
    if (professional.test(message)) return 'professional';
    return 'casual';
  }
}
