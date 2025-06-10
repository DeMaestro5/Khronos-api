import Content from '../../database/model/content';

export interface AudienceInsights {
  totalAudience: number;
  audienceGrowth: number;
  demographics: {
    age: Record<string, number>;
    gender: Record<string, number>;
    location: Record<string, number>;
    interests: string[];
    devices: Record<string, number>;
  };
  behavior: {
    bestPostingTimes: string[];
    mostEngagingContentTypes: string[];
    averageSessionDuration: number;
    bounceRate: number;
  };
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

// Calculate real audience insights from content data
export function calculateRealAudienceInsights(
  contents: Content[],
): AudienceInsights['demographics'] {
  const interests: string[] = [];
  const targetAudiences: string[] = [];

  // Extract interests from content tags and target audiences
  contents.forEach((content) => {
    if (content.tags) interests.push(...content.tags);
    if (content.metadata?.targetAudience)
      targetAudiences.push(...content.metadata.targetAudience);
  });

  // Count unique interests
  const interestCounts = interests.reduce(
    (acc, interest) => {
      acc[interest] = (acc[interest] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topInterests = Object.entries(interestCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([interest]) => interest);

  return {
    age: {
      '18-24': 0,
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55+': 0,
    },
    gender: {
      male: 0,
      female: 0,
      other: 0,
    },
    location: {
      Unknown: 100,
    },
    interests: topInterests.length > 0 ? topInterests : ['General'],
    devices: {
      mobile: 0,
      desktop: 0,
      tablet: 0,
    },
  };
}
