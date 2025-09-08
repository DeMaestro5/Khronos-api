import axios from 'axios';
import { google } from 'googleapis';
import { Types } from 'mongoose';
import { getPlatformCredentials } from '../../../database/repository/PlatformConnectionRepo';
import { config } from '../../../config/index';

export class YoutubePublishingService {
  async publishVideo(
    userId: Types.ObjectId,
    videoData: {
      title: string;
      description: string;
      videoFile?: Buffer | string; // expects a public URL if string
      tags?: string[];
    },
  ): Promise<{ success: boolean; videoId?: string; error?: string }> {
    try {
      // 1) Fetch user YouTube credentials
      const creds = await getPlatformCredentials(userId, 'youtube');
      const accessToken = creds?.accessTokenEnc;
      const refreshToken = creds?.refreshTokenEnc;
      // Note: channelId is not strictly required to upload; the authenticated user's default channel is used
      if (!accessToken) {
        return { success: false, error: 'youtube_not_properly_connected' };
      }

      if (!videoData.videoFile || typeof videoData.videoFile !== 'string') {
        return { success: false, error: 'video_url_required' };
      }

      // 2) Prepare OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        config.google.clientId || undefined,
        config.google.clientSecret || undefined,
        config.google.callbackUrl || undefined,
      );
      oauth2Client.setCredentials({
        access_token: accessToken,
        ...(refreshToken ? { refresh_token: refreshToken } : {}),
      });

      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

      // 3) Stream the video from the provided URL
      const videoStream = await axios.get(videoData.videoFile, {
        responseType: 'stream',
        timeout: 120000,
      });

      // 4) Upload the video
      const uploadRes = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: videoData.title,
            description: videoData.description,
            tags: videoData.tags,
            categoryId: '22',
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: videoStream.data,
        },
      });

      const videoId = (uploadRes.data as any)?.id;
      return videoId
        ? { success: true, videoId }
        : { success: false, error: 'no_video_id_in_response' };
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'youtube_upload_failed';
      // Help user recover when tokens are invalid/expired
      if (/invalid_grant|unauthorized|authError/i.test(msg)) {
        return { success: false, error: 'youtube_reauth_required' };
      }
      return { success: false, error: msg };
    }
  }
}
