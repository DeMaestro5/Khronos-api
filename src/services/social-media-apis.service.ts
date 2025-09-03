import axios from 'axios';

// Platform-specific API configurations
interface PlatformConfig {
  baseURL: string;
  apiVersion: string;
  rateLimits: {
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

interface SocialMediaCredentials {
  instagram: {
    accessToken: string;
    businessAccountId: string;
    appId: string;
    appSecret: string;
  };
  youtube: {
    apiKey: string;
    channelId: string;
    accessToken: string;
    refreshToken: string;
  };
  tiktok: {
    accessToken: string;
    openId: string;
    appId: string;
  };
  linkedin: {
    accessToken: string;
    personId: string;
    organizationId?: string;
  };
  twitter: {
    bearerToken: string;
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessTokenSecret: string;
  };
  facebook: {
    accessToken: string;
    pageId: string;
    appId: string;
    appSecret: string;
  };
}

interface RealTimeMetrics {
  platform: string;
  contentId: string;
  timestamp: Date;
  metrics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    impressions: number;
    engagement: number;
  };
  demographics?: {
    ageGroups: Record<string, number>;
    genders: Record<string, number>;
    locations: Record<string, number>;
    devices: Record<string, number>;
  };
  trending?: {
    isViral: boolean;
    trendingScore: number;
    hashtags: string[];
    mentions: number;
  };
}

interface TrendingData {
  platform: string;
  trends: {
    hashtags: Array<{
      tag: string;
      usage: number;
      growth: number;
      sentiment: 'positive' | 'neutral' | 'negative';
    }>;
    topics: Array<{
      topic: string;
      volume: number;
      growth: number;
      relatedTerms: string[];
    }>;
    influencers: Array<{
      username: string;
      followers: number;
      engagement: number;
      niche: string;
    }>;
  };
  industry: {
    averageEngagement: number;
    topContentTypes: string[];
    peakTimes: string[];
    competitorMetrics: Array<{
      competitor: string;
      metrics: any;
    }>;
  };
}

interface PredictionData {
  contentType: string;
  platform: string;
  predictedMetrics: {
    expectedViews: number;
    expectedEngagement: number;
    expectedReach: number;
    confidenceScore: number;
  };
  optimization: {
    bestPostingTime: Date;
    recommendedHashtags: string[];
    contentSuggestions: string[];
    audienceTargeting: any;
  };
}

export class SocialMediaAPIService {
  private credentials: Partial<SocialMediaCredentials> = {};
  private platformConfigs: Record<string, PlatformConfig> = {
    instagram: {
      baseURL: 'https://graph.instagram.com/v18.0',
      apiVersion: 'v18.0',
      rateLimits: { requestsPerHour: 1000, requestsPerDay: 10000 },
    },
    youtube: {
      baseURL: 'https://www.googleapis.com/youtube/v3',
      apiVersion: 'v3',
      rateLimits: { requestsPerHour: 10000, requestsPerDay: 100000 },
    },
    tiktok: {
      baseURL: 'https://open-api.tiktok.com/platform/v1',
      apiVersion: 'v1',
      rateLimits: { requestsPerHour: 100, requestsPerDay: 1000 },
    },
    linkedin: {
      baseURL: 'https://api.linkedin.com/v2',
      apiVersion: 'v2',
      rateLimits: { requestsPerHour: 500, requestsPerDay: 5000 },
    },
    twitter: {
      baseURL: 'https://api.twitter.com/2',
      apiVersion: '2',
      rateLimits: { requestsPerHour: 300, requestsPerDay: 1000 },
    },
    facebook: {
      baseURL: 'https://graph.facebook.com/v18.0',
      apiVersion: 'v18.0',
      rateLimits: { requestsPerHour: 1000, requestsPerDay: 10000 },
    },
  };

  constructor() {
    this.loadCredentials();
  }

