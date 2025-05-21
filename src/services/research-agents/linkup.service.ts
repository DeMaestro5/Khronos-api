import axios from 'axios';
import { config } from '../../config';
import Logger from '../../core/Logger';

export interface LinkupQueryParams {
  query: string;
  maxResults?: number;
  filters?: {
    dateRange?: {
      start: string;
      end: string;
    };
    sources?: string[];
    contentType?: string[];
  };
}

export interface LinkupResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedDate?: string;
  relevance: number;
  metadata?: Record<string, any>;
}

export class LinkupService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = config.linkup.apiKey;
    this.baseUrl = 'https://api.linkup.com/v1'; // Replace with actual Linkup API endpoint
  }

  async search(params: LinkupQueryParams): Promise<LinkupResult[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/search`, params, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data.results;
    } catch (error) {
      Logger.error('Linkup search failed:', error);
      throw new Error('Failed to fetch data from Linkup');
    }
  }

  async getContentInsights(query: string): Promise<{
    trends: string[];
    relatedTopics: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/insights`,
        { query },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      Logger.error('Linkup insights failed:', error);
      throw new Error('Failed to get content insights from Linkup');
    }
  }

  async validateContent(content: string): Promise<{
    factCheck: {
      score: number;
      issues: string[];
    };
    sources: string[];
  }> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/validate`,
        { content },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      Logger.error('Linkup content validation failed:', error);
      throw new Error('Failed to validate content with Linkup');
    }
  }
}
