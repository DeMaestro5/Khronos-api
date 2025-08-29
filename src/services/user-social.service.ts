import { Types } from 'mongoose';
import {
  RealTimeMetrics,
  SocialMediaAPIService,
} from './social-media-apis.service';
import {
  getConnection,
  getFacebookConnectionByUser,
  getInstagramConnectionByUser,
  getLinkedinConnectionByUser,
  getTiktokConnectionByUser,
  getTwitterConnectionByUser,
} from '../database/repository/PlatformConnectionRepo';
import { decryptIfPresent } from '../helpers/crypto';
import axios from 'axios';

export class UserSocialService {
  private api: SocialMediaAPIService;

  constructor() {
    this.api = new SocialMediaAPIService();
  }

  async getYoutubeMetricsForUser(
    userId: Types.ObjectId,
    videoId: string,
  ): Promise<RealTimeMetrics> {
    const conn = await getConnection(userId, 'youtube');
    if (!conn?.isActive) {
      return this.api.getYouTubeRealTimeMetrics(videoId);
    }

    return this.api.getYouTubeRealTimeMetrics(videoId);
  }

  private normalize(
    p: Partial<{
      likes: number;
      comments: number;
      views: number;
      reach: number;
      shares: number;
      impressions: number;
      engagement: number;
    }>,
  ) {
    return {
      metrics: {
        likes: p.likes ?? 0,
        comments: p.comments ?? 0,
        views: p.views ?? 0,
        reach: p.reach ?? 0,
        impressions: p.impressions ?? 0,
        shares: p.shares ?? 0,
        engagement:
          p.engagement ?? (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0),
      },
    };
  }

  async getInstagramMetricsForUser(userId: Types.ObjectId, mediaId: string) {
    const conn = await getInstagramConnectionByUser(userId);
    const igToken = decryptIfPresent(
      conn?.platformCredentials?.instagram?.igUserAccessTokenEnc,
    );
    if (
      !igToken ||
      !conn?.platformCredentials?.instagram?.igBusinessAccountId
    ) {
      throw new Error('missing_instagram_token_or_business_account');
    }

    const fields = 'like_count,comments_count,media_count,media_product_type';
    const base = `https://graph.facebook.com/v19.0/${mediaId}/media?fields=${fields}&access_token=${igToken}`;
    const mediaResponse = await axios.get(base, { timeout: 15000 });

    const likeCount = Number(mediaResponse.data?.like_count || 0);
    const commentCount = Number(mediaResponse.data?.comments_count || 0);

    let reach = 0,
      impressions = 0,
      engagement = likeCount + commentCount,
      views = 0;

    try {
      const insightResponse = await axios.get(
        `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=impressions,reach,engagement,saved,video_views&access_token=${igToken}`,
        { timeout: 15000 },
      );

      const rows = Array.isArray(insightResponse.data?.data)
        ? insightResponse.data.data
        : [];

      for (const row of rows) {
        if (row?.name === 'reach') reach = Number(row?.values?.[0]?.value || 0);
        if (row?.name === 'impressions')
          impressions = Number(row?.values?.[0]?.value || 0);
        if (row?.name === 'engagement')
          engagement = Number(row?.values?.[0]?.value || 0);
        if (row?.name === 'video_views')
          views = Number(row?.values?.[0]?.value || 0);
      }
    } catch (error) {}
    return this.normalize({
      likes: likeCount,
      comments: commentCount,
      reach,
      impressions,
      views,
      engagement,
    });
  }

