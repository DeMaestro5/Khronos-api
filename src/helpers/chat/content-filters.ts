export interface MessageValidationResult {
  isAppropriate: boolean;
  severity: 'low' | 'medium' | 'high';
  reason?: string;
  suggestedResponse?: string;
}

export class ContentFilter {
  private static inappropriatePatterns: RegExp[] = [
    /\b(fuck|shit|damn|hell|bitch|asshole|bastard)\b/gi,
    /\b(hate|kill|die|death|murder)\b/gi,
    /\b(spam|scam|fake|fraud|cheat)\b/gi,
    /\b(sex|porn|nude|naked|xxx)\b/gi,
  ];

  private static spamPatterns: RegExp[] = [
    /(.)\1{4,}/g, // Repeated characters
    /^[^a-zA-Z]*$/g, // Only symbols/numbers
    /\b(test|testing|hello|hi|hey)\b$/gi, // Single word greetings
    /^.{1,3}$/g, // Very short messages
  ];

  static async validateMessageContent(
    message: string,
  ): Promise<MessageValidationResult> {
    const lowerMessage = message.toLowerCase().trim();

    // Check for inappropriate content
    for (const pattern of this.inappropriatePatterns) {
      if (pattern.test(message)) {
        return {
          isAppropriate: false,
          severity: 'high',
          reason: 'inappropriate_language',
          suggestedResponse:
            "I understand you might be frustrated, but let's keep our conversation professional and focused on improving your content.",
        };
      }
    }

    // Check for spam/nonsense
    for (const pattern of this.spamPatterns) {
      if (pattern.test(message)) {
        return {
          isAppropriate: false,
          severity: 'low',
          reason: 'unclear_message',
          suggestedResponse:
            "I'd love to help you with your content! Could you please provide more details about what you'd like to discuss or improve?",
        };
      }
    }

    // Check message length and coherence
    if (message.length < 3) {
      return {
        isAppropriate: false,
        severity: 'low',
        reason: 'too_short',
        suggestedResponse:
          "I'm here to help you optimize your content! Please let me know what specific aspect you'd like to work on.",
      };
    }

    // Check if message is content-related
    const contentKeywords = [
      'content',
      'post',
      'optimize',
      'improve',
      'engagement',
      'audience',
      'platform',
      'strategy',
      'performance',
    ];
    const hasContentContext = contentKeywords.some((keyword) =>
      lowerMessage.includes(keyword),
    );

    if (!hasContentContext && message.length > 10) {
      return {
        isAppropriate: false,
        severity: 'medium',
        reason: 'off_topic',
        suggestedResponse:
          "I'm specifically here to help you with your content optimization and improvement. Let's focus on how we can make your content more engaging and effective!",
      };
    }

    return {
      isAppropriate: true,
      severity: 'low',
    };
  }
}
