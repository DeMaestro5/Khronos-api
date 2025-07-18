import { NotificationService } from './notification.service';
import {
  NotificationType,
  NotificationPriority,
} from '../database/model/Notification';
import CalendarRepo from '../database/repository/CalendarRepo';
import { Types } from 'mongoose';

export class SchedulerService {
  private notificationService: NotificationService;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

  constructor() {
    this.notificationService = new NotificationService();
  }

  public startScheduler(): void {
    if (this.checkInterval) {
      return;
    }

    this.checkInterval = setInterval(() => {
      this.checkUpcomingEvents().catch(console.error);
    }, this.CHECK_INTERVAL_MS);

    // Initial check
    this.checkUpcomingEvents().catch(console.error);
  }

  public stopScheduler(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkUpcomingEvents(): Promise<void> {
    const now = new Date();
    const timeWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours

    // Get all users with upcoming events
    const allEvents = await CalendarRepo.findByDateRange(
      new Types.ObjectId(), // This will be replaced with actual user IDs
      now,
      timeWindow,
    );

    // Group events by user
    const eventsByUser = new Map<string, any[]>();
    for (const event of allEvents) {
      const userId = event.userId.toString();
      if (!eventsByUser.has(userId)) {
        eventsByUser.set(userId, []);
      }
      eventsByUser.get(userId)?.push(event);
    }

    // Process events for each user
    for (const [userId, events] of eventsByUser) {
      const settings = await this.notificationService.getNotificationSettings(
        new Types.ObjectId(userId),
      );

      // Skip if user has disabled schedule notifications
      if (!settings?.scheduleNotifications) {
        continue;
      }

      // Check if we're in quiet hours
      if (this.isInQuietHours(now, settings.quietHours)) {
        continue;
      }

      for (const event of events) {
        // Calculate time until event
        const timeUntilEvent = event.startDate.getTime() - now.getTime();
        const minutesUntilEvent = Math.floor(timeUntilEvent / (60 * 1000));

        // Generate notifications based on event reminders
        if (event.reminders) {
          for (const reminder of event.reminders) {
            if (!reminder.sent && minutesUntilEvent <= reminder.time) {
              await this.generateEventNotification(event, reminder);
              reminder.sent = true;
            }
          }
        }

        // Generate default notifications for events without reminders
        if (!event.reminders?.length) {
          if (minutesUntilEvent <= 60) {
            // 1 hour before
            await this.generateEventNotification(event, {
              type: 'push',
              time: 60,
            });
          } else if (minutesUntilEvent <= 1440) {
            // 24 hours before
            await this.generateEventNotification(event, {
              type: 'push',
              time: 1440,
            });
          }
        }
      }
    }

    // Check for overdue events
    const overdueEvents = await CalendarRepo.findOverdue(new Types.ObjectId()); // This will be replaced with actual user IDs
    for (const event of overdueEvents) {
      if (event.status === 'completed' || event.status === 'cancelled') {
        continue;
      }

      const settings = await this.notificationService.getNotificationSettings(
        event.userId,
      );
      if (!settings?.scheduleNotifications) {
        continue;
      }

      // Generate follow-up notification for past events
      await this.generateEventFollowUpNotification(event);
    }
  }

  private async generateEventNotification(
    event: any,
    reminder: { type: string; time: number },
  ): Promise<void> {
    const timeUnit = reminder.time >= 60 ? 'hour' : 'minute';
    const timeValue = reminder.time >= 60 ? reminder.time / 60 : reminder.time;

    const title = `Upcoming Event: ${event.title}`;
    const message = `${event.title} is starting in ${timeValue} ${timeUnit}${
      timeValue !== 1 ? 's' : ''
    }.`;

    await this.notificationService.createNotification(
      event.userId,
      NotificationType.SCHEDULE,
      title,
      message,
      this.getPriorityForEvent(event),
      {
        eventId: event._id,
        startDate: event.startDate,
        endDate: event.endDate,
        type: event.eventType,
        reminderType: reminder.type,
      },
    );
  }

  private async generateEventFollowUpNotification(event: any): Promise<void> {
    const title = `Event Follow-up: ${event.title}`;
    const message = `${event.title} has ended. Would you like to mark it as completed?`;

    await this.notificationService.createNotification(
      event.userId,
      NotificationType.SCHEDULE,
      title,
      message,
      NotificationPriority.MEDIUM,
      {
        eventId: event._id,
        startDate: event.startDate,
        endDate: event.endDate,
        type: event.eventType,
        action: 'mark_completed',
      },
    );
  }

  private getPriorityForEvent(event: any): NotificationPriority {
    switch (event.priority) {
      case 'critical':
        return NotificationPriority.HIGH;
      case 'high':
        return NotificationPriority.HIGH;
      case 'medium':
        return NotificationPriority.MEDIUM;
      case 'low':
        return NotificationPriority.LOW;
      default:
        return NotificationPriority.MEDIUM;
    }
  }

  private isInQuietHours(
    now: Date,
    quietHours?: { start: string; end: string },
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
      // Handles overnight quiet hours (e.g., 22:00 to 08:00)
      return (
        currentTimeInMinutes >= startTimeInMinutes ||
        currentTimeInMinutes <= endTimeInMinutes
      );
    }
  }
}
