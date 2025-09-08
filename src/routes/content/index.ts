import { Router, Response } from 'express';
import asyncHandler from '../../helpers/asyncHandler';
import { ProtectedRequest } from '../../types/app-request';
import { BadRequestError, NotFoundError } from '../../core/ApiError';
import { SuccessResponse } from '../../core/ApiResponse';
import ContentRepo from '../../database/repository/ContentRepo';
import { Types } from 'mongoose';
import validator from '../../helpers/validator';
import schema from './schema';
import authentication from '../../auth/authentication';
import { ContentService } from '../../services/content.service';
import Content from '../../database/model/content';
import RAGService from '../../services/RAG-service';
import { ContentCalendarService } from '../../services/content-calendar.service';
import aiSuggestRouter from './ai-suggest';
import { UserCache } from '../../cache/repository/UserCache';
import { PlatformPublishingService } from '../../services/platform-publishing.service';

const router = Router();

const contentService = new ContentService();
const contentCalendarService = new ContentCalendarService();
const platformPublishingService = new PlatformPublishingService();

router.use(authentication);

router.use('/ai-suggest', aiSuggestRouter);

// Normalize stats from engagement when stats are empty/zero
function normalizeStatsForResponse(content: any) {
  const e = content?.engagement || {};
  const s = content?.stats || {};
  const hasEngagement = e.likes || e.comments || e.shares || e.views;
  const statsZero =
    !s ||
    ((s.views || 0) === 0 &&
      (s.engagement || 0) === 0 &&
      (s.shares || 0) === 0 &&
      (s.saves || 0) === 0 &&
      (s.clicks || 0) === 0);
  if (hasEngagement && statsZero) {
    const derived = {
      views: e.views || 0,
      engagement: (e.likes || 0) + (e.comments || 0) + (e.shares || 0),
      shares: e.shares || 0,
      saves: s.saves || 0,
      clicks: s.clicks || 0,
    };
    return { ...content, stats: derived };
  }
  return content;
}

router.post(
  '/',
  validator(schema.create),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const {
      title,
      description,
      type,
      platform,
      tags,
      scheduling,
      scheduledDate,
      publish,
    } = req.body;

    // Generate comprehensive content ideas if not provided
    let contentIdeas: any[] = [];
    let primaryContent = description;
    let selectedIdea = null;

    if (!description) {
      console.log('No description provided, generating content ideas...');
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
        console.log('Using generated description from first content idea');
      } else {
        // Final fallback if no ideas were generated
        primaryContent = `Comprehensive guide about ${title}`;
        console.log('Using fallback description');
      }
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
        // Include priority from form for calendar event
        priority: req.body.priority || 'medium',
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
      aiGenerated: !description, // True if we generated the content
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
        console.log('Creating calendar events for scheduled content...');
        calendarEvents =
          await contentCalendarService.createCalendarEventsForContent(
            content,
            contentScheduling,
            req.user._id,
          );
        console.log(`Created ${calendarEvents.length} calendar events`);
      } catch (error) {
        console.error('Failed to create calendar events:', error);
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
    };

    // 🔄 **CACHE INVALIDATION**: Clear user content cache after creating new content
    await UserCache.invalidateUserContent(req.user._id);

    new SuccessResponse('Content created successfully', responseData).send(res);
  }),
);

router.get(
  '/',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    // 🚀 **CACHING LAYER**: Check cache first for user's content
    const cachedContent = await UserCache.getUserContent(req.user._id);
    if (cachedContent) {
      const normalized = cachedContent.map((c) => normalizeStatsForResponse(c));
      new SuccessResponse('Contents retrieved successfully (cached)', {
        total: normalized.length,
        contents: normalized,
        cached: true,
      }).send(res);
      return;
    }

    // Cache miss - fetch from database
    const contents = await ContentRepo.findByUserId(req.user._id);
    const normalized = contents.map((c) => normalizeStatsForResponse(c));
    const total = normalized.length;

    // 🔄 **CACHE STORAGE**: Store result
    await UserCache.setUserContent(req.user._id, normalized as any);

    new SuccessResponse('Contents retrieved successfully', {
      total,
      contents: normalized,
      cached: false,
    }).send(res);
  }),
);

