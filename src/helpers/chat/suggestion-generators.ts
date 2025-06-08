import { ChatContext } from '../../types/chat';

export class SuggestionGenerator {
  static generateContextualSuggestions(
    userMessage: string,
    context: ChatContext,
  ): string[] {
    const suggestions = [];
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('optimize')) {
      suggestions.push(
        `What are the best ${context.contentPlatform?.join(
          '/',
        )} optimization techniques?`,
        'How can I improve engagement rates?',
        'What content format works best for my audience?',
      );
    } else if (lowerMessage.includes('engagement')) {
      suggestions.push(
        'What call-to-action should I use?',
        'How can I encourage more comments and shares?',
        'What posting frequency is optimal?',
      );
    } else if (
      lowerMessage.includes('hashtag') ||
      lowerMessage.includes('tag')
    ) {
      suggestions.push(
        'How many hashtags should I use?',
        'What are trending hashtags in my niche?',
        'Should I create a branded hashtag?',
      );
    } else {
      suggestions.push(
        `How can I make this ${context.contentType} more engaging?`,
        `What's working well in ${context.contentPlatform?.join(
          '/',
        )} right now?`,
        'Can you suggest improvements for better reach?',
        'What metrics should I track for this content?',
      );
    }

    return suggestions.slice(0, 3);
  }

  static generateBasicSuggestions(userMessage: string): string[] {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('optimize')) {
      return [
        'How can I improve engagement?',
        'What are the best posting times?',
        'Can you suggest hashtags?',
      ];
    } else if (lowerMessage.includes('content')) {
      return [
        'Generate variations of this content',
        'Optimize for different platforms',
        'Create a content calendar',
      ];
    } else {
      return [
        'Tell me more about this content',
        'How can I improve it?',
        'What platforms work best?',
      ];
    }
  }

  static generateConversationStarters(content: any): string[] {
    const starters = [];

    starters.push(
      `How can I optimize "${content.title}" for better ${content.platform.join(
        ' and ',
      )} performance?`,
      `What creative ideas do you have to enhance "${content.title}"?`,
      `What's the best strategy for promoting "${
        content.title
      }" on ${content.platform.join(' and ')}?`,
      `Can you analyze the potential performance of "${content.title}"?`,
    );

    if (content.type === 'social') {
      starters.push(
        `What hashtags would work best for this ${content.platform.join(
          '/',
        )} post?`,
        `When is the optimal time to post this content?`,
      );
    }

    if (content.type === 'article' || content.type === 'blog_post') {
      starters.push(
        `How can I improve the SEO of this article?`,
        `What's the best way to promote this article across platforms?`,
      );
    }

    return starters.slice(0, 4);
  }
}
