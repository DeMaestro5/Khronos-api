import { Types } from 'mongoose';
import { getInstagramConnectionByUser } from '../../../database/repository/PlatformConnectionRepo';
import { decryptIfPresent } from '../../../helpers/crypto';
import axios from 'axios';

export class InstagramPublishingService {
  async publishInstagramPost(
    userId: Types.ObjectId,
    postData: {
      caption: string;
      imageUrl?: string;
      videoUrl?: string;
      mediaType: 'image' | 'video' | 'carousel';
    },
  ): Promise<{ success: boolean; mediaId?: string; error?: string }> {
    try {
      // get user instagram connection
      const conn = await getInstagramConnectionByUser(userId);
      if (!conn) {
        return { success: false, error: 'No Instagram connection found' };
      }

      // decrypt access token
      const accessToken = await decryptIfPresent(
        conn?.platformCredentials?.instagram?.igUserAccessTokenEnc,
      );

      const businessAccountId =
        conn?.platformCredentials?.instagram?.igBusinessAccountId;

      if (!businessAccountId || !accessToken) {
        return {
          success: false,
          error: 'instagram account not properly connected',
        };
      }

      // create media to object
      const createMediaResponse = await axios.post(
        `https://graph.facebook.com/v19.0/${businessAccountId}/media`,
        {
          image_url: postData.imageUrl,
          video_url: postData.videoUrl,
          media_type: postData.mediaType,
          caption: postData.caption,
          access_token: accessToken,
        },
      );

      const creationId = createMediaResponse.data.id;

      // publish media
      const publicResponse = await axios.post(
        `https://graph.facebook.com/v19.0/${businessAccountId}/media_publish`,
        {
          creation_id: creationId,
          access_token: accessToken,
        },
      );

      const mediaId = publicResponse.data.id;
      console.log(`Successfully publish to instagram with ID: ${mediaId} `);

      return { success: true, mediaId };
    } catch (error: any) {
      console.error('Instagram publishing failed', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }
}
