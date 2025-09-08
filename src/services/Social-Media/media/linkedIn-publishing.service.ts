import axios from 'axios';
import { Types } from 'mongoose';
import { getLinkedinConnectionByUser } from '../../../database/repository/PlatformConnectionRepo';
import { decryptIfPresent } from '../../../helpers/crypto';

type LinkedInAudience = 'PUBLIC' | 'CONNECTIONS';

export class LinkedInPublishingService {
  async publishMemberPost(
    userId: Types.ObjectId,
    postData: {
      text: string;
      linkUrl?: string;
      visibility?: LinkedInAudience;
    },
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const conn = await getLinkedinConnectionByUser(userId);
      if (!conn) return { success: false, error: 'no_linkedin_connection' };

      const accessToken = decryptIfPresent(
        conn?.platformCredentials?.linkedin?.accessTokenEnc,
      );
      const memberUrn = conn?.platformCredentials?.linkedin?.memberUrn;
      if (!accessToken || !memberUrn)
        return { success: false, error: 'linkedin_not_properly_connected' };

      const body: any = {
        author: memberUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: postData.text },
            shareMediaCategory: postData.linkUrl ? 'ARTICLE' : 'NONE',
            ...(postData.linkUrl && {
              media: [{ status: 'READY', originalUrl: postData.linkUrl }],
            }),
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility':
            postData.visibility || 'PUBLIC',
        },
      };

      const resp = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        body,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          timeout: 20000,
        },
      );

      const location = resp.headers?.location as string | undefined;
      const postId = location || (resp.data && (resp.data.id as string));
      return postId
        ? { success: true, postId }
        : { success: false, error: 'no_linkedin_post_id' };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.response?.data?.message ||
          error?.response?.data?.serviceErrorCode ||
          error?.message ||
          'linkedin_post_failed',
      };
    }
  }
}
