import axios from 'axios';
import { Types } from 'mongoose';
import { getTiktokConnectionByUser } from '../../../database/repository/PlatformConnectionRepo';
import { decryptIfPresent } from '../../../helpers/crypto';

export class TikTokPublishingService {
  async publishTikTokPost(
    userId: Types.ObjectId,
    postData: { caption: string; videoUrl: string },
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const conn = await getTiktokConnectionByUser(userId);
      if (!conn) return { success: false, error: 'no_tiktok_connection' };

      const accessToken = decryptIfPresent(
        conn?.platformCredentials?.tiktok?.accessTokenEnc,
      );
      const openId = conn?.platformCredentials?.tiktok?.openId;
      if (!accessToken || !openId)
        return { success: false, error: 'tiktok_not_properly_connected' };

      const init = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/',
        {
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: postData.videoUrl,
          },
        },
        { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 20000 },
      );
      const uploadId = init?.data?.data?.upload_id;
      if (!uploadId) return { success: false, error: 'no_upload_id' };

      const publish = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/inbox/video/',
        { upload_id: uploadId, text: postData.caption },
        { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 30000 },
      );

      const videoId =
        publish?.data?.data?.video_id ||
        publish?.data?.data?.share_id ||
        publish?.data?.data?.id;

      return videoId
        ? { success: true, postId: videoId }
        : { success: false, error: 'no_video_id' };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.response?.data?.message ||
          error?.response?.data?.error?.message ||
          error?.message ||
          'tiktok_post_failed',
      };
    }
  }
}
