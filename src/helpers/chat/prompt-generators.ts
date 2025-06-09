import { ChatContext } from '../../types/chat';

export class PromptGenerator {
  static generateBasicSystemPrompt(): string {
    return `You are an intelligent AI assistant with expertise in content creation, marketing, and general knowledge. You can help with:

1. Content creation, optimization, and marketing strategy
2. General questions across all topics and domains
3. Creative problem-solving and brainstorming
4. Research and information on trending topics
5. Personal and professional advice

RESPONSE GUIDELINES:
- **Match your response length to the question type**:
  - Casual questions (greetings, "how are you") → Brief, friendly responses (1-2 sentences)
  - Simple questions → Concise, helpful answers (2-3 sentences)
  - Complex questions → Detailed, comprehensive responses (4-6 sentences)
- Be conversational, helpful, and engaging
- Use "your" when referring to the user, not "the user"
- Handle both content-related and general topics intelligently
- Ask follow-up questions when helpful, but keep them appropriate to the conversation level
- Be graceful and natural in your communication style
- Provide actionable insights when possible, but don't over-explain simple interactions

You're here to be a knowledgeable companion who can discuss anything while maintaining expertise in content creation.`;
  }

  static generateEnhancedSystemPrompt(context: ChatContext): string {
    return `You are an intelligent AI assistant with deep expertise in content creation and broad knowledge across all topics. You're currently helping with content titled "${
      context.contentTitle
    }" but you can discuss anything the user asks about.

**CONTENT CONTEXT (when relevant):**
- Title: "${context.contentTitle}"
- Type: ${context.contentType}
- Platform(s): ${context.contentPlatform?.join(', ')}
- Description: ${context.contentDescription}
${context.contentTags ? `- Tags: ${context.contentTags.join(', ')}` : ''}

**YOUR CAPABILITIES:**
1. **Content Expertise**: Deep knowledge in content optimization, marketing, and strategy
2. **General Intelligence**: Can discuss any topic - trends, news, research, personal advice, etc.
3. **Contextual Awareness**: When content is relevant, provide targeted advice; otherwise, engage naturally
4. **Conversational Style**: Natural, engaging, and helpful communication

**RESPONSE GUIDELINES:**
- **Match response length to question complexity**:
  - Casual/greeting questions → Brief, warm responses (1-2 sentences)
  - Content questions → Detailed, actionable advice (4-6 sentences)
  - General knowledge questions → Comprehensive but appropriate responses (3-5 sentences)
- Be conversational and engaging, not overly formal
- Use "your" when referring to the user
- For content questions: Provide detailed, actionable advice referencing their specific content
- For general questions: Answer comprehensively and naturally without forcing content connections
- Ask thoughtful follow-up questions when appropriate to the conversation level
- Be graceful in transitions between topics

Remember: You're a knowledgeable companion who happens to excel at content creation but can intelligently discuss anything at the appropriate level.`;
  }

  static buildDetailedPrompt(
    userMessage: string,
    context: ChatContext,
  ): string {
    const isContentRelated = this.isContentRelatedQuery(userMessage);
    const questionType = this.getQuestionType(userMessage);
    const isKhronosQuery = this.isKhronosProjectQuery(userMessage);

    // Handle Khronos project questions with comprehensive information
    if (isKhronosQuery) {
      return `The user is asking about the Khronos project: "${userMessage}"

This is a question about our platform/project. Provide comprehensive information about Khronos:

**KHRONOS PLATFORM OVERVIEW:**
Khronos is a comprehensive content creation and optimization platform designed to empower creators, marketers, and businesses to maximize their content performance across all digital platforms.

**KEY FEATURES:**
1. **AI-Powered Content Optimization**: Advanced AI tools that analyze and optimize content for different platforms (Instagram, YouTube, TikTok, LinkedIn, Twitter, etc.)
2. **Multi-Platform Strategy**: Unified content management across all major social media platforms
3. **Performance Analytics**: Deep insights into content performance with actionable recommendations
4. **Content Planning & Scheduling**: Smart content calendar and automated scheduling tools
5. **AI Chat Assistant**: Intelligent conversation system that provides personalized content advice and general knowledge support
6. **Template Library**: Pre-built content templates for different industries and platforms
7. **Trend Analysis**: Real-time trending topic detection and content opportunity identification
8. **Collaboration Tools**: Team features for content collaboration and workflow management

**TARGET USERS:**
- Content creators and influencers
- Digital marketing agencies
- Small to enterprise businesses
- Social media managers
- Personal brands and entrepreneurs

**PLATFORM BENEFITS:**
- Increase content engagement rates
- Save time with automated optimization
- Data-driven content decisions
- Multi-platform content strategy
- AI-powered insights and recommendations

Provide a detailed, engaging response about Khronos based on what they're specifically asking about. Keep it informative but conversational.`;
    }

    // Handle casual/greeting questions with brief, friendly responses
    if (questionType === 'casual') {
      return `The user is asking a casual question: "${userMessage}"

This is a casual/greeting question that should get a brief, friendly response. Provide:
1. A short, warm response (1-2 sentences maximum)
2. Keep it conversational and natural
3. Don't over-explain or be overly analytical
4. Optionally ask a simple follow-up question

Keep the response concise and human-like.`;
    }

    if (isContentRelated) {
      return `The user is asking about their ${
        context.contentType
      } content: "${userMessage}"

Content Details:
- Title: "${context.contentTitle}"
- Platform(s): ${context.contentPlatform?.join(', ')}
- Type: ${context.contentType}
- Description: ${context.contentDescription}

Provide a detailed, actionable response that:
1. Directly answers their question
2. References their specific content appropriately
3. Offers platform-specific insights
4. Suggests concrete next steps
5. Uses "your" when referring to them

Keep it conversational and helpful.`;
    } else {
      return `The user is asking: "${userMessage}"

This appears to be a general question not directly related to their content. Provide a comprehensive, intelligent response that:
1. Directly answers their question with accurate information
2. Offers valuable insights and perspectives
3. Includes relevant examples or context when helpful
4. Uses "your" when referring to them
5. Maintains a conversational, engaging tone

If the topic could eventually relate to content creation or their work, you can mention that connection naturally, but don't force it.`;
    }
  }

