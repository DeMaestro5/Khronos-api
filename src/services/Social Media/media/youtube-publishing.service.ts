import { Types } from 'mongoose';
import { getConnection } from '../../../database/repository/PlatformConnectionRepo';
import { decryptIfPresent } from '../../../helpers/crypto';
import axios from 'axios';

export class YoutubePublishingService {
  async publishVideo(
    userId: Types.ObjectId,
    videoData: {
      title: string;
      description: string;
      videoFile?: Buffer | string;
      thumbnailFile?: Buffer;
      tags?: string[];
      categoryId: string;
      privacy?: 'public' | 'unlisted' | 'private';
    },
  ): Promise<{ success: boolean; videoId?: string; error?: string }> {
    try {
      // get user youtube connection
      const conn = await getConnection(userId, 'youtube');
      if (!conn) {
        return { success: false, error: 'Youtube account not connected' };
      }

      // decrypt access token
      const accessToken = await decryptIfPresent(conn.accessTokenEncrypted);
      if (!accessToken) {
        return { success: false, error: 'No access token found' };
      }

      // For video uploads, you'd typically need to:
      // 1. Upload video file to YouTube
      // 2. Set metadata
      // This is a simplified example - real implementation would handle file uploads

      const uploadResponse = await axios.post(
        'https://www.googleapis.com/upload/youtube/v3/videos',
        {
          snippet: {
            title: videoData.title,
            description: videoData.description,
            tags: videoData.tags,
            categoryId: videoData.categoryId,
          },
          status: {
            privacyStatus: videoData.privacy || 'public',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: {
            part: 'snippet,status',
          },
        },
      );

      const videoId = uploadResponse.data.id;
      console.log(`Video uploaded successfully with ID: ${videoId}`);
      return { success: true, videoId };
    } catch (error: any) {
      console.error('Youtube publishing failed:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }
}
