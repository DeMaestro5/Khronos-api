import { OpenAIService, ContentAnalysis } from './openai.service';
import { GeminiService } from './gemini.service';
import { config } from '../config';

export enum LLMProvider {
  OPENAI = 'openai',
  GEMINI = 'gemini',
}

export class UnifiedLLMService {
  private openaiService: OpenAIService | null = null;
  private geminiService: GeminiService | null = null;
  private primaryProvider: LLMProvider;
  private fallbackProvider: LLMProvider;

  constructor(primaryProvider: LLMProvider = LLMProvider.GEMINI) {
    this.primaryProvider = primaryProvider;
    this.fallbackProvider =
      primaryProvider === LLMProvider.OPENAI
        ? LLMProvider.GEMINI
        : LLMProvider.OPENAI;

    // Initialize services based on available API keys
    if (config.openai.apiKey) {
      this.openaiService = new OpenAIService();
    }
    if (config.gemini.apiKey) {
      this.geminiService = new GeminiService();
    }

    // Adjust providers based on what's actually available
    if (!config.gemini.apiKey && primaryProvider === LLMProvider.GEMINI) {
      console.warn('Gemini API key not found, switching to OpenAI as primary');
      this.primaryProvider = LLMProvider.OPENAI;
      this.fallbackProvider = LLMProvider.GEMINI;
    }
    if (!config.openai.apiKey && primaryProvider === LLMProvider.OPENAI) {
      console.warn('OpenAI API key not found, switching to Gemini as primary');
      this.primaryProvider = LLMProvider.GEMINI;
      this.fallbackProvider = LLMProvider.OPENAI;
    }
  }

  private getService(provider: LLMProvider) {
    switch (provider) {
      case LLMProvider.OPENAI:
        return this.openaiService;
      case LLMProvider.GEMINI:
        return this.geminiService;
      default:
        return null;
    }
  }

  private async executeWithFallback<T>(
    operation: (service: any) => Promise<T>,
    operationName: string,
  ): Promise<T> {
    const primaryService = this.getService(this.primaryProvider);
    const fallbackService = this.getService(this.fallbackProvider);

    // Try primary provider first
    if (primaryService) {
      try {
        console.log(`Attempting ${operationName} with ${this.primaryProvider}`);
        return await operation(primaryService);
      } catch (error: any) {
        console.warn(
          `${this.primaryProvider} failed for ${operationName}:`,
          error.message,
        );

        // Check if it's a quota/rate limit error for OpenAI
        if (
          this.primaryProvider === LLMProvider.OPENAI &&
          (error.message?.includes('quota') ||
            error.message?.includes('rate limit') ||
            error.message?.includes('429'))
        ) {
          console.log(
            `OpenAI quota exceeded, switching to ${this.fallbackProvider}`,
          );
        }
      }
    }

    // Try fallback provider
    if (fallbackService) {
      try {
        console.log(
          `Attempting ${operationName} with ${this.fallbackProvider} as fallback`,
        );
        return await operation(fallbackService);
      } catch (error: any) {
        console.error(
          `Both providers failed for ${operationName}:`,
          error.message,
        );
        throw new Error(
          `All LLM providers failed for ${operationName}: ${error.message}`,
        );
      }
    }

    throw new Error(`No available LLM providers for ${operationName}`);
  }

  async analyzeContent(content: string): Promise<ContentAnalysis> {
    return this.executeWithFallback(
      (service) => service.analyzeContent(content),
      'analyzeContent',
    );
  }

  async generateHashtags(content: string, platform: string): Promise<string[]> {
    return this.executeWithFallback(
      (service) => service.generateHashtags(content, platform),
      'generateHashtags',
    );
  }

  async optimizeHeadline(content: string, platform: string): Promise<string> {
    return this.executeWithFallback(
      (service) => service.optimizeHeadline(content, platform),
      'optimizeHeadline',
    );
  }

  async generateContentVariations(
    content: string,
    platform: string,
    count: number = 3,
  ): Promise<string[]> {
    return this.executeWithFallback(
      (service) => service.generateContentVariations(content, platform, count),
      'generateContentVariations',
    );
  }

  async analyzeAudienceEngagement(
    content: string,
    platform: string,
  ): Promise<{ score: number; suggestions: string[] }> {
    return this.executeWithFallback(
      (service) => service.analyzeAudienceEngagement(content, platform),
      'analyzeAudienceEngagement',
    );
  }

  async analyzeTrendingTopics(platform: string): Promise<string[]> {
    return this.executeWithFallback(
      (service) =>
        service.analyzeTrendingTopics
          ? service.analyzeTrendingTopics(platform)
          : Promise.reject(new Error('Method not available')),
      'analyzeTrendingTopics',
    );
  }

