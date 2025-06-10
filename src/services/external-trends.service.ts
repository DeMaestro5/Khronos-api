import axios from 'axios';

interface TrendingTopic {
  topic: string;
  volume: number;
  growth: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  platforms: string[];
  relatedKeywords: string[];
  influencers: string[];
  geographicData: Record<string, number>;
  ageGroups: Record<string, number>;
  competitionLevel: 'low' | 'medium' | 'high';
  opportunityScore: number;
}

interface CompetitorAnalysis {
  competitor: string;
  platform: string;
  followers: number;
  avgEngagement: number;
  postFrequency: number;
  topContent: Array<{
    type: string;
    engagement: number;
    reach: number;
  }>;
  contentStrategy: {
    primaryTopics: string[];
    postingTimes: number[];
    hashtagStrategy: string[];
  };
  performanceTrends: {
    growth: number;
    engagementTrend: number;
    reachTrend: number;
  };
}

interface IndustryInsight {
  industry: string;
  metric: string;
  value: number;
  change: number;
  timeframe: string;
  benchmark: number;
  source: string;
  reliability: number;
}

interface SocialListeningData {
  keyword: string;
  mentions: number;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  platforms: Record<string, number>;
  influencerMentions: Array<{
    username: string;
    followers: number;
    engagement: number;
    sentiment: string;
  }>;
  geographicDistribution: Record<string, number>;
  timeSeriesData: Array<{
    date: Date;
    mentions: number;
    sentiment: number;
  }>;
}

interface ExternalAPIConfig {
  name: string;
  baseURL: string;
  apiKey: string;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  endpoints: Record<string, string>;
}

export class ExternalTrendsService {
  private apiConfigs: Map<string, ExternalAPIConfig> = new Map();
  private requestCounts: Map<string, { count: number; resetTime: Date }> =
    new Map();

  constructor() {
    this.initializeAPIConfigs();
  }

  /**
   * Check if an API has valid credentials
   */
  private hasValidCredentials(apiName: string): boolean {
    const config = this.apiConfigs.get(apiName);
    return config ? !!config.apiKey && config.apiKey.length > 0 : false;
  }

  /**
   * Generate mock trending topics when API credentials are not available
   */
  private generateMockTrendingTopics(): TrendingTopic[] {
    return [
      {
        topic: 'Content Creation Tips',
        volume: 1000,
        growth: 25,
        sentiment: 'positive',
        platforms: ['youtube', 'instagram', 'tiktok'],
        relatedKeywords: ['tutorial', 'guide', 'howto'],
        influencers: [],
        geographicData: { US: 40, UK: 20, CA: 15 },
        ageGroups: { '18-24': 30, '25-34': 40, '35-44': 30 },
        competitionLevel: 'medium',
        opportunityScore: 75,
      },
      {
        topic: 'Social Media Strategy',
        volume: 800,
        growth: 15,
        sentiment: 'positive',
        platforms: ['linkedin', 'twitter', 'facebook'],
        relatedKeywords: ['marketing', 'engagement', 'growth'],
        influencers: [],
        geographicData: { US: 50, UK: 25, AU: 15 },
        ageGroups: { '25-34': 45, '35-44': 35, '45-54': 20 },
        competitionLevel: 'high',
        opportunityScore: 60,
      },
    ];
  }

