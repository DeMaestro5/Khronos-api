import { Types } from 'mongoose';
import { getJson, setJsonWithTTL, flushByPattern } from '../query';
import { DynamicKey, getUserCacheKey } from '../keys';
import Content from '../../database/model/content';
import { IChatSession } from '../../database/model/chat';
import CalendarEvent from '../../database/model/calendar';
import { UserSettings } from '../../types/settings.types';
import Logger from '../../core/Logger';

interface CachedData<T> {
  data: T;
  cachedAt: Date;
  expiresAt: Date;
}

export class UserCache {
  // Cache TTL values (in seconds)
  private static readonly CONTENT_LIST_TTL = 5 * 60; // 5 minutes
  private static readonly USER_SETTINGS_TTL = 30 * 60; // 30 minutes
  private static readonly CHAT_SESSIONS_TTL = 2 * 60; // 2 minutes
  private static readonly CALENDAR_EVENTS_TTL = 10 * 60; // 10 minutes
  private static readonly USER_PROFILE_TTL = 60 * 60; // 1 hour

  /**
   * **User Content List Caching**
   *
   * Why 5 minutes? Content lists are frequently accessed but can change when users
   * create, edit, or delete content. 5 minutes provides good performance while
   * ensuring users see their latest content relatively quickly.
   */
  static async getUserContent(
    userId: Types.ObjectId,
  ): Promise<Content[] | null> {
    try {
      const key = getUserCacheKey(DynamicKey.USER_CONTENT, userId.toString());
      const cached = await getJson<CachedData<Content[]>>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(`Cache HIT for user content - User: ${userId}`);
        return cached.data;
      }

      Logger.info(`Cache MISS for user content - User: ${userId}`);
      return null;
    } catch (error) {
      Logger.error('Error getting cached user content:', error);
      return null;
    }
  }

  static async setUserContent(
    userId: Types.ObjectId,
    data: Content[],
  ): Promise<void> {
    try {
      const key = getUserCacheKey(DynamicKey.USER_CONTENT, userId.toString());
      const cachedData: CachedData<Content[]> = {
        data,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.CONTENT_LIST_TTL * 1000),
      };

      await setJsonWithTTL(key, cachedData, this.CONTENT_LIST_TTL);
      Logger.info(
        `Cached user content for user: ${userId} (${data.length} items)`,
      );
    } catch (error) {
      Logger.error('Error caching user content:', error);
    }
  }

  /**
   * **User Settings Caching**
   *
   * Why 30 minutes? User settings don't change frequently but are accessed on every
   * request for personalization. 30 minutes provides excellent performance while
   * ensuring settings changes are reflected reasonably quickly.
   */
  static async getUserSettings(
    userId: Types.ObjectId,
  ): Promise<UserSettings | null> {
    try {
      const key = getUserCacheKey(DynamicKey.USER_SETTINGS, userId.toString());
      const cached = await getJson<CachedData<UserSettings>>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(`Cache HIT for user settings - User: ${userId}`);
        return cached.data;
      }

      Logger.info(`Cache MISS for user settings - User: ${userId}`);
      return null;
    } catch (error) {
      Logger.error('Error getting cached user settings:', error);
      return null;
    }
  }

  static async setUserSettings(
    userId: Types.ObjectId,
    data: UserSettings,
  ): Promise<void> {
    try {
      const key = getUserCacheKey(DynamicKey.USER_SETTINGS, userId.toString());
      const cachedData: CachedData<UserSettings> = {
        data,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.USER_SETTINGS_TTL * 1000),
      };

      await setJsonWithTTL(key, cachedData, this.USER_SETTINGS_TTL);
      Logger.info(`Cached user settings for user: ${userId}`);
    } catch (error) {
      Logger.error('Error caching user settings:', error);
    }
  }

  /**
   * **Chat Sessions Caching**
   *
   * Why 2 minutes? Chat sessions are highly dynamic and change frequently during
   * active conversations. 2 minutes provides performance benefits while ensuring
   * real-time conversation experience.
   */
  static async getUserChatSessions(
    userId: Types.ObjectId,
  ): Promise<IChatSession[] | null> {
    try {
      const key = getUserCacheKey(DynamicKey.USER_SESSIONS, userId.toString());
      const cached = await getJson<CachedData<IChatSession[]>>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(`Cache HIT for chat sessions - User: ${userId}`);
        return cached.data;
      }

      Logger.info(`Cache MISS for chat sessions - User: ${userId}`);
      return null;
    } catch (error) {
      Logger.error('Error getting cached chat sessions:', error);
      return null;
    }
  }

  static async setUserChatSessions(
    userId: Types.ObjectId,
    data: IChatSession[],
  ): Promise<void> {
    try {
      const key = getUserCacheKey(DynamicKey.USER_SESSIONS, userId.toString());
      const cachedData: CachedData<IChatSession[]> = {
        data,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.CHAT_SESSIONS_TTL * 1000),
      };

      await setJsonWithTTL(key, cachedData, this.CHAT_SESSIONS_TTL);
      Logger.info(
        `Cached chat sessions for user: ${userId} (${data.length} sessions)`,
      );
    } catch (error) {
      Logger.error('Error caching chat sessions:', error);
    }
  }

  /**
   * **Calendar Events Caching**
   *
   * Why 10 minutes? Calendar events are accessed frequently for scheduling views
   * but don't change extremely often. 10 minutes balances performance with ensuring
   * users see their latest scheduled content.
   */
  static async getUserCalendarEvents(
    userId: Types.ObjectId,
  ): Promise<CalendarEvent[] | null> {
    try {
      const key = getUserCacheKey(DynamicKey.USER_CALENDAR, userId.toString());
      const cached = await getJson<CachedData<CalendarEvent[]>>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(`Cache HIT for calendar events - User: ${userId}`);
        return cached.data;
      }

      Logger.info(`Cache MISS for calendar events - User: ${userId}`);
      return null;
    } catch (error) {
      Logger.error('Error getting cached calendar events:', error);
      return null;
    }
  }

  static async setUserCalendarEvents(
    userId: Types.ObjectId,
    data: CalendarEvent[],
  ): Promise<void> {
    try {
      const key = getUserCacheKey(DynamicKey.USER_CALENDAR, userId.toString());
      const cachedData: CachedData<CalendarEvent[]> = {
        data,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.CALENDAR_EVENTS_TTL * 1000),
      };

      await setJsonWithTTL(key, cachedData, this.CALENDAR_EVENTS_TTL);
      Logger.info(
        `Cached calendar events for user: ${userId} (${data.length} events)`,
      );
    } catch (error) {
      Logger.error('Error caching calendar events:', error);
    }
  }

  /**
   * **User Notifications Caching**
   *
   * Why 1 minute? Notifications need to be very fresh to provide timely updates
   * to users, but still benefit from caching to reduce database load.
   */
  static async getUserNotifications(
    userId: Types.ObjectId,
  ): Promise<any[] | null> {
    try {
      const key = getUserCacheKey(
        DynamicKey.USER_NOTIFICATIONS,
        userId.toString(),
      );
      const cached = await getJson<CachedData<any[]>>(key);

      if (cached && new Date() < new Date(cached.expiresAt)) {
        Logger.info(`Cache HIT for user notifications - User: ${userId}`);
        return cached.data;
      }

      Logger.info(`Cache MISS for user notifications - User: ${userId}`);
      return null;
    } catch (error) {
      Logger.error('Error getting cached user notifications:', error);
      return null;
    }
  }

  static async setUserNotifications(
    userId: Types.ObjectId,
    data: any[],
  ): Promise<void> {
    try {
      const key = getUserCacheKey(
        DynamicKey.USER_NOTIFICATIONS,
        userId.toString(),
      );
      const cachedData: CachedData<any[]> = {
        data,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 1000), // 1 minute
      };

      await setJsonWithTTL(key, cachedData, 60);
      Logger.info(
        `Cached notifications for user: ${userId} (${data.length} notifications)`,
      );
    } catch (error) {
      Logger.error('Error caching user notifications:', error);
    }
  }

  /**
   * **Cache Invalidation Methods**
   *
   * Critical for maintaining data consistency when users modify their data
   */
  static async invalidateUserContent(userId: Types.ObjectId): Promise<void> {
    try {
      const pattern = `USER_CONTENT_${userId}*`;
      await flushByPattern(pattern);
      Logger.info(`Invalidated content cache for user: ${userId}`);
    } catch (error) {
      Logger.error('Error invalidating user content cache:', error);
    }
  }

  static async invalidateUserSettings(userId: Types.ObjectId): Promise<void> {
    try {
      const pattern = `USER_SETTINGS_${userId}*`;
      await flushByPattern(pattern);
      Logger.info(`Invalidated settings cache for user: ${userId}`);
    } catch (error) {
      Logger.error('Error invalidating user settings cache:', error);
    }
  }

  static async invalidateUserChatSessions(
    userId: Types.ObjectId,
  ): Promise<void> {
    try {
      const pattern = `USER_SESSIONS_${userId}*`;
      await flushByPattern(pattern);
      Logger.info(`Invalidated chat sessions cache for user: ${userId}`);
    } catch (error) {
      Logger.error('Error invalidating chat sessions cache:', error);
    }
  }

  static async invalidateUserCalendar(userId: Types.ObjectId): Promise<void> {
    try {
      const pattern = `USER_CALENDAR_${userId}*`;
      await flushByPattern(pattern);
      Logger.info(`Invalidated calendar cache for user: ${userId}`);
    } catch (error) {
      Logger.error('Error invalidating calendar cache:', error);
    }
  }

  static async invalidateAllUserData(userId: Types.ObjectId): Promise<void> {
    try {
      const patterns = [
        `USER_CONTENT_${userId}*`,
        `USER_SETTINGS_${userId}*`,
        `USER_SESSIONS_${userId}*`,
        `USER_CALENDAR_${userId}*`,
        `USER_NOTIFICATIONS_${userId}*`,
        `USER_ANALYTICS_${userId}*`,
      ];

      for (const pattern of patterns) {
        await flushByPattern(pattern);
      }

      Logger.info(`Invalidated all cached data for user: ${userId}`);
    } catch (error) {
      Logger.error('Error invalidating all user cache:', error);
    }
  }

  /**
   * **Cache Health Monitoring**
   */
  static async getCacheHealth(userId: Types.ObjectId): Promise<{
    content: boolean;
    settings: boolean;
    sessions: boolean;
    calendar: boolean;
    notifications: boolean;
  }> {
    try {
      const contentKey = getUserCacheKey(
        DynamicKey.USER_CONTENT,
        userId.toString(),
      );
      const settingsKey = getUserCacheKey(
        DynamicKey.USER_SETTINGS,
        userId.toString(),
      );
      const sessionsKey = getUserCacheKey(
        DynamicKey.USER_SESSIONS,
        userId.toString(),
      );
      const calendarKey = getUserCacheKey(
        DynamicKey.USER_CALENDAR,
        userId.toString(),
      );
      const notificationsKey = getUserCacheKey(
        DynamicKey.USER_NOTIFICATIONS,
        userId.toString(),
      );

      const [
        contentCached,
        settingsCached,
        sessionsCached,
        calendarCached,
        notificationsCached,
      ] = await Promise.all([
        getJson(contentKey),
        getJson(settingsKey),
        getJson(sessionsKey),
        getJson(calendarKey),
        getJson(notificationsKey),
      ]);

      return {
        content: !!contentCached,
        settings: !!settingsCached,
        sessions: !!sessionsCached,
        calendar: !!calendarCached,
        notifications: !!notificationsCached,
      };
    } catch (error) {
      Logger.error('Error checking cache health:', error);
      return {
        content: false,
        settings: false,
        sessions: false,
        calendar: false,
        notifications: false,
      };
    }
  }
}
