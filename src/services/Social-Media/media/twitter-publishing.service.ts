import axios from 'axios';
import { Types } from 'mongoose';
import { getTwitterConnectionByUser } from '../../../database/repository/PlatformConnectionRepo';
import { decryptIfPresent } from '../../../helpers/crypto';

export class TwitterPublishingService {
  async publishTwitterPost(
    userId: Types.ObjectId,
    postData: {
      tweet: string;
      mediaIds?: string[]; // only after separate media upload flow
    },
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const connection = await getTwitterConnectionByUser(userId);
      if (!connection)
        return { success: false, error: 'no_twitter_connection' };

      const userAccessToken = decryptIfPresent(
        connection?.platformCredentials?.twitter?.accessTokenEnc,
      );
      if (!userAccessToken)
        return { success: false, error: 'missing_twitter_user_access_token' };

      const body: any = { text: postData.tweet };
      if (postData.mediaIds && postData.mediaIds.length > 0) {
        body.media = { media_ids: postData.mediaIds };
      }

      const resp = await axios.post('https://api.twitter.com/2/tweets', body, {
        headers: {
          Authorization: `Bearer ${userAccessToken}`, // must be user-context; scope: tweet.write
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      const tweetId = resp?.data?.data?.id;
      return tweetId
        ? { success: true, postId: tweetId }
        : { success: false, error: 'no_tweet_id_in_response' };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.response?.data?.detail ||
          error?.response?.data?.title ||
          error?.message ||
          'twitter_post_failed',
      };
    }
  }
}
