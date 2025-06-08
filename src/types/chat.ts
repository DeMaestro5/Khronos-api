export interface ChatMode {
  enhanced: boolean; // Enable enhanced features
  requireContentOwnership: boolean; // Require content ownership validation
  validateInappropriate: boolean; // Enable inappropriate content detection
  generateInsights: boolean; // Generate content insights
}

export interface ChatContext {
  contentId?: string;
  contentTitle?: string;
  contentType?: string;
  contentPlatform?: string[];
  contentDescription?: string;
  contentBody?: string;
  contentTags?: string[];
  contentStatus?: string;
  userProfile?: {
    name: string;
    role: string;
  };
}

export interface ChatResponse {
  message: string;
  tokens?: number;
  model?: string;
  suggestions?: string[];
  actions?: Array<{
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
  }>;
  conversationStarters?: string[];
  contentInsights?: {
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  };
  inappropriateContentDetected?: boolean;
  warningMessage?: string;
}
