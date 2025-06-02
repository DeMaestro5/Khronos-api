import { Types } from 'mongoose';
import { OpenAI } from 'openai';
import { config } from '../config';

export interface Content {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  metadata: {
    title: string;
    description: string;
    type: 'article' | 'video' | 'social' | 'podcast';
    status: 'draft' | 'scheduled' | 'published';
    scheduledDate?: Date;
    publishedDate?: Date;
    platform: string[];
    tags: string[];
  };
  title: string;
  description: string;
  type: 'article' | 'video' | 'social' | 'podcast';
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  platform: string[];
  tags: string[];
  engagement?: {
    likes?: number;
    shares?: number;
    comments?: number;
    views?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class ContentService {
  private openai: OpenAI;
  // Use a valid model name
  private model = 'gpt-3.5-turbo';

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async analyzeTrendingTopics(platform: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Analyze trending topics for ${platform} and provide a list of relevant topics.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const topics =
        response.choices[0].message.content?.split('\n').filter(Boolean) || [];
      return topics;
    } catch (error) {
      console.error('Error analyzing trending topics:', error);
      throw new Error('Failed to analyze trending topics');
    }
  }

  async generateContentIdeas(
    topic: string,
    type: Content['type'],
  ): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Generate creative content ideas for ${type} about ${topic}.`,
          },
        ],
        temperature: 0.8,
        max_tokens: 500,
      });

      const ideas =
        response.choices[0].message.content?.split('\n').filter(Boolean) || [];
      return ideas;
    } catch (error) {
      console.error('Error generating content ideas:', error);
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

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a content optimization expert. Optimize the following content for ${platform}. Maintain the original message but make it more engaging and platform-appropriate.`,
          },
          {
            role: 'user',
            content: content,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const optimizedContent = response.choices[0]?.message?.content;
      if (!optimizedContent) {
        console.warn('No optimized content received from OpenAI');
        return content;
      }

      return optimizedContent;
    } catch (error) {
      console.error('Error optimizing content:', error);
      // Return original content instead of throwing error
      return content;
    }
  }

  async analyzeEngagement(
    contentId: Types.ObjectId,
  ): Promise<Content['engagement']> {
    // Implement engagement analysis logic here
    // This could involve fetching data from social media APIs
    console.log(`Analyzing engagement for content: ${contentId}`);
    return {
      likes: 0,
      shares: 0,
      comments: 0,
      views: 0,
    };
  }

  /**
   * Get detailed analytics for a specific content
   */
  async getContentAnalytics(contentId: Types.ObjectId): Promise<{
    engagement: Content['engagement'];
    performance: {
      reach: number;
      impressions: number;
      clickThroughRate: number;
      averageTimeOnPage: number;
    };
    demographics: {
      ageGroups: Record<string, number>;
      locations: Record<string, number>;
      devices: Record<string, number>;
    };
    trends: {
      dailyEngagement: Array<{ date: string; value: number }>;
      topReferrers: Array<{ source: string; count: number }>;
    };
  }> {
    try {
      // Get basic engagement metrics
      const engagement = await this.analyzeEngagement(contentId);

      // In a real implementation, this would fetch data from analytics providers
      // For now, return mock data
      return {
        engagement,
        performance: {
          reach: 1000,
          impressions: 5000,
          clickThroughRate: 0.15,
          averageTimeOnPage: 120,
        },
        demographics: {
          ageGroups: {
            '18-24': 30,
            '25-34': 40,
            '35-44': 20,
            '45+': 10,
          },
          locations: {
            'United States': 60,
            'United Kingdom': 20,
            Canada: 10,
            Other: 10,
          },
          devices: {
            Mobile: 70,
            Desktop: 25,
            Tablet: 5,
          },
        },
        trends: {
          dailyEngagement: [
            { date: '2024-03-01', value: 100 },
            { date: '2024-03-02', value: 150 },
            { date: '2024-03-03', value: 200 },
          ],
          topReferrers: [
            { source: 'Direct', count: 500 },
            { source: 'Social Media', count: 300 },
            { source: 'Search', count: 200 },
          ],
        },
      };
    } catch (error) {
      console.error('Error getting content analytics:', error);
      throw new Error('Failed to get content analytics');
    }
  }
}