router.get(
  '/tags',
  validator(schema.tags),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const contents = await ContentRepo.findByTags(req.body.tags);
    new SuccessResponse('Contents retrieved successfully', contents).send(res);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );

    if (!content) throw new NotFoundError('Content not found');

    // Get engagement metrics
    const recompute = req.query.recompute === 'true';
    if (recompute) {
      const analysis = await contentService.analyzeEngagement(content._id);
      (content as any).analysis = analysis;
    }

    const normalized = normalizeStatsForResponse(content);
    new SuccessResponse('Content retrieved successfully', normalized).send(res);
  }),
);

router.get(
  '/user/:userId',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = new Types.ObjectId(req.params.userId);

    // 🚀 **CACHING LAYER**: Check cache first for user's content
    const cachedContent = await UserCache.getUserContent(userId);
    if (cachedContent) {
      const normalized = cachedContent.map((c) => normalizeStatsForResponse(c));
      new SuccessResponse('Contents retrieved successfully (cached)', {
        totalContents: normalized.length,
        contents: normalized,
        cached: true,
      }).send(res);
      return;
    }

    // Cache miss - fetch from database
    const contents = await ContentRepo.findByUserId(userId);
    const normalized = contents.map((c) => normalizeStatsForResponse(c));
    const totalContents = normalized.length;

    // 🔄 **CACHE STORAGE**: Store result
    await UserCache.setUserContent(userId, normalized as any);

    new SuccessResponse('Contents retrieved successfully', {
      totalContents,
      contents: normalized,
      cached: false,
    }).send(res);
  }),
);

router.get(
  '/user/:userId/:platform',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const userId = new Types.ObjectId(req.params.userId);
    const platform = req.params.platform;

    const userPlatformContents = await ContentRepo.findUserPlatform(
      userId,
      platform,
    );
    const total = userPlatformContents.length;

    new SuccessResponse('Contents retrieved successfully', {
      total,
      userPlatformContents,
    }).send(res);
  }),
);

router.get(
  '/type/:type',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const contents = await ContentRepo.findByType(
      req.params.type as Content['type'],
    );
    new SuccessResponse('Contents retrieved successfully', contents).send(res);
  }),
);

router.get(
  '/platform/:platform',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const contents = await ContentRepo.findByPlatform(req.params.platform);
    const totalContents = contents.length;
    if (contents.length === 0) throw new NotFoundError('Contents not found');
    new SuccessResponse('Contents retrieved successfully', {
      contents,
      totalContents,
    }).send(res);
  }),
);

router.put(
  '/:id',
  validator(schema.update),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );

    if (!content) throw new NotFoundError('Content not found');

    // Compare the _id from the populated user object
    if (content.userId._id.toString() !== req.user._id.toString())
      throw new BadRequestError('Not authorized to update this content');

    const { title, description, type, platform, tags, priority } = req.body;

    // Optimize content for each platform if description is updated
    let optimizedContent;
    if (description) {
      optimizedContent = await Promise.all(
        platform.map(async (p: string) => {
          return contentService.optimizeContent(description, p);
        }),
      );
    }

    const updatedContent = await ContentRepo.update({
      ...content,
      metadata: {
        ...content.metadata,
        title: title || content.metadata.title,
        description: description || content.metadata.description,
        type: type || content.metadata.type,
        platform: platform || content.metadata.platform,
        tags: tags || content.metadata.tags,
      },
      title: title || content.title,
      description: description || content.description,
      type: type || content.type,
      platform: platform || content.platform,
      tags: tags || content.tags,
    } as any);

    // 🔄 UPDATE CALENDAR EVENTS IF PRIORITY CHANGED
    let calendarEventsUpdated = 0;
    if (priority) {
      try {
        const CalendarRepo = (
          await import('../../database/repository/CalendarRepo')
        ).default;

        // Find calendar events for this content
        const calendarEvents = await CalendarRepo.findByContentId(content._id);

        // Update priority for each calendar event
        const updatePromises = calendarEvents.map((event) =>
          CalendarRepo.update({
            ...event,
            priority: priority as any,
          }),
        );

        await Promise.all(updatePromises);
        calendarEventsUpdated = calendarEvents.length;
        console.log(
          `Updated priority for ${calendarEventsUpdated} calendar events`,
        );
      } catch (error) {
        console.error('Failed to update calendar event priorities:', error);
        // Don't fail the content update if calendar update fails
      }
    }

    const responseData = {
      content: updatedContent,
      optimizedContent,
      ...(priority && {
        priorityUpdate: {
          newPriority: priority,
          calendarEventsUpdated,
        },
      }),
    };

    new SuccessResponse('Content updated successfully', responseData).send(res);
  }),
);

