import { Types } from 'mongoose';

export interface OverviewAnalytics {
  totalContent: number;
  totalEngagement: number;
  totalReach: number;
  averageEngagementRate: number;
  topPerformingPlatform: string;
  recentGrowth: number;
  contentPerformance: {
    excellent: number;
    good: number;
    average: number;
    needsImprovement: number;
  };
  platformBreakdown: Record<
    string,
    {
      count: number;
      engagement: number;
      reach: number;
      trend: 'up' | 'down' | 'stable';
    }
  >;
  timeSeriesData: Array<{
    date: string;
    engagement: number;
    reach: number;
    content: number;
  }>;
}

export interface ContentPerformance {
  _id: Types.ObjectId;
  contentId: Types.ObjectId;
  platform: string;
  metrics: any;
  audience: {
    demographics: any;
  };
  performance: {
    score: number;
    ranking: number;
    trend: 'up' | 'down' | 'stable';
    growthRate: number;
    competitorComparison: number;
  };
  period: {
    start: Date;
    end: Date;
  };
  realTimeMetrics?: {
    liveViewers?: number;
    currentEngagementRate?: number;
    trendinessScore?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface EngagementMetrics {
  totalEngagement: number;
  engagementRate: number;
  engagementGrowth: number;
  breakdown: {
    likes: number;
    shares: number;
    comments: number;
    saves: number;
    clicks: number;
  };
  topEngagingContent: Array<{
    contentId: string;
    title: string;
    engagement: number;
    platform: string;
  }>;
  hourlyEngagement: Record<string, number>;
  dailyEngagement: Record<string, number>;
  qualityScore: number;
}

// Convert data to CSV format
export function convertToCSV(data: any): string {
  const headers = Object.keys(data.data);
  const csvContent =
    headers.join(',') +
    '\n' +
    headers
      .map((header) =>
        typeof data.data[header] === 'object'
          ? JSON.stringify(data.data[header])
          : data.data[header],
      )
      .join(',');

  return csvContent;
}

// Get empty overview analytics structure
export function getEmptyOverviewAnalytics(): OverviewAnalytics {
  return {
    totalContent: 0,
    totalEngagement: 0,
    totalReach: 0,
    averageEngagementRate: 0,
    topPerformingPlatform: 'instagram',
    recentGrowth: 0,
    contentPerformance: {
      excellent: 0,
      good: 0,
      average: 0,
      needsImprovement: 0,
    },
    platformBreakdown: {},
    timeSeriesData: [],
  };
}

// Get day name from number
export function getDayName(dayNumber: number): string {
  const days = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return days[dayNumber] || 'Tuesday';
}
