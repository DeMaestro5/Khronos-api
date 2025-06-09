import { ChatContext } from '../../types/chat';

export class SuggestionGenerator {
  static generateContextualSuggestions(
    userMessage: string,
    context: ChatContext,
  ): string[] {
    const lowerMessage = userMessage.toLowerCase();

    // Check if the message is content-related
    if (this.isContentRelatedMessage(lowerMessage)) {
      return this.generateContentSpecificSuggestions(lowerMessage, context);
    } else {
      return this.generateGeneralSuggestions(userMessage, lowerMessage);
    }
  }

  private static isContentRelatedMessage(message: string): boolean {
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
    ];
    return contentKeywords.some((keyword) => message.includes(keyword));
  }

  private static generateContentSpecificSuggestions(
    lowerMessage: string,
    context: ChatContext,
  ): string[] {
    const suggestions = [];

    if (lowerMessage.includes('optimize')) {
      suggestions.push(
        `What are the best ${context.contentPlatform?.join(
          '/',
        )} optimization techniques?`,
        'How can I improve my engagement rates?',
        'What content format works best for my audience?',
      );
    } else if (lowerMessage.includes('engagement')) {
      suggestions.push(
        'What call-to-action should I use?',
        'How can I encourage more comments and shares?',
        'What hashtags will boost my reach?',
      );
    } else if (lowerMessage.includes('schedule')) {
      suggestions.push(
        'When is the best time to post for my audience?',
        'How often should I publish new content?',
        'Should I create a content calendar?',
      );
    } else if (lowerMessage.includes('analytics')) {
      suggestions.push(
        'Which metrics should I focus on?',
        'How do I interpret my performance data?',
        'What tools can help me track my success?',
      );
    } else {
      // General content suggestions
      suggestions.push(
        'How can I make my content more engaging?',
        'What trends should I incorporate?',
        'How do I grow my audience organically?',
      );
    }

    return suggestions.slice(0, 3);
  }

  private static generateGeneralSuggestions(
    originalMessage: string,
    lowerMessage: string,
  ): string[] {
    // Check for Khronos/platform questions first
    if (this.isKhronosRelated(lowerMessage)) {
      return [
        'What specific features of Khronos interest you most?',
        'Would you like to know about pricing and plans?',
        'Are you interested in the AI optimization capabilities?',
        'Would you like a demo or walkthrough of the platform?',
      ];
    }

    // Check for specific topics and provide relevant follow-ups
    if (lowerMessage.includes('trend')) {
      return [
        'What industries are you most interested in tracking?',
        'Are you looking for global or local trending topics?',
        'Would you like tips on how to leverage these trends?',
      ];
    } else if (lowerMessage.includes('nigeria')) {
      return [
        'What specific aspects of Nigerian trends interest you?',
        'Are you focusing on a particular industry or demographic?',
        'Would you like insights on Nigerian consumer behavior?',
      ];
    } else if (
      lowerMessage.includes('business') ||
      lowerMessage.includes('startup')
    ) {
      return [
        'What stage is your business at currently?',
        'What are your biggest business challenges right now?',
        'Are you looking for growth strategies or operational advice?',
      ];
    } else if (
      lowerMessage.includes('career') ||
      lowerMessage.includes('job')
    ) {
      return [
        'What career goals are you working towards?',
        'Are you looking to switch industries or advance in your current field?',
        'Would you like tips on skill development or networking?',
      ];
    } else if (
      lowerMessage.includes('learn') ||
      lowerMessage.includes('education')
    ) {
      return [
        'What subject area interests you most?',
        'Are you looking for formal education or self-learning resources?',
        'What learning style works best for you?',
      ];
    } else {
      // Completely general follow-up questions
      return [
        'What aspects of this topic are you most curious about?',
        'Are you looking for practical advice or general information?',
        'Would you like me to dive deeper into any specific area?',
      ];
    }
  }

  // Helper method to detect Khronos-related questions
  private static isKhronosRelated(message: string): boolean {
    const khronosKeywords = [
      'khronos',
      'this platform',
      'this project',
      'this app',
      'this tool',
      'platform features',
      'about this system',
      'what does khronos do',
    ];
    return khronosKeywords.some((keyword) => message.includes(keyword));
  }

  static generateBasicSuggestions(userMessage: string): string[] {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('help')) {
      return [
        'What specific topic can I assist you with?',
        'Are you looking for advice on content or something else?',
        'What challenges are you facing that I can help solve?',
      ];
    } else if (lowerMessage.includes('how')) {
      return [
        'Would you like a step-by-step guide?',
        'Are you looking for beginner or advanced tips?',
        'What have you already tried?',
      ];
    } else {
      return [
        'What would you like to explore further about this topic?',
        'Can I help you with any related questions?',
        'Is there a specific aspect you want to focus on?',
      ];
    }
  }

  static generateConversationStarters(content?: any): string[] {
    const contentStarters = [
      'How can I optimize this content for better engagement?',
      'What platforms would work best for this content?',
      'Any ideas for improving this content?',
      'How can I analyze the performance of this content?',
    ];

    const generalStarters = [
      "What's trending in your industry right now?",
      'What topics are you most curious about today?',
      "Any challenges you're facing that I can help with?",
      'What would you like to learn or discuss?',
    ];

    if (content) {
      return [...contentStarters, ...generalStarters];
    }

    return generalStarters;
  }
}
