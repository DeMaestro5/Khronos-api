import { OpenAI } from 'openai';
import { config } from '../config';

export interface ContentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
  keywords: string[];
  readability: {
    score: number;
    level: 'easy' | 'moderate' | 'difficult';
  };
  suggestions: string[];
}

export class OpenAIService {
  private openai: OpenAI;
  // Use a more current model that is likely to be available
  private model = 'gpt-4.1-mini';

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async analyzeContent(content: string): Promise<ContentAnalysis> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Analyze this content and provide detailed insights: ${content}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      console.log('analyzeContent', response);

      // Parse and structure the response
      const analysis: ContentAnalysis = {
        sentiment: 'neutral',
        topics: [],
        keywords: [],
        readability: {
          score: 0,
          level: 'moderate',
        },
        suggestions: [],
      };

      // Add implementation logic to parse the response
      return analysis;
    } catch (error) {
      console.error('Error analyzing content:', error);
      throw new Error('Failed to analyze content');
    }
  }

  async generateHashtags(content: string, platform: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Generate relevant hashtags for this content on ${platform}: ${content}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      const hashtags =
        response.choices[0].message.content
          ?.split(' ')
          .filter((tag) => tag.startsWith('#')) || [];
      return hashtags;
    } catch (error) {
      console.error('Error generating hashtags:', error);
      throw new Error('Failed to generate hashtags');
    }
  }

  async optimizeHeadline(content: string, platform: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Generate an optimized headline for this content on ${platform}: ${content}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error optimizing headline:', error);
      throw new Error('Failed to optimize headline');
    }
  }

  async generateContentVariations(
    content: string,
    platform: string,
    count: number = 3,
  ): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Generate ${count} variations of this content optimized for ${platform}: ${content}`,
          },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      });

      const variations =
        response.choices[0].message.content?.split('\n\n').filter(Boolean) ||
        [];
      return variations;
    } catch (error) {
      console.error('Error generating content variations:', error);
      throw new Error('Failed to generate content variations');
    }
  }

  async analyzeAudienceEngagement(
    content: string,
    platform: string,
  ): Promise<{ score: number; suggestions: string[] }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Analyze this content's potential engagement on ${platform} and provide suggestions: ${content}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      console.log('analyzeAudienceEngagement', response);

      // Parse and structure the response
      return {
        score: 0,
        suggestions: [],
      };
    } catch (error) {
      console.error('Error analyzing audience engagement:', error);
      throw new Error('Failed to analyze audience engagement');
    }
  }

  // Analytics methods
  async analyzeContentPerformance(
    contentId: string,
    platform: string,
    period: { start: Date; end: Date },
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Analyze content performance for content ID: ${contentId} on ${platform} from ${period.start.toISOString()} to ${period.end.toISOString()}. Return insights in a structured format.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0].message.content || 'Analysis completed';
    } catch (error) {
      console.error('Error analyzing content performance:', error);
      throw new Error('Failed to analyze content performance');
    }
  }

  async generatePerformanceReport(
    platform: string,
    dateRange: { start: Date; end: Date },
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Generate a performance report for ${platform} from ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}. Include summary, insights, and recommendations.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0].message.content || 'Report generated';
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw new Error('Failed to generate performance report');
    }
  }

  async predictContentPerformance(
    content: string,
    platform: string,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Predict performance for this content on ${platform}. Provide predicted metrics, confidence level, and suggestions in JSON format: ${content}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0].message.content || 'Prediction completed';
    } catch (error) {
      console.error('Error predicting content performance:', error);
      throw new Error('Failed to predict content performance');
    }
  }

  async compareContentPerformance(
    contentIds: string[],
    platform: string,
    period: { start: Date; end: Date },
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Compare performance for content IDs: ${contentIds.join(
              ', ',
            )} on ${platform} from ${period.start.toISOString()} to ${period.end.toISOString()}. Provide comparison insights and recommendations.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0].message.content || 'Comparison completed';
    } catch (error) {
      console.error('Error comparing content performance:', error);
      throw new Error('Failed to compare content performance');
    }
  }

  // Notification methods
  async generatePerformanceAlert(
    contentId: string,
    metrics: Record<string, number>,
    threshold: number,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Generate a performance alert for content ID: ${contentId} with metrics: ${JSON.stringify(
              metrics,
            )} and threshold: ${threshold}. Make it concise and actionable.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      return response.choices[0].message.content || 'Performance alert';
    } catch (error) {
      console.error('Error generating performance alert:', error);
      throw new Error('Failed to generate performance alert');
    }
  }

  async generateTrendAlert(
    trend: string,
    platform: string,
    growth: number,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Generate a trend alert for trend: ${trend} on ${platform} with growth: ${growth}%. Make it engaging and informative.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      return response.choices[0].message.content || 'Trend alert';
    } catch (error) {
      console.error('Error generating trend alert:', error);
      throw new Error('Failed to generate trend alert');
    }
  }

  async generateScheduleReminder(
    contentId: string,
    scheduledTime: Date,
    platform: string,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Generate a schedule reminder for content ID: ${contentId} scheduled for ${scheduledTime.toISOString()} on ${platform}. Make it helpful and clear.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      return response.choices[0].message.content || 'Schedule reminder';
    } catch (error) {
      console.error('Error generating schedule reminder:', error);
      throw new Error('Failed to generate schedule reminder');
    }
  }

  // Trend methods
  async analyzeTrends(platform: string, category?: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Analyze current trends for ${platform}${
              category ? ` in ${category}` : ''
            } and provide detailed insights including trending topics, emerging topics, declining topics, and recommendations in a structured format.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0].message.content || 'Trend analysis completed';
    } catch (error) {
      console.error('Error analyzing trends:', error);
      throw new Error('Failed to analyze trends');
    }
  }

  async predictTrendGrowth(
    trendKeyword: string,
    platform: string,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Predict growth for trend: ${trendKeyword} on ${platform}. Provide predicted growth percentage, confidence level, and timeframe in JSON format.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return (
        response.choices[0].message.content || 'Trend prediction completed'
      );
    } catch (error) {
      console.error('Error predicting trend growth:', error);
      throw new Error('Failed to predict trend growth');
    }
  }

  async getRelatedTrends(
    trendKeyword: string,
    platform: string,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Find related trends for: ${trendKeyword} on ${platform}. Return a list of related trending topics and keywords.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0].message.content || 'Related trends found';
    } catch (error) {
      console.error('Error getting related trends:', error);
      throw new Error('Failed to get related trends');
    }
  }

  async generateTrendReport(
    platform: string,
    dateRange: { start: Date; end: Date },
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Generate a comprehensive trend report for ${platform} from ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}. Include summary, top trends, insights, and recommendations.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0].message.content || 'Trend report generated';
    } catch (error) {
      console.error('Error generating trend report:', error);
      throw new Error('Failed to generate trend report');
    }
  }
}
