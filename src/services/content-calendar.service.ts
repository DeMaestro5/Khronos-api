import { Types } from 'mongoose';
import CalendarRepo from '../database/repository/CalendarRepo';
import CalendarEvent from '../database/model/calendar';
import Content from '../database/model/content';

export interface ContentSchedulingData {
  startDate: Date;
  endDate?: Date;
  timezone?: string;
  allDay?: boolean;
  autoPublish?: boolean;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  platformSchedules?: Array<{
    platform: string;
    scheduledDate: Date;
    customContent?: string;
    autoPublish?: boolean;
  }>;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    daysOfWeek?: number[];
    endDate?: Date;
    occurrences?: number;
  };
  reminders?: Array<{
    type: 'email' | 'push' | 'webhook';
    time: number;
  }>;
  publishSettings?: {
    optimizeForEngagement?: boolean;
    crossPost?: boolean;
    includeHashtags?: boolean;
    mentionInfluencers?: boolean;
  };
  aiOptimization?: {
    useOptimalTimes?: boolean;
    adjustForAudience?: boolean;
    avoidCompetitorPosts?: boolean;
  };
}

export class ContentCalendarService {
  /**
   * Automatically creates calendar event(s) when content is created with scheduling
   */
  async createCalendarEventsForContent(
    content: Content,
    schedulingData: ContentSchedulingData,
    userId: Types.ObjectId,
  ): Promise<CalendarEvent[]> {
    const createdEvents: CalendarEvent[] = [];

    // 1. Create main content publishing event
    const mainEvent = await this.createMainContentEvent(
      content,
      schedulingData,
      userId,
    );
    createdEvents.push(mainEvent);

    // 2. Create platform-specific events if specified
    if (
      schedulingData.platformSchedules &&
      schedulingData.platformSchedules.length > 0
    ) {
      const platformEvents = await this.createPlatformSpecificEvents(
        content,
        schedulingData,
        userId,
        mainEvent._id,
      );
      createdEvents.push(...platformEvents);
    }

    // 3. Create recurring events if specified
    if (schedulingData.recurrence) {
      const recurringEvents = await this.createRecurringEvents(
        content,
        schedulingData,
        userId,
        mainEvent._id,
      );
      createdEvents.push(...recurringEvents);
    }

    return createdEvents;
  }

  /**
   * Creates the main calendar event for content publishing
   */
  private async createMainContentEvent(
    content: Content,
    schedulingData: ContentSchedulingData,
    userId: Types.ObjectId,
  ): Promise<CalendarEvent> {
    const eventData: Partial<CalendarEvent> = {
      userId,
      title: `Publish: ${content.title}`,
      description: `Publish content "${
        content.title
      }" across ${content.platform.join(', ')}`,
      startDate: schedulingData.startDate,
      endDate:
        schedulingData.endDate ||
        new Date(schedulingData.startDate.getTime() + 30 * 60 * 1000), // 30 min default
      allDay: schedulingData.allDay || false,
      timezone: schedulingData.timezone || 'UTC',
      eventType: 'content_publishing',
      status: 'scheduled',
      priority: schedulingData.priority || 'high',

      // Content association
      contentId: content._id,
      platform: content.platform,

      // Automation settings
      autoPublish: schedulingData.autoPublish || false,
      publishSettings: {
        platforms: content.platform,
        optimizeForEngagement:
          schedulingData.publishSettings?.optimizeForEngagement || true,
        crossPost: schedulingData.publishSettings?.crossPost || false,
      },

      // Reminders
      reminders: schedulingData.reminders || [],

      // AI suggestions
      aiSuggested: schedulingData.aiOptimization?.useOptimalTimes || false,
      suggestedBy: 'engagement_analysis',

      // Metadata
      tags: content.tags,
      color: this.getContentTypeColor(content.type),
      notes: `Auto-generated from content creation. Type: ${content.type}`,

      createdBy: userId,
    };

    return await CalendarRepo.create(eventData as CalendarEvent);
  }

  /**
   * Creates platform-specific events for cross-platform scheduling
   */
  private async createPlatformSpecificEvents(
    content: Content,
    schedulingData: ContentSchedulingData,
    userId: Types.ObjectId,
    parentEventId: Types.ObjectId,
  ): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    for (const platformSchedule of schedulingData.platformSchedules!) {
      const eventData: Partial<CalendarEvent> = {
        userId,
        title: `Publish on ${platformSchedule.platform}: ${content.title}`,
        description:
          platformSchedule.customContent ||
          `Publish content "${content.title}" on ${platformSchedule.platform}`,
        startDate: platformSchedule.scheduledDate,
        endDate: new Date(
          platformSchedule.scheduledDate.getTime() + 15 * 60 * 1000,
        ), // 15 min
        allDay: false,
        timezone: schedulingData.timezone || 'UTC',
        eventType: 'content_publishing',
        status: 'scheduled',
        priority: 'medium',

        // Content association
        contentId: content._id,
        platform: [platformSchedule.platform],

        // Link to parent event
        parentEventId,

        // Automation
        autoPublish: platformSchedule.autoPublish || false,
        publishSettings: {
          platforms: [platformSchedule.platform],
          optimizeForEngagement: true,
          crossPost: false,
        },

        // Metadata
        tags: [...content.tags, `platform-${platformSchedule.platform}`],
        color: this.getPlatformColor(platformSchedule.platform),
        notes: `Platform-specific publishing event for ${platformSchedule.platform}`,

        createdBy: userId,
      };

      const event = await CalendarRepo.create(eventData as CalendarEvent);
      events.push(event);
    }

