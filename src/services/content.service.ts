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
  status: 'draft' | 'scheduled' | 'published';
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
  // Use a more current model that is likely to be available
  private model = 'gpt-4.1-mini';

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
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Optimize this content for ${platform}: ${content}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return response.choices[0].message.content || content;
    } catch (error) {
      console.error('Error optimizing content:', error);
      throw new Error('Failed to optimize content');
    }
  }

  async analyzeEngagement(
    contentId: Types.ObjectId,
  ): Promise<Content['engagement']> {
    // Implement engagement analysis logic here
    // This could involve fetching data from social media APIs
    return {
      likes: 0,
      shares: 0,
      comments: 0,
      views: 0,
    };
  }
}