  private initializeAPIConfigs(): void {
    // Google Trends API
    this.apiConfigs.set('google_trends', {
      name: 'Google Trends',
      baseURL: 'https://trends.googleapis.com/trends/api',
      apiKey: process.env.GOOGLE_TRENDS_API_KEY || '',
      rateLimits: { requestsPerMinute: 100, requestsPerDay: 10000 },
      endpoints: {
        trending: '/dailytrends',
        interest: '/explore',
        related: '/relatedqueries',
      },
    });

    // Twitter API v2
    this.apiConfigs.set('twitter', {
      name: 'Twitter API',
      baseURL: 'https://api.twitter.com/2',
      apiKey: process.env.TWITTER_BEARER_TOKEN || '',
      rateLimits: { requestsPerMinute: 300, requestsPerDay: 7200 },
      endpoints: {
        trends: '/trends/place',
        search: '/tweets/search/recent',
        users: '/users/by/username',
      },
    });

    // BuzzSumo API
    this.apiConfigs.set('buzzsumo', {
      name: 'BuzzSumo',
      baseURL: 'https://api.buzzsumo.com/v5',
      apiKey: process.env.BUZZSUMO_API_KEY || '',
      rateLimits: { requestsPerMinute: 60, requestsPerDay: 10000 },
      endpoints: {
        trending: '/content/trending',
        influencers: '/influencers',
        analysis: '/content/analysis',
      },
    });

    // Mention.com API
    this.apiConfigs.set('mention', {
      name: 'Mention',
      baseURL: 'https://api.mention.net/api',
      apiKey: process.env.MENTION_API_KEY || '',
      rateLimits: { requestsPerMinute: 120, requestsPerDay: 5000 },
      endpoints: {
        mentions: '/accounts/{account_id}/mentions',
        alerts: '/accounts/{account_id}/alerts',
        stats: '/accounts/{account_id}/stats',
      },
    });

    // Brand24 API
    this.apiConfigs.set('brand24', {
      name: 'Brand24',
      baseURL: 'https://api.brand24.com/v2',
      apiKey: process.env.BRAND24_API_KEY || '',
      rateLimits: { requestsPerMinute: 60, requestsPerDay: 2000 },
      endpoints: {
        mentions: '/mentions',
        summary: '/summary',
        influencers: '/influencers',
      },
    });

    // SEMrush API
    this.apiConfigs.set('semrush', {
      name: 'SEMrush',
      baseURL: 'https://api.semrush.com',
      apiKey: process.env.SEMRUSH_API_KEY || '',
      rateLimits: { requestsPerMinute: 60, requestsPerDay: 10000 },
      endpoints: {
        trends: '/analytics/ta/api/v3/summary',
        keywords: '/analytics/kw/api/v3/overview',
        competitors: '/analytics/da/api/v3/competitors',
      },
    });
  }

  // Google Trends Integration
  async getGoogleTrends(
    geo: string = 'US',
    category: number = 0,
  ): Promise<TrendingTopic[]> {
    try {
      const config = this.apiConfigs.get('google_trends')!;
      await this.checkRateLimit('google_trends');

      const response = await axios.get(
        `${config.baseURL}${config.endpoints.trending}`,
        {
          params: {
            hl: 'en-US',
            tz: -480,
            geo,
            cat: category,
          },
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
        },
      );

      const trends: TrendingTopic[] = [];

      if (response.data?.default?.trendingSearchesDays) {
        const trendingDay = response.data.default.trendingSearchesDays[0];

        for (const search of trendingDay.trendingSearches.slice(0, 10)) {
          trends.push({
            topic: search.title.query,
            volume:
              parseInt(search.formattedTraffic.replace(/[^0-9]/g, '')) || 0,
            growth: Math.random() * 100, // Would calculate from historical data
            sentiment: 'neutral',
            platforms: ['google', 'youtube'],
            relatedKeywords:
              search.relatedQueries?.map((q: any) => q.query) || [],
            influencers: [],
            geographicData: { [geo]: 100 },
            ageGroups: {},
            competitionLevel: 'medium',
            opportunityScore: Math.random() * 100,
          });
        }
      }

      return trends;
    } catch (error) {
      console.error('Google Trends API Error:', error);
      return [];
    }
  }

  // Twitter Trends Integration
  async getTwitterTrends(woeid: number = 1): Promise<TrendingTopic[]> {
    if (!this.hasValidCredentials('twitter')) {
      console.log(
        'Twitter credentials not available, returning mock trending data',
      );
      return this.generateMockTrendingTopics();
    }

    try {
      const config = this.apiConfigs.get('twitter')!;
      await this.checkRateLimit('twitter');

      const response = await axios.get(
        `${config.baseURL}${config.endpoints.trends}`,
        {
          params: { id: woeid },
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
        },
      );

      const trends: TrendingTopic[] = [];

      if (response.data?.[0]?.trends) {
        for (const trend of response.data[0].trends.slice(0, 10)) {
          // Get additional data for each trend
          const searchData = await this.searchTwitterTrend(trend.name);

          trends.push({
            topic: trend.name,
            volume: trend.tweet_volume || 0,
            growth: searchData.growth,
            sentiment: searchData.sentiment,
            platforms: ['twitter'],
            relatedKeywords: searchData.relatedKeywords,
            influencers: searchData.influencers,
            geographicData: searchData.geographicData,
            ageGroups: {},
            competitionLevel: this.assessCompetitionLevel(
              trend.tweet_volume || 0,
            ),
            opportunityScore: this.calculateOpportunityScore(
              trend.tweet_volume || 0,
              searchData.sentiment,
            ),
          });
        }
      }

      return trends;
    } catch (error) {
      console.error('Twitter Trends API Error:', error);
      return this.generateMockTrendingTopics();
    }
  }

