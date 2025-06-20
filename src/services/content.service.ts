import { Types } from 'mongoose';
import { UnifiedLLMService, LLMProvider } from './llm.service';
import Content from '../database/model/content';

// Export Content model for use in other services
export { Content };

export interface EngagementMetrics {
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  shares: number;
  saves: number;
  comments: number;
  likes: number;
}

export interface ContentPerformance {
  contentId: string;
  platform: string;
  metrics: EngagementMetrics;
  period: {
    start: Date;
    end: Date;
  };
  benchmarks: {
    industry: EngagementMetrics;
    personal: EngagementMetrics;
  };
}

export class ContentService {
  private llmService: UnifiedLLMService;

  constructor() {
    // Initialize with Gemini as primary provider (free model)
    this.llmService = new UnifiedLLMService(LLMProvider.GEMINI);
  }

  async analyzeTrendingTopics(platform: string): Promise<string[]> {
    try {
      return await this.llmService.analyzeTrendingTopics(platform);
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
      return await this.llmService.generateContentIdeas(topic, type);
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

      return await this.llmService.optimizeContent(content, platform);
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

  /**
   * Generate rich structured content body
   * @param title - Content title
   * @param description - Content description
   * @param type - Content type
   * @param keyPoints - Optional key points to include
   * @returns Structured JSON content with sections array
   *
   * Example return format:
   * {
   *   sections: [
   *     { type: 'heading', level: 2, content: 'Introduction' },
   *     { type: 'paragraph', content: 'Detailed content...' },
   *     { type: 'list', style: 'bulleted', items: ['Item 1', 'Item 2'] },
   *     { type: 'quote', content: 'Quote text', author: 'Author' },
   *     { type: 'callout', style: 'tip', title: 'Pro Tip', content: 'Helpful info' }
   *   ],
   *   wordCount: 800,
   *   readingTime: '4 min read',
   *   summary: 'Brief content summary'
   * }
   */
  async generateRichContentBody(
    title: string,
    description: string,
    type: Content['type'],
    keyPoints?: string[],
  ): Promise<any> {
    try {
      return await this.llmService.generateRichContentBody(
        title,
        description,
        type,
        keyPoints,
      );
    } catch (error) {
      console.error('Error generating rich content body:', error);
      return this.generateBasicStructuredContent(title, description, keyPoints);
    }
  }

  // Add method for generating AI suggestions
  async generateAISuggestions(
    title: string,
    description: string,
    type: Content['type'],
    platforms: string[],
  ): Promise<any> {
    try {
      return await this.llmService.generateAISuggestions(
        title,
        description,
        type,
        platforms,
      );
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      return this.generateBasicAISuggestions(title, description);
    }
  }

  // Add method for getting platform information
  async getPlatformInformation(platforms: string[]): Promise<any[]> {
    const platformMap: Record<string, any> = {
      youtube: {
        id: 'youtube',
        name: 'YouTube',
        icon: 'youtube',
        color: 'bg-red-600',
      },
      tiktok: {
        id: 'tiktok',
        name: 'TikTok',
        icon: 'tiktok',
        color: 'bg-black',
      },
      instagram: {
        id: 'instagram',
        name: 'Instagram',
        icon: 'instagram',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      },
      linkedin: {
        id: 'linkedin',
        name: 'LinkedIn',
        icon: 'linkedin',
        color: 'bg-blue-600',
      },
      twitter: {
        id: 'twitter',
        name: 'Twitter',
        icon: 'twitter',
        color: 'bg-sky-500',
      },
      facebook: {
        id: 'facebook',
        name: 'Facebook',
        icon: 'facebook',
        color: 'bg-blue-700',
      },
      medium: {
        id: 'medium',
        name: 'Medium',
        icon: 'medium',
        color: 'bg-gray-800',
      },
      pinterest: {
        id: 'pinterest',
        name: 'Pinterest',
        icon: 'pinterest',
        color: 'bg-red-500',
      },
    };

    return platforms.map(
      (platform) =>
        platformMap[platform.toLowerCase()] || {
          id: platform,
          name: platform.charAt(0).toUpperCase() + platform.slice(1),
          icon: 'globe',
          color: 'bg-gray-500',
        },
    );
  }

  // Add method for parsing structured content ideas
  async parseContentIdeas(
    ideas: string[],
    topic?: string,
    type?: string,
  ): Promise<any[]> {
    const parsedIdeas = [];

    for (const idea of ideas) {
      try {
        // Try to parse as JSON (from rich generation)
        const parsed = JSON.parse(idea);

        // Validate required fields
        if (!parsed.title || !parsed.description) {
          console.warn(
            'Skipping idea with missing title or description:',
            parsed,
          );
          continue;
        }

        // Generate rich body content for each idea
        const body = await this.generateRichContentBody(
          parsed.title,
          parsed.description,
          'article',
          parsed.keyPoints,
        );

        parsedIdeas.push({
          title: parsed.title,
          description: parsed.description,
          excerpt:
            parsed.excerpt || parsed.description.substring(0, 150) + '...',
          targetAudience: parsed.targetAudience || 'General audience',
          keyPoints: parsed.keyPoints || [
            'Key insight 1',
            'Key insight 2',
            'Key insight 3',
          ],
          callToAction: parsed.callToAction || 'Engage with this content',
          estimatedEngagement:
            parsed.engagementScore || Math.floor(Math.random() * 5) + 5,
          difficulty: this.normalizeDifficulty(parsed.difficulty) || 'moderate',
          timeToCreate: parsed.timeToCreate || '2-3 hours',
          trendingScore: Math.floor(Math.random() * 10) + 1,
          body: body,
        });
      } catch (parseError) {
        console.warn(
          'Failed to parse idea as JSON, treating as simple string:',
          idea,
        );

        // If not JSON, treat as simple string
        const title = idea.replace(/^\d+\.\s*/, '').trim();

        // Skip empty or very short titles
        if (!title || title.length < 5) {
          console.warn('Skipping empty or too short title:', title);
          continue;
        }

        const description = `A comprehensive guide about ${title.toLowerCase()}. This content will provide readers with practical insights, actionable strategies, and expert tips to help them understand and master the topic effectively.`;
        const excerpt = `Discover everything you need to know about ${title.toLowerCase()} with practical tips and expert insights.`;

        const body = await this.generateRichContentBody(
          title,
          description,
          'article',
          [
            'Introduction to the topic',
            'Key concepts and strategies',
            'Practical implementation',
            'Best practices',
            'Future trends',
          ],
        );

        parsedIdeas.push({
          title: title,
          description: description,
          excerpt: excerpt,
          targetAudience: 'Content creators and marketers',
          keyPoints: [
            'Introduction to the topic',
            'Key concepts and strategies',
            'Practical implementation',
            'Best practices',
            'Future trends',
          ],
          callToAction: 'Start implementing these strategies today',
          estimatedEngagement: Math.floor(Math.random() * 5) + 5,
          difficulty: 'moderate',
          timeToCreate: '2-3 hours',
          trendingScore: Math.floor(Math.random() * 10) + 1,
          body: body,
        });
      }
    }

    // If no ideas were successfully parsed, generate fallback ideas
    if (parsedIdeas.length === 0) {
      console.warn(
        'No content ideas could be parsed, generating fallback ideas',
      );
      return this.generateFallbackParsedIdeas(topic, type);
    }

    console.log(`Successfully parsed ${parsedIdeas.length} content ideas`);
    return parsedIdeas;
  }

  /**
   * Generate fallback content ideas when parsing completely fails
   */
  private async generateFallbackParsedIdeas(
    topic?: string,
    type?: string,
  ): Promise<any[]> {
    console.log(
      `Generating fallback parsed ideas for topic: ${
        topic || 'general'
      }, type: ${type || 'blog_post'}`,
    );

    // Use the topic and type if provided, otherwise use generic fallbacks
    const fallbackTopic = topic || 'Content Creation';
    const fallbackType = type || 'blog_post';

    const fallbackIdeas = this.createTypeSpecificParsedFallbacks(
      fallbackTopic,
      fallbackType,
    );

    // Generate rich body content for each fallback idea
    for (const idea of fallbackIdeas) {
      idea.body = await this.generateRichContentBody(
        idea.title,
        idea.description,
        'article',
        idea.keyPoints,
      );
    }

    return fallbackIdeas;
  }

  /**
   * Create content type-specific fallback ideas for parsed content
   */
  private createTypeSpecificParsedFallbacks(
    topic: string,
    type: string,
  ): any[] {
    const cleanTopic = topic.toLowerCase();

    switch (type.toLowerCase()) {
      case 'video':
        return this.generateVideoParsedFallbacks(topic, cleanTopic);
      case 'social':
        return this.generateSocialParsedFallbacks(topic, cleanTopic);
      case 'podcast':
        return this.generatePodcastParsedFallbacks(topic, cleanTopic);
      case 'newsletter':
        return this.generateNewsletterParsedFallbacks(topic, cleanTopic);
      case 'article':
      case 'blog_post':
      default:
        return this.generateBlogParsedFallbacks(topic, cleanTopic);
    }
  }

  private generateVideoParsedFallbacks(
    topic: string,
    cleanTopic: string,
  ): any[] {
    return [
      {
        title: `${topic}: Step-by-Step Tutorial`,
        description: `A comprehensive video tutorial that walks viewers through ${cleanTopic} from start to finish. This hands-on guide includes visual demonstrations, practical examples, and expert tips to help viewers master the fundamentals.`,
        excerpt: `Learn ${cleanTopic} with our step-by-step video tutorial featuring practical examples and expert guidance.`,
        targetAudience: 'Visual learners and beginners',
        keyPoints: [
          'Introduction and setup',
          'Core concepts explained visually',
          'Hands-on demonstrations',
          'Common pitfalls to avoid',
          'Advanced tips and tricks',
        ],
        callToAction: 'Subscribe for more in-depth tutorials',
        estimatedEngagement: 8,
        difficulty: 'easy',
        timeToCreate: '4-6 hours',
        trendingScore: 7,
      },
      {
        title: `${topic} Masterclass: Pro Techniques Revealed`,
        description: `An advanced video masterclass showcasing professional techniques and insider secrets for ${cleanTopic}. Perfect for viewers who want to take their skills to the next level with expert-level strategies.`,
        excerpt: `Master ${cleanTopic} with professional techniques and insider secrets from industry experts.`,
        targetAudience: 'Intermediate to advanced practitioners',
        keyPoints: [
          'Professional techniques',
          'Industry best practices',
          'Advanced strategies',
          'Real-world case studies',
          'Expert insights',
        ],
        callToAction: 'Apply these techniques and share your results',
        estimatedEngagement: 9,
        difficulty: 'advanced',
        timeToCreate: '6-8 hours',
        trendingScore: 8,
      },
      {
        title: `${topic} Q&A: Answering Your Top Questions`,
        description: `A comprehensive Q&A video addressing the most common questions and challenges related to ${cleanTopic}. This format provides valuable answers while building community engagement.`,
        excerpt: `Get answers to the most frequently asked questions about ${cleanTopic} from our expert team.`,
        targetAudience: 'Community members and curious learners',
        keyPoints: [
          'Community questions answered',
          'Common challenges addressed',
          'Expert solutions provided',
          'Interactive format',
          'Practical advice',
        ],
        callToAction: 'Submit your questions for our next Q&A session',
        estimatedEngagement: 7,
        difficulty: 'moderate',
        timeToCreate: '2-3 hours',
        trendingScore: 6,
      },
    ];
  }

  private generateSocialParsedFallbacks(
    topic: string,
    cleanTopic: string,
  ): any[] {
    return [
      {
        title: `${topic} Hack That Changed Everything`,
        description: `A viral-worthy social media post revealing a game-changing hack or insight about ${cleanTopic}. Designed to spark engagement, shares, and meaningful discussions in the comments.`,
        excerpt: `This ${cleanTopic} hack will completely change how you think about the topic.`,
        targetAudience: 'Social media audience',
        keyPoints: [
          'Surprising insight',
          'Easy to implement',
          'Shareable content',
          'Conversation starter',
          'Quick value delivery',
        ],
        callToAction: 'Tag someone who needs to see this!',
        estimatedEngagement: 9,
        difficulty: 'easy',
        timeToCreate: '30 minutes',
        trendingScore: 9,
      },
      {
        title: `${topic} Myths vs Facts`,
        description: `A fact-checking social media post that debunks common myths and misconceptions about ${cleanTopic}. This educational content drives engagement while providing genuine value to followers.`,
        excerpt: `Separating fact from fiction in the world of ${cleanTopic} - you might be surprised by #3!`,
        targetAudience: 'Engaged social media followers',
        keyPoints: [
          'Myth busting',
          'Educational content',
          'Surprising revelations',
          'Evidence-based facts',
          'Engagement focused',
        ],
        callToAction: 'What other myths should we bust? Comment below!',
        estimatedEngagement: 8,
        difficulty: 'moderate',
        timeToCreate: '45 minutes',
        trendingScore: 8,
      },
      {
        title: `Before & After: ${topic} Transformation`,
        description: `A compelling before-and-after post showcasing the transformation possible with ${cleanTopic}. This visual storytelling format performs exceptionally well on social platforms.`,
        excerpt: `See the incredible transformation possible with ${cleanTopic} - the results will amaze you!`,
        targetAudience: 'Social media users seeking inspiration',
        keyPoints: [
          'Visual transformation',
          'Inspiring results',
          'Relatable journey',
          'Motivational content',
          'Social proof',
        ],
        callToAction: 'Share your own transformation story in the comments!',
        estimatedEngagement: 9,
        difficulty: 'easy',
        timeToCreate: '20 minutes',
        trendingScore: 9,
      },
    ];
  }

  private generatePodcastParsedFallbacks(
    topic: string,
    cleanTopic: string,
  ): any[] {
    return [
      {
        title: `The ${topic} Deep Dive: Expert Interview`,
        description: `An in-depth podcast episode featuring an expert interview about ${cleanTopic}. This long-form content provides listeners with comprehensive insights, industry perspectives, and actionable advice.`,
        excerpt: `Join us for an expert interview exploring the intricacies of ${cleanTopic} with industry leading professionals.`,
        targetAudience: 'Podcast enthusiasts and industry professionals',
        keyPoints: [
          'Expert insights',
          'Industry trends',
          'Professional advice',
          'Real-world applications',
          'Future predictions',
        ],
        callToAction: 'Subscribe and rate us on your favorite podcast platform',
        estimatedEngagement: 7,
        difficulty: 'moderate',
        timeToCreate: '8-10 hours',
        trendingScore: 6,
      },
      {
        title: `${topic} Success Stories: Real People, Real Results`,
        description: `A compelling podcast episode featuring real success stories from people who have excelled with ${cleanTopic}. These authentic narratives inspire and educate listeners through practical examples.`,
        excerpt: `Hear inspiring success stories from real people who have achieved remarkable results with ${cleanTopic}.`,
        targetAudience: 'Aspiring practitioners and success-seekers',
        keyPoints: [
          'Real success stories',
          'Authentic experiences',
          'Practical lessons',
          'Inspirational content',
          'Actionable insights',
        ],
        callToAction: 'Share your own success story with our community',
        estimatedEngagement: 8,
        difficulty: 'moderate',
        timeToCreate: '6-8 hours',
        trendingScore: 7,
      },
      {
        title: `${topic} Roundtable: Multiple Expert Perspectives`,
        description: `A dynamic roundtable discussion bringing together multiple experts to discuss various aspects of ${cleanTopic}. This format provides diverse viewpoints and comprehensive coverage of the topic.`,
        excerpt: `Multiple experts share their perspectives on ${cleanTopic} in this engaging roundtable discussion.`,
        targetAudience: 'Industry professionals and thought leaders',
        keyPoints: [
          'Multiple expert views',
          'Diverse perspectives',
          'Comprehensive coverage',
          'Dynamic discussion',
          'Industry insights',
        ],
        callToAction: 'Join the conversation on our social media channels',
        estimatedEngagement: 6,
        difficulty: 'advanced',
        timeToCreate: '10-12 hours',
        trendingScore: 5,
      },
    ];
  }

  private generateNewsletterParsedFallbacks(
    topic: string,
    cleanTopic: string,
  ): any[] {
    return [
      {
        title: `${topic} Weekly Insights`,
        description: `A curated weekly newsletter delivering the latest insights, trends, and developments in ${cleanTopic}. This valuable resource keeps subscribers informed and ahead of the curve with expert analysis and actionable takeaways.`,
        excerpt: `Stay informed with weekly insights and trends in ${cleanTopic}, curated by industry experts.`,
        targetAudience: 'Industry professionals and enthusiasts',
        keyPoints: [
          'Weekly trend analysis',
          'Expert insights',
          'Curated resources',
          'Actionable takeaways',
          'Industry updates',
        ],
        callToAction: 'Forward this newsletter to colleagues who would benefit',
        estimatedEngagement: 6,
        difficulty: 'moderate',
        timeToCreate: '3-4 hours',
        trendingScore: 5,
      },
      {
        title: `${topic} Tool Reviews and Recommendations`,
        description: `A comprehensive newsletter edition reviewing the latest tools, resources, and solutions for ${cleanTopic}. This practical guide helps subscribers make informed decisions about their toolkit and investments.`,
        excerpt: `Discover the best tools and resources for ${cleanTopic} with our expert reviews and recommendations.`,
        targetAudience: 'Practitioners and decision makers',
        keyPoints: [
          'Tool comparisons',
          'Expert reviews',
          'Cost-benefit analysis',
          'Implementation guides',
          'Recommendation rankings',
        ],
        callToAction: 'Reply with your own tool recommendations',
        estimatedEngagement: 7,
        difficulty: 'moderate',
        timeToCreate: '4-5 hours',
        trendingScore: 6,
      },
      {
        title: `${topic} Case Study Spotlight`,
        description: `A detailed newsletter featuring an in-depth case study showcasing successful implementation of ${cleanTopic} strategies. This analytical content provides subscribers with real-world examples and practical insights.`,
        excerpt: `Learn from a detailed case study showing successful ${cleanTopic} implementation and results.`,
        targetAudience: 'Strategic thinkers and implementers',
        keyPoints: [
          'Detailed case analysis',
          'Implementation strategies',
          'Results measurement',
          'Lessons learned',
          'Replicable frameworks',
        ],
        callToAction: 'Share this case study with your team',
        estimatedEngagement: 8,
        difficulty: 'advanced',
        timeToCreate: '5-6 hours',
        trendingScore: 7,
      },
    ];
  }

  private generateBlogParsedFallbacks(
    topic: string,
    cleanTopic: string,
  ): any[] {
    return [
      {
        title: `The Complete ${topic} Guide for 2024`,
        description: `A comprehensive, up-to-date guide covering everything you need to know about ${cleanTopic} in 2024. This authoritative resource includes the latest trends, best practices, and proven strategies for success.`,
        excerpt: `Everything you need to know about ${cleanTopic} in 2024, from basics to advanced strategies.`,
        targetAudience: 'Beginners to intermediate practitioners',
        keyPoints: [
          '2024 updates and trends',
          'Comprehensive coverage',
          'Best practices',
          'Step-by-step guidance',
          'Future-ready strategies',
        ],
        callToAction: 'Bookmark this guide for future reference',
        estimatedEngagement: 8,
        difficulty: 'moderate',
        timeToCreate: '4-6 hours',
        trendingScore: 8,
      },
      {
        title: `${topic} Mistakes That Are Costing You Money`,
        description: `An eye-opening blog post revealing the most expensive mistakes people make with ${cleanTopic} and how to avoid them. This practical guide can help readers save significant time, money, and frustration.`,
        excerpt: `Avoid these costly ${cleanTopic} mistakes that could be draining your resources without you knowing it.`,
        targetAudience: 'Cost-conscious practitioners and business owners',
        keyPoints: [
          'Expensive common mistakes',
          'Financial impact analysis',
          'Prevention strategies',
          'Cost-saving alternatives',
          'ROI optimization',
        ],
        callToAction: 'Calculate how much these mistakes might be costing you',
        estimatedEngagement: 9,
        difficulty: 'moderate',
        timeToCreate: '3-4 hours',
        trendingScore: 9,
      },
      {
        title: `From Zero to Hero: My ${topic} Journey`,
        description: `A personal and inspiring blog post documenting a complete journey from beginner to expert in ${cleanTopic}. This authentic story provides motivation, practical insights, and a realistic roadmap for others to follow.`,
        excerpt: `Follow my complete journey from knowing nothing about ${cleanTopic} to becoming proficient - including all the ups and downs.`,
        targetAudience: 'Beginners and aspiring practitioners',
        keyPoints: [
          'Personal journey narrative',
          'Honest challenges faced',
          'Lessons learned',
          'Milestone achievements',
          'Actionable roadmap',
        ],
        callToAction: 'Share your own journey in the comments',
        estimatedEngagement: 8,
        difficulty: 'easy',
        timeToCreate: '2-3 hours',
        trendingScore: 7,
      },
    ];
  }

  /**
   * Normalize difficulty values from AI responses
   */
  private normalizeDifficulty(difficulty: string): string {
    if (!difficulty) return 'moderate';

    const normalized = difficulty.toLowerCase().trim();
    const validValues = ['easy', 'moderate', 'advanced'];

    return validValues.includes(normalized) ? normalized : 'moderate';
  }

  private generateBasicStructuredContent(
    title: string,
    description: string,
    keyPoints?: string[],
  ): any {
    const points = keyPoints || [
      'Key insight 1',
      'Key insight 2',
      'Key insight 3',
    ];

    return {
      sections: [
        {
          type: 'heading',
          level: 2,
          content: 'Introduction',
        },
        {
          type: 'paragraph',
          content: description,
        },
        {
          type: 'heading',
          level: 2,
          content: 'Key Points',
        },
        {
          type: 'list',
          style: 'bulleted',
          items: points,
        },
        {
          type: 'callout',
          style: 'tip',
          title: 'Pro Tip',
          content: 'Apply these insights consistently for best results.',
        },
        {
          type: 'heading',
          level: 2,
          content: 'Conclusion',
        },
        {
          type: 'paragraph',
          content: `This comprehensive guide provides valuable insights and actionable strategies to help you succeed with ${title.toLowerCase()}.`,
        },
      ],
      wordCount: 300,
      readingTime: '2 min read',
      summary: `A practical guide covering the essentials of ${title.toLowerCase()}.`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private generateBasicAISuggestions(title: string, description: string): any {
    return {
      title: `Enhanced: ${title}`,
      description: `Optimized version: ${description}`,
      keywords: ['content', 'marketing', 'strategy', 'engagement', 'growth'],
      improvements: [
        'Add compelling visuals and graphics',
        'Include interactive elements',
        'Optimize for mobile viewing',
        'Add strong call-to-action',
        'Use trending hashtags',
      ],
      hashtags: [
        '#content',
        '#marketing',
        '#strategy',
        '#growth',
        '#engagement',
      ],
      optimalPostingTimes: [
        new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
        new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      ],
      estimatedReach: Math.floor(Math.random() * 5000) + 1000,
      competitorAnalysis: [
        'Analyze trending content in your niche',
        'Study competitor engagement strategies',
        'Monitor industry best practices',
      ],
    };
  }

  /**
   * Generate comprehensive AI suggestions for content creation form
   * This method auto-suggests all form fields: title, description, content type, platform, tags, and priority
   * @param prompt - Brief user input or topic
   * @param context - Optional context about target audience, industry, etc.
   * @returns Complete content suggestion object
   */
  async generateAISuggest(
    prompt: string,
    context?: {
      targetAudience?: string;
      industry?: string;
      preferredPlatforms?: string[];
      contentGoal?: string; // 'engagement', 'education', 'sales', 'brand_awareness'
    },
  ): Promise<{
    title: string;
    description: string;
    contentType: Content['type'];
    platforms: string[];
    tags: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    aiConfidence: number;
    reasoning: string;
    alternatives: {
      titles: string[];
      contentTypes: Content['type'][];
      platformCombinations: string[][];
    };
  }> {
    try {
      // Create comprehensive prompt for AI suggestion
      const suggestPrompt = this.buildAISuggestPrompt(prompt, context);

      // Get AI suggestions using LLM service
      const aiResponse =
        await this.llmService.generateChatResponse(suggestPrompt);

      // Parse the AI response
      const suggestions = await this.parseAISuggestResponse(
        aiResponse,
        prompt,
        context,
      );

      return suggestions;
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      // Return fallback suggestions
      return this.generateFallbackAISuggestions(prompt, context);
    }
  }

  /**
   * Build comprehensive prompt for AI suggestion generation
   */
  private buildAISuggestPrompt(prompt: string, context?: any): string {
    const contextInfo = context
      ? `
Target Audience: ${context.targetAudience || 'General audience'}
Industry: ${context.industry || 'General'}
Preferred Platforms: ${
          context.preferredPlatforms?.join(', ') || 'Not specified'
        }
Content Goal: ${context.contentGoal || 'Engagement'}
`
      : '';

    return `You are an expert content strategist. Based on the user's input, suggest comprehensive content creation details.

User Input: "${prompt}"
${contextInfo}

Provide suggestions in the following JSON format:
{
  "title": "Engaging and SEO-optimized title (max 100 characters)",
  "description": "Detailed description explaining what the content will cover (150-300 words)",
  "contentType": "article|video|social|podcast|blog_post|newsletter",
  "platforms": ["platform1", "platform2", "platform3"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "priority": "low|medium|high|critical",
  "aiConfidence": 0.85,
  "reasoning": "Brief explanation of why these suggestions fit the user's input",
  "alternatives": {
    "titles": ["Alternative title 1", "Alternative title 2", "Alternative title 3"],
    "contentTypes": ["alternative_type1", "alternative_type2"],
    "platformCombinations": [["platform_set_1"], ["platform_set_2"]]
  }
}

Content Type Guidelines:
- article: Long-form educational/informational content
- video: Visual tutorials, demos, vlogs
- social: Short-form posts for social media
- podcast: Audio content, interviews, discussions
- blog_post: Casual, personal blog content
- newsletter: Email marketing content

Platform Options:
- linkedin: B2B professional content
- twitter: Real-time updates, news, discussions
- instagram: Visual content, lifestyle, behind-the-scenes
- youtube: Video tutorials, entertainment
- tiktok: Short-form video content
- facebook: Community engagement, events
- medium: Thought leadership articles
- email: Newsletter, direct communication

Priority Guidelines:
- low: Evergreen content, no time pressure
- medium: Regular content schedule
- high: Trending topics, time-sensitive
- critical: Breaking news, urgent announcements

Make suggestions relevant to the user's input and context. Ensure the content type matches the suggested platforms.`;
  }

  /**
   * Parse AI response and extract suggestions
   */
  private async parseAISuggestResponse(
    aiResponse: string,
    originalPrompt: string,
    context?: any,
  ): Promise<any> {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate and clean the response
        return {
          title: this.validateTitle(parsed.title),
          description: this.validateDescription(parsed.description),
          contentType: this.validateContentType(parsed.contentType),
          platforms: this.validatePlatforms(parsed.platforms),
          tags: this.validateTags(parsed.tags),
          priority: this.validatePriority(parsed.priority),
          aiConfidence: Math.min(
            Math.max(parsed.aiConfidence || 0.7, 0.1),
            1.0,
          ),
          reasoning:
            parsed.reasoning || 'AI-generated suggestions based on your input',
          alternatives: {
            titles: (parsed.alternatives?.titles || []).slice(0, 3),
            contentTypes: (parsed.alternatives?.contentTypes || []).slice(0, 2),
            platformCombinations: (
              parsed.alternatives?.platformCombinations || []
            ).slice(0, 2),
          },
        };
      }
    } catch (error) {
      console.error('Error parsing AI suggest response:', error);
    }

    // Fallback if parsing fails
    return this.generateFallbackAISuggestions(originalPrompt, context);
  }

  /**
   * Generate fallback suggestions when AI fails
   */
  private generateFallbackAISuggestions(prompt: string, context?: any): any {
    const cleanPrompt = prompt.toLowerCase().trim();

    // Determine content type based on keywords
    let contentType: Content['type'] = 'article';
    let platforms = ['linkedin', 'twitter'];
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    if (
      cleanPrompt.includes('video') ||
      cleanPrompt.includes('tutorial') ||
      cleanPrompt.includes('demo')
    ) {
      contentType = 'video';
      platforms = ['youtube', 'instagram', 'tiktok'];
    } else if (
      cleanPrompt.includes('social') ||
      cleanPrompt.includes('post') ||
      cleanPrompt.includes('update')
    ) {
      contentType = 'social';
      platforms = ['twitter', 'instagram', 'linkedin'];
    } else if (
      cleanPrompt.includes('podcast') ||
      cleanPrompt.includes('interview') ||
      cleanPrompt.includes('audio')
    ) {
      contentType = 'podcast';
      platforms = ['spotify', 'apple_podcasts'];
    } else if (
      cleanPrompt.includes('newsletter') ||
      cleanPrompt.includes('email')
    ) {
      contentType = 'newsletter';
      platforms = ['email'];
    } else if (cleanPrompt.includes('blog')) {
      contentType = 'blog_post';
      platforms = ['medium', 'personal_blog'];
    }

    // Determine priority based on keywords
    if (
      cleanPrompt.includes('urgent') ||
      cleanPrompt.includes('breaking') ||
      cleanPrompt.includes('now')
    ) {
      priority = 'critical';
    } else if (
      cleanPrompt.includes('trending') ||
      cleanPrompt.includes('important') ||
      cleanPrompt.includes('soon')
    ) {
      priority = 'high';
    } else if (
      cleanPrompt.includes('later') ||
      cleanPrompt.includes('someday') ||
      cleanPrompt.includes('eventually')
    ) {
      priority = 'low';
    }

    // Use context if provided
    if (context?.preferredPlatforms) {
      platforms = context.preferredPlatforms.slice(0, 3);
    }

    // Generate basic tags
    const tags = this.generateBasicTags(cleanPrompt);

    return {
      title: this.generateFallbackTitle(prompt),
      description: this.generateFallbackDescription(prompt, contentType),
      contentType,
      platforms,
      tags,
      priority,
      aiConfidence: 0.6,
      reasoning: 'Fallback suggestions generated based on keyword analysis',
      alternatives: {
        titles: [
          `${prompt} - Complete Guide`,
          `Everything You Need to Know About ${prompt}`,
          `${prompt}: Tips and Best Practices`,
        ],
        contentTypes:
          contentType === 'article'
            ? ['blog_post', 'video']
            : ['article', 'social'],
        platformCombinations: [
          ['linkedin', 'twitter'],
          ['instagram', 'tiktok'],
          ['youtube', 'medium'],
        ],
      },
    };
  }

  // Validation helper methods
  private validateTitle(title: string): string {
    if (!title || typeof title !== 'string') return 'Untitled Content';
    return title.substring(0, 100).trim();
  }

  private validateDescription(description: string): string {
    if (!description || typeof description !== 'string')
      return 'Content description will be generated based on your topic.';
    return description.substring(0, 1000).trim();
  }

  private validateContentType(type: string): Content['type'] {
    const validTypes: Content['type'][] = [
      'article',
      'video',
      'social',
      'podcast',
      'blog_post',
      'newsletter',
    ];
    return validTypes.includes(type as Content['type'])
      ? (type as Content['type'])
      : 'article';
  }

  private validatePlatforms(platforms: any): string[] {
    if (!Array.isArray(platforms)) return ['linkedin', 'twitter'];
    const validPlatforms = [
      'linkedin',
      'twitter',
      'instagram',
      'youtube',
      'tiktok',
      'facebook',
      'medium',
      'email',
    ];
    return platforms
      .filter((p) => typeof p === 'string' && validPlatforms.includes(p))
      .slice(0, 4);
  }

  private validateTags(tags: any): string[] {
    if (!Array.isArray(tags)) return [];
    return tags
      .filter((t) => typeof t === 'string' && t.length > 0)
      .slice(0, 8);
  }

  private validatePriority(
    priority: string,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    return validPriorities.includes(priority) ? (priority as any) : 'medium';
  }

  private generateBasicTags(prompt: string): string[] {
    const words = prompt.toLowerCase().split(/\s+/);
    const tags = words
      .filter((word) => word.length > 3)
      .filter(
        (word) =>
          ![
            'this',
            'that',
            'with',
            'from',
            'they',
            'were',
            'been',
            'have',
            'your',
            'what',
            'when',
            'where',
            'will',
          ].includes(word),
      )
      .slice(0, 5);

    return tags.length > 0 ? tags : ['content', 'marketing', 'business'];
  }

  private generateFallbackTitle(prompt: string): string {
    const cleanPrompt = prompt.charAt(0).toUpperCase() + prompt.slice(1);
    return `${cleanPrompt}: A Comprehensive Guide`;
  }

  private generateFallbackDescription(
    prompt: string,
    contentType: Content['type'],
  ): string {
    const typeDescriptions = {
      article: 'In-depth article covering',
      video: 'Engaging video tutorial about',
      social: 'Social media content discussing',
      podcast: 'Podcast episode exploring',
      blog_post: 'Blog post diving into',
      newsletter: 'Newsletter edition featuring',
    };

    return `${typeDescriptions[contentType]} ${prompt}. This content will provide valuable insights, practical tips, and actionable strategies for your audience. Perfect for engaging your community and establishing thought leadership in your field.`;
  }

  /**
   * Generate suggestions feed for the suggestions tab
   * @param userId - User ID for personalized suggestions
   * @param options - Feed generation options
   */
  async generateSuggestionsFeed(
    userId: Types.ObjectId,
    options: {
      limit?: number;
      category?: string;
      forceRefresh?: boolean;
    } = {},
  ): Promise<any[]> {
    try {
      const {
        limit = 10,
        category: _category,
        forceRefresh: _forceRefresh = false,
      } = options;

      // Generate trending topics and content ideas
      const trendingTopics = [
        'AI tools for content creators',
        'Social media trends 2025',
        'Remote work productivity',
        'Digital marketing strategies',
        'Personal branding tips',
        'Video content creation',
        'Email marketing automation',
        'SEO best practices',
        'Influencer marketing',
        'Content monetization',
      ];

      const suggestions = [];

      for (let i = 0; i < Math.min(limit, trendingTopics.length); i++) {
        const topic = trendingTopics[i];

        try {
          // Generate AI suggestion for each topic
          const suggestion = await this.generateAISuggest(topic, {
            targetAudience: 'Content creators and marketers',
            contentGoal: 'engagement',
          });

          suggestions.push({
            id: `suggestion-${Date.now()}-${i}`,
            title: suggestion.title,
            description: suggestion.description,
            contentType: suggestion.contentType,
            platforms: suggestion.platforms,
            tags: suggestion.tags,
            priority: suggestion.priority,
            trending: Math.random() > 0.5, // Random trending status
            category: this.categorizeTopic(topic),
            estimatedEngagement: this.estimateEngagement(
              suggestion.contentType,
              suggestion.platforms,
            ),
            difficulty: this.determineDifficulty(suggestion.contentType),
            timeToCreate: this.estimateTimeToCreate(suggestion.contentType),
            reasoning: suggestion.reasoning,
            aiConfidence: suggestion.aiConfidence,
            createdAt: new Date(),
          });
        } catch (error) {
          console.warn(
            `Failed to generate suggestion for topic: ${topic}`,
            error,
          );
          // Add fallback suggestion
          suggestions.push(this.generateFallbackFeedSuggestion(topic, i));
        }
      }

      return suggestions.slice(0, limit);
    } catch (error) {
      console.error('Error generating suggestions feed:', error);
      // Return fallback suggestions
      return this.generateFallbackSuggestionsFeed(options.limit || 10);
    }
  }

  /**
   * Convert a suggestion from the feed to form-ready data
   * @param suggestionId - ID of the suggestion from the feed
   * @param customizations - Any user customizations
   * @param userId - User ID
   */
  async convertFeedSuggestionToForm(
    suggestionId: string,
    customizations: any = {},
    _userId: Types.ObjectId, // Prefixed with underscore to indicate intentionally unused
  ): Promise<any> {
    try {
      // For now, we'll create form data based on the suggestion ID and customizations
      // In a real implementation, you might fetch the suggestion from a cache/database

      console.log('Converting feed suggestion to form:', suggestionId);

      // Extract basic info from suggestion ID or use customizations
      const baseFormData: Record<string, any> = {
        title: customizations.title || 'AI Generated Content Title',
        description:
          customizations.description ||
          'AI generated description for your content',
        type: customizations.type || 'article',
        platform: customizations.platforms || ['linkedin', 'twitter'],
        tags: customizations.tags || ['ai', 'content', 'marketing'],
        priority: customizations.priority || 'medium',
      };

      // Apply any user-specific customizations
      if (customizations) {
        const allowedKeys = [
          'title',
          'description',
          'type',
          'platform',
          'tags',
          'priority',
        ];
        Object.keys(customizations).forEach((key) => {
          if (customizations[key] !== undefined && allowedKeys.includes(key)) {
            baseFormData[key] = customizations[key];
          }
        });
      }

      return baseFormData;
    } catch (error) {
      console.error('Error converting feed suggestion to form:', error);
      throw new Error('Failed to convert suggestion to form data');
    }
  }

  private categorizeTopic(topic: string): string {
    const topicLower = topic.toLowerCase();

    if (topicLower.includes('ai') || topicLower.includes('tool'))
      return 'Technology';
    if (topicLower.includes('social') || topicLower.includes('media'))
      return 'Social Media';
    if (topicLower.includes('marketing') || topicLower.includes('seo'))
      return 'Marketing';
    if (topicLower.includes('productivity') || topicLower.includes('remote'))
      return 'Business';
    if (topicLower.includes('video') || topicLower.includes('content'))
      return 'Content Creation';

    return 'General';
  }

  private estimateEngagement(
    contentType: Content['type'],
    platforms: string[],
  ): string {
    const engagementMap = {
      video: 'Very High',
      social: 'High',
      article: 'Medium',
      podcast: 'Medium',
      blog_post: 'Medium',
      newsletter: 'Low',
    };

    const platformBoost = platforms.some((p) =>
      ['tiktok', 'instagram', 'youtube'].includes(p),
    );
    const baseEngagement = engagementMap[contentType] || 'Medium';

    if (platformBoost && baseEngagement === 'Medium') return 'High';
    return baseEngagement;
  }

  private determineDifficulty(contentType: Content['type']): string {
    const difficultyMap = {
      social: 'Beginner',
      blog_post: 'Beginner',
      article: 'Intermediate',
      newsletter: 'Intermediate',
      video: 'Advanced',
      podcast: 'Advanced',
    };

    return difficultyMap[contentType] || 'Intermediate';
  }

  private estimateTimeToCreate(contentType: Content['type']): string {
    const timeMap = {
      social: '30 minutes',
      blog_post: '1-2 hours',
      article: '2-3 hours',
      newsletter: '1-2 hours',
      video: '3-5 hours',
      podcast: '2-4 hours',
    };

    return timeMap[contentType] || '1-2 hours';
  }

  private generateFallbackFeedSuggestion(topic: string, index: number): any {
    return {
      id: `fallback-${Date.now()}-${index}`,
      title: `${topic}: Complete Guide`,
      description: `Comprehensive guide covering ${topic}. Learn the latest trends, best practices, and actionable strategies.`,
      contentType: 'article',
      platforms: ['linkedin', 'twitter'],
      tags: topic
        .toLowerCase()
        .split(' ')
        .filter((word) => word.length > 3)
        .slice(0, 5),
      priority: 'medium',
      trending: false,
      category: this.categorizeTopic(topic),
      estimatedEngagement: 'Medium',
      difficulty: 'Intermediate',
      timeToCreate: '2-3 hours',
      reasoning: 'Fallback suggestion generated from trending topic',
      aiConfidence: 0.5,
      createdAt: new Date(),
    };
  }

  private generateFallbackSuggestionsFeed(limit: number): any[] {
    const fallbackTopics = [
      'AI Tools for Content Creators',
      'Social Media Marketing Strategies',
      'Remote Work Best Practices',
      'Digital Marketing Trends',
      'Content Creation Tips',
    ];

    return fallbackTopics
      .slice(0, limit)
      .map((topic, index) => this.generateFallbackFeedSuggestion(topic, index));
  }

  /**
   * Generate a single optimized suggestion for form auto-fill
   * @param userId - User ID for personalized suggestions
   * @param options - Generation options
   */
  async generateFormFillSuggestion(
    userId: Types.ObjectId,
    options: {
      category?: string;
      seed?: string;
    } = {},
  ): Promise<any> {
    try {
      const { category, seed } = options;

      // Generate trending topics pool based on category
      const trendingTopics = this.getTrendingTopicsByCategory(category);

      // Select a topic (use seed for consistent results if provided)
      const selectedTopic = seed
        ? trendingTopics[parseInt(seed) % trendingTopics.length]
        : trendingTopics[Math.floor(Math.random() * trendingTopics.length)];

      // Generate AI suggestion for the selected topic
      const suggestion = await this.generateAISuggest(selectedTopic, {
        targetAudience: 'Content creators and marketers',
        contentGoal: 'engagement',
      });

      return {
        id: `form-fill-${Date.now()}`,
        title: suggestion.title,
        description: suggestion.description,
        contentType: suggestion.contentType,
        platforms: suggestion.platforms,
        tags: suggestion.tags,
        priority: suggestion.priority,
        category: this.categorizeTopic(selectedTopic),
        trending: Math.random() > 0.3, // Higher chance of trending for form fills
        reasoning: suggestion.reasoning,
        aiConfidence: suggestion.aiConfidence,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error generating form fill suggestion:', error);
      // Return smart fallback
      return this.generateSmartFormFillFallback(options.category);
    }
  }

  private getTrendingTopicsByCategory(category?: string): string[] {
    const allTopics = {
      Technology: [
        'AI tools for content creators',
        'Latest tech trends 2025',
        'Digital transformation strategies',
        'Automation in content creation',
      ],
      Marketing: [
        'Social media marketing strategies',
        'Email marketing best practices',
        'Influencer marketing trends',
        'Content marketing ROI',
      ],
      Business: [
        'Remote work productivity',
        'Team collaboration tools',
        'Business automation',
        'Startup growth strategies',
      ],
      'Content Creation': [
        'Video content trends',
        'Content planning strategies',
        'Creator economy insights',
        'Content distribution tactics',
      ],
    };

    if (category && allTopics[category]) {
      return allTopics[category];
    }

    // Return mix of all categories if no specific category
    return [
      ...allTopics.Technology,
      ...allTopics.Marketing,
      ...allTopics.Business,
      ...allTopics['Content Creation'],
    ];
  }

  private generateSmartFormFillFallback(category?: string): any {
    const fallbackSuggestions = {
      Technology: {
        title: 'Essential AI Tools Every Content Creator Should Know',
        description:
          'Discover the most impactful AI tools that are transforming content creation workflows and boosting productivity',
        contentType: 'article' as Content['type'],
        platforms: ['linkedin', 'medium', 'twitter'],
        tags: ['ai-tools', 'productivity', 'content-creation', 'technology'],
        priority: 'high' as const,
      },
      Marketing: {
        title: 'Social Media Marketing Strategies That Actually Work',
        description:
          'Proven social media marketing tactics that drive engagement, build community, and generate leads',
        contentType: 'social' as Content['type'],
        platforms: ['instagram', 'linkedin', 'twitter'],
        tags: ['social-media', 'marketing', 'engagement', 'strategy'],
        priority: 'high' as const,
      },
      Business: {
        title: 'Remote Team Productivity: A Complete Guide',
        description:
          "Transform your remote team's productivity with proven strategies, tools, and management techniques",
        contentType: 'video' as Content['type'],
        platforms: ['youtube', 'linkedin'],
        tags: ['remote-work', 'productivity', 'team-management', 'business'],
        priority: 'medium' as const,
      },
    };

    const fallbackData =
      fallbackSuggestions[category as keyof typeof fallbackSuggestions] ||
      fallbackSuggestions.Technology;

    return {
      id: `fallback-form-fill-${Date.now()}`,
      title: fallbackData.title,
      description: fallbackData.description,
      contentType: fallbackData.contentType,
      platforms: fallbackData.platforms,
      tags: fallbackData.tags,
      priority: fallbackData.priority,
      category: category || 'Technology',
      trending: false,
      reasoning: 'Smart fallback suggestion based on popular content patterns',
      aiConfidence: 0.7,
      createdAt: new Date(),
    };
  }
}
