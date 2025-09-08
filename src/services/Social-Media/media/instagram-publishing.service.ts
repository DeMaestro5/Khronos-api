import axios from 'axios';
import { Types } from 'mongoose';
import { getInstagramConnectionByUser } from '../../../database/repository/PlatformConnectionRepo';
import { decryptIfPresent } from '../../../helpers/crypto';

export class InstagramPublishingService {
  async publishInstagramPost(
    userId: Types.ObjectId,
    postData: {
      caption: string;
      imageUrl?: string;
      videoUrl?: string;
      mediaType: 'image' | 'video';
    },
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const conn = await getInstagramConnectionByUser(userId);
      if (!conn) return { success: false, error: 'no_instagram_connection' };

      const accessToken = decryptIfPresent(
        conn?.platformCredentials?.instagram?.igUserAccessTokenEnc,
      );
      const businessAccountId =
        conn?.platformCredentials?.instagram?.igBusinessAccountId;

      if (!accessToken || !businessAccountId) {
        return { success: false, error: 'instagram_not_properly_connected' };
      }

      const create = await axios.post(
        `https://graph.facebook.com/v19.0/${businessAccountId}/media`,
        {
          image_url:
            postData.mediaType === 'image' ? postData.imageUrl : undefined,
          video_url:
            postData.mediaType === 'video' ? postData.videoUrl : undefined,
          media_type: postData.mediaType.toUpperCase(),
          caption: postData.caption,
          access_token: accessToken,
        },
        { timeout: 20000 },
      );

      const creationId = create?.data?.id;
      if (!creationId) return { success: false, error: 'no_creation_id' };

      const publish = await axios.post(
        `https://graph.facebook.com/v19.0/${businessAccountId}/media_publish`,
        { creation_id: creationId, access_token: accessToken },
        { timeout: 20000 },
      );

      const mediaId = publish?.data?.id;
      return mediaId
        ? { success: true, postId: mediaId }
        : { success: false, error: 'no_media_id' };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.response?.data?.error?.message ||
          error?.message ||
          'instagram_post_failed',
      };
    }
  }
}