router.put(
  '/:id/status',
  validator(schema.status),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    if (!content) throw new NotFoundError('Content not found');
    if (content.userId._id.toString() !== req.user._id.toString())
      throw new BadRequestError('Not authorized to update this content');

    await ContentRepo.updateStatus(
      content._id,
      req.body.status as Content['status'],
    );
    new SuccessResponse('Content status updated successfully', null).send(res);
  }),
);

router.put(
  '/:id/archive',
  validator(schema.archive),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { reason, preserveCalendarEvents } = req.body;

    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    if (!content) throw new NotFoundError('Content not found');
    if (content.userId._id.toString() !== req.user._id.toString())
      throw new BadRequestError('Not authorized to archive this content');

    if (content.status === 'archived') {
      throw new BadRequestError('Content is already archived');
    }

    // Store the previous status for potential unarchiving
    const previousStatus = content.status;
    const archivedAt = new Date();

    // Update content status to archived
    const updatedContent = await ContentRepo.update({
      ...content,
      metadata: {
        ...content.metadata,
        status: 'archived',
        previousStatus, // Store for unarchiving
        archivedAt,
        archiveReason: reason,
      },
      status: 'archived',
    } as any);

    // 🗂️ HANDLE CALENDAR EVENTS
    let calendarEventsAction = 'none';
    let calendarEventsCount = 0;

    try {
      const CalendarRepo = (
        await import('../../database/repository/CalendarRepo')
      ).default;

      // Find calendar events for this content
      const calendarEvents = await CalendarRepo.findByContentId(content._id);
      calendarEventsCount = calendarEvents.length;

      if (calendarEventsCount > 0) {
        if (preserveCalendarEvents) {
          // Update calendar events to archived status instead of deleting
          const updatePromises = calendarEvents.map((event) =>
            CalendarRepo.update({
              ...event,
              status: 'cancelled' as any,
              notes: `Content archived: ${reason || 'No reason provided'}`,
            }),
          );
          await Promise.all(updatePromises);
          calendarEventsAction = 'preserved';
          console.log(
            `Marked ${calendarEventsCount} calendar events as cancelled`,
          );
        } else {
          // Remove calendar events for archived content
          await CalendarRepo.removeByContentId(content._id);
          calendarEventsAction = 'removed';
          console.log(`Removed ${calendarEventsCount} calendar events`);
        }
      }
    } catch (error) {
      console.error(
        'Failed to handle calendar events during archiving:',
        error,
      );
      // Don't fail the archive operation if calendar update fails
    }

    const responseData = {
      content: updatedContent,
      archiveInfo: {
        previousStatus,
        archivedAt,
        reason: reason || null,
        calendarEvents: {
          action: calendarEventsAction,
          count: calendarEventsCount,
          preserved: preserveCalendarEvents,
        },
      },
    };

    new SuccessResponse('Content archived successfully', responseData).send(
      res,
    );
  }),
);

