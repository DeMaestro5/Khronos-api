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
      videoUrl?: string; // for videos
      mediaType?: 'text' | 'link' | 'image' | 'video';
    },
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const conn = await getFacebookConnectionByUser(userId);
      if (!conn)
        return { success: false, error: 'No facebook connection found' };

      const pageAccessToken = decryptIfPresent(
        conn?.platformCredentials?.facebook?.pageAccessTokenEnc,
      );
      const pageId = conn?.platformCredentials?.facebook?.pageId;
      if (!pageAccessToken || !pageId) {
        return {
          success: false,
          error: 'Facebook page not properly connected',
        };
      }

      // Choose endpoint by mediaType
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
        // For photos, use post_id if available, else id
        const postId = resp?.data?.post_id || resp?.data?.id;
        return postId
          ? { success: true, postId }
          : { success: false, error: 'No post id in photo response' };
      }

      if (postData.mediaType === 'video' && postData.videoUrl) {
        // POST /{page-id}/videos
        const resp = await axios.post(
          `https://graph.facebook.com/v19.0/${pageId}/videos`,
          {
            file_url: postData.videoUrl, // hosted video URL
            description: postData.message || '',
            access_token: pageAccessToken,
          },
          { timeout: 30000 },
        );
        const videoId = resp?.data?.id;
        // The related feed post id can be fetched via /{videoId}?fields=permalink_url,from,.....
        return videoId
          ? { success: true, postId: videoId }
          : { success: false, error: 'No video id in response' };
      }

      // Default: text or link post → POST /{page-id}/feed
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
        : { success: false, error: 'No post id in feed response' };
    } catch (error: any) {
      return {
        success: false,
        error: error?.response?.data?.error?.message || error?.message,
      };
    }
  }
}
