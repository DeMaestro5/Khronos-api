import { ChatResponse } from '../../types/chat';
import { MessageValidationResult } from './content-filters';

export class ResponseGenerator {
  static async generateInappropriateContentResponse(
    validation: MessageValidationResult,
  ): Promise<ChatResponse> {
    const responses = {
      inappropriate_language: [
        "I understand you might be feeling frustrated, but let's keep our conversation professional and focused on creating amazing content together! 😊",
        "I'm here to help you succeed with your content. Let's channel that energy into making your content even better!",
        "I appreciate your passion! Let's use that enthusiasm to optimize your content and reach your audience more effectively.",
      ],
      unclear_message: [
        "I'd love to help you with your content! Could you please provide more details about what specific aspect you'd like to work on?",
        "I'm here to assist with your content optimization. What would you like to focus on - engagement, reach, or perhaps content strategy?",
        "Let's dive into your content! What particular challenge or improvement are you looking to address?",
      ],
      too_short: [
        "I'm excited to help optimize your content! Please share more details about what you'd like to improve or discuss.",
        "I'm your content assistant and I'm here to help! What specific aspect of your content would you like to work on?",
        'Ready to make your content shine! What would you like to focus on today?',
      ],
      off_topic: [
        "I'm specifically designed to help you optimize and improve your content. Let's focus on making your content more engaging and effective for your audience!",
        "I'm your dedicated content assistant! Let's discuss how we can enhance your content's performance and reach.",
        "I'm here to help with your content strategy and optimization. What aspect of your content would you like to improve?",
      ],
    };

    const responseArray =
      responses[validation.reason as keyof typeof responses] ||
      responses.unclear_message;
    const selectedResponse =
      responseArray[Math.floor(Math.random() * responseArray.length)];

    return {
      message: selectedResponse,
      tokens: this.estimateTokens(selectedResponse),
      model: 'gpt-4o-mini',
      inappropriateContentDetected: true,
      warningMessage: validation.suggestedResponse,
      suggestions: [
        'How can I optimize this content?',
        'What are the best practices for this platform?',
        "Can you analyze my content's potential?",
        'What improvements would you suggest?',
      ],
      actions: this.generateUIActions(),
    };
  }

  static generateErrorResponse(): ChatResponse {
    return {
      message:
        "I apologize, but I'm experiencing some technical difficulties right now. However, I'm still here to help you optimize your content! Please try rephrasing your question, and I'll do my best to provide you with valuable insights and recommendations.",
      tokens: 0,
      model: 'gpt-4o-mini',
      suggestions: [
        'How can I improve my content engagement?',
        'What are the best practices for my platform?',
        'Can you help me optimize my content strategy?',
      ],
      actions: this.generateBasicActions(),
      inappropriateContentDetected: false,
    };
  }

  static generateUIActions(): Array<{
    type:
      | 'optimize'
      | 'schedule'
      | 'analyze'
      | 'generate'
      | 'ideas'
      | 'strategy';
    label: string;
    description: string;
    icon?: string;
  }> {
    return [
      {
        type: 'optimize',
        label: 'Optimize',
        description: 'Get platform-specific optimization suggestions',
        icon: '⚡',
      },
      {
        type: 'ideas',
        label: 'Ideas',
        description: 'Generate creative content variations and concepts',
        icon: '✨',
      },
      {
        type: 'strategy',
        label: 'Strategy',
        description: 'Develop comprehensive content marketing strategy',
        icon: '🎯',
      },
      {
        type: 'analyze',
        label: 'Analyze',
        description: 'Get detailed performance insights and recommendations',
        icon: '💬',
      },
    ];
  }

  static generateBasicActions(): Array<{
    type:
      | 'optimize'
      | 'schedule'
      | 'analyze'
      | 'generate'
      | 'ideas'
      | 'strategy';
    label: string;
    description: string;
    icon?: string;
  }> {
    return [
      {
        type: 'optimize',
        label: 'Optimize Content',
        description: 'Get platform-specific optimization suggestions',
        icon: '⚡',
      },
      {
        type: 'analyze',
        label: 'Analyze Performance',
        description: 'Get insights on content performance potential',
        icon: '💬',
      },
      {
        type: 'generate',
        label: 'Generate Variations',
        description: 'Create different versions for various platforms',
        icon: '✨',
      },
      {
        type: 'schedule',
        label: 'Schedule Content',
        description: 'Get optimal timing recommendations',
        icon: '🎯',
      },
    ];
  }

  private static estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