    return events;
  }

  /**
   * Creates recurring events for regular content publishing
   */
  private async createRecurringEvents(
    content: Content,
    schedulingData: ContentSchedulingData,
    userId: Types.ObjectId,
    parentEventId: Types.ObjectId,
  ): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    const recurrence = schedulingData.recurrence!;

    // Calculate recurring dates
    const recurringDates = this.calculateRecurringDates(
      schedulingData.startDate,
      recurrence,
    );

    for (const [index, date] of recurringDates.entries()) {
      if (index === 0) continue; // Skip first occurrence (already created as main event)

      const eventData: Partial<CalendarEvent> = {
        userId,
        title: `Recurring: ${content.title} (#${index + 1})`,
        description: `Recurring publication of "${
          content.title
        }" - Occurrence ${index + 1}`,
        startDate: date,
        endDate: new Date(date.getTime() + 30 * 60 * 1000),
        allDay: schedulingData.allDay || false,
        timezone: schedulingData.timezone || 'UTC',
        eventType: 'content_publishing',
        status: 'scheduled',
        priority: 'medium',

        // Content association
        contentId: content._id,
        platform: content.platform,

        // Recurrence info
        recurrence: {
          frequency: recurrence.frequency,
          interval: recurrence.interval,
          daysOfWeek: recurrence.daysOfWeek,
          endDate: recurrence.endDate,
          occurrences: recurrence.occurrences,
        },
        parentEventId,

        // Automation
        autoPublish: schedulingData.autoPublish || false,

        // Metadata
        tags: [...content.tags, 'recurring'],
        color: this.getContentTypeColor(content.type),
        notes: `Recurring event ${index + 1} for ${content.title}`,

        createdBy: userId,
      };

      const event = await CalendarRepo.create(eventData as CalendarEvent);
      events.push(event);
    }

    return events;
  }

  /**
   * Updates calendar events when content scheduling is updated
   */
  async updateCalendarEventsForContent(
    contentId: Types.ObjectId,
    schedulingData: ContentSchedulingData,
  ): Promise<void> {
    // Find existing events for this content
    const existingEvents = await CalendarRepo.findByContentId(contentId);

    // Update main event
    if (existingEvents.length > 0) {
      const mainEvent =
        existingEvents.find((e) => !e.parentEventId) || existingEvents[0];

      const updateData = {
        ...mainEvent,
        startDate: schedulingData.startDate,
        endDate: schedulingData.endDate || mainEvent.endDate,
        timezone: schedulingData.timezone || mainEvent.timezone,
        allDay: schedulingData.allDay ?? mainEvent.allDay,
        autoPublish: schedulingData.autoPublish ?? mainEvent.autoPublish,
        reminders: schedulingData.reminders || mainEvent.reminders,
      };

      await CalendarRepo.update(updateData);
    }
  }

  /**
   * Removes calendar events when content is deleted
   */
  async removeCalendarEventsForContent(
    contentId: Types.ObjectId,
  ): Promise<void> {
    await CalendarRepo.removeByContentId(contentId);
  }

  /**
   * Helper methods
   */
  private calculateRecurringDates(
    startDate: Date,
    recurrence: ContentSchedulingData['recurrence'],
  ): Date[] {
    const dates: Date[] = [startDate];

    if (!recurrence) return dates;

    const maxOccurrences = recurrence.occurrences || 10; // Default limit
    const endDate = recurrence.endDate;
    let currentDate = new Date(startDate);

    for (let i = 1; i < maxOccurrences; i++) {
      switch (recurrence.frequency) {
        case 'daily':
          currentDate = new Date(
            currentDate.getTime() + recurrence.interval * 24 * 60 * 60 * 1000,
          );
          break;
        case 'weekly':
          currentDate = new Date(
            currentDate.getTime() +
              recurrence.interval * 7 * 24 * 60 * 60 * 1000,
          );
          break;
        case 'monthly':
          currentDate = new Date(currentDate);
          currentDate.setMonth(currentDate.getMonth() + recurrence.interval);
          break;
        case 'yearly':
          currentDate = new Date(currentDate);
          currentDate.setFullYear(
            currentDate.getFullYear() + recurrence.interval,
          );
          break;
      }

      if (endDate && currentDate > endDate) break;

      dates.push(new Date(currentDate));
    }

    return dates;
  }

  private getContentTypeColor(type: Content['type']): string {
    const colors: { [key: string]: string } = {
      article: '#3B82F6', // Blue
      video: '#EF4444', // Red
      social: '#10B981', // Green
      podcast: '#8B5CF6', // Purple
      newsletter: '#F59E0B', // Yellow
      blog_post: '#06B6D4', // Cyan
    };

    return colors[type] || '#6B7280'; // Gray fallback
  }

  private getPlatformColor(platform: string): string {
    const colors: { [key: string]: string } = {
      instagram: '#E1306C',
      twitter: '#1DA1F2',
      linkedin: '#0077B5',
      facebook: '#1877F2',
      tiktok: '#000000',
      youtube: '#FF0000',
      pinterest: '#BD081C',
    };

    return colors[platform.toLowerCase()] || '#6B7280';
  }
}
