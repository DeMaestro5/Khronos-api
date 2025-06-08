import { Types } from 'mongoose';
import {
  ChatSession,
  ChatTemplate,
  IChatSession,
  IChatTemplate,
  IChatMessage,
} from '../model/chat';
import { InternalError } from '../../core/ApiError';

export default class ChatRepo {
  // Chat Session operations
  public static async createSession(
    userId: Types.ObjectId,
    data: Partial<IChatSession>,
  ): Promise<IChatSession> {
    try {
      const session = await ChatSession.create({
        userId,
        ...data,
      });
      return session;
    } catch (error: any) {
      throw new InternalError(error.message);
    }
  }

  public static async findSessionById(
    id: Types.ObjectId,
  ): Promise<IChatSession | null> {
    return ChatSession.findById(id)
      .populate('contentId', 'title type platform metadata')
      .exec();
  }

  public static async findSessionsByUserId(
    userId: Types.ObjectId,
    status?: string,
    limit: number = 20,
    skip: number = 0,
  ): Promise<IChatSession[]> {
    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    return ChatSession.find(query)
      .populate('contentId', 'title type platform metadata')
      .sort({ 'metadata.lastActiveAt': -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  public static async findSessionsByContentId(
    contentId: Types.ObjectId,
    userId?: Types.ObjectId,
  ): Promise<IChatSession[]> {
    const query: any = { contentId };
    if (userId) {
      query.userId = userId;
    }

    return ChatSession.find(query)
      .populate('contentId', 'title type platform metadata')
      .sort({ 'metadata.lastActiveAt': -1 })
      .exec();
  }

  public static async updateSession(
    id: Types.ObjectId,
    update: Partial<IChatSession>,
  ): Promise<IChatSession | null> {
    return ChatSession.findByIdAndUpdate(
      id,
      {
        ...update,
        'metadata.updatedAt': new Date(),
        'metadata.lastActiveAt': new Date(),
      },
      { new: true, runValidators: true },
    ).exec();
  }

  public static async addMessage(
    sessionId: Types.ObjectId,
    message: IChatMessage,
  ): Promise<IChatSession | null> {
    return ChatSession.findByIdAndUpdate(
      sessionId,
      {
        $push: { messages: message },
        $inc: { 'metadata.totalTokens': message.metadata?.tokens || 0 },
        'metadata.lastActiveAt': new Date(),
        'metadata.updatedAt': new Date(),
      },
      { new: true, runValidators: true },
    ).exec();
  }

  public static async deleteSession(id: Types.ObjectId): Promise<boolean> {
    const result = await ChatSession.findByIdAndDelete(id).exec();
    return !!result;
  }

  public static async archiveSession(
    id: Types.ObjectId,
  ): Promise<IChatSession | null> {
    return ChatSession.findByIdAndUpdate(
      id,
      {
        status: 'archived',
        'metadata.updatedAt': new Date(),
      },
      { new: true },
    ).exec();
  }

  // Chat Template operations
  public static async createTemplate(
    userId: Types.ObjectId,
    data: Partial<IChatTemplate>,
  ): Promise<IChatTemplate> {
    try {
      const template = await ChatTemplate.create({
        userId,
        ...data,
      });
      return template;
    } catch (error: any) {
      throw new InternalError(error.message);
    }
  }

  public static async findTemplateById(
    id: Types.ObjectId,
  ): Promise<IChatTemplate | null> {
    return ChatTemplate.findById(id).exec();
  }

  public static async findTemplatesByUserId(
    userId: Types.ObjectId,
    category?: string,
    limit: number = 20,
  ): Promise<IChatTemplate[]> {
    const query: any = { userId };
    if (category) {
      query.category = category;
    }

    return ChatTemplate.find(query)
      .sort({ usageCount: -1, createdAt: -1 })
      .limit(limit)
      .exec();
  }

  public static async findPublicTemplates(
    category?: string,
    limit: number = 20,
  ): Promise<IChatTemplate[]> {
    const query: any = { isPublic: true };
    if (category) {
      query.category = category;
    }

    return ChatTemplate.find(query)
      .populate('userId', 'name')
      .sort({ usageCount: -1, createdAt: -1 })
      .limit(limit)
      .exec();
  }

  public static async updateTemplate(
    id: Types.ObjectId,
    update: Partial<IChatTemplate>,
  ): Promise<IChatTemplate | null> {
    return ChatTemplate.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).exec();
  }

  public static async incrementTemplateUsage(
    id: Types.ObjectId,
  ): Promise<IChatTemplate | null> {
    return ChatTemplate.findByIdAndUpdate(
      id,
      { $inc: { usageCount: 1 } },
      { new: true },
    ).exec();
  }

  public static async deleteTemplate(id: Types.ObjectId): Promise<boolean> {
    const result = await ChatTemplate.findByIdAndDelete(id).exec();
    return !!result;
  }

  public static async searchTemplates(
    query: string,
    userId?: Types.ObjectId,
    category?: string,
    limit: number = 10,
  ): Promise<IChatTemplate[]> {
    const searchQuery: any = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } },
      ],
    };

    if (userId) {
      searchQuery.userId = userId;
    } else {
      searchQuery.isPublic = true;
    }

    if (category) {
      searchQuery.category = category;
    }

    return ChatTemplate.find(searchQuery)
      .populate('userId', 'name')
      .sort({ usageCount: -1, createdAt: -1 })
      .limit(limit)
      .exec();
  }

  // Analytics and insights
  public static async getSessionStats(userId: Types.ObjectId): Promise<any> {
    const stats = await ChatSession.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          activeSessions: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
          totalTokens: { $sum: '$metadata.totalTokens' },
          averageMessagesPerSession: { $avg: { $size: '$messages' } },
        },
      },
    ]);

    return (
      stats[0] || {
        totalSessions: 0,
        activeSessions: 0,
        totalTokens: 0,
        averageMessagesPerSession: 0,
      }
    );
  }

  public static async getRecentSessions(
    userId: Types.ObjectId,
    limit: number = 5,
  ): Promise<IChatSession[]> {
    return ChatSession.find({ userId, status: 'active' })
      .populate('contentId', 'title type platform')
      .sort({ 'metadata.lastActiveAt': -1 })
      .limit(limit)
      .select('title description messages metadata contentId')
      .exec();
  }

  public static async createSessionFromTemplate(
    templateId: Types.ObjectId,
    userId: Types.ObjectId,
    title: string,
    contentId?: Types.ObjectId,
  ): Promise<IChatSession | null> {
    const template = await ChatTemplate.findById(templateId);
    if (!template) return null;

    // Increment template usage
    await this.incrementTemplateUsage(templateId);

    // Create new session with template settings
    const session = await ChatSession.create({
      userId,
      title,
      contentId,
      messages: template.initialMessages || [],
      tags: template.tags,
      settings: {
        ...template.settings,
        systemPrompt: template.systemPrompt,
      },
      metadata: {
        totalTokens: 0,
        lastActiveAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        context: `Created from template: ${template.name}`,
      },
    });

    return session;
  }
}
