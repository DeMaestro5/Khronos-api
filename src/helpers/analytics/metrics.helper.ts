import Content from '../../database/model/content';

// Real-world platform data for benchmarking and calculations
export const PLATFORM_BENCHMARKS = {
  instagram: {
    avgEngagementRate: 1.22,
    avgReachRate: 0.15,
    avgClickThroughRate: 0.58,
    peakHours: [12, 17, 19, 21],
    bestDays: ['tuesday', 'wednesday', 'thursday'],
  },
  youtube: {
    avgEngagementRate: 4.5,
    avgReachRate: 0.25,
    avgClickThroughRate: 2.8,
    peakHours: [14, 20, 21],
    bestDays: ['saturday', 'sunday', 'friday'],
  },
  linkedin: {
    avgEngagementRate: 2.1,
    avgReachRate: 0.12,
    avgClickThroughRate: 0.45,
    peakHours: [8, 12, 17],
    bestDays: ['tuesday', 'wednesday', 'thursday'],
  },
  twitter: {
    avgEngagementRate: 1.8,
    avgReachRate: 0.18,
    avgClickThroughRate: 1.2,
    peakHours: [9, 12, 15, 18],
    bestDays: ['wednesday', 'thursday', 'friday'],
  },
  tiktok: {
    avgEngagementRate: 5.3,
    avgReachRate: 0.35,
    avgClickThroughRate: 1.6,
    peakHours: [18, 19, 20, 21],
    bestDays: ['monday', 'tuesday', 'wednesday'],
  },
  facebook: {
    avgEngagementRate: 0.9,
    avgReachRate: 0.08,
    avgClickThroughRate: 0.35,
    peakHours: [13, 15, 21],
    bestDays: ['wednesday', 'thursday', 'friday'],
  },
};

export interface AnalyticsMetrics {
  reach: number;
  engagement: number;
  conversion: number;
  clicks: number;
  shares: number;
  comments: number;
  likes: number;
  impressions: number;
  saves?: number;
  watchTime?: number;
  ctr?: number;
  cpm?: number;
  roi?: number;
}

// Extract real metrics from content data
export function extractRealMetrics(
  content: Content,
  platform: string,
): AnalyticsMetrics {
  // Get actual engagement data from content
  const engagement = content.engagement || {};
  const analytics = content.analytics || {};
  const stats = content.stats || {};

  // Use real data where available, fallback to 0 if not
  const totalEngagement =
    (engagement.likes || 0) +
    (engagement.shares || 0) +
    (engagement.comments || 0);
  const reach = analytics.reach || (stats as any)?.views || 0;
  const impressions = analytics.impressions || reach * 1.5; // Estimate if not available

  // Calculate real CTR and other derived metrics
  const clicks = engagement.clicks || (stats as any)?.clicks || 0;
  const ctr = impressions > 0 ? +((clicks / impressions) * 100).toFixed(2) : 0;

  return {
    impressions: Math.floor(impressions),
    reach: Math.floor(reach),
    engagement: totalEngagement,
    likes: engagement.likes || 0,
    comments: engagement.comments || 0,
    shares: engagement.shares || 0,
    saves: engagement.saves || 0,
    clicks: clicks,
    conversion: 0, // Would need campaign data to calculate
    watchTime:
      platform === 'youtube' ? (analytics as any)?.watchTime : undefined,
    ctr,
    cpm: 0, // Would need ad spend data
    roi: 0, // Would need investment and conversion data
  };
}

// Calculate content performance score based on real metrics
export function calculatePerformanceScore(
  content: Content,
  platform: string,
): number {
  const metrics = extractRealMetrics(content, platform);
  const benchmark =
    PLATFORM_BENCHMARKS[platform as keyof typeof PLATFORM_BENCHMARKS] ||
    PLATFORM_BENCHMARKS.instagram;

  if (metrics.reach === 0) return 0;

  const actualEngagementRate = (metrics.engagement / metrics.reach) * 100;
  const score = Math.min(
    100,
    (actualEngagementRate / benchmark.avgEngagementRate) * 100,
  );

  return Math.max(0, score);
}
