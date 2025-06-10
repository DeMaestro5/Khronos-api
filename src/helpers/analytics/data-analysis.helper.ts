import Content from '../../database/model/content';

export function generateInsightsFromData(contents: Content[]): string[] {
  const insights: string[] = [];

  if (contents.length === 0) {
    insights.push('No content data available for analysis');
    return insights;
  }

  // Analyze content types
  const contentTypes = contents.reduce(
    (acc, content) => {
      acc[content.type] = (acc[content.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topContentType = Object.entries(contentTypes).sort(
    ([, a], [, b]) => b - a,
  )[0];
  if (topContentType) {
    insights.push(
      `${topContentType[0]} content represents ${Math.round(
        (topContentType[1] / contents.length) * 100,
      )}% of your content`,
    );
  }

  // Analyze platforms
  const platformUsage = contents.reduce(
    (acc, content) => {
      content.platform.forEach((platform) => {
        acc[platform] = (acc[platform] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>,
  );

  const topPlatform = Object.entries(platformUsage).sort(
    ([, a], [, b]) => b - a,
  )[0];
  if (topPlatform) {
    insights.push(
      `${topPlatform[0]} is your most active platform with ${topPlatform[1]} content pieces`,
    );
  }

  // Analyze posting frequency
  const now = new Date();
  const recentContent = contents.filter(
    (c) =>
      now.getTime() - new Date(c.createdAt).getTime() <
      30 * 24 * 60 * 60 * 1000,
  );

  if (recentContent.length > 0) {
    const avgPerDay = (recentContent.length / 30).toFixed(1);
    insights.push(
      `You're publishing an average of ${avgPerDay} content pieces per day`,
    );
  }

  return insights;
}

export function generateRecommendationsFromData(contents: Content[]): string[] {
  const recommendations: string[] = [];

  if (contents.length === 0) {
    recommendations.push('Start creating content to see recommendations');
    return recommendations;
  }

  // Analyze engagement performance
  const totalEngagement = contents.reduce((sum, content) => {
    return (
      sum +
      ((content.engagement?.likes || 0) +
        (content.engagement?.shares || 0) +
        (content.engagement?.comments || 0))
    );
  }, 0);

  const avgEngagement = totalEngagement / contents.length;

  if (avgEngagement < 10) {
    recommendations.push(
      'Focus on creating more engaging content with clear call-to-actions',
    );
  }

  // Analyze content variety
  const contentTypes = new Set(contents.map((c) => c.type));
  if (contentTypes.size < 3) {
    recommendations.push(
      'Diversify your content types to reach different audience preferences',
    );
  }

  // Analyze posting consistency
  const now = new Date();
  const last7Days = contents.filter(
    (c) =>
      now.getTime() - new Date(c.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000,
  );

  if (last7Days.length < 3) {
    recommendations.push(
      'Increase posting frequency to maintain audience engagement',
    );
  }

  // Platform recommendations
  const platformCount = new Set(contents.flatMap((c) => c.platform)).size;
  if (platformCount < 2) {
    recommendations.push(
      'Consider expanding to additional platforms to grow your reach',
    );
  }

  return recommendations;
}
