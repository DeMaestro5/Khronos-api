import { Router, Response } from 'express';
import asyncHandler from '../../helpers/asyncHandler';
import { ProtectedRequest } from '../../types/app-request';
import { BadRequestError, NotFoundError } from '../../core/ApiError';
import { SuccessResponse } from '../../core/ApiResponse';
import { Types } from 'mongoose';
import validator, { ValidationSource } from '../../helpers/validator';
import schema from './schema';
import authentication from '../../auth/authentication';
import { ChatService } from '../../services/chat.service';
import ChatRepo from '../../database/repository/ChatRepo';

const router = Router();
const chatService = new ChatService();

router.use(authentication);

// // POST /api/chat/start - Start a new chat session (basic mode)
// router.post(
//   '/start',
//   validator(schema.startSession),
//   asyncHandler(async (req: ProtectedRequest, res: Response) => {
//     const { title, description, contentId, templateId, settings } = req.body;

//     const { session } = await chatService.startSession(
//       req.user._id,
//       title,
//       contentId ? new Types.ObjectId(contentId) : undefined,
//       templateId ? new Types.ObjectId(templateId) : undefined,
//       description,
//       { enhanced: false }, // Basic mode for backward compatibility
//     );

//     // Apply custom settings if provided
//     if (settings) {
//       await ChatRepo.updateSession(session._id, { settings });
//     }

//     new SuccessResponse('Chat session started successfully', {
//       session: {
//         id: session._id,
//         title: session.title,
//         description: session.description,
//         contentId: session.contentId,
//         status: session.status,
//         settings: session.settings,
//         metadata: session.metadata,
//         createdAt: session.createdAt,
//       },
//     }).send(res);
//   }),
// );

// POST /api/chat/enhanced/start - Start enhanced chat session with content ownership validation
router.post(
  '/start',
  validator(schema.startSession),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { title, description, contentId, templateId } = req.body;

    if (!contentId) {
      throw new BadRequestError(
        'Content ID is required for enhanced chat sessions',
      );
    }

    if (!Types.ObjectId.isValid(contentId)) {
      throw new BadRequestError('Invalid content ID');
    }

    const { session, conversationStarters } = await chatService.startSession(
      req.user._id,
      title,
      new Types.ObjectId(contentId),
      templateId ? new Types.ObjectId(templateId) : undefined,
      description,
      {
        enhanced: true,
        requireContentOwnership: true,
        validateInappropriate: true,
        generateInsights: true,
      },
    );

    new SuccessResponse('Enhanced chat session started successfully', {
      session: {
        id: session._id,
        title: session.title,
        description: session.description,
        contentId: session.contentId,
        status: session.status,
        settings: session.settings,
        metadata: session.metadata,
        tags: session.tags,
        createdAt: session.createdAt,
      },
      conversationStarters,
      ui: {
        actions: [
          {
            type: 'optimize',
            label: 'Optimize',
            description: 'Get platform-specific optimization suggestions',
            icon: '⚡',
          },
          {
            type: 'ideas',
            label: 'Ideas',
            description: 'Generate creative content variations and concepts',
            icon: '✨',
          },
          {
            type: 'strategy',
            label: 'Strategy',
            description: 'Develop comprehensive content marketing strategy',
            icon: '🎯',
          },
          {
            type: 'analyze',
            label: 'Analyze',
            description:
              'Get detailed performance insights and recommendations',
            icon: '💬',
          },
        ],
      },
    }).send(res);
  }),
);

// POST /api/chat/message - Send message to AI assistant (basic mode)
// router.post(
//   '/message',
//   validator(schema.sendMessage),
//   asyncHandler(async (req: ProtectedRequest, res: Response) => {
//     const { message, sessionId } = req.body;

//     if (!Types.ObjectId.isValid(sessionId)) {
//       throw new BadRequestError('Invalid session ID');
//     }

//     const { session, response } = await chatService.sendMessage(
//       new Types.ObjectId(sessionId),
//       message,
//       req.user._id,
//       { enhanced: false }, // Basic mode
//     );

//     new SuccessResponse('Message sent successfully', {
//       message: {
//         role: 'assistant',
//         content: response.message,
//         timestamp: new Date(),
//         metadata: {
//           tokens: response.tokens,
//           model: response.model,
//         },
//       },
//       suggestions: response.suggestions,
//       actions: response.actions,
//       session: {
//         id: session._id,
//         totalMessages: session.messages.length,
//         totalTokens: session.metadata.totalTokens,
//         lastActiveAt: session.metadata.lastActiveAt,
//       },
//     }).send(res);
//   }),
// );

// POST /api/chat/enhanced/message - Send message with enhanced validation and responses
router.post(
  '/message',
  validator(schema.sendMessage),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { message, sessionId } = req.body;

    if (!Types.ObjectId.isValid(sessionId)) {
      throw new BadRequestError('Invalid session ID');
    }

    const { session, response } = await chatService.sendMessage(
      new Types.ObjectId(sessionId),
      message,
      req.user._id,
      {
        enhanced: true,
        requireContentOwnership: true,
        validateInappropriate: true,
        generateInsights: true,
      },
    );

    new SuccessResponse('Message processed successfully', {
      message: {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        metadata: {
          tokens: response.tokens,
          model: response.model,
          inappropriate: response.inappropriateContentDetected,
        },
      },
      suggestions: response.suggestions,
      actions: response.actions,
      contentInsights: response.contentInsights,
      inappropriateContentDetected: response.inappropriateContentDetected,
      warningMessage: response.warningMessage,
      session: {
        id: session._id,
        totalMessages: session.messages.length,
        totalTokens: session.metadata.totalTokens,
        lastActiveAt: session.metadata.lastActiveAt,
      },
    }).send(res);
  }),
);

