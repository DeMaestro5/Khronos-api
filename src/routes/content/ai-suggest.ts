import { Router, Response } from 'express';
import validator from '../../helpers/validator';
import schema from './schema';
import asyncHandler from '../../helpers/asyncHandler';
import { ProtectedRequest } from '../../types/app-request';
import { ContentService } from '../../services/content.service';
import { ContentCalendarService } from '../../services/content-calendar.service';
import Content from '../../database/model/content';
import ContentRepo from '../../database/repository/ContentRepo';
import RAGService from '../../services/RAG-service';
import { SuccessResponse } from '../../core/ApiResponse';
import { PlatformPublishingService } from '../../services/platform-publishing.service';

const router = Router({ mergeParams: true });

const contentService = new ContentService();
const contentCalendarService = new ContentCalendarService();
const platformPublishingService = new PlatformPublishingService();

router.post(
  '/create',
  validator(schema.createFromAI),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const {
      title,
      type = 'article',
      platform = ['linkedin', 'medium'],
      tags = [],
      scheduling,
      scheduledDate,
      priority = 'medium',
      publish,
    } = req.body;

    console.log('🚀 Creating content from AI suggestion:', {
      title,
      type,
      platform,
    });

    // Use the same logic as manual content creation but with AI-generated content
    let contentIdeas: any[] = [];
    let primaryContent = '';
    let selectedIdea = null;

    // Generate comprehensive content ideas based on the title
    console.log('Generating content ideas for AI suggestion...');
    const rawIdeas = await contentService.generateContentIdeas(
      title,
      type as Content['type'],
    );
    contentIdeas = await contentService.parseContentIdeas(
      rawIdeas,
      title,
      type,
    );

    // Use the first generated idea for primary content
    if (contentIdeas.length > 0) {
      selectedIdea = contentIdeas[0];
      primaryContent = selectedIdea.description;
      console.log('Using generated description from AI content idea');
    } else {
      // Fallback if no ideas were generated
      primaryContent = `Comprehensive guide about ${title}`;
      console.log('Using fallback description for AI content');
    }

    // Generate rich HTML content body
    const bodyContent = await contentService.generateRichContentBody(
      title,
      primaryContent,
      type as Content['type'],
      selectedIdea?.keyPoints,
    );

    // Generate AI suggestions for optimization
    const aiSuggestions = await contentService.generateAISuggestions(
      title,
      primaryContent,
      type as Content['type'],
      platform,
    );

    // Get platform information with icons and colors
    const platformsInfo = await contentService.getPlatformInformation(platform);

    // Optimize content for each platform
    const optimizedContent: Record<string, string> = {};
    for (const p of platform) {
      try {
        optimizedContent[p] = await contentService.optimizeContent(
          primaryContent,
          p,
        );
      } catch (error) {
        console.warn(`Failed to optimize content for ${p}:`, error);
        optimizedContent[p] = primaryContent;
      }
    }

    // Create author information from user data
    const authorInfo = {
      id: req.user._id.toString(),
      name: req.user.name || 'Content Creator',
      avatar:
        req.user.profilePicUrl ||
        `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face`,
      role: req.user.role === 'ADMIN' ? 'Administrator' : 'Content Creator',
    };

    // Determine scheduling info (new enhanced scheduling or legacy scheduledDate)
    let contentScheduling = null;
    let contentStatus = 'draft';

    if (scheduling?.startDate) {
      // New enhanced scheduling
      contentScheduling = scheduling;
      contentStatus = 'scheduled';
    } else if (scheduledDate) {
      // Legacy scheduling - convert to new format
      contentScheduling = {
        startDate: new Date(scheduledDate),
        endDate: new Date(new Date(scheduledDate).getTime() + 30 * 60 * 1000), // 30 minutes default
        timezone: 'UTC',
        autoPublish: false,
        priority: priority,
      };
      contentStatus = 'scheduled';
    }

    // Generate comprehensive content object
    const content = await ContentRepo.create({
      userId: req.user._id,
      metadata: {
        title,
        description: primaryContent,
        type,
        status: contentStatus,
        platform,
        tags: tags || [],
        category: selectedIdea?.targetAudience || 'General',
        language: 'en',
        targetAudience: [selectedIdea?.targetAudience || 'General audience'],
        contentPillars: (tags || []).slice(0, 3),
        // Store scheduling info in metadata
        ...(contentScheduling && {
          scheduledDate: contentScheduling.startDate,
          schedulingDetails: contentScheduling,
        }),
        // Mark as AI-generated
        aiGenerated: true,
        generatedFrom: 'ai_suggestion',
      },
      title,
      description: primaryContent,
      excerpt:
        selectedIdea?.excerpt || primaryContent.substring(0, 150) + '...',
      body: bodyContent,
      type,
      status: contentStatus,
      platform,
      tags: tags || [],
      platforms: platformsInfo,
      author: authorInfo,
      stats: {
        views: 0,
        engagement: 0,
        shares: 0,
        saves: 0,
        clicks: 0,
      },
      aiSuggestions,
      aiGenerated: true, // Mark as AI-generated
      contentIdeas: (contentIdeas || []).slice(0, 5), // Store top 5 ideas
      optimizedContent,
      engagement: {
        likes: 0,
        shares: 0,
        comments: 0,
        views: 0,
        saves: 0,
        clicks: 0,
      },
      seo: {
        metaTitle: title,
        metaDescription: primaryContent.substring(0, 160),
        keywords: aiSuggestions?.keywords || tags,
        canonicalUrl: `https://yourapp.com/content/${title
          .toLowerCase()
          .replace(/\s+/g, '-')}`,
      },
      scheduling: {
        timezone: contentScheduling?.timezone || 'UTC',
        optimalTimes: aiSuggestions?.optimalPostingTimes || [],
        frequency: contentScheduling?.recurrence?.frequency || 'once',
        ...(contentScheduling && { details: contentScheduling }),
      },
      analytics: {
        impressions: 0,
        reach: 0,
        clickThroughRate: 0,
        conversionRate: 0,
        engagementRate: 0,
      },
    } as any);

    // Optional immediate cross-platform publishing
    let publishingResults: any = undefined;
    let platformPostIds: Record<string, string> | undefined = undefined;
    if (publish?.enabled) {
      try {
        const supportedPlatforms = [
          'youtube',
          'instagram',
          'facebook',
          'twitter',
          'linkedin',
          'tiktok',
        ];
        const targetPlatforms = (publish.platforms || platform).filter(
          (p: string) => supportedPlatforms.includes(p),
        );
        if (targetPlatforms.length > 0) {
          const contentData = {
            title,
            description: primaryContent,
            mediaUrl: publish.mediaUrl,
            mediaType: publish.mediaType,
            linkUrl: publish.linkUrl,
            tags,
          } as any;
          const { results, platformPostIds: ids } =
            await platformPublishingService.publishToMultiplePlatforms(
              req.user._id,
              targetPlatforms as any,
              contentData,
            );
          publishingResults = results;
          platformPostIds = ids;
          if (platformPostIds && Object.keys(platformPostIds).length > 0) {
            await ContentRepo.update({
              ...content,
              platformPostIds,
            } as any);
            (content as any).platformPostIds = platformPostIds;
          }
        }
      } catch (error) {
        console.error('Publishing failed:', error);
      }
    }

    // 🚀 AUTOMATIC CALENDAR EVENT CREATION
    let calendarEvents: any[] = [];
    if (contentScheduling) {
      try {
        console.log(
          'Creating calendar events for AI-generated scheduled content...',
        );
        calendarEvents =
          await contentCalendarService.createCalendarEventsForContent(
            content,
            contentScheduling,
            req.user._id,
          );
        console.log(
          `Created ${calendarEvents.length} calendar events for AI content`,
        );
      } catch (error) {
        console.error(
          'Failed to create calendar events for AI content:',
          error,
        );
        // Don't fail the content creation if calendar creation fails
      }
    }

    // Initialize RAG service with the new content
    await RAGService.initializeWithContent(content);

    // Create comprehensive response
    const responseData = {
      content,
      ...(platformPostIds && { platformPostIds }),
      ...(publishingResults && { publishing: { results: publishingResults } }),
      calendarEvents, // Include created calendar events in response
      contentIdeas: (contentIdeas || []).length > 0 ? contentIdeas : undefined,
      optimizedContent:
        Object.keys(optimizedContent).length > 0 ? optimizedContent : undefined,
      aiSuggestions,
      platforms: platformsInfo,
      author: authorInfo,
      recommendations: (contentIdeas || []).slice(1, 4), // Next 3 ideas as recommendations
      insights: {
        estimatedReach:
          aiSuggestions?.estimatedReach ||
          Math.floor(Math.random() * 5000) + 1000,
        difficulty: selectedIdea?.difficulty || 'moderate',
        timeToCreate: selectedIdea?.timeToCreate || '2-3 hours',
        trendingScore:
          selectedIdea?.trendingScore || Math.floor(Math.random() * 10) + 1,
      },
      scheduling: contentScheduling
        ? {
            isScheduled: true,
            schedulingDetails: contentScheduling,
            calendarEventsCreated: calendarEvents.length,
          }
        : {
            isScheduled: false,
          },
      aiGenerated: true, // Indicate this was created from AI suggestion
    };

    console.log('✅ Content created successfully from AI suggestion');

    new SuccessResponse(
      'Content created successfully from AI suggestion',
      responseData,
    ).send(res);
  }),
);