  private loadCredentials(): void {
    // Load from environment variables
    this.credentials = {
      instagram: {
        accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
        businessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '',
        appId: process.env.INSTAGRAM_APP_ID || '',
        appSecret: process.env.INSTAGRAM_APP_SECRET || '',
      },
      youtube: {
        apiKey: process.env.YOUTUBE_API_KEY || '',
        channelId: process.env.YOUTUBE_CHANNEL_ID || '',
        accessToken: process.env.YOUTUBE_ACCESS_TOKEN || '',
        refreshToken: process.env.YOUTUBE_REFRESH_TOKEN || '',
      },
      tiktok: {
        accessToken: process.env.TIKTOK_ACCESS_TOKEN || '',
        openId: process.env.TIKTOK_OPEN_ID || '',
        appId: process.env.TIKTOK_APP_ID || '',
      },
      linkedin: {
        accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
        personId: process.env.LINKEDIN_PERSON_ID || '',
        organizationId: process.env.LINKEDIN_ORGANIZATION_ID,
      },
      twitter: {
        bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
        apiKey: process.env.TWITTER_API_KEY || '',
        apiSecret: process.env.TWITTER_API_SECRET || '',
        accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
      },
      facebook: {
        accessToken: process.env.FACEBOOK_ACCESS_TOKEN || '',
        pageId: process.env.FACEBOOK_PAGE_ID || '',
        appId: process.env.FACEBOOK_APP_ID || '',
        appSecret: process.env.FACEBOOK_APP_SECRET || '',
      },
    };
  }

  /**
   * Check if platform credentials are available and valid
   */
  private hasValidCredentials(platform: string): boolean {
    const creds = this.credentials[platform as keyof SocialMediaCredentials];
    if (!creds) return false;

    switch (platform) {
      case 'youtube':
        return !!(creds as any).apiKey && !!(creds as any).channelId;
      case 'instagram':
        return (
          !!(creds as any).accessToken && !!(creds as any).businessAccountId
        );
      case 'tiktok':
        return !!(creds as any).accessToken && !!(creds as any).openId;
      case 'linkedin':
        return !!(creds as any).accessToken && !!(creds as any).personId;
      case 'twitter':
        return (
          !!(creds as any).bearerToken ||
          ((creds as any).apiKey && (creds as any).apiSecret)
        );
      case 'facebook':
        return !!(creds as any).accessToken && !!(creds as any).pageId;
      case 'medium':
        // Medium doesn't have a public real-time API, always return false
        return false;
      default:
        return false;
    }
  }

  /**
   * Generate mock metrics for platforms with missing credentials
   */
  private generateMockMetrics(
    platform: string,
    contentId: string,
  ): RealTimeMetrics {
    return {
      platform,
      contentId,
      timestamp: new Date(),
      metrics: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        reach: 0,
        impressions: 0,
        engagement: 0,
      },
      demographics: {
        ageGroups: {},
        genders: {},
        locations: {},
        devices: {},
      },
      trending: {
        isViral: false,
        trendingScore: 0,
        hashtags: [],
        mentions: 0,
      },
    };
  }

  /**
   * Generate mock trending data for platforms with missing credentials
   */
  private generateMockTrendingData(platform: string): TrendingData {
    return {
      platform,
      trends: {
        hashtags: [],
        topics: [],
        influencers: [],
      },
      industry: {
        averageEngagement: 0,
        topContentTypes: [],
        peakTimes: [],
        competitorMetrics: [],
      },
    };
  }

  /**
   * Get list of available platforms (with valid credentials)
   */
  getAvailablePlatforms(): string[] {
    const platforms = [
      'instagram',
      'youtube',
      'tiktok',
      'linkedin',
      'twitter',
      'facebook',
      'medium',
    ];
    return platforms.filter((platform) => this.hasValidCredentials(platform));
  }

  /**
   * Get list of unavailable platforms (missing credentials)
   */
  getUnavailablePlatforms(): string[] {
    const platforms = [
      'instagram',
      'youtube',
      'tiktok',
      'linkedin',
      'twitter',
      'facebook',
      'medium',
    ];
    return platforms.filter((platform) => !this.hasValidCredentials(platform));
  }

