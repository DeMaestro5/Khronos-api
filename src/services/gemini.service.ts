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

      // Simplified prompt that's more likely to get consistent results
      const prompt = `Generate 5 detailed content ideas for a ${type} about "${topic}".

For each idea, respond in this EXACT format:

IDEA_START
TITLE: [Write a compelling, clickable title]
DESCRIPTION: [Write a detailed 150-200 word description explaining what the content will cover]
EXCERPT: [Write an engaging 50-80 word hook/summary]
KEY_POINTS: [Point 1], [Point 2], [Point 3], [Point 4], [Point 5]
TARGET_AUDIENCE: [Describe the specific target audience]
ENGAGEMENT_SCORE: [Number from 1-10]
DIFFICULTY: [easy, moderate, or advanced]
TIME_TO_CREATE: [e.g., 2-3 hours]
CALL_TO_ACTION: [Specific call-to-action]
TRENDING_KEYWORDS: [keyword1], [keyword2], [keyword3]
PLATFORM_TIPS: [Platform-specific optimization advice]
IDEA_END

Make each idea unique, actionable, and engaging. Focus on practical value and current trends.

Topic: ${topic}
Content Type: ${type}

Generate all 5 ideas using the exact format above.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('AI Response for content ideas:', text); // Debug logging

      // Parse the structured response
      const ideas = this.parseStructuredContentIdeas(text);

      if (ideas.length === 0) {
        console.warn('No ideas parsed from AI response, using fallback');
        return this.generateFallbackContentIdeas(topic, type);
      }

      return ideas;
    } catch (error) {
      console.error('Error generating content ideas with Gemini:', error);
      // Fallback to basic ideas if structured generation fails
      return this.generateFallbackContentIdeas(topic, type);
    }
  }

  private parseStructuredContentIdeas(text: string): string[] {
    const ideas: string[] = [];

    try {
      // Split by IDEA_START to get individual ideas
      const ideaSections = text.split('IDEA_START');

      for (let i = 1; i < ideaSections.length; i++) {
        const section = ideaSections[i];

        // Extract structured data using improved field extraction
        const title = this.extractFieldValue(section, 'TITLE');
        const description = this.extractFieldValue(section, 'DESCRIPTION');
        const excerpt = this.extractFieldValue(section, 'EXCERPT');
        const keyPointsRaw = this.extractFieldValue(section, 'KEY_POINTS');
        const targetAudience = this.extractFieldValue(
          section,
          'TARGET_AUDIENCE',
        );
        const engagementScore = this.extractFieldValue(
          section,
          'ENGAGEMENT_SCORE',
        );
        const difficulty = this.extractFieldValue(section, 'DIFFICULTY');
        const timeToCreate = this.extractFieldValue(section, 'TIME_TO_CREATE');
        const callToAction = this.extractFieldValue(section, 'CALL_TO_ACTION');
        const trendingKeywords = this.extractFieldValue(
          section,
          'TRENDING_KEYWORDS',
        );
        const platformTips = this.extractFieldValue(section, 'PLATFORM_TIPS');

        // Parse key points
        const keyPoints = keyPointsRaw
          ? keyPointsRaw
              .split(',')
              .map((p) => p.trim())
              .filter(Boolean)
          : [
              'Introduction to the topic',
              'Key concepts and strategies',
              'Practical implementation',
              'Best practices',
              'Future trends',
            ];

        // Parse trending keywords
        const keywords = trendingKeywords
          ? trendingKeywords
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean)
          : [];

        // Validate that we have at least title and description
        if (!title || !description) {
          console.warn(`Skipping idea ${i}: Missing title or description`);
          continue;
        }

        // Create rich content idea object as JSON string
        const richIdea = JSON.stringify({
          title: title,
          description: description,
          excerpt: excerpt || description.substring(0, 100) + '...',
          keyPoints: keyPoints,
          targetAudience: targetAudience || 'General audience',
          engagementScore:
            parseInt(engagementScore) || Math.floor(Math.random() * 5) + 5,
          difficulty: this.normalizeDifficultyValue(difficulty),
          timeToCreate: timeToCreate || '2-3 hours',
          callToAction:
            callToAction || 'Engage with this content and share your thoughts',
          trendingKeywords: keywords,
          platformTips:
            platformTips || 'Optimize content for target platform and audience',
        });

        ideas.push(richIdea);
      }

      console.log(`Successfully parsed ${ideas.length} ideas from AI response`);
      return ideas;
    } catch (error) {
      console.error('Error parsing structured content ideas:', error);
      return [];
    }
  }

  /**
   * Improved field extraction method
   */
  private extractFieldValue(text: string, fieldName: string): string {
    // Try multiple regex patterns to be more flexible
    const patterns = [
      new RegExp(`${fieldName}:\\s*(.+?)(?=\\n[A-Z_]+:|\\nIDEA_END|$)`, 'is'),
      new RegExp(`${fieldName}:\\s*(.+?)(?=\\n\\w+:|$)`, 'is'),
      new RegExp(`${fieldName}:\\s*(.+?)\\n`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return '';
  }

  /**
   * Generate fallback content ideas when AI parsing fails
   */
  private generateFallbackContentIdeas(topic: string, type: string): string[] {
    console.log(
      `Generating fallback content ideas for topic: ${topic}, type: ${type}`,
    );

    // Create type-specific and topic-aware fallback ideas
    const fallbackIdeas = this.createTypeSpecificFallbacks(topic, type);

    return fallbackIdeas.map((idea) => JSON.stringify(idea));
  }

  /**
   * Create content type-specific fallback ideas
   */
  private createTypeSpecificFallbacks(topic: string, type: string): any[] {
    const cleanTopic = topic.toLowerCase();

    switch (type.toLowerCase()) {
      case 'video':
        return this.generateVideoFallbacks(topic, cleanTopic);
      case 'social':
        return this.generateSocialFallbacks(topic, cleanTopic);
      case 'podcast':
        return this.generatePodcastFallbacks(topic, cleanTopic);
      case 'newsletter':
        return this.generateNewsletterFallbacks(topic, cleanTopic);
      case 'article':
      case 'blog_post':
      default:
        return this.generateBlogFallbacks(topic, cleanTopic);
    }
  }

  private generateVideoFallbacks(topic: string, cleanTopic: string): any[] {
    return [
      {
        title: `${topic}: Complete Tutorial for Beginners`,
        description: `A comprehensive video tutorial covering everything beginners need to know about ${cleanTopic}. This step-by-step guide will walk viewers through the fundamentals, common challenges, and practical tips to get started with confidence.`,
        excerpt: `Learn ${cleanTopic} from scratch with this beginner-friendly video tutorial covering all the essentials.`,
        keyPoints: [
          'Introduction and basics',
          'Step-by-step process',
          'Common mistakes to avoid',
          'Practical examples',
          'Next steps for advancement',
        ],
        targetAudience: 'Beginners and newcomers',
        engagementScore: 8,
        difficulty: 'easy',
        timeToCreate: '4-6 hours',
        callToAction: 'Subscribe for more tutorials like this',
        trendingKeywords: [cleanTopic, 'tutorial', 'beginner', 'how-to'],
        platformTips:
          'Use clear visuals, maintain good pacing, and include timestamps for easy navigation',
      },
      {
        title: `Top 10 ${topic} Tips That Actually Work`,
        description: `Discover the most effective tips and tricks for ${cleanTopic} that professionals use daily. This video compiles proven strategies, insider secrets, and actionable advice that viewers can implement immediately.`,
        excerpt: `Get 10 proven ${cleanTopic} tips from industry professionals that you can start using today.`,
        keyPoints: [
          'Expert-validated techniques',
          'Real-world applications',
          'Time-saving shortcuts',
          'Professional insights',
          'Measurable results',
        ],
        targetAudience: 'Intermediate practitioners',
        engagementScore: 9,
        difficulty: 'moderate',
        timeToCreate: '3-4 hours',
        callToAction: 'Try these tips and share your results in the comments',
        trendingKeywords: [cleanTopic, 'tips', 'professional', 'expert'],
        platformTips:
          'Use engaging thumbnails, create suspense between tips, and encourage viewer interaction',
      },
      {
        title: `${topic} Mistakes Everyone Makes (And How to Fix Them)`,
        description: `Learn about the most common ${cleanTopic} mistakes that even experienced people make, and discover how to avoid or fix them. This video will save viewers time, money, and frustration by addressing frequent pitfalls.`,
        excerpt: `Avoid costly ${cleanTopic} mistakes with this guide to common pitfalls and their solutions.`,
        keyPoints: [
          'Most common errors',
          'Why these mistakes happen',
          'How to identify problems',
          'Step-by-step solutions',
          'Prevention strategies',
        ],
        targetAudience: 'All skill levels',
        engagementScore: 8,
        difficulty: 'moderate',
        timeToCreate: '3-5 hours',
        callToAction: 'Share your own mistakes and solutions in the comments',
        trendingKeywords: [cleanTopic, 'mistakes', 'avoid', 'fix'],
        platformTips:
          'Use relatable examples, show before/after scenarios, and maintain a helpful tone',
      },
    ];
  }

  private generateSocialFallbacks(topic: string, cleanTopic: string): any[] {
    return [
      {
        title: `Quick ${topic} Tip`,
        description: `A bite-sized, actionable tip about ${cleanTopic} that followers can implement immediately. Perfect for driving engagement and providing quick value in a social media format.`,
        excerpt: `One simple ${cleanTopic} tip that makes a big difference.`,
        keyPoints: [
          'Single actionable tip',
          'Easy to implement',
          'Immediate value',
          'Engagement-focused',
          'Shareable content',
        ],
        targetAudience: 'Social media followers',
        engagementScore: 9,
        difficulty: 'easy',
        timeToCreate: '30 minutes',
        callToAction: 'Try this tip and tag us in your results!',
        trendingKeywords: [cleanTopic, 'tip', 'quick', 'easy'],
        platformTips:
          'Use eye-catching visuals, keep text concise, and include relevant hashtags',
      },
      {
        title: `${topic} Monday Motivation`,
        description: `Inspirational content related to ${cleanTopic} designed to motivate and encourage your social media audience. Combines motivation with practical insights to drive engagement.`,
        excerpt: `Get motivated about ${cleanTopic} with this inspiring post.`,
        keyPoints: [
          'Motivational message',
          'Relatable content',
          'Call for engagement',
          'Community building',
          'Positive energy',
        ],
        targetAudience: 'General social media audience',
        engagementScore: 8,
        difficulty: 'easy',
        timeToCreate: '20 minutes',
        callToAction: 'Share your own motivation in the comments!',
        trendingKeywords: [cleanTopic, 'motivation', 'monday', 'inspiration'],
        platformTips:
          'Use bright, uplifting visuals and ask questions to encourage comments',
      },
      {
        title: `${topic} vs Reality - What They Don't Tell You`,
        description: `A candid look at the realities of ${cleanTopic}, comparing expectations vs reality. This type of content performs well on social media by being authentic and relatable.`,
        excerpt: `The truth about ${cleanTopic} that nobody talks about.`,
        keyPoints: [
          'Reality check',
          'Honest perspective',
          'Debunking myths',
          'Authentic insights',
          'Relatable experiences',
        ],
        targetAudience: 'Engaged community members',
        engagementScore: 9,
        difficulty: 'moderate',
        timeToCreate: '45 minutes',
        callToAction:
          'What reality checks have you experienced? Tell us below!',
        trendingKeywords: [cleanTopic, 'reality', 'truth', 'honest'],
        platformTips:
          'Use carousel posts or video format, be authentic, and encourage personal stories',
      },
    ];
  }

  private generatePodcastFallbacks(topic: string, cleanTopic: string): any[] {
    return [
      {
        title: `Deep Dive into ${topic}: Everything You Need to Know`,
        description: `A comprehensive podcast episode exploring all aspects of ${cleanTopic}. This long-form content allows for in-depth discussion, expert insights, and detailed analysis perfect for podcast audiences.`,
        excerpt: `Join us for an in-depth exploration of ${cleanTopic} covering everything from basics to advanced concepts.`,
        keyPoints: [
          'Comprehensive overview',
          'Expert insights',
          'Industry trends',
          'Practical applications',
          'Future outlook',
        ],
        targetAudience: 'Podcast listeners and enthusiasts',
        engagementScore: 7,
        difficulty: 'moderate',
        timeToCreate: '6-8 hours',
        callToAction:
          'Subscribe and leave a review to help others find this content',
        trendingKeywords: [cleanTopic, 'podcast', 'deep dive', 'comprehensive'],
        platformTips:
          'Prepare detailed show notes, include timestamps, and encourage listener interaction',
      },
      {
        title: `${topic} Stories: Real Experiences from the Community`,
        description: `A podcast episode featuring real stories and experiences from people involved in ${cleanTopic}. This format creates authentic, engaging content that resonates with listeners.`,
        excerpt: `Hear real stories and experiences from the ${cleanTopic} community.`,
        keyPoints: [
          'Real user stories',
          'Community experiences',
          'Lessons learned',
          'Authentic perspectives',
          'Practical insights',
        ],
        targetAudience: 'Community members and curious listeners',
        engagementScore: 8,
        difficulty: 'moderate',
        timeToCreate: '4-6 hours',
        callToAction:
          'Share your own story with us for a chance to be featured',
        trendingKeywords: [cleanTopic, 'stories', 'community', 'experiences'],
        platformTips:
          'Prepare good questions, create a comfortable environment, and follow up on interesting points',
      },
      {
        title: `The Future of ${topic}: Trends and Predictions`,
        description: `A forward-looking podcast episode discussing emerging trends, future developments, and predictions related to ${cleanTopic}. Perfect for thought leadership and industry analysis.`,
        excerpt: `Explore what's next for ${cleanTopic} with expert predictions and trend analysis.`,
        keyPoints: [
          'Industry trends',
          'Future predictions',
          'Expert opinions',
          'Market analysis',
          'Strategic insights',
        ],
        targetAudience: 'Industry professionals and forward-thinkers',
        engagementScore: 7,
        difficulty: 'advanced',
        timeToCreate: '8-10 hours',
        callToAction:
          'What trends do you see? Join the conversation on our social channels',
        trendingKeywords: [cleanTopic, 'future', 'trends', 'predictions'],
        platformTips:
          'Research thoroughly, invite expert guests, and provide actionable takeaways',
      },
    ];
  }

  private generateNewsletterFallbacks(
    topic: string,
    cleanTopic: string,
  ): any[] {
    return [
      {
        title: `Weekly ${topic} Roundup`,
        description: `A comprehensive weekly newsletter covering the latest news, trends, and insights in ${cleanTopic}. This format provides subscribers with valuable, curated content delivered regularly.`,
        excerpt: `Stay updated with the latest ${cleanTopic} news, trends, and insights in this weekly roundup.`,
        keyPoints: [
          'Latest industry news',
          'Trend analysis',
          'Curated resources',
          'Expert commentary',
          'Actionable insights',
        ],
        targetAudience: 'Industry professionals and enthusiasts',
        engagementScore: 6,
        difficulty: 'moderate',
        timeToCreate: '3-4 hours',
        callToAction:
          'Forward this newsletter to colleagues who would find it valuable',
        trendingKeywords: [cleanTopic, 'weekly', 'roundup', 'newsletter'],
        platformTips:
          'Use clear sections, include visuals, and maintain consistent formatting',
      },
      {
        title: `${topic} Spotlight: Feature of the Week`,
        description: `A focused newsletter edition highlighting a specific aspect, tool, or development in ${cleanTopic}. This deep-dive format provides subscribers with detailed, valuable insights.`,
        excerpt: `This week's spotlight focuses on an important development in ${cleanTopic}.`,
        keyPoints: [
          'Focused deep-dive',
          'Detailed analysis',
          'Practical applications',
          'Expert insights',
          'Implementation tips',
        ],
        targetAudience: 'Engaged subscribers',
        engagementScore: 7,
        difficulty: 'moderate',
        timeToCreate: '4-5 hours',
        callToAction: 'Reply with your thoughts or questions about this topic',
        trendingKeywords: [cleanTopic, 'spotlight', 'feature', 'analysis'],
        platformTips:
          'Include case studies, use bullet points for readability, and add relevant links',
      },
      {
        title: `Getting Started with ${topic}: Beginner's Guide`,
        description: `A newsletter series designed to help newcomers understand and get started with ${cleanTopic}. This educational format builds a loyal subscriber base by providing genuine value.`,
        excerpt: `New to ${cleanTopic}? This beginner's guide will help you get started on the right foot.`,
        keyPoints: [
          'Beginner-friendly content',
          'Step-by-step guidance',
          'Essential resources',
          'Common pitfalls',
          'Next steps',
        ],
        targetAudience: 'Beginners and newcomers',
        engagementScore: 8,
        difficulty: 'easy',
        timeToCreate: '2-3 hours',
        callToAction:
          "Share this guide with someone who's just getting started",
        trendingKeywords: [cleanTopic, 'beginner', 'guide', 'getting started'],
        platformTips:
          'Use simple language, include helpful links, and encourage questions',
      },
    ];
  }

  private generateBlogFallbacks(topic: string, cleanTopic: string): any[] {
    return [
      {
        title: `The Ultimate Guide to ${topic}`,
        description: `A comprehensive deep dive into ${cleanTopic}, covering everything from basic concepts to advanced strategies. This guide will provide readers with practical insights, real-world examples, and actionable steps to master ${cleanTopic} effectively.`,
        excerpt: `Master ${cleanTopic} with our comprehensive guide covering essential concepts, practical strategies, and expert insights.`,
        keyPoints: [
          'Understanding the fundamentals',
          'Key strategies and techniques',
          'Real-world applications',
          'Best practices and tips',
          'Future trends and opportunities',
        ],
        targetAudience: 'Beginners and intermediate learners',
        engagementScore: 8,
        difficulty: 'moderate',
        timeToCreate: '3-4 hours',
        callToAction: 'Start your journey with these proven strategies',
        trendingKeywords: [cleanTopic, 'guide', 'tutorial', 'tips'],
        platformTips:
          'Use engaging visuals and break content into digestible sections',
      },
      {
        title: `${topic}: Top 10 Tips for Success`,
        description: `Discover the top 10 most effective tips and strategies for achieving success with ${cleanTopic}. Based on expert insights and proven methods, this content will help you avoid common mistakes and accelerate your progress.`,
        excerpt: `Unlock success with these 10 proven tips and strategies that industry experts swear by for ${cleanTopic}.`,
        keyPoints: [
          'Expert-validated strategies',
          'Common mistakes to avoid',
          'Quick wins and long-term success',
          'Industry best practices',
          'Measurable results',
        ],
        targetAudience: 'Professionals and enthusiasts',
        engagementScore: 9,
        difficulty: 'easy',
        timeToCreate: '2-3 hours',
        callToAction: 'Apply these tips and see immediate results',
        trendingKeywords: [cleanTopic, 'tips', 'success', 'strategies'],
        platformTips: 'Use numbered lists and highlight key takeaways',
      },
      {
        title: `${topic} Trends: What's Hot in 2024`,
        description: `Stay ahead of the curve with the latest trends and developments in ${cleanTopic}. Explore emerging technologies, changing consumer behaviors, and future predictions that will shape the industry landscape.`,
        excerpt: `Stay ahead with the latest ${cleanTopic} trends shaping 2024, including emerging technologies and industry predictions.`,
        keyPoints: [
          'Current market trends',
          'Emerging technologies',
          'Consumer behavior changes',
          'Industry predictions',
          'Opportunities for growth',
        ],
        targetAudience: 'Industry professionals and decision makers',
        engagementScore: 7,
        difficulty: 'moderate',
        timeToCreate: '4-5 hours',
        callToAction: 'Position yourself ahead of these trends',
        trendingKeywords: [cleanTopic, 'trends', '2024', 'future'],
        platformTips: 'Include current statistics and visual trend data',
      },
      {
        title: `From Beginner to Pro: Mastering ${topic}`,
        description: `A step-by-step journey from beginner to professional level in ${cleanTopic}. This comprehensive roadmap includes learning resources, milestone checkpoints, and expert advice to guide your progression.`,
        excerpt: `Transform from beginner to pro with this complete roadmap for mastering ${cleanTopic}, including resources and milestones.`,
        keyPoints: [
          'Beginner fundamentals',
          'Intermediate skill building',
          'Advanced techniques',
          'Professional development',
          'Continuous learning strategies',
        ],
        targetAudience: 'Aspiring professionals and career changers',
        engagementScore: 8,
        difficulty: 'advanced',
        timeToCreate: '5-6 hours',
        callToAction: 'Start your professional journey today',
        trendingKeywords: [cleanTopic, 'mastery', 'professional', 'skills'],
        platformTips:
          'Create a clear progression pathway with visual milestones',
      },
      {
        title: `${topic} Case Studies: Real Success Stories`,
        description: `Learn from real-world success stories and case studies in ${cleanTopic}. Analyze what worked, what didn't, and extract actionable insights you can apply to your own projects and strategies.`,
        excerpt: `Learn from real success stories and case studies that reveal the secrets behind effective ${cleanTopic} strategies.`,
        keyPoints: [
          'Real-world case studies',
          'Success factors analysis',
          'Lessons learned',
          'Actionable insights',
          'Implementation strategies',
        ],
        targetAudience: 'Practitioners and business owners',
        engagementScore: 9,
        difficulty: 'moderate',
        timeToCreate: '4-5 hours',
        callToAction: 'Apply these proven strategies to your projects',
        trendingKeywords: [
          cleanTopic,
          'case studies',
          'success stories',
          'results',
        ],
        platformTips:
          'Use storytelling format with clear before/after scenarios',
      },
    ];
  }

  /**
   * Normalize difficulty values to match enum constraints
   */
  private normalizeDifficultyValue(difficulty: string): string {
    if (!difficulty) return 'moderate';

    const normalized = difficulty.toLowerCase().trim();
    const validValues = ['easy', 'moderate', 'advanced'];

    // Handle common variations
    if (normalized.includes('easy') || normalized.includes('beginner'))
      return 'easy';
    if (
      normalized.includes('hard') ||
      normalized.includes('difficult') ||
      normalized.includes('advanced')
    )
      return 'advanced';

    return validValues.includes(normalized) ? normalized : 'moderate';
  }

  // Add new method for generating rich content body as structured JSON
  async generateRichContentBody(
    title: string,
    description: string,
    type: string,
    keyPoints?: string[],
  ): Promise<any> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });

      const prompt = `Create a comprehensive, engaging content structure for a ${type} with the following details:

Title: ${title}
Description: ${description}
Key Points: ${keyPoints?.join(', ') || 'Not specified'}

Generate a well-structured content body in VALID JSON format. Make sure to return ONLY a valid JSON object, no additional text or explanations.

{
  "sections": [
    {
      "type": "heading",
      "level": 2,
      "content": "Introduction"
    },
    {
      "type": "paragraph",
      "content": "Detailed paragraph content here..."
    },
    {
      "type": "list",
      "style": "bulleted",
      "items": ["Point 1", "Point 2", "Point 3"]
    },
    {
      "type": "callout",
      "style": "tip",
      "title": "Pro Tip",
      "content": "Important highlighted information"
    },
    {
      "type": "quote",
      "content": "Inspirational quote",
      "author": "Author Name"
    }
  ],
  "wordCount": 800,
  "readingTime": "4 min read",
  "summary": "Brief summary of the content"
}

Create comprehensive content (800-1200 words) with multiple sections. Return ONLY the JSON object, no other text.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        // Clean and parse the JSON response
        const cleanedText = this.cleanJsonResponse(text);
        const structuredContent = JSON.parse(cleanedText);
        return structuredContent;
      } catch (parseError) {
        console.warn(
          'Failed to parse structured content as JSON, using fallback structure',
        );
        // Return a basic structured format if AI doesn't return valid JSON
        return this.generateFallbackStructuredContent(
          title,
          description,
          keyPoints,
        );
      }
    } catch (error) {
      console.error('Error generating rich content body:', error);
      return this.generateFallbackStructuredContent(
        title,
        description,
        keyPoints,
      );
    }
  }

  /**
   * Clean AI response text to extract valid JSON
   */
  private cleanJsonResponse(text: string): string {
    // Remove any markdown code blocks
    let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Remove any leading/trailing text that isn't JSON
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}') + 1;

    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd);
    }

    return cleaned.trim();
  }

  private generateFallbackStructuredContent(
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
      wordCount: 400,
      readingTime: '2 min read',
      summary: `A comprehensive guide covering the essential aspects of ${title.toLowerCase()}.`,
    };
  }

  // Add method for generating AI suggestions
  async generateAISuggestions(
    title: string,
    description: string,
    type: string,
    platform: string[],
  ): Promise<any> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });

      const prompt = `As an AI content optimization expert, analyze this content and provide comprehensive suggestions.