router.get(
  '/feed',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { limit = 10, category, refresh } = req.query;

    console.log('📋 AI Suggestions Feed request:', {
      limit,
      category,
      refresh,
    });

    try {
      // Generate real content ideas for different topics
      const topics = [
        'trending technology topics',
        'social media marketing strategies',
        'business productivity tips',
        'content creation techniques',
        'digital marketing trends',
      ];

      const allSuggestions = [];

      // Generate content ideas for each topic
      for (const topic of topics.slice(
        0,
        Math.ceil(parseInt(limit as string) / topics.length),
      )) {
        try {
          const rawIdeas = await contentService.generateContentIdeas(
            topic,
            'article' as Content['type'],
          );

          const contentIdeas = await contentService.parseContentIdeas(
            rawIdeas,
            topic,
            'article',
          );

          // Add the first few ideas from each topic
          const topIdeas = contentIdeas
            .slice(0, 2)
            .map((idea: any, index: number) => ({
              id: `ai-${Date.now()}-${index}`,
              title: idea.title,
              category: category || 'General',
              timestamp: new Date().toISOString(),
            }));

          allSuggestions.push(...topIdeas);
        } catch (error) {
          console.warn(`Failed to generate ideas for topic: ${topic}`, error);
        }
      }

      // Limit to requested number
      const suggestions = allSuggestions.slice(0, parseInt(limit as string));

      console.log('✅ Real AI Suggestions Feed generated successfully');

      new SuccessResponse('AI suggestions feed retrieved successfully', {
        suggestions,
        metadata: {
          total: suggestions.length,
          canLoadMore: suggestions.length >= parseInt(limit as string),
          lastUpdated: new Date().toISOString(),
          source: 'real_ai_generation',
        },
      }).send(res);
    } catch (error) {
      console.error('❌ Error in AI suggestions feed:', error);

      // Simple fallback suggestions with just titles
      const fallbackSuggestions = [
        {
          id: 'fallback-1',
          title: 'Top AI Tools for Content Creators in 2025',
          category: 'Technology',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'fallback-2',
          title: 'Social Media Trends to Watch This Week',
          category: 'Social Media',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'fallback-3',
          title: 'Productivity Hacks for Remote Teams',
          category: 'Business',
          timestamp: new Date().toISOString(),
        },
      ];

      new SuccessResponse('AI suggestions feed retrieved (fallback)', {
        suggestions: fallbackSuggestions,
        metadata: {
          total: fallbackSuggestions.length,
          canLoadMore: false,
          lastUpdated: new Date().toISOString(),
          isFallback: true,
        },
      }).send(res);
    }
  }),
);