router.put(
  '/:id/unarchive',
  validator(schema.unarchive),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { restoreStatus, restoreCalendarEvents } = req.body;

    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    if (!content) throw new NotFoundError('Content not found');
    if (content.userId._id.toString() !== req.user._id.toString())
      throw new BadRequestError('Not authorized to unarchive this content');

    if (content.status !== 'archived') {
      throw new BadRequestError('Content is not archived');
    }

    // Determine status to restore to
    const statusToRestore =
      restoreStatus || (content.metadata as any)?.previousStatus || 'draft';
    const unarchivedAt = new Date();

    // Update content status
    const updatedContent = await ContentRepo.update({
      ...content,
      metadata: {
        ...content.metadata,
        status: statusToRestore,
        unarchivedAt,
        // Clear archive-related fields
        previousStatus: undefined,
        archivedAt: undefined,
        archiveReason: undefined,
      },
      status: statusToRestore,
    } as any);

    // 📅 RESTORE CALENDAR EVENTS IF NEEDED
    let calendarEventsAction = 'none';
    let calendarEventsCount = 0;

    if (restoreCalendarEvents && statusToRestore === 'scheduled') {
      try {
        // Check if content has scheduling information to restore calendar events
        const hasScheduling =
          content.metadata?.scheduledDate ||
          (content.metadata as any)?.schedulingDetails;

        if (hasScheduling) {
          console.log(
            'Attempting to restore calendar events for unarchived content...',
          );

          // Create new calendar events if content is being restored to scheduled status
          let schedulingInfo = (content.metadata as any)?.schedulingDetails;
          if (!schedulingInfo && content.metadata?.scheduledDate) {
            // Convert legacy scheduling to new format
            schedulingInfo = {
              startDate: new Date(content.metadata.scheduledDate),
              endDate: new Date(
                new Date(content.metadata.scheduledDate).getTime() +
                  30 * 60 * 1000,
              ),
              timezone: 'UTC',
              autoPublish: false,
              priority: 'medium',
            };
          }

          if (schedulingInfo) {
            const calendarEvents =
              await contentCalendarService.createCalendarEventsForContent(
                updatedContent,
                schedulingInfo,
                req.user._id,
              );
            calendarEventsCount = calendarEvents.length;
            calendarEventsAction = 'restored';
            console.log(`Created ${calendarEventsCount} new calendar events`);
          }
        }
      } catch (error) {
        console.error(
          'Failed to restore calendar events during unarchiving:',
          error,
        );
        // Don't fail the unarchive operation if calendar restoration fails
      }
    }

    const responseData = {
      content: updatedContent,
      unarchiveInfo: {
        restoredStatus: statusToRestore,
        unarchivedAt,
        calendarEvents: {
          action: calendarEventsAction,
          count: calendarEventsCount,
          attempted: restoreCalendarEvents,
        },
      },
    };

    new SuccessResponse('Content unarchived successfully', responseData).send(
      res,
    );
  }),
);

router.put(
  '/:id/priority',
  validator(schema.priority),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { priority } = req.body;

    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    if (!content) throw new NotFoundError('Content not found');
    if (content.userId._id.toString() !== req.user._id.toString())
      throw new BadRequestError(
        'Not authorized to update this content priority',
      );

    // 🔄 UPDATE CALENDAR EVENTS PRIORITY
    let calendarEventsUpdated = 0;
    try {
      console.log('Updating calendar event priorities...');
      const CalendarRepo = (
        await import('../../database/repository/CalendarRepo')
      ).default;

      // Find calendar events for this content
      const calendarEvents = await CalendarRepo.findByContentId(content._id);

      // Update priority for each calendar event
      const updatePromises = calendarEvents.map((event) =>
        CalendarRepo.update({
          ...event,
          priority: priority as any,
        }),
      );

      await Promise.all(updatePromises);
      calendarEventsUpdated = calendarEvents.length;
      console.log(
        `Updated priority for ${calendarEventsUpdated} calendar events`,
      );
    } catch (error) {
      console.error('Failed to update calendar event priorities:', error);
      // Continue even if calendar update fails
    }

    const responseData = {
      contentId: content._id,
      newPriority: priority,
      calendarEventsUpdated,
      message: `Priority updated to ${priority}${
        calendarEventsUpdated > 0
          ? ` and synced to ${calendarEventsUpdated} calendar events`
          : ''
      }`,
    };

    new SuccessResponse(
      'Content priority updated successfully',
      responseData,
    ).send(res);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    console.log('content.userId', content?.userId._id.toString());
    console.log('req.user._id', req.user._id.toString());
    if (!content) throw new NotFoundError('Content not found');
    if (content.userId._id.toString() !== req.user._id.toString())
      throw new BadRequestError('Not authorized to delete this content');

    await ContentRepo.remove(new Types.ObjectId(req.params.id));

    // 🔄 **CACHE INVALIDATION**: Clear user content cache after deleting content
    await UserCache.invalidateUserContent(req.user._id);

    new SuccessResponse('Content deleted successfully', null).send(res);
  }),
);

