import axios from 'axios';
import { Types } from 'mongoose';
import { getTwitterConnectionByUser } from '../../../database/repository/PlatformConnectionRepo';
import { decryptIfPresent } from '../../../helpers/crypto';

export class TwitterPublishingService {
  async publishTwitterPost(
    userId: Types.ObjectId,
    postData: {
      tweet: string;
      mediaIds?: string[]; // media_id strings from upload API (optional)
    },
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const connection = await getTwitterConnectionByUser(userId);
      if (!connection)
        return { success: false, error: 'No twitter connection found' };

      const userAccessToken = decryptIfPresent(
        connection?.platformCredentials?.twitter?.accessTokenEnc,
      );
      if (!userAccessToken)
        return { success: false, error: 'Missing twitter user access token' };

      const body: any = { text: postData.tweet };
      if (postData.mediaIds && postData.mediaIds.length > 0) {
        body.media = { media_ids: postData.mediaIds };
      }

      const resp = await axios.post('https://api.twitter.com/2/tweets', body, {
        headers: {
          Authorization: `Bearer ${userAccessToken}`, // OAuth2 user-context token with tweet.write scope
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      const tweetId = resp?.data?.data?.id;
      if (!tweetId) return { success: false, error: 'No tweet id in response' };

      return { success: true, postId: tweetId };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.response?.data?.detail ||
          error?.response?.data?.title ||
          error?.message,
      };
    }
  }
}