Title: ${title}
Description: ${description}
Type: ${type}
Platforms: ${platform.join(', ')}

Return ONLY a valid JSON object with suggestions. No additional text or explanations.

{
  "title": "Improved title suggestion",
  "description": "Enhanced description suggestion", 
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "improvements": ["improvement1", "improvement2", "improvement3", "improvement4"],
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "optimalPostingTimes": ["2025-01-20T10:00:00Z", "2025-01-20T15:00:00Z", "2025-01-20T19:00:00Z"],
  "estimatedReach": 5000,
  "competitorAnalysis": ["insight1", "insight2", "insight3"]
}

Focus on making suggestions that will increase engagement, reach, and overall content performance. Return ONLY the JSON object.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        const cleanedText = this.cleanJsonResponse(text);
        return JSON.parse(cleanedText);
      } catch (parseError) {
        console.warn(
          'Failed to parse AI suggestions as JSON, using default values',
        );
        return {
          title: `Enhanced: ${title}`,
          description: `Optimized: ${description}`,
          keywords: [
            'content',
            'engagement',
            'marketing',
            'strategy',
            'growth',
          ],
          improvements: [
            'Add more engaging visuals',
            'Include interactive elements',
            'Optimize for mobile viewing',
            'Add compelling call-to-action',
          ],
          hashtags: [
            '#content',
            '#marketing',
            '#strategy',
            '#growth',
            '#engagement',
          ],
          estimatedReach: 2500,
          competitorAnalysis: [
            'Analyze competitor content strategy',
            'Study trending topics in your niche',
          ],
        };
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      return null;
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