// GET /api/chat/sessions - Get all chat sessions
router.get(
  '/sessions',
  validator(schema.getSessions, ValidationSource.QUERY),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { status, limit, skip, contentId } = req.query as any;

    let sessions;
    if (contentId) {
      if (!Types.ObjectId.isValid(contentId)) {
        throw new BadRequestError('Invalid content ID');
      }
      sessions = await ChatRepo.findSessionsByContentId(
        new Types.ObjectId(contentId),
        req.user._id,
      );
    } else {
      sessions = await chatService.getUserSessions(
        req.user._id,
        status,
        parseInt(limit) || 20,
        parseInt(skip) || 0,
      );
    }

    // Transform sessions for response
    const transformedSessions = sessions.map((session) => ({
      id: session._id,
      title: session.title,
      description: session.description,
      contentId: session.contentId,
      content: session.contentId
        ? {
            id: (session.contentId as any)?._id,
            title: (session.contentId as any)?.title,
            type: (session.contentId as any)?.type,
            platform: (session.contentId as any)?.platform,
          }
        : null,
      status: session.status,
      messageCount: session.messages.length,
      totalTokens: session.metadata.totalTokens,
      lastActiveAt: session.metadata.lastActiveAt,
      createdAt: session.createdAt,
      tags: session.tags,
    }));

    new SuccessResponse('Chat sessions retrieved successfully', {
      sessions: transformedSessions,
      total: transformedSessions.length,
    }).send(res);
  }),
);

// GET /api/chat/sessions/:id - Get a specific chat session (basic mode)
router.get(
  '/sessions/:id',
  validator(schema.sessionId, ValidationSource.PARAM),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid session ID');
    }

    const { session } = await chatService.getSession(
      new Types.ObjectId(id),
      req.user._id,
      { enhanced: false },
    );

    // Transform messages for response
    const messages = session.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      metadata: msg.metadata,
    }));

    new SuccessResponse('Chat session retrieved successfully', {
      session: {
        id: session._id,
        title: session.title,
        description: session.description,
        contentId: session.contentId,
        content: session.contentId
          ? {
              id: (session.contentId as any)?._id,
              title: (session.contentId as any)?.title,
              type: (session.contentId as any)?.type,
              platform: (session.contentId as any)?.platform,
            }
          : null,
        messages,
        status: session.status,
        tags: session.tags,
        settings: session.settings,
        metadata: session.metadata,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    }).send(res);
  }),
);

// GET /api/chat/enhanced/sessions/:id - Get enhanced session with conversation starters
router.get(
  '/enhanced/sessions/:id',
  validator(schema.sessionId, ValidationSource.PARAM),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid session ID');
    }

    const { session, conversationStarters } = await chatService.getSession(
      new Types.ObjectId(id),
      req.user._id,
      {
        enhanced: true,
        requireContentOwnership: true,
      },
    );

    // Transform messages for response with inappropriate content tracking
    const messages = session.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      metadata: {
        ...msg.metadata,
        flagged: msg.metadata?.inappropriate || false,
        severity: msg.metadata?.severity,
      },
    }));

    new SuccessResponse('Enhanced chat session retrieved successfully', {
      session: {
        id: session._id,
        title: session.title,
        description: session.description,
        contentId: session.contentId,
        messages,
        status: session.status,
        tags: session.tags,
        settings: session.settings,
        metadata: session.metadata,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      conversationStarters,
      ui: {
        actions: [
          {
            type: 'optimize',
            label: 'Optimize',
            description: 'Get platform-specific optimization suggestions',
            icon: '⚡',
          },
          {
            type: 'ideas',
            label: 'Ideas',
            description: 'Generate creative content variations and concepts',
            icon: '✨',
          },
          {
            type: 'strategy',
            label: 'Strategy',
            description: 'Develop comprehensive content marketing strategy',
            icon: '🎯',
          },
          {
            type: 'analyze',
            label: 'Analyze',
            description:
              'Get detailed performance insights and recommendations',
            icon: '💬',
          },
        ],
      },
    }).send(res);
  }),
);

// DELETE /api/chat/sessions/:id - Delete a chat session
router.delete(
  '/sessions/:id',
  validator(schema.sessionId, ValidationSource.PARAM),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestError('Invalid session ID');
    }

    const deleted = await chatService.deleteSession(
      new Types.ObjectId(id),
      req.user._id,
    );

    if (!deleted) {
      throw new NotFoundError('Chat session not found');
    }

    new SuccessResponse('Chat session deleted successfully', {
      deleted: true,
      sessionId: id,
    }).send(res);
  }),
);

// GET /api/chat/content-templates - Get available chat templates
router.get(
  '/content-templates',
  validator(schema.getTemplates, ValidationSource.QUERY),
  asyncHandler(async (req: ProtectedRequest, res: Response) => {
    const { category, limit, search } = req.query as any;

    let templates;
    if (search) {
      templates = await ChatRepo.searchTemplates(
        search,
        req.user._id,
        category,
        parseInt(limit) || 20,
      );
    } else {
      templates = await ChatRepo.findPublicTemplates(category);
    }

    // Transform templates for response
    const transformedTemplates = templates.map((template: any) => ({
      id: template._id,
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags,
      isPublic: template.isPublic,
      usageCount: template.usageCount,
      author: template.userId
        ? {
            id: (template.userId as any)?._id,
            name: (template.userId as any)?.name,
          }
        : null,
      settings: template.settings,
      createdAt: template.createdAt,
    }));

    new SuccessResponse('Chat templates retrieved successfully', {
      templates: transformedTemplates,
      total: transformedTemplates.length,
    }).send(res);
  }),
);

export default router;