  static generateFallbackResponse(
    userMessage: string,
    context: ChatContext,
  ): string {
    return `I'm processing your question about "${userMessage}". While I prepare a comprehensive response, I want you to know that I'm here to help with both your content optimization needs and any general questions you might have.

Whether you're looking to improve your ${context.contentType} titled "${context.contentTitle}" or explore other topics entirely, I'm equipped to provide valuable insights and actionable advice.

What specific aspect of this topic interests you most? I'd love to dive deeper and provide you with the most relevant and helpful information.`;
  }

  // Helper method to determine if a query is content-related
  private static isContentRelatedQuery(message: string): boolean {
    const contentKeywords = [
      'optimize',
      'content',
      'post',
      'engagement',
      'audience',
      'platform',
      'hashtags',
      'schedule',
      'performance',
      'analytics',
      'reach',
      'views',
      'followers',
      'likes',
      'shares',
      'comments',
      'strategy',
      'marketing',
      'seo',
      'social media',
      'youtube',
      'instagram',
      'tiktok',
      'twitter',
      'linkedin',
      'facebook',
      'blog',
      'video',
      'article',
      'caption',
    ];

    const lowerMessage = message.toLowerCase();
    return contentKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  // New helper method to detect Khronos project queries
  private static isKhronosProjectQuery(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    const khronosKeywords = [
      'khronos',
      'this platform',
      'this project',
      'this app',
      'this tool',
      'what is khronos',
      'tell me about khronos',
      'about this platform',
      'what does khronos do',
      'khronos features',
      'about this project',
      'what is this platform',
      'platform features',
      'this system',
    ];

    return khronosKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  // Updated method to determine question type with more casual patterns
  private static getQuestionType(
    message: string,
  ): 'casual' | 'detailed' | 'technical' {
    const lowerMessage = message.toLowerCase().trim();

    // Expanded casual greetings and simple questions
    const casualPatterns = [
      /^(hi|hello|hey|good morning|good afternoon|good evening)/,
      /how are you(\s+doing)?(\s+today)?[?]?$/,
      /are you (okay|ok|alright|good|fine|well)[?]?$/,
      /you (okay|ok|alright|good|fine|well)[?]?$/,
      /what'?s up[?]?$/,
      /how'?s it going[?]?$/,
      /how have you been[?]?$/,
      /how'?s your day[?]?$/,
      /having a good day[?]?$/,
      /hope you'?re (okay|ok|alright|good|fine|well)/,
      /thanks?(\s+you)?[!]?$/,
      /thank you[!]?$/,
      /appreciate it[!]?$/,
      /you'?re (great|awesome|amazing|helpful)[!]?$/,
      /nice work[!]?$/,
      /good job[!]?$/,
      /bye|goodbye|see you|talk later|catch you later/,
      /^(yes|no|ok|okay|sure|alright|definitely|absolutely)([!.])*$/,
      /^(cool|nice|awesome|great|perfect|excellent)([!.])*$/,
    ];

    if (casualPatterns.some((pattern) => pattern.test(lowerMessage))) {
      return 'casual';
    }

    // Technical or detailed questions
    const technicalPatterns = [
      /explain|describe|analyze|compare|what is|how does|why does/,
      /step by step|detailed|comprehensive|in depth/,
      /best practices|strategies|methodology|framework/,
      /tell me about|give me info|information about/,
    ];

    if (technicalPatterns.some((pattern) => pattern.test(lowerMessage))) {
      return 'technical';
    }

    return 'detailed'; // Default for most questions
  }

  // New method for generating conversation starters that aren't just content-focused
  static generateConversationStarters(hasContent: boolean = false): string[] {
    const generalStarters = [
      "What's trending in your industry right now?",
      'What topics are you most curious about today?',
      "Any challenges you're facing that I can help with?",
      'What would you like to learn more about?',
    ];

    const contentStarters = [
      'How can I help optimize your content today?',
      'What content goals are you working towards?',
      'Any specific platforms you want to focus on?',
      'What content challenges can I help you solve?',
    ];

    return hasContent
      ? [...contentStarters, ...generalStarters]
      : generalStarters;
  }
}