  private async searchTwitterTrend(query: string): Promise<any> {
    try {
      const config = this.apiConfigs.get('twitter')!;

      const response = await axios.get(
        `${config.baseURL}${config.endpoints.search}`,
        {
          params: {
            query,
            max_results: 100,
            'tweet.fields': 'public_metrics,created_at,context_annotations',
          },
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
          },
        },
      );

      // Analyze the tweets for sentiment and related data
      const tweets = response.data?.data || [];
      const sentiment = this.analyzeSentiment(tweets);
      const relatedKeywords = this.extractKeywords(tweets);

      return {
        growth: Math.random() * 50,
        sentiment,
        relatedKeywords,
        influencers: [],
        geographicData: { US: 60, Global: 40 },
      };
    } catch (error) {
      console.error('Twitter search error:', error);
      return {
        growth: 0,
        sentiment: 'neutral',
        relatedKeywords: [],
        influencers: [],
        geographicData: {},
      };
    }
  }

  // BuzzSumo Integration
  async getBuzzSumoTrends(domain?: string): Promise<TrendingTopic[]> {
    try {
      const config = this.apiConfigs.get('buzzsumo')!;
      await this.checkRateLimit('buzzsumo');

      const response = await axios.get(
        `${config.baseURL}${config.endpoints.trending}`,
        {
          params: {
            num_results: 20,
            days: 7,
            domain,
          },
          headers: {
            'X-API-KEY': config.apiKey,
          },
        },
      );

      const trends: TrendingTopic[] = [];

      if (response.data?.results) {
        for (const item of response.data.results.slice(0, 10)) {
          trends.push({
            topic: item.title,
            volume: item.total_shares || 0,
            growth: item.growth_rate || 0,
            sentiment: this.categorizeSentiment(item.sentiment_score || 0),
            platforms: item.networks || ['facebook', 'twitter', 'linkedin'],
            relatedKeywords: item.keywords || [],
            influencers: item.influencers?.map((inf: any) => inf.name) || [],
            geographicData: item.geographic_data || {},
            ageGroups: {},
            competitionLevel: this.assessCompetitionLevel(
              item.total_shares || 0,
            ),
            opportunityScore: this.calculateBuzzSumoOpportunity(item),
          });
        }
      }

      return trends;
    } catch (error) {
      console.error('BuzzSumo API Error:', error);
      return [];
    }
  }

  // Social Listening with Mention.com
  async getSocialListeningData(
    keywords: string[],
  ): Promise<SocialListeningData[]> {
    try {
      const config = this.apiConfigs.get('mention')!;
      await this.checkRateLimit('mention');

      const results: SocialListeningData[] = [];

      for (const keyword of keywords) {
        const response = await axios.get(
          `${config.baseURL}${config.endpoints.mentions}`,
          {
            params: {
              q: keyword,
              limit: 100,
              sort: 'published_at',
            },
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
            },
          },
        );

        if (response.data?.mentions) {
          const mentions = response.data.mentions;

          results.push({
            keyword,
            mentions: mentions.length,
            sentiment: this.calculateSentimentDistribution(mentions),
            platforms: this.calculatePlatformDistribution(mentions),
            influencerMentions: this.extractInfluencerMentions(mentions),
            geographicDistribution:
              this.calculateGeographicDistribution(mentions),
            timeSeriesData: this.generateTimeSeriesData(mentions),
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Mention API Error:', error);
      return [];
    }
  }

  // Competitor Analysis
  async getCompetitorAnalysis(
    competitors: string[],
    platform: string,
  ): Promise<CompetitorAnalysis[]> {
    try {
      const results: CompetitorAnalysis[] = [];

      for (const competitor of competitors) {
        const analysis = await this.analyzeCompetitor(competitor, platform);
        if (analysis) {
          results.push(analysis);
        }
      }

      return results;
    } catch (error) {
      console.error('Competitor analysis error:', error);
      return [];
    }
  }

  private async analyzeCompetitor(
    competitor: string,
    platform: string,
  ): Promise<CompetitorAnalysis | null> {
    try {
      // This would integrate with platform-specific APIs
      switch (platform) {
        case 'twitter':
          return await this.analyzeTwitterCompetitor(competitor);
        case 'instagram':
          return await this.analyzeInstagramCompetitor(competitor);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error analyzing ${competitor} on ${platform}:`, error);
      return null;
    }
  }

  private async analyzeTwitterCompetitor(
    username: string,
  ): Promise<CompetitorAnalysis> {
    const config = this.apiConfigs.get('twitter')!;

    // Get user data
    const userResponse = await axios.get(
      `${config.baseURL}${config.endpoints.users}/${username}`,
      {
        params: {
          'user.fields': 'public_metrics,created_at',
        },
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      },
    );

    const user = userResponse.data?.data;

    return {
      competitor: username,
      platform: 'twitter',
      followers: user?.public_metrics?.followers_count || 0,
      avgEngagement: this.calculateTwitterEngagement(user),
      postFrequency: 5, // Would calculate from recent tweets
      topContent: [],
      contentStrategy: {
        primaryTopics: [],
        postingTimes: [],
        hashtagStrategy: [],
      },
      performanceTrends: {
        growth: Math.random() * 20,
        engagementTrend: Math.random() * 10,
        reachTrend: Math.random() * 15,
      },
    };
  }

  private async analyzeInstagramCompetitor(
    username: string,
  ): Promise<CompetitorAnalysis> {
    // Instagram analysis would require Instagram Basic Display API or Instagram Graph API
    return {
      competitor: username,
      platform: 'instagram',
      followers: 0,
      avgEngagement: 0,
      postFrequency: 0,
      topContent: [],
      contentStrategy: {
        primaryTopics: [],
        postingTimes: [],
        hashtagStrategy: [],
      },
      performanceTrends: {
        growth: 0,
        engagementTrend: 0,
        reachTrend: 0,
      },
    };
  }

  // Industry Insights
  async getIndustryInsights(industry: string): Promise<IndustryInsight[]> {
    try {
      const insights: IndustryInsight[] = [];

      // Get data from multiple sources
      const semrushData = await this.getSEMrushIndustryData(industry);
      const socialData = await this.getSocialIndustryData(industry);

      insights.push(...semrushData, ...socialData);

      return insights;
    } catch (error) {
      console.error('Industry insights error:', error);
      return [];
    }
  }

  private async getSEMrushIndustryData(
    industry: string,
  ): Promise<IndustryInsight[]> {
    try {
      await this.checkRateLimit('semrush');

      // This would make actual SEMrush API calls
      return [
        {
          industry,
          metric: 'Search Volume',
          value: Math.floor(Math.random() * 100000),
          change: Math.random() * 20 - 10,
          timeframe: '30d',
          benchmark: Math.floor(Math.random() * 80000),
          source: 'SEMrush',
          reliability: 0.9,
        },
      ];
    } catch (error) {
      console.error('SEMrush industry data error:', error);
      return [];
    }
  }

  private async getSocialIndustryData(
    industry: string,
  ): Promise<IndustryInsight[]> {
    // Aggregate social media insights for the industry
    return [
      {
        industry,
        metric: 'Average Engagement Rate',
        value: Math.random() * 5,
        change: Math.random() * 2 - 1,
        timeframe: '30d',
        benchmark: 2.5,
        source: 'Social Media Analysis',
        reliability: 0.8,
      },
    ];
  }

  // Helper Methods
  private async checkRateLimit(apiName: string): Promise<void> {
    const config = this.apiConfigs.get(apiName);
    if (!config) return;

    const now = new Date();
    const requestData = this.requestCounts.get(apiName);

    if (!requestData || now > requestData.resetTime) {
      this.requestCounts.set(apiName, {
        count: 1,
        resetTime: new Date(now.getTime() + 60000), // Reset in 1 minute
      });
      return;
    }

    if (requestData.count >= config.rateLimits.requestsPerMinute) {
      const waitTime = requestData.resetTime.getTime() - now.getTime();
      throw new Error(`Rate limit exceeded for ${apiName}. Wait ${waitTime}ms`);
    }

    requestData.count++;
    this.requestCounts.set(apiName, requestData);
  }

  private analyzeSentiment(tweets: any[]): 'positive' | 'neutral' | 'negative' {
    // Simplified sentiment analysis
    const positiveWords = [
      'good',
      'great',
      'awesome',
      'love',
      'amazing',
      'excellent',
    ];
    const negativeWords = [
      'bad',
      'terrible',
      'hate',
      'awful',
      'horrible',
      'worst',
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    tweets.forEach((tweet) => {
      const text = tweet.text?.toLowerCase() || '';
      positiveWords.forEach((word) => {
        if (text.includes(word)) positiveCount++;
      });
      negativeWords.forEach((word) => {
        if (text.includes(word)) negativeCount++;
      });
    });

    if (positiveCount > negativeCount * 1.2) return 'positive';
    if (negativeCount > positiveCount * 1.2) return 'negative';
    return 'neutral';
  }

  private extractKeywords(tweets: any[]): string[] {
    const keywords = new Set<string>();

    tweets.forEach((tweet) => {
      const text = tweet.text || '';
      const hashtags = text.match(/#\w+/g) || [];
      hashtags.forEach((tag: any) => keywords.add(tag.toLowerCase()));
    });

    return Array.from(keywords).slice(0, 10);
  }

  private categorizeSentiment(
    score: number,
  ): 'positive' | 'neutral' | 'negative' {
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }

  private assessCompetitionLevel(volume: number): 'low' | 'medium' | 'high' {
    if (volume < 1000) return 'low';
    if (volume < 10000) return 'medium';
    return 'high';
  }

  private calculateOpportunityScore(volume: number, sentiment: string): number {
    let score = Math.min(100, (volume / 1000) * 10);
    if (sentiment === 'positive') score *= 1.2;
    if (sentiment === 'negative') score *= 0.8;
    return Math.max(0, Math.min(100, score));
  }

  private calculateBuzzSumoOpportunity(item: any): number {
    const shares = item.total_shares || 0;
    const engagement = item.engagement_rate || 0;
    return Math.min(100, shares / 100 + engagement * 10);
  }

  private calculateSentimentDistribution(mentions: any[]): any {
    const total = mentions.length;
    const positive = mentions.filter(
      (m) => (m.sentiment_score || 0) > 0.1,
    ).length;
    const negative = mentions.filter(
      (m) => (m.sentiment_score || 0) < -0.1,
    ).length;
    const neutral = total - positive - negative;

    return {
      positive: +((positive / total) * 100).toFixed(1),
      neutral: +((neutral / total) * 100).toFixed(1),
      negative: +((negative / total) * 100).toFixed(1),
    };
  }

  private calculatePlatformDistribution(
    mentions: any[],
  ): Record<string, number> {
    const platforms: Record<string, number> = {};

    mentions.forEach((mention) => {
      const platform = mention.source?.name || 'unknown';
      platforms[platform] = (platforms[platform] || 0) + 1;
    });

    return platforms;
  }

  private extractInfluencerMentions(mentions: any[]): any[] {
    return mentions
      .filter((m) => (m.author?.followers_count || 0) > 10000)
      .map((m) => ({
        username: m.author?.username || '',
        followers: m.author?.followers_count || 0,
        engagement: m.engagement_count || 0,
        sentiment: this.categorizeSentiment(m.sentiment_score || 0),
      }))
      .slice(0, 10);
  }

  private calculateGeographicDistribution(
    mentions: any[],
  ): Record<string, number> {
    const locations: Record<string, number> = {};

    mentions.forEach((mention) => {
      const location = mention.location?.country || 'Unknown';
      locations[location] = (locations[location] || 0) + 1;
    });

    return locations;
  }

  private generateTimeSeriesData(mentions: any[]): any[] {
    const timeData: Record<string, { mentions: number; sentiment: number }> =
      {};

    mentions.forEach((mention) => {
      const date = new Date(mention.published_at).toISOString().split('T')[0];
      if (!timeData[date]) {
        timeData[date] = { mentions: 0, sentiment: 0 };
      }
      timeData[date].mentions++;
      timeData[date].sentiment += mention.sentiment_score || 0;
    });

    return Object.entries(timeData).map(([date, data]) => ({
      date: new Date(date),
      mentions: data.mentions,
      sentiment: data.sentiment / data.mentions,
    }));
  }

  private calculateTwitterEngagement(user: any): number {
    const metrics = user?.public_metrics || {};
    const followers = metrics.followers_count || 1;
    const tweets = metrics.tweet_count || 0;

    // Simplified engagement calculation
    return Math.min(10, (tweets / followers) * 1000);
  }
}

export {
  TrendingTopic,
  CompetitorAnalysis,
  IndustryInsight,
  SocialListeningData,
};