  async generateContentIdeas(topic: string, type: string): Promise<string[]> {
    return this.executeWithFallback(
      (service) =>
        service.generateContentIdeas
          ? service.generateContentIdeas(topic, type)
          : Promise.reject(new Error('Method not available')),
      'generateContentIdeas',
    );
  }

  async optimizeContent(content: string, platform: string): Promise<string> {
    return this.executeWithFallback(
      (service) => service.optimizeContent(content, platform),
      'optimizeContent',
    );
  }

  // Method to manually switch primary provider
  switchPrimaryProvider(provider: LLMProvider): void {
    if (
      (provider === LLMProvider.OPENAI && this.openaiService) ||
      (provider === LLMProvider.GEMINI && this.geminiService)
    ) {
      this.primaryProvider = provider;
      this.fallbackProvider =
        provider === LLMProvider.OPENAI
          ? LLMProvider.GEMINI
          : LLMProvider.OPENAI;
      console.log(`Switched primary provider to ${provider}`);
    } else {
      console.warn(`Cannot switch to ${provider}: service not available`);
    }
  }

  // Get current provider status
  getProviderStatus(): {
    primary: LLMProvider;
    fallback: LLMProvider;
    available: LLMProvider[];
  } {
    const available: LLMProvider[] = [];
    if (this.openaiService) available.push(LLMProvider.OPENAI);
    if (this.geminiService) available.push(LLMProvider.GEMINI);

    return {
      primary: this.primaryProvider,
      fallback: this.fallbackProvider,
      available,
    };
  }

  // Analytics methods
  async analyzeContentPerformance(
    contentId: string,
    platform: string,
    period: { start: Date; end: Date },
  ): Promise<string> {
    return this.executeWithFallback(
      (service) =>
        service.analyzeContentPerformance(contentId, platform, period),
      'analyzeContentPerformance',
    );
  }

  async generatePerformanceReport(
    platform: string,
    dateRange: { start: Date; end: Date },
  ): Promise<string> {
    return this.executeWithFallback(
      (service) => service.generatePerformanceReport(platform, dateRange),
      'generatePerformanceReport',
    );
  }

  async predictContentPerformance(
    content: string,
    platform: string,
  ): Promise<string> {
    return this.executeWithFallback(
      (service) => service.predictContentPerformance(content, platform),
      'predictContentPerformance',
    );
  }

  async compareContentPerformance(
    contentIds: string[],
    platform: string,
    period: { start: Date; end: Date },
  ): Promise<string> {
    return this.executeWithFallback(
      (service) =>
        service.compareContentPerformance(contentIds, platform, period),
      'compareContentPerformance',
    );
  }

  // Notification methods
  async generatePerformanceAlert(
    contentId: string,
    metrics: Record<string, number>,
    threshold: number,
  ): Promise<string> {
    return this.executeWithFallback(
      (service) =>
        service.generatePerformanceAlert(contentId, metrics, threshold),
      'generatePerformanceAlert',
    );
  }

  async generateTrendAlert(
    trend: string,
    platform: string,
    growth: number,
  ): Promise<string> {
    return this.executeWithFallback(
      (service) => service.generateTrendAlert(trend, platform, growth),
      'generateTrendAlert',
    );
  }

  async generateScheduleReminder(
    contentId: string,
    scheduledTime: Date,
    platform: string,
  ): Promise<string> {
    return this.executeWithFallback(
      (service) =>
        service.generateScheduleReminder(contentId, scheduledTime, platform),
      'generateScheduleReminder',
    );
  }

  // Trend methods
  async analyzeTrends(platform: string, category?: string): Promise<string> {
    return this.executeWithFallback(
      (service) => service.analyzeTrends(platform, category),
      'analyzeTrends',
    );
  }

  async predictTrendGrowth(
    trendKeyword: string,
    platform: string,
  ): Promise<string> {
    return this.executeWithFallback(
      (service) => service.predictTrendGrowth(trendKeyword, platform),
      'predictTrendGrowth',
    );
  }

  async getRelatedTrends(
    trendKeyword: string,
    platform: string,
  ): Promise<string> {
    return this.executeWithFallback(
      (service) => service.getRelatedTrends(trendKeyword, platform),
      'getRelatedTrends',
    );
  }

  async generateTrendReport(
    platform: string,
    dateRange: { start: Date; end: Date },
  ): Promise<string> {
    return this.executeWithFallback(
      (service) => service.generateTrendReport(platform, dateRange),
      'generateTrendReport',
    );
  }
}
