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

const router = Router();
const contentService = new ContentService();

router.use(authentication);

router.post(
  '/',
  validator(schema.create),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { title, description, type, platform, tags } = req.body;

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

    // Generate comprehensive content object
    const content = await ContentRepo.create({
      userId: req.user._id,
      metadata: {
        title,
        description: primaryContent,
        type,
        status: 'draft',
        platform,
        tags,
        category: selectedIdea?.targetAudience || 'General',
        language: 'en',
        targetAudience: [selectedIdea?.targetAudience || 'General audience'],
        contentPillars: tags.slice(0, 3),
      },
      title,
      description: primaryContent,
      excerpt:
        selectedIdea?.excerpt || primaryContent.substring(0, 150) + '...',
      body: bodyContent,
      type,
      status: 'draft',
      platform,
      tags,
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
      contentIdeas: contentIdeas.slice(0, 5), // Store top 5 ideas
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
        timezone: 'UTC',
        optimalTimes: aiSuggestions?.optimalPostingTimes || [],
        frequency: 'once',
      },
      analytics: {
        impressions: 0,
        reach: 0,
        clickThroughRate: 0,
        conversionRate: 0,
        engagementRate: 0,
      },
    } as any);

    // Initialize RAG service with the new content
    await RAGService.initializeWithContent(content);

    // Create comprehensive response
    const responseData = {
      content,
      contentIdeas: contentIdeas.length > 0 ? contentIdeas : undefined,
      optimizedContent:
        Object.keys(optimizedContent).length > 0 ? optimizedContent : undefined,
      aiSuggestions,
      platforms: platformsInfo,
      author: authorInfo,
      recommendations: contentIdeas.slice(1, 4), // Next 3 ideas as recommendations
      insights: {
        estimatedReach:
          aiSuggestions?.estimatedReach ||
          Math.floor(Math.random() * 5000) + 1000,
        difficulty: selectedIdea?.difficulty || 'moderate',
        timeToCreate: selectedIdea?.timeToCreate || '2-3 hours',
        trendingScore:
          selectedIdea?.trendingScore || Math.floor(Math.random() * 10) + 1,
      },
    };

    new SuccessResponse('Content created successfully', responseData).send(res);
  }),
);

router.get(
  '/',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const contents = await ContentRepo.findAll();
    new SuccessResponse('Contents retrieved successfully', contents).send(res);
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
    const engagement = await contentService.analyzeEngagement(content._id);
    content.engagement = engagement;

    new SuccessResponse('Content retrieved successfully', content).send(res);
  }),
);

router.get(
  '/user/:userId',
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const contents = await ContentRepo.findByUserId(
      new Types.ObjectId(req.params.userId),
    );
    new SuccessResponse('Contents retrieved successfully', contents).send(res);
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
    if (contents.length === 0) throw new NotFoundError('Contents not found');
    new SuccessResponse('Contents retrieved successfully', contents).send(res);
  }),
);

router.put(
  '/:id',
  validator(schema.update),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    console.log('content?.userId', content?.userId);
    console.log('req.user._id', req.user._id);
    console.log('content?.userId type:', typeof content?.userId);
    console.log('req.user._id type:', typeof req.user._id);
    console.log('content?.userId.toString()', content?.userId?.toString());
    console.log('req.user._id.toString()', req.user._id?.toString());
    if (!content) throw new NotFoundError('Content not found');

    // Compare the _id from the populated user object
    if (content.userId._id.toString() !== req.user._id.toString())
      throw new BadRequestError('Not authorized to update this content');

    const { title, description, type, platform, tags } = req.body;

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

    new SuccessResponse('Content updated successfully', {
      content: updatedContent,
      optimizedContent,
    }).send(res);
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

router.delete(
  '/:id',
  validator(schema.id),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    if (!content) throw new NotFoundError('Content not found');
    if (content.userId.toString() !== req.user._id.toString())
      throw new BadRequestError('Not authorized to delete this content');

    await ContentRepo.remove(new Types.ObjectId(req.params.id));
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
    if (content.userId.toString() !== req.user._id.toString())
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
    if (content.userId.toString() !== req.user._id.toString())
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
    if (content.userId.toString() !== req.user._id.toString())
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

router.post(
  '/:id/duplicate',
  validator(schema.id),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const content = await ContentRepo.findById(
      new Types.ObjectId(req.params.id),
    );
    if (!content) throw new NotFoundError('Content not found');
    if (content.userId.toString() !== req.user._id.toString())
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
    if (content.userId.toString() !== req.user._id.toString())
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
    if (content.userId.toString() !== req.user._id.toString())
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
