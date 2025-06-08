import { Types } from 'mongoose';
import { LLMProvider, UnifiedLLMService } from './llm.service';
import { IChatSession, IChatMessage } from '../database/model/chat';
import ChatRepo from '../database/repository/ChatRepo';
import ContentRepo from '../database/repository/ContentRepo';
import { BadRequestError, ForbiddenError } from '../core/ApiError';
import {
  ChatMode,
  ChatContext,
  ChatResponse,
  ContentFilter,
  MessageValidationResult,
  PromptGenerator,
  ResponseGenerator,
  SuggestionGenerator,
  ContentInsightsGenerator,
} from '../helpers/chat';

export class ChatService {
  private llmService: UnifiedLLMService;

  constructor() {
    // Initialize with Gemini as primary provider (free model)
    this.llmService = new UnifiedLLMService(LLMProvider.GEMINI);
  }

  // Unified session creation with optional enhanced features
  async startSession(
    userId: Types.ObjectId,
    title: string,
    contentId?: Types.ObjectId,
    templateId?: Types.ObjectId,
    description?: string,
    mode: Partial<ChatMode> = {},
  ): Promise<{ session: IChatSession; conversationStarters?: string[] }> {
    const chatMode: ChatMode = {
      enhanced: false,
      requireContentOwnership: false,
      validateInappropriate: false,
      generateInsights: false,
      ...mode,
    };

    let content: any = null;
    let context: ChatContext | null = null;

    // Validate content ownership if required or if content is provided
    if (contentId) {
      if (chatMode.requireContentOwnership) {
        content = await this.validateContentOwnership(contentId, userId);
      } else {
        content = await ContentRepo.findById(contentId);
        if (!content) {
          throw new BadRequestError('Content not found');
        }
      }
      context = await ContentInsightsGenerator.buildContentContext(content);
    }

    let session: IChatSession;

    if (templateId) {
      session = (await ChatRepo.createSessionFromTemplate(
        templateId,
        userId,
        title,
        contentId,
      )) as IChatSession;

      if (!session) {
        throw new BadRequestError('Template not found');
      }
    } else {
      const systemPrompt =
        chatMode.enhanced && context
          ? PromptGenerator.generateEnhancedSystemPrompt(context)
          : PromptGenerator.generateBasicSystemPrompt();

      session = await ChatRepo.createSession(userId, {
        title,
        description,
        contentId,
        messages: [],
        tags: content
          ? ContentInsightsGenerator.generateContentTags(content)
          : [],
        settings: {
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: chatMode.enhanced ? 2000 : 1000,
          systemPrompt,
        },
        metadata: {
          totalTokens: 0,
          lastActiveAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          context: context ? JSON.stringify(context) : undefined,
        },
        status: 'active',
      });
    }

    // Generate conversation starters if enhanced mode and content exists
    const conversationStarters =
      chatMode.enhanced && content
        ? SuggestionGenerator.generateConversationStarters(content)
        : undefined;

    return { session, conversationStarters };
  }

  // Unified message sending with optional validation and enhancement
  async sendMessage(
    sessionId: Types.ObjectId,
    userMessage: string,
    userId: Types.ObjectId,
    mode: Partial<ChatMode> = {},
  ): Promise<{ session: IChatSession; response: ChatResponse }> {
    const chatMode: ChatMode = {
      enhanced: false,
      requireContentOwnership: false,
      validateInappropriate: false,
      generateInsights: false,
      ...mode,
    };

    const session = await ChatRepo.findSessionById(sessionId);
    if (!session) {
      throw new BadRequestError('Chat session not found');
    }

    // Validate session ownership
    if (session.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('Unauthorized access to chat session');
    }

    // Validate content ownership if required
    if (chatMode.requireContentOwnership && session.contentId) {
      await this.validateContentOwnership(session.contentId, userId);
    }

    // Validate message content if enabled
    let validation: MessageValidationResult = {
      isAppropriate: true,
      severity: 'low',
    };
    if (chatMode.validateInappropriate) {
      validation = await ContentFilter.validateMessageContent(userMessage);
    }

    // Add user message to session
    const userMsg: IChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
      metadata: {
        contentId: session.contentId?.toString(),
        inappropriate: !validation.isAppropriate,
        severity: validation.severity,
      },
    };

    await ChatRepo.addMessage(sessionId, userMsg);

    let aiResponse: ChatResponse;

    if (!validation.isAppropriate && chatMode.validateInappropriate) {
      // Handle inappropriate content gracefully
      aiResponse =
        await ResponseGenerator.generateInappropriateContentResponse(
          validation,
        );
    } else {
      // Generate AI response (enhanced or basic)
      aiResponse = chatMode.enhanced
        ? await this.generateEnhancedAIResponse(session, userMessage, chatMode)
        : await this.generateBasicAIResponse(session, userMessage);
    }