router.get(
  '/form-fill',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { category, seed } = req.query;

    console.log('✨ AI Form Fill request:', { category, seed });

    try {
      // Generate a real content idea using the content service
      const rawIdeas = await contentService.generateContentIdeas(
        `Content about ${category || 'general topics'}`,
        'article' as Content['type'],
      );

      const contentIdeas = await contentService.parseContentIdeas(
        rawIdeas,
        `Content about ${category || 'general topics'}`,
        'article',
      );

      if (contentIdeas.length === 0) {
        throw new Error('No content ideas generated');
      }

      const suggestion = contentIdeas[0];

      console.log('✅ Real form fill suggestion generated successfully');

      new SuccessResponse('Form fill suggestion generated successfully', {
        id: `suggestion-${Date.now()}`,
        title: suggestion.title,
        category: category || 'General',
        timestamp: new Date().toISOString(),
      }).send(res);
    } catch (error) {
      console.error('❌ Error in form fill suggestion:', error);

      // Simple fallback with just a title
      new SuccessResponse('Form fill suggestion generated (fallback)', {
        id: `fallback-${Date.now()}`,
        title: 'Content Marketing Best Practices for 2025',
        category: category || 'Marketing',
        timestamp: new Date().toISOString(),
      }).send(res);
    }
  }),
);
export default router;