  // Instagram Real-Time Analytics
  async getInstagramRealTimeMetrics(mediaId: string): Promise<RealTimeMetrics> {
    if (!this.hasValidCredentials('instagram')) {
      console.log('Instagram credentials not available, returning mock data');
      return this.generateMockMetrics('instagram', mediaId);
    }

    try {
      const config = this.platformConfigs.instagram;
      const creds = this.credentials.instagram!;

      const response = await axios.get(
        `${config.baseURL}/${mediaId}/insights`,
        {
          params: {
            metric: 'impressions,reach,likes,comments,shares,saves,video_views',
            access_token: creds.accessToken,
          },
        },
      );

      const audienceResponse = await axios.get(
        `${config.baseURL}/${creds.businessAccountId}/insights`,
        {
          params: {
            metric: 'audience_gender_age,audience_country,audience_city',
            period: 'lifetime',
            access_token: creds.accessToken,
          },
        },
      );

      return {
        platform: 'instagram',
        contentId: mediaId,
        timestamp: new Date(),
        metrics: {
          views: this.extractMetricValue(response.data, 'video_views') || 0,
          likes: this.extractMetricValue(response.data, 'likes') || 0,
          comments: this.extractMetricValue(response.data, 'comments') || 0,
          shares: this.extractMetricValue(response.data, 'shares') || 0,
          reach: this.extractMetricValue(response.data, 'reach') || 0,
          impressions:
            this.extractMetricValue(response.data, 'impressions') || 0,
          engagement: this.calculateEngagement(response.data),
        },
        demographics: this.processDemographics(audienceResponse.data),
        trending: {
          isViral: this.checkViralStatus(response.data),
          trendingScore: this.calculateTrendingScore(response.data),
          hashtags: [], // Would need content analysis
          mentions: 0,
        },
      };
    } catch (error) {
      console.error('Instagram API Error:', error);
      return this.generateMockMetrics('instagram', mediaId);
    }
  }

