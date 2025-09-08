import axios from 'axios';
import { Types } from 'mongoose';
import { getFacebookConnectionByUser } from '../../../database/repository/PlatformConnectionRepo';
import { decryptIfPresent } from '../../../helpers/crypto';

export class FacebookPublishingService {
  async publishFacebookPost(
    userId: Types.ObjectId,
    postData: {
      message?: string;
      link?: string; // optional link preview
      imageUrl?: string; // for photos
      videoUrl?: string; // for videos (hosted url or pre-upload if you manage binary)
      mediaType?: 'text' | 'link' | 'image' | 'video';
    },
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const conn = await getFacebookConnectionByUser(userId);
      if (!conn) return { success: false, error: 'no_facebook_connection' };

      const pageAccessToken = decryptIfPresent(
        conn?.platformCredentials?.facebook?.pageAccessTokenEnc,
      );
      const pageId = conn?.platformCredentials?.facebook?.pageId;
      if (!pageAccessToken || !pageId) {
        return { success: false, error: 'facebook_page_not_connected' };
      }

      if (postData.mediaType === 'image' && postData.imageUrl) {
        // POST /{page-id}/photos
        const resp = await axios.post(
          `https://graph.facebook.com/v19.0/${pageId}/photos`,
          {
            url: postData.imageUrl,
            caption: postData.message || '',
            published: true,
            access_token: pageAccessToken,
          },
          { timeout: 15000 },
        );
        const postId = resp?.data?.post_id || resp?.data?.id;
        return postId
          ? { success: true, postId }
          : { success: false, error: 'no_post_id_in_photo_response' };
      }

      if (postData.mediaType === 'video' && postData.videoUrl) {
        // POST /{page-id}/videos
        const resp = await axios.post(
          `https://graph.facebook.com/v19.0/${pageId}/videos`,
          {
            file_url: postData.videoUrl,
            description: postData.message || '',
            access_token: pageAccessToken,
          },
          { timeout: 60000 },
        );
        const videoId = resp?.data?.id;
        return videoId
          ? { success: true, postId: videoId }
          : { success: false, error: 'no_video_id_in_response' };
      }

      // Default: text or link → POST /{page-id}/feed
      const resp = await axios.post(
        `https://graph.facebook.com/v19.0/${pageId}/feed`,
        {
          message: postData.message || '',
          ...(postData.link ? { link: postData.link } : {}),
          access_token: pageAccessToken,
        },
        { timeout: 15000 },
      );
      const postId = resp?.data?.id;
      return postId
        ? { success: true, postId }
        : { success: false, error: 'no_post_id_in_feed_response' };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.response?.data?.error?.message ||
          error?.message ||
          'facebook_post_failed',
      };
    }
  }
}
