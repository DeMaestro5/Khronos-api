import { ChatContext } from '../../types/chat';

export class ContentInsightsGenerator {
  static async generateContentInsights(context: ChatContext): Promise<{
    strengths: string[];
    improvements: string[];
    recommendations: string[];
  }> {
    const insights = {
      strengths: [] as string[],
      improvements: [] as string[],
      recommendations: [] as string[],
    };

    if (context.contentType === 'social') {
      insights.strengths.push('Social content has high engagement potential');
      if (context.contentPlatform?.includes('instagram')) {
        insights.improvements.push(
          'Consider adding visual storytelling elements',
        );
        insights.recommendations.push(
          'Use Instagram Stories for behind-the-scenes content',
        );
      }
      if (context.contentPlatform?.includes('twitter')) {
        insights.improvements.push(
          'Optimize tweet timing for maximum visibility',
        );
        insights.recommendations.push('Use Twitter threads for complex topics');
      }
      if (context.contentPlatform?.includes('linkedin')) {
        insights.improvements.push(
          'Add professional insights and industry perspective',
        );
        insights.recommendations.push(
          'Engage with industry leaders in comments',
        );
      }
    }

    if (
      context.contentType === 'article' ||
      context.contentType === 'blog_post'
    ) {
      insights.strengths.push('Long-form content builds authority and trust');
      insights.improvements.push('Optimize for SEO with relevant keywords');
      insights.recommendations.push('Break content into scannable sections');
      insights.recommendations.push(
        'Include relevant internal and external links',
      );
    }

    if (context.contentType === 'video') {
      insights.strengths.push('Video content has high engagement rates');
      insights.improvements.push('Optimize thumbnail and title for clicks');
      insights.recommendations.push('Add captions for accessibility');
      insights.recommendations.push(
        'Create engaging hooks in first 15 seconds',
      );
    }

    // Platform-specific recommendations
    if (context.contentPlatform) {
      insights.recommendations.push(
        `Optimize posting time for ${context.contentPlatform.join(
          ' and ',
        )} audience`,
      );
    }

    // General recommendations
    insights.recommendations.push(
      'Track engagement metrics to refine strategy',
      'Create content variations for different platforms',
      'Use analytics to understand audience preferences',
    );

    return insights;
  }

  static generateContentTags(content: any): string[] {
    const tags = [...(content.tags || [])];
    tags.push(content.type);
    tags.push(...content.platform);
    tags.push('ai-assisted');
    return [...new Set(tags)];
  }

  static async buildContentContext(content: any): Promise<ChatContext> {
    return {
      contentId: content._id.toString(),
      contentTitle: content.title,
      contentType: content.type,
      contentPlatform: content.platform,
      contentDescription: content.description,
      contentBody: content.body || content.metadata?.body,
      contentTags: content.tags,
      contentStatus: content.status,
      userProfile: {
        name: content.userId.name || 'User',
        role: 'Content Creator',
      },
    };
  }
}
