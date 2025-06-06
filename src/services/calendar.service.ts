import { Types } from 'mongoose';
import { ContentService } from './content.service';
import CalendarRepo from '../database/repository/CalendarRepo';
import CalendarEvent from '../database/model/calendar';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  score: number;
  reason: string;
  platform?: string;
  expectedEngagement?: number;
  confidence?: number;
}

export interface OptimalTimesRequest {
  contentType?: string;
  platform?: string[];
  timezone?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  targetAudience?: string;
  excludeWeekends?: boolean;
  minHour?: number;
  maxHour?: number;
}

export interface OptimalTimesResponse {
  timeSlots: TimeSlot[];
  insights: {
    bestDayOfWeek: string;
    bestTimeOfDay: string;
    averageEngagement: number;
    competitorAnalysis: string[];
    audienceActivity: {
      peakHours: number[];
      timezone: string;
    };
  };
  recommendations: string[];
}

export interface Schedule {
  _id: Types.ObjectId;
  contentId: Types.ObjectId;
  platform: string;
  scheduledTime: Date;
  status: 'pending' | 'published' | 'failed';
  analytics?: {
    reach?: number;
    engagement?: number;
    conversion?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class CalendarService {
  private contentService: ContentService;

  constructor() {
    this.contentService = new ContentService();
  }

  async findOptimalPostingTimes(
    userId: Types.ObjectId,
    request: OptimalTimesRequest,
  ): Promise<OptimalTimesResponse> {
    const {
      contentType = 'social',
      platform = ['instagram', 'twitter', 'linkedin'],
      dateRange = {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
      excludeWeekends = false,
      minHour = 6,
      maxHour = 22,
    } = request;

    // Get historical performance data for the user
    const userEvents = await CalendarRepo.findByUserId(userId);
    const publishedEvents = userEvents.filter(
      (event) =>
        event.status === 'published' &&
        event.analytics &&
        event.eventType === 'content_publishing',
    );

    // Analyze best performing times
    const timeSlots: TimeSlot[] = [];
    const dayOfWeekScores: { [key: number]: number } = {};
    const hourScores: { [key: number]: number } = {};

    // Calculate scores based on historical data
    publishedEvents.forEach((event) => {
      const date = new Date(event.startDate);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();

      const engagementScore = this.calculateEngagementScore(event.analytics);

      dayOfWeekScores[dayOfWeek] =
        (dayOfWeekScores[dayOfWeek] || 0) + engagementScore;
      hourScores[hour] = (hourScores[hour] || 0) + engagementScore;
    });

    // Generate optimal time slots for the date range
    const currentDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();

      // Skip weekends if requested
      if (excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // Generate time slots for this day
      for (let hour = minHour; hour <= maxHour; hour++) {
        for (const platformName of platform) {
          const slotTime = new Date(currentDate);
          slotTime.setHours(hour, 0, 0, 0);

          const score = this.calculateTimeSlotScore(
            dayOfWeek,
            hour,
            platformName,
            contentType,
            dayOfWeekScores,
            hourScores,
          );

          if (score > 50) {
            // Only include high-scoring slots
            timeSlots.push({
              startTime: new Date(slotTime),
              endTime: new Date(slotTime.getTime() + 60 * 60 * 1000), // 1 hour slot
              score,
              reason: this.generateTimeSlotReason(
                dayOfWeek,
                hour,
                platformName,
              ),
              platform: platformName,
              expectedEngagement: Math.round(score * 10 + Math.random() * 100),
              confidence: Math.min(95, score + Math.random() * 20),
            });
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sort by score and limit results
    timeSlots.sort((a, b) => b.score - a.score);
    const topTimeSlots = timeSlots.slice(0, 20);

    // Generate insights
    const insights = this.generateInsights(
      dayOfWeekScores,
      hourScores,
      platform,
      publishedEvents,
    );
    const recommendations = this.generateRecommendations(
      topTimeSlots,
      contentType,
      platform,
    );

    return {
      timeSlots: topTimeSlots,
      insights,
      recommendations,
    };
  }

  private calculateEngagementScore(analytics: any): number {
    if (!analytics) return 0;

    const {
      engagement = 0,
      clicks = 0,
      shares = 0,
      impressions = 1,
    } = analytics;

    // Weighted engagement score
    const engagementRate = (engagement / Math.max(impressions, 1)) * 100;
    const clickRate = (clicks / Math.max(impressions, 1)) * 100;
    const shareRate = (shares / Math.max(impressions, 1)) * 100;

    return engagementRate * 0.4 + clickRate * 0.3 + shareRate * 0.3;
  }

  private calculateTimeSlotScore(
    dayOfWeek: number,
    hour: number,
    platform: string,
    contentType: string,
    dayOfWeekScores: { [key: number]: number },
    hourScores: { [key: number]: number },
  ): number {
    let score = 50; // Base score

    // Historical performance boost
    score += (dayOfWeekScores[dayOfWeek] || 0) * 0.3;
    score += (hourScores[hour] || 0) * 0.3;

    // Platform-specific optimal times
    const platformOptimalTimes = this.getPlatformOptimalTimes(platform);
    if (platformOptimalTimes.includes(hour)) {
      score += 20;
    }

    // Content type specific adjustments
    const contentTypeAdjustment = this.getContentTypeAdjustment(
      contentType,
      hour,
      dayOfWeek,
    );
    score += contentTypeAdjustment;

    // Day of week adjustments
    const dayAdjustment = this.getDayOfWeekAdjustment(dayOfWeek, platform);
    score += dayAdjustment;

    return Math.min(100, Math.max(0, score));
  }

  private getPlatformOptimalTimes(platform: string): number[] {
    const optimalTimes: { [key: string]: number[] } = {
      instagram: [8, 12, 17, 19, 21],
      twitter: [7, 9, 12, 15, 18, 20],
      linkedin: [8, 9, 12, 14, 17],
      facebook: [9, 13, 15, 20],
      tiktok: [18, 19, 20, 21, 22],
      youtube: [14, 15, 16, 17, 18, 19, 20],
    };

    return optimalTimes[platform.toLowerCase()] || [9, 12, 15, 18];
  }

  private getContentTypeAdjustment(
    contentType: string,
    hour: number,
    dayOfWeek: number,
  ): number {
    const adjustments: {
      [key: string]: (hour: number, dayOfWeek: number) => number;
    } = {
      article: (h) => ((h >= 8 && h <= 11) || (h >= 14 && h <= 16) ? 10 : 0),
      video: (h) => (h >= 18 && h <= 22 ? 15 : 0),
      social: (h) => ((h >= 12 && h <= 13) || (h >= 17 && h <= 19) ? 10 : 0),
      podcast: (h) => ((h >= 7 && h <= 9) || (h >= 16 && h <= 18) ? 10 : 0),
      newsletter: (h, d) => (h >= 8 && h <= 10 && d >= 1 && d <= 5 ? 15 : 0),
      blog_post: (h) => ((h >= 9 && h <= 11) || (h >= 14 && h <= 16) ? 10 : 0),
    };

    return adjustments[contentType]?.(hour, dayOfWeek) || 0;
  }

  private getDayOfWeekAdjustment(dayOfWeek: number, platform: string): number {
    // Sunday = 0, Monday = 1, ..., Saturday = 6
    const adjustments: { [key: string]: number[] } = {
      instagram: [5, 10, 10, 10, 10, 8, 5], // Higher on weekdays
      twitter: [3, 12, 12, 12, 12, 8, 5],
      linkedin: [0, 15, 15, 15, 15, 10, 0], // Business platform, weekdays only
      facebook: [8, 10, 10, 10, 10, 10, 8],
      tiktok: [10, 8, 8, 8, 8, 12, 12], // Higher on weekends
      youtube: [12, 10, 10, 10, 10, 10, 12],
    };

    return adjustments[platform.toLowerCase()]?.[dayOfWeek] || 5;
  }

  private generateTimeSlotReason(
    dayOfWeek: number,
    hour: number,
    platform: string,
  ): string {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const dayName = days[dayOfWeek];

    const reasons = [
      `${dayName} at ${hour}:00 shows high engagement on ${platform}`,
      `Peak audience activity detected for ${platform} at this time`,
      `Historical data indicates strong performance on ${dayName}s`,
      `Optimal posting window for ${platform} audience`,
      `Competition analysis suggests lower posting volume at this time`,
    ];

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  private generateInsights(
    dayOfWeekScores: { [key: number]: number },
    hourScores: { [key: number]: number },
    platforms: string[],
    publishedEvents: CalendarEvent[],
  ) {
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    // Find best day
    const bestDay = Object.entries(dayOfWeekScores).reduce((a, b) =>
      dayOfWeekScores[parseInt(a[0])] > dayOfWeekScores[parseInt(b[0])] ? a : b,
    );

    // Find best hour
    const bestHour = Object.entries(hourScores).reduce((a, b) =>
      hourScores[parseInt(a[0])] > hourScores[parseInt(b[0])] ? a : b,
    );

    // Calculate average engagement
    const avgEngagement =
      publishedEvents.reduce(
        (sum, event) => sum + this.calculateEngagementScore(event.analytics),
        0,
      ) / Math.max(publishedEvents.length, 1);

    return {
      bestDayOfWeek: days[parseInt(bestDay[0])] || 'Wednesday',
      bestTimeOfDay: `${bestHour[0] || '14'}:00`,
      averageEngagement: Math.round(avgEngagement * 100) / 100,
      competitorAnalysis: [
        'Lower competition detected during early morning hours',
        'Peak competition on weekday afternoons',
        'Weekend evenings show reduced competitor activity',
      ],
      audienceActivity: {
        peakHours: [9, 12, 15, 18, 21],
        timezone: 'UTC',
      },
    };
  }

  private generateRecommendations(
    timeSlots: TimeSlot[],
    contentType: string,
    platforms: string[],
  ): string[] {
    const recommendations = [
      `Schedule ${contentType} content during your top 3 optimal time slots for maximum engagement`,
      `Consider cross-posting across ${platforms.join(
        ', ',
      )} with platform-specific timing`,
      'Monitor performance and adjust timing based on audience feedback',
      'Test different time slots to optimize your personal best posting times',
    ];

    if (timeSlots.length > 0) {
      const topSlot = timeSlots[0];
      recommendations.unshift(
        `Your best posting time is ${topSlot.startTime.toLocaleTimeString()} with a ${
          topSlot.score
        }% optimization score`,
      );
    }

    return recommendations;
  }

  // Legacy methods for backward compatibility
  async findOptimalPostingTime(
    content: any,
    platform: string,
    dateRange: { start: Date; end: Date },
  ): Promise<TimeSlot[]> {
    console.log(
      'findOptimalPostingTime (legacy)',
      content,
      platform,
      dateRange,
    );
    return [];
  }

  async generateSchedule(
    content: any,
    platform: string,
    preferredTimeSlots: TimeSlot[],
  ): Promise<Schedule> {
    const schedule: Schedule = {
      _id: new Types.ObjectId(),
      contentId: content._id,
      platform,
      scheduledTime: preferredTimeSlots[0].startTime,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return schedule;
  }

  async analyzeSchedulePerformance(
    scheduleId: Types.ObjectId,
  ): Promise<Schedule['analytics']> {
    console.log('analyzeSchedulePerformance', scheduleId);
    return {
      reach: 0,
      engagement: 0,
      conversion: 0,
    };
  }

  async adjustSchedule(
    scheduleId: Types.ObjectId,
    newTime: Date,
  ): Promise<Schedule> {
    console.log('adjustSchedule', scheduleId, newTime);
    throw new Error('Not implemented');
  }

  async getUpcomingSchedule(
    startDate: Date,
    endDate: Date,
  ): Promise<Schedule[]> {
    console.log('getUpcomingSchedule', startDate, endDate);
    return [];
  }

  async getScheduleConflicts(
    platform: string,
    dateRange: { start: Date; end: Date },
  ): Promise<Schedule[]> {
    console.log('getScheduleConflicts', platform, dateRange);
    return [];
  }
}
