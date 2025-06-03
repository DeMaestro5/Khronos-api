import { GoogleGenerativeAI } from '@google/generative-ai';
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

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: string = 'gemini-1.5-flash'; // Free model

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async analyzeContent(content: string): Promise<ContentAnalysis> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Analyze this content and provide detailed insights in JSON format with the following structure:
      {
        "sentiment": "positive|negative|neutral",
        "topics": ["topic1", "topic2"],
        "keywords": ["keyword1", "keyword2"],
        "readability": {
          "score": 0-100,
          "level": "easy|moderate|difficult"
        },
        "suggestions": ["suggestion1", "suggestion2"]
      }
      
      Content: ${content}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        const analysis = JSON.parse(text);
        return analysis;
      } catch (parseError) {
        console.warn(
          'Failed to parse Gemini response as JSON, using default values',
        );
        return {
          sentiment: 'neutral',
          topics: [],
          keywords: [],
          readability: {
            score: 0,
            level: 'moderate',
          },
          suggestions: [],
        };
      }
    } catch (error) {
      console.error('Error analyzing content with Gemini:', error);
      throw new Error('Failed to analyze content');
    }
  }

  async generateHashtags(content: string, platform: string): Promise<string[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Generate relevant hashtags for this content on ${platform}. Return only the hashtags separated by spaces, each starting with #:

      Content: ${content}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const hashtags =
        text.split(' ').filter((tag) => tag.startsWith('#')) || [];
      return hashtags;
    } catch (error) {
      console.error('Error generating hashtags with Gemini:', error);
      throw new Error('Failed to generate hashtags');
    }
  }

  async optimizeHeadline(content: string, platform: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Generate an optimized headline for this content on ${platform}. Return only the headline:

      Content: ${content}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return text.trim();
    } catch (error) {
      console.error('Error optimizing headline with Gemini:', error);
      throw new Error('Failed to optimize headline');
    }
  }

  async generateContentVariations(
    content: string,
    platform: string,
    count: number = 3,
  ): Promise<string[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Generate ${count} variations of this content optimized for ${platform}. Separate each variation with "---":

      Content: ${content}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const variations = text
        .split('---')
        .map((v) => v.trim())
        .filter(Boolean);
      return variations;
    } catch (error) {
      console.error('Error generating content variations with Gemini:', error);
      throw new Error('Failed to generate content variations');
    }
  }

  async analyzeAudienceEngagement(
    content: string,
    platform: string,
  ): Promise<{ score: number; suggestions: string[] }> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Analyze this content's potential engagement on ${platform} and provide suggestions in JSON format:
      {
        "score": 0-100,
        "suggestions": ["suggestion1", "suggestion2"]
      }
      
      Content: ${content}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        const analysis = JSON.parse(text);
        return analysis;
      } catch (parseError) {
        console.warn(
          'Failed to parse Gemini engagement response as JSON, using default values',
        );
        return {
          score: 0,
          suggestions: [],
        };
      }
    } catch (error) {
      console.error('Error analyzing audience engagement with Gemini:', error);
      throw new Error('Failed to analyze audience engagement');
    }
  }

  async analyzeTrendingTopics(platform: string): Promise<string[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Analyze trending topics for ${platform} and provide a list of relevant topics. Return each topic on a new line:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const topics = text
        .split('\n')
        .filter(Boolean)
        .map((t) => t.trim());
      return topics;
    } catch (error) {
      console.error('Error analyzing trending topics with Gemini:', error);
      throw new Error('Failed to analyze trending topics');
    }
  }

  async generateContentIdeas(topic: string, type: string): Promise<string[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Generate creative content ideas for ${type} about ${topic}. Return each idea on a new line:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const ideas = text
        .split('\n')
        .filter(Boolean)
        .map((i) => i.trim());
      return ideas;
    } catch (error) {
      console.error('Error generating content ideas with Gemini:', error);
      throw new Error('Failed to generate content ideas');
    }
  }

  async optimizeContent(content: string, platform: string): Promise<string> {
    try {
      if (!content) {
        console.warn('No content provided for optimization');
        return '';
      }

      if (!platform) {
        console.warn('No platform specified for optimization');
        return content;
      }

      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `You are a content optimization expert. Optimize the following content for ${platform}. Maintain the original message but make it more engaging and platform-appropriate. Return only the optimized content:

      Content: ${content}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const optimizedContent = response.text().trim();

      if (!optimizedContent) {
        console.warn('No optimized content received from Gemini');
        return content;
      }

      return optimizedContent;
    } catch (error) {
      console.error('Error optimizing content with Gemini:', error);
      // Return original content instead of throwing error
      return content;
    }
  }

  // Analytics methods
  async analyzeContentPerformance(
    contentId: string,
    platform: string,
    period: { start: Date; end: Date },
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Analyze content performance for content ID: ${contentId} on ${platform} from ${period.start.toISOString()} to ${period.end.toISOString()}. Return insights in a structured format.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing content performance with Gemini:', error);
      throw new Error('Failed to analyze content performance');
    }
  }

  async generatePerformanceReport(
    platform: string,
    dateRange: { start: Date; end: Date },
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Generate a performance report for ${platform} from ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}. Include summary, insights, and recommendations.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating performance report with Gemini:', error);
      throw new Error('Failed to generate performance report');
    }
  }

  async predictContentPerformance(
    content: string,
    platform: string,
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Predict performance for this content on ${platform}. Provide predicted metrics, confidence level, and suggestions in JSON format:

      Content: ${content}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error predicting content performance with Gemini:', error);
      throw new Error('Failed to predict content performance');
    }
  }

  async compareContentPerformance(
    contentIds: string[],
    platform: string,
    period: { start: Date; end: Date },
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Compare performance for content IDs: ${contentIds.join(
        ', ',
      )} on ${platform} from ${period.start.toISOString()} to ${period.end.toISOString()}. Provide comparison insights and recommendations.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error comparing content performance with Gemini:', error);
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
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Generate a performance alert for content ID: ${contentId} with metrics: ${JSON.stringify(
        metrics,
      )} and threshold: ${threshold}. Make it concise and actionable.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating performance alert with Gemini:', error);
      throw new Error('Failed to generate performance alert');
    }
  }

  async generateTrendAlert(
    trend: string,
    platform: string,
    growth: number,
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Generate a trend alert for trend: ${trend} on ${platform} with growth: ${growth}%. Make it engaging and informative.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating trend alert with Gemini:', error);
      throw new Error('Failed to generate trend alert');
    }
  }

  async generateScheduleReminder(
    contentId: string,
    scheduledTime: Date,
    platform: string,
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Generate a schedule reminder for content ID: ${contentId} scheduled for ${scheduledTime.toISOString()} on ${platform}. Make it helpful and clear.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating schedule reminder with Gemini:', error);
      throw new Error('Failed to generate schedule reminder');
    }
  }

  // Trend methods
  async analyzeTrends(platform: string, category?: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Analyze current trends for ${platform}${
        category ? ` in ${category}` : ''
      } and provide detailed insights including trending topics, emerging topics, declining topics, and recommendations in a structured format.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing trends with Gemini:', error);
      throw new Error('Failed to analyze trends');
    }
  }

  async predictTrendGrowth(
    trendKeyword: string,
    platform: string,
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Predict growth for trend: ${trendKeyword} on ${platform}. Provide predicted growth percentage, confidence level, and timeframe in JSON format.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error predicting trend growth with Gemini:', error);
      throw new Error('Failed to predict trend growth');
    }
  }

  async getRelatedTrends(
    trendKeyword: string,
    platform: string,
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Find related trends for: ${trendKeyword} on ${platform}. Return a list of related trending topics and keywords.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error getting related trends with Gemini:', error);
      throw new Error('Failed to get related trends');
    }
  }

  async generateTrendReport(
    platform: string,
    dateRange: { start: Date; end: Date },
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const prompt = `Generate a comprehensive trend report for ${platform} from ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}. Include summary, top trends, insights, and recommendations.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating trend report with Gemini:', error);
      throw new Error('Failed to generate trend report');
    }
  }
}
