import { Types } from 'mongoose';
import { getTiktokConnectionByUser } from '../../../database/repository/PlatformConnectionRepo';
import { decryptIfPresent } from '../../../helpers/crypto';
import axios from 'axios';

export class TikTokPublishingService {
  async publishTikTokPost(
    userId: Types.ObjectId,
    postData: {
      caption: string;
      videoUrl: string;
      mediaType: 'image' | 'video' | 'carousel';
    },
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      // get user tiktok connection
      const conn = await getTiktokConnectionByUser(userId);
      if (!conn) {
        return { success: false, error: 'No tiktok connection found' };
      }
      const accessToken = decryptIfPresent(
        conn?.platformCredentials?.tiktok?.accessTokenEnc,
      );
      const businessAccountId = conn?.platformCredentials?.tiktok?.openId;
      if (!accessToken || !businessAccountId) {
        return {
          success: false,
          error: 'Tiktok account not properly connected',
        };
      }

      // create media object
      const createMediaResponse = await axios.post(
        `https://open.tiktokapis.com/v2/media/create`,
        {
          video_url: postData.videoUrl,
          caption: postData.caption,
          access_token: accessToken,
        },
      );

      const creationId = createMediaResponse.data.id;

      // publish media

      const publishResponse = await axios.post(
        `https://open.tiktokapis.com/v2/media/publish`,
        {
          creation_id: creationId,
          access_token: accessToken,
        },
      );

      const mediaId = publishResponse.data.id;
      console.log(`Successfully publish to tiktok with ID: ${mediaId}`);

      return { success: true, postId: mediaId };
    } catch (error: any) {
      console.error('Tiktok publishing failed', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }
}