    // Add AI message to session
    const aiMsg: IChatMessage = {
      role: 'assistant',
      content: aiResponse.message,
      timestamp: new Date(),
      metadata: {
        contentId: session.contentId?.toString(),
        tokens: aiResponse.tokens,
        model: aiResponse.model,
        inappropriate: aiResponse.inappropriateContentDetected || false,
      },
    };

    const updatedSession = await ChatRepo.addMessage(sessionId, aiMsg);

    if (!updatedSession) {
      throw new BadRequestError('Failed to update chat session');
    }

    return {
      session: updatedSession,
      response: aiResponse,
    };
  }

  // Get session with optional enhancements
  async getSession(
    sessionId: Types.ObjectId,
    userId: Types.ObjectId,
    mode: Partial<ChatMode> = {},
  ): Promise<{ session: IChatSession; conversationStarters?: string[] }> {
    const chatMode: ChatMode = {
      enhanced: false,
      requireContentOwnership: false,
      validateInappropriate: false,
      generateInsights: false,
      ...mode,
    };

    const session = await ChatRepo.findSessionById(sessionId);
    if (!session) {
      throw new BadRequestError('Chat session not found');
    }

    if (session.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('Unauthorized access to chat session');
    }

    // Validate content ownership if required
    let conversationStarters: string[] | undefined;
    if (chatMode.enhanced && session.contentId) {
      const content = chatMode.requireContentOwnership
        ? await this.validateContentOwnership(session.contentId, userId)
        : await ContentRepo.findById(session.contentId);

      if (content) {
        conversationStarters =
          SuggestionGenerator.generateConversationStarters(content);
      }
    }

    return { session, conversationStarters };
  }

  // Get all user sessions
  async getUserSessions(
    userId: Types.ObjectId,
    status?: string,
    limit: number = 20,
    skip: number = 0,
  ): Promise<IChatSession[]> {
    return ChatRepo.findSessionsByUserId(userId, status, limit, skip);
  }

  // Delete session
  async deleteSession(
    sessionId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<boolean> {
    const session = await ChatRepo.findSessionById(sessionId);
    if (!session) {
      throw new BadRequestError('Chat session not found');
    }

    if (session.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('Unauthorized access to chat session');
    }

    return ChatRepo.deleteSession(sessionId);
  }

  // Private helper methods
  private async validateContentOwnership(
    contentId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<any> {
    const content = await ContentRepo.findById(contentId);
    if (!content) {
      throw new BadRequestError('Content not found');
    }

    if (content.userId._id.toString() !== userId.toString()) {
      throw new ForbiddenError('You can only chat about content you created');
    }

    return content;
  }

  private async generateBasicAIResponse(
    session: IChatSession,
    userMessage: string,
  ): Promise<ChatResponse> {
    try {
      const response = await this.llmService.generateChatResponse(userMessage);

      return {
        message:
          response ||
          'I apologize, but I was unable to generate a response. Please try again.',
        tokens: this.estimateTokens(response || ''),
        model: session.settings.model || 'gpt-4o-mini',
        suggestions: SuggestionGenerator.generateBasicSuggestions(userMessage),
        actions: ResponseGenerator.generateBasicActions(),
      };
    } catch (error: any) {
      console.error('Error generating basic AI response:', error);
      return ResponseGenerator.generateErrorResponse();
    }
  }

  private async generateEnhancedAIResponse(
    session: IChatSession,
    userMessage: string,
    mode: ChatMode,
  ): Promise<ChatResponse> {
    try {
      const context = JSON.parse(
        session.metadata.context || '{}',
      ) as ChatContext;

      const detailedPrompt = PromptGenerator.buildDetailedPrompt(
        userMessage,
        context,
      );
      const response =
        await this.llmService.generateChatResponse(detailedPrompt);

      const contentInsights = mode.generateInsights
        ? await ContentInsightsGenerator.generateContentInsights(context)
        : undefined;

      const suggestions = SuggestionGenerator.generateContextualSuggestions(
        userMessage,
        context,
      );

      return {
        message:
          response ||
          PromptGenerator.generateFallbackResponse(userMessage, context),
        tokens: this.estimateTokens(response || ''),
        model: session.settings.model || 'gpt-4o-mini',
        suggestions,
        actions: ResponseGenerator.generateUIActions(),
        contentInsights,
        inappropriateContentDetected: false,
      };
    } catch (error: any) {
      console.error('Error generating enhanced AI response:', error);
      return ResponseGenerator.generateErrorResponse();
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
