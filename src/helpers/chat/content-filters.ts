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
    /(.)\1{10,}/g, // Repeated characters (increased threshold)
    /^[^a-zA-Z\s]*$/g, // Only symbols/numbers (but allow spaces)
    /^.{1,2}$/g, // Very short messages (reduced from 3 to 2)
  ];

  static async validateMessageContent(
    message: string,
  ): Promise<MessageValidationResult> {
    // Check for inappropriate content (severe violations only)
    for (const pattern of this.inappropriatePatterns) {
      if (pattern.test(message)) {
        return {
          isAppropriate: false,
          severity: 'high',
          reason: 'inappropriate_language',
          suggestedResponse:
            "I understand you might be feeling frustrated, but let's keep our conversation professional and focused on how I can help you best! 😊",
        };
      }
    }

    // Check for spam/nonsense (more lenient)
    for (const pattern of this.spamPatterns) {
      if (pattern.test(message)) {
        return {
          isAppropriate: false,
          severity: 'low',
          reason: 'unclear_message',
          suggestedResponse:
            "I'd love to help you! Could you please provide a bit more detail about what you'd like to discuss or learn about?",
        };
      }
    }

    // Check message length (very minimal threshold)
    if (message.length < 2) {
      return {
        isAppropriate: false,
        severity: 'low',
        reason: 'too_short',
        suggestedResponse:
          "I'm here to help with any questions you have! What would you like to know about?",
      };
    }

    // REMOVED: Off-topic content filtering - now we accept all topics!
    // The AI should be able to discuss anything, not just content-related topics

    return {
      isAppropriate: true,
      severity: 'low',
    };
  }

  // Helper method to check if content is spam-like (very basic)
  static isLikelySpam(message: string): boolean {
    const spamIndicators = [
      /(.)\1{15,}/g, // Excessive character repetition
      /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/g, // Only special characters
      /^\d+$/g, // Only numbers
    ];

    return spamIndicators.some((pattern) => pattern.test(message));
  }

  // Helper method for content relevance (but doesn't block anymore)
  static getContentRelevanceScore(message: string): number {
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
      'marketing',
      'social media',
    ];

    const lowerMessage = message.toLowerCase();
    const matches = contentKeywords.filter((keyword) =>
      lowerMessage.includes(keyword),
    );

    return matches.length / contentKeywords.length; // Returns 0-1 score
  }
}
