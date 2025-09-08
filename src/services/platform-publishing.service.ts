import { Types } from 'mongoose';
import { FacebookPublishingService } from './Social-Media/media/facebook-publishing.service';
import { InstagramPublishingService } from './Social-Media/media/instagram-publishing.service';
import { LinkedInPublishingService } from './Social-Media/media/linkedIn-publishing.service';
import { TikTokPublishingService } from './Social-Media/media/tiktok-publishing.service';
import { TwitterPublishingService } from './Social-Media/media/twitter-publishing.service';
import { YoutubePublishingService } from './Social-Media/media/youtube-publishing.service';

type Platform =
  | 'youtube'
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'tiktok';

interface PublishingResult {
  platform: Platform;
  success: boolean;
  postId?: string;
  error?: string;
}

interface ContentData {
  title: string;
  description: string;
  mediaUrl?: string; // hosted asset url (image/video) where applicable
  mediaType?: 'image' | 'video'; // when you’re actually sending media
  linkUrl?: string; // for link-preview style posts (facebook/linkedin)
  tags?: string[];
}

export class PlatformPublishingService {
  private youtubeService: YoutubePublishingService;
  private facebookService: FacebookPublishingService;
  private twitterService: TwitterPublishingService;
  private linkedinService: LinkedInPublishingService;
  private tiktokService: TikTokPublishingService;
  private instagramService: InstagramPublishingService;

  constructor() {
    this.youtubeService = new YoutubePublishingService();
    this.facebookService = new FacebookPublishingService();
    this.twitterService = new TwitterPublishingService();
    this.linkedinService = new LinkedInPublishingService();
    this.tiktokService = new TikTokPublishingService();
    this.instagramService = new InstagramPublishingService();
  }

  async publishToMultiplePlatforms(
    userId: Types.ObjectId,
    platforms: Platform[],
    content: ContentData,
  ): Promise<{
    results: PublishingResult[];
    platformPostIds: Record<string, string>;
  }> {
    const results: PublishingResult[] = [];
    const platformPostIds: Record<string, string> = {};

    for (const platform of platforms) {
      try {
        const result = await this.publishSinglePlatform(
          userId,
          platform,
          content,
        );
        results.push(result);
        if (result.success && result.postId) {
          platformPostIds[platform] = result.postId;
        }
      } catch (error: any) {
        results.push({
          platform,
          success: false,
          error: this.normalizeError(error),
        });
      }
    }

    return { results, platformPostIds };
  }

  private async publishSinglePlatform(
    userId: Types.ObjectId,
    platform: Platform,
    content: ContentData,
  ): Promise<PublishingResult> {
    switch (platform) {
      case 'youtube': {
        if (content.mediaType !== 'video' || !content.mediaUrl) {
          return this.fail(platform, 'youtube_requires_video_mediaUrl');
        }
        const res = await this.youtubeService.publishVideo(userId, {
          title: content.title,
          description: content.description,
          videoFile: content.mediaUrl,
          tags: content.tags,
        });
        return this.wrap(platform, res.success, res.videoId, res.error);
      }

      case 'instagram': {
        if (!content.mediaUrl || !content.mediaType) {
          return this.fail(
            platform,
            'instagram_requires_mediaUrl_and_mediaType',
          );
        }
        const res = await this.instagramService.publishInstagramPost(userId, {
          caption: content.description,
          imageUrl:
            content.mediaType === 'image' ? content.mediaUrl : undefined,
          videoUrl:
            content.mediaType === 'video' ? content.mediaUrl : undefined,
          mediaType: content.mediaType === 'video' ? 'video' : 'image',
        });
        return this.wrap(platform, res.success, res.postId, res.error);
      }

      case 'facebook': {
        const res = await this.facebookService.publishFacebookPost(userId, {
          message: content.description,
          link: content.linkUrl || undefined,
          imageUrl:
            content.mediaType === 'image' ? content.mediaUrl : undefined,
          videoUrl:
            content.mediaType === 'video' ? content.mediaUrl : undefined,
          mediaType: content.mediaType
            ? content.mediaType === 'video'
              ? 'video'
              : 'image'
            : content.linkUrl
              ? 'link'
              : 'text',
        });
        return this.wrap(platform, res.success, res.postId, res.error);
      }

      case 'twitter': {
        const res = await this.twitterService.publishTwitterPost(userId, {
          tweet: content.description,
          // mediaIds: ['<media_id_string>'], // add after media upload flow
        });
        return this.wrap(platform, res.success, res.postId, res.error);
      }

      case 'linkedin': {
        const res = await this.linkedinService.publishMemberPost(userId, {
          text: content.description,
          linkUrl: content.linkUrl,
          visibility: 'PUBLIC',
        });
        return this.wrap(platform, res.success, res.postId, res.error);
      }

      case 'tiktok': {
        if (content.mediaType !== 'video' || !content.mediaUrl) {
          return this.fail(platform, 'tiktok_requires_video_mediaUrl');
        }
        const res = await this.tiktokService.publishTikTokPost(userId, {
          caption: content.description,
          videoUrl: content.mediaUrl,
        });
        return this.wrap(platform, res.success, res.postId, res.error);
      }

      default:
        return this.fail(platform, `unsupported_platform_${platform}`);
    }
  }

  private wrap(
    platform: Platform,
    success: boolean,
    postId?: string,
    error?: string,
  ): PublishingResult {
    return { platform, success, postId, error };
  }

  private fail(platform: Platform, error: string): PublishingResult {
    return { platform, success: false, error };
  }

  private normalizeError(err: any): string {
    return (
      err?.response?.data?.error?.message ||
      err?.response?.data?.detail ||
      err?.response?.data?.message ||
      err?.message ||
      String(err)
    );
  }
}
