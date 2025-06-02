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

    // Generate content ideas if not provided
    let contentIdeas: string[] = [];
    if (!description) {
      contentIdeas = await contentService.generateContentIdeas(
        title,
        type as Content['type'],
      );
    }

    // Optimize content for each platform
    const optimizedContent = await Promise.all(
      platform.map(async (p: string) => {
        const content = description || contentIdeas[0];
        return contentService.optimizeContent(content, p);
      }),
    );

    const content = await ContentRepo.create({
      userId: req.user._id,
      metadata: {
        title,
        description: description || contentIdeas[0],
        type,
        status: 'draft',
        platform,
        tags,
      },
      title,
      description: description || contentIdeas[0],
      type,
      status: 'draft',
      platform,
      tags,
    } as any);

    // Initialize RAG service with the new content
    await RAGService.initializeWithContent(content);

    new SuccessResponse('Content created successfully', {
      content,
      contentIdeas: contentIdeas.length > 0 ? contentIdeas : undefined,
      optimizedContent:
        optimizedContent.length > 0 ? optimizedContent : undefined,
    }).send(res);
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