  async getFacebookMetricsForUser(userId: Types.ObjectId, postId: string) {
    const conn = await getFacebookConnectionByUser(userId);
    const pageToken = decryptIfPresent(
      conn?.platformCredentials?.facebook?.pageAccessTokenEnc,
    );
    if (!pageToken) throw new Error('missing_facebook_page_token');

    const url = `https://graph.facebook.com/v19.0/${postId}/insights`;
    const params = {
      metric:
        'post_engagement_impressions,post_engaged_users,post_reactions_by_type_total',
      access_token: pageToken,
    };

    const { data } = await axios.get(url, { params, timeout: 15000 });
    const rows = Array.isArray(data?.data) ? data.data : [];

    let impressions = 0,
      engagement = 0,
      likes = 0,
      comments = 0,
      shares = 0;

    for (const row of rows) {
      if (row?.name === 'post_engagements')
        impressions = Number(row?.values?.[0]?.value || 0);
      if (row?.name === 'post_engaged_users')
        engagement = Number(row?.value?.[0]?.value || 0);
      if (row?.name === 'post_reactions_by_type_total') {
        const v = row?.values?.[0]?.value || {};
        likes = Number(v.like || 0);
        // Comments/Shares typically require separate calls:
        // comments via /{postId}/comments?summary=true
        // shares via /?fields=shares
      }
    }

    try {
      const commentsResponse = await axios.get(
        `https://graph.facebook.com/v19.0/${postId}/comments?summary=true&access_token=${pageToken}`,
        { timeout: 15000 },
      );
      comments = Number(commentsResponse.data?.summary?.total_count || 0);
    } catch {}

    try {
      const sharesResponse = await axios.get(
        `https://graph.facebook.com/v19.0/${postId}?fields=shares&access_token=${pageToken}`,
        { timeout: 15000 },
      );
      shares = Number(sharesResponse.data?.shares?.count || 0);
    } catch {}

    const views = impressions;
    const reach = impressions;

    return this.normalize({
      likes,
      comments,
      shares,
      views,
      reach,
      impressions,
      engagement,
    });
  }

  async getTikTokMetricsForUser(userId: Types.ObjectId, videoId: string) {
    const conn = await getTiktokConnectionByUser(userId);
    const token = decryptIfPresent(
      conn?.platformCredentials?.tiktok?.accessTokenEnc,
    );
    const openId = conn?.platformCredentials?.tiktok?.openId;

    if (!token || !openId) {
      throw new Error('missing_tiktok_credentials');
    }
    const url = 'https://open.tiktokapis.com/v2/video/query/';
    const body = { open_id: openId, video_ids: [videoId] };

    const { data } = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const video = Array.isArray(data?.data?.videos)
      ? data.data.videos[0]
      : undefined;
    const stats = video?.statistics || {};
    const likes = Number(stats?.digg_count || 0);
    const comments = Number(stats?.comment_count || 0);
    const shares = Number(stats?.share_count || 0);
    const views = Number(stats?.play_count || 0);
    const reach = views;
    const impressions = views;

    return this.normalize({
      likes,
      comments,
      shares,
      views,
      reach,
      impressions,
    });
  }

  async getLinkedInMetricsForUser(userId: Types.ObjectId, postUrn: string) {
    const conn = await getLinkedinConnectionByUser(userId);
    const token = decryptIfPresent(
      conn?.platformCredentials?.linkedin?.accessTokenEnc,
    );
    if (!token) throw new Error('missing_linkedin_token');

    const url =
      'https://api.linkedin.com/v2/socialActions/' +
      encodeURIComponent(postUrn);
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });

    const likes = Number(data?.likesSummary?.totalLikes || 0);
    const comments = Number(
      data?.commentsSummary?.totalFirstLevelComments || 0,
    );
    const impressions = Number(data?.impressionsSummary?.impressionsCount || 0);
    const shares = Number(data?.sharesSummary?.shareCount || 0);
    const views = impressions;
    const reach = impressions;

    return this.normalize({
      likes,
      comments,
      shares,
      views,
      reach,
      impressions,
    });
  }

  async getTwitterMetricsForUser(userId: Types.ObjectId, tweetId: string) {
    const conn = await getTwitterConnectionByUser(userId);
    const token = decryptIfPresent(
      conn?.platformCredentials?.twitter?.accessTokenEnc,
    );
    if (!token) throw new Error('missing_twitter_token');

    const url = `https://api.twitter.com/2/tweets/${encodeURIComponent(
      tweetId,
    )}?tweet.fields=public_metrics`;

    let data;

    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });
      data = response.data;
    } catch (error) {
      return this.normalize({});
    }
    const pm = data?.data?.public_metrics || {};

    const likes = Number(pm?.like_count || 0);
    const replies = Number(pm?.reply_count || 0);
    const retweets = Number(pm?.retweet_count || 0);
    const quotes = Number(pm?.quote_count || 0);

    return this.normalize({
      likes,
      comments: replies,
      shares: retweets + quotes,
      views: 0,
      reach: 0,
      impressions: 0,
    });
  }
}