router.get(
  '/:id/similar',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    if (!content) throw new NotFoundError('Content not found');

    const similarContent = await RAGService.findSimilarContent(content);
    new SuccessResponse(
      'Similar content retrieved successfully',
      similarContent,
    ).send(res);
  }),
);

router.get(
  '/recommendations',
  validator(schema.recommendations),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { platform, contentType, limit } = req.query;
    const recommendations = await RAGService.getContentRecommendations(
      platform as string,
      contentType as string,
      Number(limit) || 5,
    );
    new SuccessResponse(
      'Content recommendations retrieved successfully',
      recommendations,
    ).send(res);
  }),
);

router.get(
  '/patterns',
  validator(schema.patterns),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { platform, contentType } = req.query;
    const patterns = await RAGService.analyzeContentPatterns(
      platform as string,
      contentType as string,
    );
    new SuccessResponse(
      'Content patterns analyzed successfully',
      patterns,
    ).send(res);
  }),
);

router.post(
  '/:id/publish',
  validator(schema.id),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    if (!content) throw new NotFoundError('Content not found');
    if (content.userId._id.toString() !== req.user._id.toString())
      throw new BadRequestError('Not authorized to publish this content');

    const updatedContent = await ContentRepo.update({
      ...content,
      metadata: {
        ...content.metadata,
        status: 'published',
        publishedDate: new Date(),
      },
      status: 'published',
    } as any);

    new SuccessResponse('Content published successfully', updatedContent).send(
      res,
    );
  }),
);

router.post(
  '/:id/unpublish',
  validator(schema.id),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    if (!content) throw new NotFoundError('Content not found');
    if (content.userId._id.toString() !== req.user._id.toString())
      throw new BadRequestError('Not authorized to unpublish this content');

    const updatedContent = await ContentRepo.update({
      ...content,
      metadata: {
        ...content.metadata,
        status: 'draft',
      },
      status: 'draft',
    } as any);

    new SuccessResponse(
      'Content unpublished successfully',
      updatedContent,
    ).send(res);
  }),
);

router.post(
  '/:id/schedule',
  validator(schema.id),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { scheduledDate } = req.body;
    if (!scheduledDate) throw new BadRequestError('Scheduled date is required');

    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    if (!content) throw new NotFoundError('Content not found');
    if (content.userId._id.toString() !== req.user._id.toString())
      throw new BadRequestError('Not authorized to schedule this content');

    const updatedContent = await ContentRepo.update({
      ...content,
      metadata: {
        ...content.metadata,
        status: 'scheduled',
        scheduledDate: new Date(scheduledDate),
      },
      status: 'scheduled',
    } as any);

    new SuccessResponse('Content scheduled successfully', updatedContent).send(
      res,
    );
  }),
);