  // YouTube Real-Time Analytics
  async getYouTubeRealTimeMetrics(videoId: string): Promise<RealTimeMetrics> {
    if (!this.hasValidCredentials('youtube')) {
      console.log('YouTube credentials not available, returning mock data');
      return this.generateMockMetrics('youtube', videoId);
    }

    try {
      const config = this.platformConfigs.youtube;
      const creds = this.credentials.youtube!;

      console.log(`Fetching YouTube metrics for video: ${videoId}`);
      console.log(`Using API key: ${creds.apiKey?.substring(0, 10)}...`);

      // Get video statistics
      const videoResponse = await axios.get(`${config.baseURL}/videos`, {
        params: {
          part: 'statistics,snippet',
          id: videoId,
          key: creds.apiKey,
        },
      });

      console.log(`YouTube API response:`, videoResponse.data);

      // If no video found with that ID, it might be a content database ID, not a YouTube video ID
      if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
        console.log(
          `No YouTube video found with ID: ${videoId}, returning mock data`,
        );
        return this.generateMockMetrics('youtube', videoId);
      }

      const stats = videoResponse.data.items[0]?.statistics || {};
      console.log(`YouTube video stats:`, stats);

      return {
        platform: 'youtube',
        contentId: videoId,
        timestamp: new Date(),
        metrics: {
          views: parseInt(stats.viewCount) || 0,
          likes: parseInt(stats.likeCount) || 0,
          comments: parseInt(stats.commentCount) || 0,
          shares: 0, // YouTube doesn't provide this directly
          reach: parseInt(stats.viewCount) || 0,
          impressions: 0, // Would need YouTube Analytics API
          engagement: this.calculateYouTubeEngagement(stats),
        },
        demographics: {
          ageGroups: {},
          genders: {},
          locations: {},
          devices: {},
        },
        trending: {
          isViral: parseInt(stats.viewCount) > 10000,
          trendingScore: this.calculateYoutubeTrendingScore(stats),
          hashtags: [],
          mentions: 0,
        },
      };
    } catch (error) {
      console.error('YouTube API Error:', error);
      console.log('Returning mock data due to YouTube API error');
      return this.generateMockMetrics('youtube', videoId);
    }
  }

  // TikTok Real-Time Analytics
  async getTikTokRealTimeMetrics(videoId: string): Promise<RealTimeMetrics> {
    if (!this.hasValidCredentials('tiktok')) {
      console.log('TikTok credentials not available, returning mock data');
      return this.generateMockMetrics('tiktok', videoId);
    }

    try {
      const config = this.platformConfigs.tiktok;
      const creds = this.credentials.tiktok!;

      const response = await axios.get(`${config.baseURL}/video/data/`, {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
        params: {
          fields:
            'id,create_time,cover_image_url,share_url,video_description,duration,height,width,title,embed_html,embed_link,like_count,comment_count,share_count,view_count',
        },
      });

      return {
        platform: 'tiktok',
        contentId: videoId,
        timestamp: new Date(),
        metrics: {
          views: response.data.data?.view_count || 0,
          likes: response.data.data?.like_count || 0,
          comments: response.data.data?.comment_count || 0,
          shares: response.data.data?.share_count || 0,
          reach: response.data.data?.view_count || 0,
          impressions: 0,
          engagement: this.calculateTikTokEngagement(response.data.data),
        },
        demographics: {
          ageGroups: {},
          genders: {},
          locations: {},
          devices: {},
        },
        trending: {
          isViral: (response.data.data?.view_count || 0) > 100000,
          trendingScore: this.calculateTikTokTrendingScore(response.data.data),
          hashtags: [],
          mentions: 0,
        },
      };
    } catch (error) {
      console.error('TikTok API Error:', error);
      return this.generateMockMetrics('tiktok', videoId);
    }
  }

  // LinkedIn Real-Time Analytics
  async getLinkedInRealTimeMetrics(postId: string): Promise<RealTimeMetrics> {
    if (!this.hasValidCredentials('linkedin')) {
      console.log('LinkedIn credentials not available, returning mock data');
      return this.generateMockMetrics('linkedin', postId);
    }

    try {
      const config = this.platformConfigs.linkedin;
      const creds = this.credentials.linkedin!;

      const response = await axios.get(
        `${config.baseURL}/v2/socialActions/${postId}/statistics`,
        {
          headers: {
            Authorization: `Bearer ${creds.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
        },
      );

      return {
        platform: 'linkedin',
        contentId: postId,
        timestamp: new Date(),
        metrics: {
          views: response.data.numViews || 0,
          likes: response.data.numLikes || 0,
          comments: response.data.numComments || 0,
          shares: response.data.numShares || 0,
          reach: response.data.numViews || 0,
          impressions: response.data.numImpressions || 0,
          engagement: this.calculateLinkedInEngagement(response.data),
        },
        demographics: {
          ageGroups: {},
          genders: {},
          locations: {},
          devices: {},
        },
        trending: {
          isViral: response.data.numViews > 5000,
          trendingScore: this.calculateLinkedInTrendingScore(response.data),
          hashtags: [],
          mentions: 0,
        },
      };
    } catch (error) {
      console.error('LinkedIn API Error:', error);
      return this.generateMockMetrics('linkedin', postId);
    }
  }

  // Twitter Real-Time Analytics
  async getTwitterRealTimeMetrics(tweetId: string): Promise<RealTimeMetrics> {
    if (!this.hasValidCredentials('twitter')) {
      console.log('Twitter credentials not available, returning mock data');
      return this.generateMockMetrics('twitter', tweetId);
    }

    try {
      const config = this.platformConfigs.twitter;
      const creds = this.credentials.twitter!;

      const response = await axios.get(`${config.baseURL}/tweets/${tweetId}`, {
        headers: {
          Authorization: `Bearer ${creds.bearerToken}`,
        },
        params: {
          'tweet.fields': 'public_metrics,created_at,context_annotations',
          expansions: 'author_id',
        },
      });

      const metrics = response.data.data?.public_metrics || {};

      return {
        platform: 'twitter',
        contentId: tweetId,
        timestamp: new Date(),
        metrics: {
          views: metrics.impression_count || 0,
          likes: metrics.like_count || 0,
          comments: metrics.reply_count || 0,
          shares: metrics.retweet_count || 0,
          reach: metrics.impression_count || 0,
          impressions: metrics.impression_count || 0,
          engagement: this.calculateTwitterEngagement(metrics),
        },
        demographics: {
          ageGroups: {},
          genders: {},
          locations: {},
          devices: {},
        },
        trending: {
          isViral: metrics.retweet_count > 100,
          trendingScore: this.calculateTwitterTrendingScore(metrics),
          hashtags: [],
          mentions: 0,
        },
      };
    } catch (error) {
      console.error('Twitter API Error:', error);
      return this.generateMockMetrics('twitter', tweetId);
    }
  }

  // Facebook Real-Time Analytics
  async getFacebookRealTimeMetrics(postId: string): Promise<RealTimeMetrics> {
    if (!this.hasValidCredentials('facebook')) {
      console.log('Facebook credentials not available, returning mock data');
      return this.generateMockMetrics('facebook', postId);
    }

    try {
      const config = this.platformConfigs.facebook;
      const creds = this.credentials.facebook!;

      const response = await axios.get(`${config.baseURL}/${postId}/insights`, {
        params: {
          metric:
            'post_impressions,post_reach,post_reactions_like_total,post_clicks,post_shares',
          access_token: creds.accessToken,
        },
      });

      return {
        platform: 'facebook',
        contentId: postId,
        timestamp: new Date(),
        metrics: {
          views:
            this.extractMetricValue(response.data, 'post_impressions') || 0,
          likes:
            this.extractMetricValue(
              response.data,
              'post_reactions_like_total',
            ) || 0,
          comments: 0, // Would need additional API call
          shares: this.extractMetricValue(response.data, 'post_shares') || 0,
          reach: this.extractMetricValue(response.data, 'post_reach') || 0,
          impressions:
            this.extractMetricValue(response.data, 'post_impressions') || 0,
          engagement: this.calculateFacebookEngagement(response.data),
        },
        demographics: {
          ageGroups: {},
          genders: {},
          locations: {},
          devices: {},
        },
        trending: {
          isViral: this.extractMetricValue(response.data, 'post_reach') > 10000,
          trendingScore: this.calculateFacebookTrendingScore(response.data),
          hashtags: [],
          mentions: 0,
        },
      };
    } catch (error) {
      console.error('Facebook API Error:', error);
      return this.generateMockMetrics('facebook', postId);
    }
  }

  // Trending Data Methods
  async getPlatformTrends(platform: string): Promise<TrendingData> {
    if (!this.hasValidCredentials(platform)) {
      console.log(
        `${platform} credentials not available, returning mock trending data`,
      );
      return this.generateMockTrendingData(platform);
    }

    switch (platform) {
      case 'instagram':
        return this.getInstagramTrends();
      case 'youtube':
        return this.getYouTubeTrends();
      case 'tiktok':
        return this.getTikTokTrends();
      case 'linkedin':
        return this.getLinkedInTrends();
      case 'twitter':
        return this.getTwitterTrends();
      case 'facebook':
        return this.getFacebookTrends();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  private async getInstagramTrends(): Promise<TrendingData> {
    // Implementation for Instagram trending data
    // This would involve hashtag analysis, trending topics, etc.
    return {
      platform: 'instagram',
      trends: {
        hashtags: [],
        topics: [],
        influencers: [],
      },
      industry: {
        averageEngagement: 0,
        topContentTypes: [],
        peakTimes: [],
        competitorMetrics: [],
      },
    };
  }

  private async getYouTubeTrends(): Promise<TrendingData> {
    // Implementation for YouTube trending data
    return {
      platform: 'youtube',
      trends: {
        hashtags: [],
        topics: [],
        influencers: [],
      },
      industry: {
        averageEngagement: 0,
        topContentTypes: [],
        peakTimes: [],
        competitorMetrics: [],
      },
    };
  }

  private async getTikTokTrends(): Promise<TrendingData> {
    // Implementation for TikTok trending data
    return {
      platform: 'tiktok',
      trends: {
        hashtags: [],
        topics: [],
        influencers: [],
      },
      industry: {
        averageEngagement: 0,
        topContentTypes: [],
        peakTimes: [],
        competitorMetrics: [],
      },
    };
  }

  private async getLinkedInTrends(): Promise<TrendingData> {
    // Implementation for LinkedIn trending data
    return {
      platform: 'linkedin',
      trends: {
        hashtags: [],
        topics: [],
        influencers: [],
      },
      industry: {
        averageEngagement: 0,
        topContentTypes: [],
        peakTimes: [],
        competitorMetrics: [],
      },
    };
  }

  private async getTwitterTrends(): Promise<TrendingData> {
    try {
      const config = this.platformConfigs.twitter;
      const creds = this.credentials.twitter!;

      const response = await axios.get(`${config.baseURL}/trends/place`, {
        headers: {
          Authorization: `Bearer ${creds.bearerToken}`,
        },
        params: {
          id: 1, // Worldwide trends
        },
      });

      return {
        platform: 'twitter',
        trends: {
          hashtags:
            response.data[0]?.trends?.map((trend: any) => ({
              tag: trend.name,
              usage: trend.tweet_volume || 0,
              growth: 0,
              sentiment: 'neutral' as const,
            })) || [],
          topics: [],
          influencers: [],
        },
        industry: {
          averageEngagement: 0,
          topContentTypes: [],
          peakTimes: [],
          competitorMetrics: [],
        },
      };
    } catch (error) {
      console.error('Twitter Trends API Error:', error);
      return {
        platform: 'twitter',
        trends: { hashtags: [], topics: [], influencers: [] },
        industry: {
          averageEngagement: 0,
          topContentTypes: [],
          peakTimes: [],
          competitorMetrics: [],
        },
      };
    }
  }

  private async getFacebookTrends(): Promise<TrendingData> {
    // Implementation for Facebook trending data
    return {
      platform: 'facebook',
      trends: {
        hashtags: [],
        topics: [],
        influencers: [],
      },
      industry: {
        averageEngagement: 0,
        topContentTypes: [],
        peakTimes: [],
        competitorMetrics: [],
      },
    };
  }

  // Helper Methods
  private extractMetricValue(data: any, metric: string): number {
    const metricData = data.data?.find((item: any) => item.name === metric);
    return metricData?.values?.[0]?.value || 0;
  }

  private calculateEngagement(data: any): number {
    const likes = this.extractMetricValue(data, 'likes');
    const comments = this.extractMetricValue(data, 'comments');
    const shares = this.extractMetricValue(data, 'shares');
    return likes + comments + shares;
  }

  private calculateYouTubeEngagement(stats: any): number {
    const likes = parseInt(stats.likeCount) || 0;
    const comments = parseInt(stats.commentCount) || 0;
    return likes + comments;
  }

  private calculateTikTokEngagement(data: any): number {
    return (
      (data?.like_count || 0) +
      (data?.comment_count || 0) +
      (data?.share_count || 0)
    );
  }

  private calculateLinkedInEngagement(data: any): number {
    return (
      (data.numLikes || 0) + (data.numComments || 0) + (data.numShares || 0)
    );
  }

  private calculateTwitterEngagement(metrics: any): number {
    return (
      (metrics.like_count || 0) +
      (metrics.reply_count || 0) +
      (metrics.retweet_count || 0)
    );
  }

  private calculateFacebookEngagement(data: any): number {
    const likes = this.extractMetricValue(data, 'post_reactions_like_total');
    const shares = this.extractMetricValue(data, 'post_shares');
    return likes + shares;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private processDemographics(_data: any): any {
    // Process demographic data from API responses
    return {
      ageGroups: {},
      genders: {},
      locations: {},
      devices: {},
    };
  }

  private checkViralStatus(data: any): boolean {
    const reach = this.extractMetricValue(data, 'reach');
    const engagement = this.calculateEngagement(data);
    return reach > 50000 && engagement > 1000;
  }

  private calculateTrendingScore(data: any): number {
    const reach = this.extractMetricValue(data, 'reach');
    const engagement = this.calculateEngagement(data);
    return Math.min(100, (engagement / Math.max(reach, 1)) * 100);
  }

  private calculateYoutubeTrendingScore(stats: any): number {
    const views = parseInt(stats.viewCount) || 0;
    const engagement = this.calculateYouTubeEngagement(stats);
    return Math.min(100, (engagement / Math.max(views, 1)) * 100);
  }

  private calculateTikTokTrendingScore(data: any): number {
    const views = data?.view_count || 0;
    const engagement = this.calculateTikTokEngagement(data);
    return Math.min(100, (engagement / Math.max(views, 1)) * 100);
  }

  private calculateLinkedInTrendingScore(data: any): number {
    const views = data.numViews || 0;
    const engagement = this.calculateLinkedInEngagement(data);
    return Math.min(100, (engagement / Math.max(views, 1)) * 100);
  }

  private calculateTwitterTrendingScore(metrics: any): number {
    const impressions = metrics.impression_count || 0;
    const engagement = this.calculateTwitterEngagement(metrics);
    return Math.min(100, (engagement / Math.max(impressions, 1)) * 100);
  }

  private calculateFacebookTrendingScore(data: any): number {
    const reach = this.extractMetricValue(data, 'post_reach');
    const engagement = this.calculateFacebookEngagement(data);
    return Math.min(100, (engagement / Math.max(reach, 1)) * 100);
  }
}

export { RealTimeMetrics, TrendingData, PredictionData };
