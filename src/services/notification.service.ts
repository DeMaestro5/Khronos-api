import { Types } from 'mongoose';
import { UnifiedLLMService, LLMProvider } from './llm.service';
import NotificationRepo from '../database/repository/NotificationRepo';
import Notification, {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from '../database/model/Notification';
import NotificationSettings from '../database/model/NotificationSettings';

export class NotificationService {
  private llmService: UnifiedLLMService;

  constructor() {
    // Initialize with Gemini as primary provider (free model)
    this.llmService = new UnifiedLLMService(LLMProvider.GEMINI);
  }

  async createNotification(
    userId: Types.ObjectId,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    data?: Record<string, any>,
  ): Promise<Notification> {
    const notification: Notification = {
      _id: new Types.ObjectId(),
      userId,
      type,
      title,
      message,
      priority,
      status: NotificationStatus.UNREAD,
      data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await NotificationRepo.create(notification);
  }

  async generatePerformanceAlert(
    contentId: Types.ObjectId,
    metrics: Record<string, number>,
    threshold: number,
  ): Promise<Notification> {
    try {
      const alert = await this.llmService.generatePerformanceAlert(
        contentId.toString(),
        metrics,
        threshold,
      );

      return {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(), // Replace with actual user ID
        type: NotificationType.PERFORMANCE,
        title: 'Performance Alert',
        message: alert,
        priority: NotificationPriority.HIGH,
        status: NotificationStatus.UNREAD,
        data: { contentId, metrics, threshold },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error generating performance alert:', error);
      throw new Error('Failed to generate performance alert');
    }
  }

  async generateTrendAlert(
    trend: string,
    platform: string,
    growth: number,
  ): Promise<Notification> {
    try {
      const alert = await this.llmService.generateTrendAlert(
        trend,
        platform,
        growth,
      );

      return {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(), // Replace with actual user ID
        type: NotificationType.TREND,
        title: 'Trend Alert',
        message: alert,
        priority: NotificationPriority.MEDIUM,
        status: NotificationStatus.UNREAD,
        data: { trend, platform, growth },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error generating trend alert:', error);
      throw new Error('Failed to generate trend alert');
    }
  }

  async generateScheduleReminder(
    contentId: Types.ObjectId,
    scheduledTime: Date,
    platform: string,
  ): Promise<Notification> {
    try {
      const reminder = await this.llmService.generateScheduleReminder(
        contentId.toString(),
        scheduledTime,
        platform,
      );

      return {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(), // Replace with actual user ID
        type: NotificationType.SCHEDULE,
        title: 'Schedule Reminder',
        message: reminder,
        priority: NotificationPriority.HIGH,
        status: NotificationStatus.UNREAD,
        data: { contentId, scheduledTime, platform },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Error generating schedule reminder:', error);
      throw new Error('Failed to generate schedule reminder');
    }
  }

  async getUserNotifications(
    userId: Types.ObjectId,
    filters?: {
      type?: NotificationType;
      status?: NotificationStatus;
      priority?: NotificationPriority;
    },
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    limit: number;
  }> {
    const notifications = await NotificationRepo.findByUserId(
      userId,
      filters,
      page,
      limit,
    );
    const total = await NotificationRepo.countByUserId(userId, filters);

    return {
      notifications,
      total,
      page,
      limit,
    };
  }

  async updateNotificationStatus(
    notificationId: Types.ObjectId,
    status: NotificationStatus,
  ): Promise<Notification> {
    const notification = await NotificationRepo.updateStatus(
      notificationId,
      status,
    );
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification;
  }

  async markAllAsRead(userId: Types.ObjectId): Promise<void> {
    await NotificationRepo.markAllAsRead(userId);
  }

  async getNotificationSettings(
    userId: Types.ObjectId,
  ): Promise<NotificationSettings | null> {
    return await NotificationRepo.findSettingsByUserId(userId);
  }

  async updateNotificationSettings(
    userId: Types.ObjectId,
    settings: Partial<NotificationSettings>,
  ): Promise<NotificationSettings> {
    const updatedSettings = await NotificationRepo.updateSettings(
      userId,
      settings,
    );
    if (!updatedSettings) {
      throw new Error('Failed to update notification settings');
    }
    return updatedSettings;
  }
}
