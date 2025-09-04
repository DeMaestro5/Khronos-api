import { Types } from 'mongoose';
import { getFacebookConnectionByUser } from '../../../database/repository/PlatformConnectionRepo';
import { decryptIfPresent } from '../../../helpers/crypto';
import axios from 'axios';

export class FacebookPublishingService {
  async publishFacebookPost(
    userId: Types.ObjectId,
    postData: {
      caption: string;
      imageUrl?: string;
      videoUrl?: string;
      mediaType: 'image' | 'video' | 'carousel';
    },
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      // get user facebook connection
      const conn = await getFacebookConnectionByUser(userId);
      if (!conn) {
        return { success: false, error: 'No facebook connection found' };
      }
      const accessToken = await decryptIfPresent(
        conn?.platformCredentials?.facebook?.pageAccessTokenEnc,
      );
      const businessAccountId = conn?.platformCredentials?.facebook?.pageId;
      if (!accessToken || !businessAccountId) {
        return {
          success: false,
          error: 'Facebook account not properly connected',
        };
      }
      // create media object
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

      //publish media
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v19.0/${businessAccountId}/media_publish`,
        {
          creation_id: creationId,
          access_token: accessToken,
        },
      );

      const mediaId = publishResponse.data.id;
      console.log(`Successfully publish to facebook with ID: ${mediaId}`);

      return { success: true, postId: mediaId };
    } catch (error: any) {
      console.error('Facebook publishing failed', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }
}
