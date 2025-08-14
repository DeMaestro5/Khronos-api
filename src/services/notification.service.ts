import { Types } from 'mongoose';
import { UnifiedLLMService, LLMProvider } from './llm.service';
import NotificationRepo from '../database/repository/NotificationRepo';
import Notification, {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from '../database/model/Notification';
import NotificationSettings from '../database/model/NotificationSettings';
import { ServiceManager } from './service-manager';

export class NotificationService {
  private llmService: UnifiedLLMService;

  constructor() {
    // Initialize with Gemini as primary provider (free model)
    this.llmService = new UnifiedLLMService(LLMProvider.GEMINI);
  }

  private isCategoryEnabled(
    settings: NotificationSettings | null,
    type: NotificationType,
  ): boolean {
    if (!settings) return true;

    const map: Record<NotificationType, boolean | undefined> = {
      [NotificationType.SCHEDULE]: settings.scheduleNotifications,
      [NotificationType.PERFORMANCE]: settings.performanceAlerts,
      [NotificationType.TREND]: settings.trendUpdates,
      [NotificationType.SYSTEM]: settings.systemUpdates,
      [NotificationType.SECURITY]: settings.securityAlerts,
      [NotificationType.REMINDER]: settings.reminders,
      [NotificationType.MESSAGE]: settings.messages,
      [NotificationType.MARKETING]: settings.marketing,
      [NotificationType.PRODUCT_UPDATE]: settings.productUpdates,
      [NotificationType.REPORT]: settings.reports,
    } as any;

    const enabled = map[type];
    return enabled === undefined ? true : Boolean(enabled);
  }

  async createNotification(
    userId: Types.ObjectId,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    data?: Record<string, any>,
  ): Promise<Notification> {
    const now = new Date();
    const settings = await this.getNotificationSettings(userId);

    const notification: Notification = {
      _id: new Types.ObjectId(),
      userId,
      type,
      title,
      message,
      priority,
      status: NotificationStatus.UNREAD,
      data,
      createdAt: now,
      updatedAt: now,
    };

    const created = await NotificationRepo.create(notification);

    // Determine if we should broadcast to client
    const shouldBroadcast =
      this.isCategoryEnabled(settings, type) &&
      !(
        settings?.quietHours?.enabled &&
        this.isInQuietHours(now, settings.quietHours)
      );

    if (shouldBroadcast) {
      try {
        const ws = ServiceManager.getInstance().getWebSocketService();
        await ws.broadcastToUser(userId, 'notification', created);
      } catch {}
    }

    return created;
  }

  private isInQuietHours(
    now: Date,
    quietHours?: { enabled?: boolean; start: string; end: string },
  ): boolean {
    if (!quietHours) {
      return false;
    }

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = quietHours.start.split(':').map(Number);
    const [endHour, endMinute] = quietHours.end.split(':').map(Number);

    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    if (startTimeInMinutes <= endTimeInMinutes) {
      return (
        currentTimeInMinutes >= startTimeInMinutes &&
        currentTimeInMinutes <= endTimeInMinutes
      );
    } else {
      return (
        currentTimeInMinutes >= startTimeInMinutes ||
        currentTimeInMinutes <= endTimeInMinutes
      );
    }
  }

  async generatePerformanceAlert(
    userId: Types.ObjectId,
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

      return await this.createNotification(
        userId,
        NotificationType.PERFORMANCE,
        'Performance Alert',
        alert,
        NotificationPriority.HIGH,
        { contentId, metrics, threshold },
      );
    } catch (error) {
      console.error('Error generating performance alert:', error);
      throw new Error('Failed to generate performance alert');
    }
  }

  async generateTrendAlert(
    userId: Types.ObjectId,
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

      return await this.createNotification(
        userId,
        NotificationType.TREND,
        'Trend Alert',
        alert,
        NotificationPriority.MEDIUM,
        { trend, platform, growth },
      );
    } catch (error) {
      console.error('Error generating trend alert:', error);
      throw new Error('Failed to generate trend alert');
    }
  }

  async generateScheduleReminder(
    userId: Types.ObjectId,
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

      return await this.createNotification(
        userId,
        NotificationType.SCHEDULE,
        'Schedule Reminder',
        reminder,
        NotificationPriority.HIGH,
        { contentId, scheduledTime, platform },
      );
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
