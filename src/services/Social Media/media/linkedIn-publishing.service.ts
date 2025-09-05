import axios from 'axios';
import { Types } from 'mongoose';
import { getLinkedinConnectionByUser } from '../../../database/repository/PlatformConnectionRepo';
import { decryptIfPresent } from '../../../helpers/crypto';

type LinkedInAudience = 'PUBLIC' | 'CONNECTIONS';

export class LinkedInPublishingService {
  // Post as the authenticated person (member)
  async publishMemberPost(
    userId: Types.ObjectId,
    postData: {
      text: string;
      linkUrl?: string; // optional external link
      visibility?: LinkedInAudience;
    },
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const conn = await getLinkedinConnectionByUser(userId);
      if (!conn)
        return { success: false, error: 'No linkedin connection found' };

      const accessToken = decryptIfPresent(
        conn?.platformCredentials?.linkedin?.accessTokenEnc,
      );
      const memberUrn = conn?.platformCredentials?.linkedin?.memberUrn; // e.g. 'urn:li:person:abc'
      if (!accessToken || !memberUrn) {
        return {
          success: false,
          error: 'LinkedIn account not properly connected',
        };
      }

      // UGC Post (member) with optional external link as ARTICLE
      const body: any = {
        author: memberUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: postData.text },
            shareMediaCategory: postData.linkUrl ? 'ARTICLE' : 'NONE',
            ...(postData.linkUrl && {
              media: [
                {
                  status: 'READY',
                  originalUrl: postData.linkUrl,
                },
              ],
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

      // LinkedIn returns the new resource URN in Location header
      const location = resp.headers?.location as string | undefined;
      const postId = location || (resp.data && (resp.data.id as string));
      if (!postId)
        return {
          success: false,
          error: 'No LinkedIn post id/Location returned',
        };

      return { success: true, postId };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.response?.data?.message ||
          error?.response?.data?.serviceErrorCode ||
          error?.message,
      };
    }
  }

  // Post as organization (company page)
  async publishOrganizationPost(
    userId: Types.ObjectId,
    postData: {
      text: string;
      linkUrl?: string;
      visibility?: LinkedInAudience;
    },
  ): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const conn = await getLinkedinConnectionByUser(userId);
      if (!conn)
        return { success: false, error: 'No linkedin connection found' };

      const accessToken = decryptIfPresent(
        conn?.platformCredentials?.linkedin?.accessTokenEnc,
      );
      const organizationUrn =
        conn?.platformCredentials?.linkedin?.organizationUrn; // 'urn:li:organization:123'
      if (!accessToken || !organizationUrn) {
        return {
          success: false,
          error: 'LinkedIn organization not properly connected',
        };
      }

      const body: any = {
        author: organizationUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: postData.text },
            shareMediaCategory: postData.linkUrl ? 'ARTICLE' : 'NONE',
            ...(postData.linkUrl && {
              media: [
                {
                  status: 'READY',
                  originalUrl: postData.linkUrl,
                },
              ],
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
      if (!postId)
        return {
          success: false,
          error: 'No LinkedIn post id/Location returned',
        };

      return { success: true, postId };
    } catch (error: any) {
      return {
        success: false,
        error:
          error?.response?.data?.message ||
          error?.response?.data?.serviceErrorCode ||
          error?.message,
      };
    }
  }
}
