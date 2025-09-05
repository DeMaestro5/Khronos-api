import { Types } from 'mongoose';
import { getTiktokConnectionByUser } from '../../../database/repository/PlatformConnectionRepo';
import { decryptIfPresent } from '../../../helpers/crypto';
import axios from 'axios';

export class TikTokPublishingService {
  async publishTikTokPost(
    userId: Types.ObjectId,
    postData: { caption: string; videoUrl: string },
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const conn = await getTiktokConnectionByUser(userId);
      if (!conn) return { success: false, error: 'No tiktok connection found' };

      const accessToken = decryptIfPresent(
        conn?.platformCredentials?.tiktok?.accessTokenEnc,
      );
      const openId = conn?.platformCredentials?.tiktok?.openId;
      if (!accessToken || !openId)
        return {
          success: false,
          error: 'Tiktok account not properly connected',
        };

      // 1) INIT (get an upload URL or upload_id)
      const initResp = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/',
        {
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: postData.videoUrl,
          },
        },
        { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 20000 },
      );
      const uploadId = initResp?.data?.data?.upload_id;
      if (!uploadId)
        return { success: false, error: 'No upload_id from TikTok init' };

      // 2) PUBLISH (finalize and set caption)
      const publishResp = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/inbox/video/',
        { upload_id: uploadId, text: postData.caption },
        { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 30000 },
      );
      // Depending on API version you’ll get video_id / share_id
      const videoId =
        publishResp?.data?.data?.video_id ||
        publishResp?.data?.data?.share_id ||
        publishResp?.data?.data?.id;

      return videoId
        ? { success: true, postId: videoId }
        : { success: false, error: 'No video id in TikTok publish response' };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.response?.data?.message ||
          error?.response?.data?.error?.message ||
          error?.message,
      };
    }
  }
}