router.put(
  '/:id/schedule',
  validator(schema.updateSchedule),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { scheduling, scheduledDate, priority } = req.body;

    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    if (!content) throw new NotFoundError('Content not found');
    if (content.userId._id.toString() !== req.user._id.toString())
      throw new BadRequestError(
        'Not authorized to update this content schedule',
      );

    // Determine new scheduling info (enhanced scheduling or legacy scheduledDate)
    let newScheduling = null;
    if (scheduling?.startDate) {
      // Enhanced scheduling format
      newScheduling = scheduling;
    } else if (scheduledDate) {
      // Legacy scheduling - convert to enhanced format
      newScheduling = {
        startDate: new Date(scheduledDate),
        endDate: new Date(new Date(scheduledDate).getTime() + 30 * 60 * 1000), // 30 minutes default
        timezone: 'UTC',
        autoPublish: false,
        priority: priority || 'medium',
      };
    } else {
      throw new BadRequestError(
        'Either scheduling object or scheduledDate is required',
      );
    }

    // Update content with new scheduling information
    const updatedContent = await ContentRepo.update({
      ...content,
      metadata: {
        ...content.metadata,
        status: 'scheduled',
        scheduledDate: newScheduling.startDate,
        schedulingDetails: newScheduling,
      },
      status: 'scheduled',
      scheduling: {
        timezone: newScheduling.timezone || 'UTC',
        optimalTimes: newScheduling.aiOptimization?.useOptimalTimes
          ? []
          : undefined,
        frequency: newScheduling.recurrence?.frequency || 'once',
      },
    } as any);

    // 🔄 UPDATE CALENDAR EVENTS
    let calendarEvents: any[] = [];
    try {
      console.log('Updating calendar events for rescheduled content...');

      // Remove existing calendar events for this content
      const CalendarRepo = (
        await import('../../database/repository/CalendarRepo')
      ).default;
      await CalendarRepo.removeByContentId(content._id);
      console.log('Removed existing calendar events');

      // Create new calendar events with updated schedule
      calendarEvents =
        await contentCalendarService.createCalendarEventsForContent(
          updatedContent,
          newScheduling,
          req.user._id,
        );
      console.log(`Created ${calendarEvents.length} new calendar events`);
    } catch (error) {
      console.error('Failed to update calendar events:', error);
      // Don't fail the schedule update if calendar update fails
    }

    const responseData = {
      content: updatedContent,
      calendarEvents,
      scheduling: {
        isScheduled: true,
        schedulingDetails: newScheduling,
        calendarEventsUpdated: calendarEvents.length,
        previousSchedule: content.metadata?.scheduledDate,
      },
    };

    new SuccessResponse(
      'Content schedule updated successfully',
      responseData,
    ).send(res);
  }),
);

router.post(
  '/:id/duplicate',
  validator(schema.id),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    if (!content) throw new NotFoundError('Content not found');
    if (content.userId._id.toString() !== req.user._id.toString())
      throw new BadRequestError('Not authorized to duplicate this content');

    const duplicatedContent = await ContentRepo.create({
      userId: req.user._id,
      metadata: {
        ...content.metadata,
        title: `${content.metadata.title} (Copy)`,
        status: 'draft',
      },
      title: `${content.title} (Copy)`,
      description: content.description,
      type: content.type,
      status: 'draft',
      platform: content.platform,
      tags: content.tags,
    } as any);

    new SuccessResponse(
      'Content duplicated successfully',
      duplicatedContent,
    ).send(res);
  }),
);

router.get(
  '/:id/versions',
  validator(schema.id),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    if (!content) throw new NotFoundError('Content not found');
    if (content.userId._id.toString() !== req.user._id.toString())
      throw new BadRequestError(
        'Not authorized to view versions of this content',
      );

    // Get version history from RAG service
    const versions = await RAGService.getContentVersions(content._id);
    new SuccessResponse(
      'Content versions retrieved successfully',
      versions,
    ).send(res);
  }),
);

router.get(
  '/:id/analytics',
  validator(schema.id),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    if (!content) throw new NotFoundError('Content not found');
    if (content.userId._id.toString() !== req.user._id.toString())
      throw new BadRequestError(
        'Not authorized to view analytics of this content',
      );

    // Get analytics from content service
    const analytics = await contentService.getContentAnalytics(content._id);
    new SuccessResponse(
      'Content analytics retrieved successfully',
      analytics,
    ).send(res);
  }),
);

export default router;
