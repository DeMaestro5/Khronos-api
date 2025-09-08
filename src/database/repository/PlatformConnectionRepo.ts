import { Types } from 'mongoose';
import {
  PlatformConnectionModel,
  PlatformConnection,
} from '../model/platformConnection';
import { encrypt, decrypt } from '../../helpers/crypto';

async function upsertConnection(
  userId: Types.ObjectId,
  platform: PlatformConnection['platform'],
  payload: {
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    accountId?: string;
    accountName?: string;
    permissions?: string[];
    accountInfo?: any;
  },
): Promise<PlatformConnection> {
  const accessTokenEnc = encrypt(payload.accessToken);
  const refreshTokenEnc = payload.refreshToken
    ? encrypt(payload.refreshToken)
    : undefined;

  const doc = await PlatformConnectionModel.findOneAndUpdate(
    {
      userId,
      platform,
    },
    {
      userId,
      platform,
      accessTokenEncrypted: accessTokenEnc,
      refreshTokenEncrypted: refreshTokenEnc,
      tokenExpiresAt: payload.tokenExpiresAt,
      accountId: payload.accountId,
      accountName: payload.accountName,
      permissions: payload.permissions || ['read'],
      accountInfo: payload.accountInfo,
      isActive: true,
      lastSyncAt: new Date(),
      connectAt: new Date(),
      ...(platform === 'youtube'
        ? {
            platformCredentials: {
              youtube: {
                channelId: payload.accountId || '',
                accessTokenEnc: accessTokenEnc,
              },
            },
          }
        : {}),
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );
  return doc;
}

async function getPlatformCredentials(
  userId: Types.ObjectId,
  platform: PlatformConnection['platform'],
) {
  const doc = await PlatformConnectionModel.findOne({ userId, platform });
  if (!doc) return null;

  const result: any = {
    platform: doc.platform,
    accountId: doc.accountId,
    accountName: doc.accountName,
    permissions: doc.permissions,
    accountInfo: doc.accountInfo,
    isActive: doc.isActive,
    lastSyncAt: doc.lastSyncAt,
    connectAt: doc.connectAt,
  };

  // Always include top-level tokens as base values
  if (doc.accessTokenEncrypted) {
    result.accessTokenEnc = decrypt(doc.accessTokenEncrypted);
  }
  if (doc.refreshTokenEncrypted) {
    result.refreshTokenEnc = decrypt(doc.refreshTokenEncrypted);
  }

  // Override with platform-specific credentials when present
  if (doc.platformCredentials) {
    switch (platform) {
      case 'instagram':
        result.igBusinessAccountId =
          doc.platformCredentials.instagram?.igBusinessAccountId;
        result.igUserAccessToken = doc.platformCredentials.instagram
          ?.igUserAccessTokenEnc
          ? decrypt(doc.platformCredentials.instagram.igUserAccessTokenEnc)
          : result.igUserAccessToken;
        break;
      case 'facebook':
        result.pageId = doc.platformCredentials.facebook?.pageId;
        result.pageAccessToken = doc.platformCredentials.facebook
          ?.pageAccessTokenEnc
          ? decrypt(doc.platformCredentials.facebook.pageAccessTokenEnc)
          : result.pageAccessToken;
        break;
      case 'linkedin':
        result.memberUrn = doc.platformCredentials.linkedin?.memberUrn;
        result.organizationUrn =
          doc.platformCredentials.linkedin?.organizationUrn;
        result.accessTokenEnc = doc.platformCredentials.linkedin?.accessTokenEnc
          ? decrypt(doc.platformCredentials.linkedin.accessTokenEnc)
          : result.accessTokenEnc;
        break;
      case 'tiktok':
        result.openId = doc.platformCredentials.tiktok?.openId;
        result.accessTokenEnc = doc.platformCredentials.tiktok?.accessTokenEnc
          ? decrypt(doc.platformCredentials.tiktok.accessTokenEnc)
          : result.accessTokenEnc;
        break;
      case 'youtube': {
        const platformAccessTokenEnc =
          doc.platformCredentials.youtube?.accessTokenEnc;
        const platformChannelId = doc.platformCredentials.youtube?.channelId;
        result.channelId = platformChannelId || result.accountId;
        result.accessTokenEnc = platformAccessTokenEnc
          ? decrypt(platformAccessTokenEnc)
          : result.accessTokenEnc;
        break;
      }
      case 'twitter':
        result.userId = doc.platformCredentials.twitter?.userId;
        result.screenName = doc.platformCredentials.twitter?.screenName;
        result.accessTokenEnc = doc.platformCredentials.twitter?.accessTokenEnc
          ? decrypt(doc.platformCredentials.twitter.accessTokenEnc)
          : result.accessTokenEnc;
        break;
      default:
      // keep top-level tokens already set
    }
  }
  return result;
}
async function getInstagramConnectionByUser(userId: Types.ObjectId) {
  return PlatformConnectionModel.findOne({
    userId,
    platform: 'instagram',
  }).lean();
}

async function getFacebookConnectionByUser(userId: Types.ObjectId) {
  return PlatformConnectionModel.findOne({
    userId,
    platform: 'facebook',
  }).lean();
}

async function getLinkedinConnectionByUser(userId: Types.ObjectId) {
  return PlatformConnectionModel.findOne({
    userId,
    platform: 'linkedin',
  }).lean();
}

async function getTiktokConnectionByUser(userId: Types.ObjectId) {
  return PlatformConnectionModel.findOne({ userId, platform: 'tiktok' }).lean();
}
async function getTwitterConnectionByUser(userId: Types.ObjectId) {
  return PlatformConnectionModel.findOne({
    userId,
    platform: 'twitter',
  }).lean();
}
async function getConnection(
  userId: Types.ObjectId,
  platform: PlatformConnection['platform'],
) {
  const doc = await PlatformConnectionModel.findOne({ userId, platform });
  if (!doc) return null;
  return {
    ...doc.toObject(),
    accessToken: decrypt(doc.accessTokenEncrypted),
    refreshToken: doc.refreshTokenEncrypted
      ? decrypt(doc.refreshTokenEncrypted)
      : undefined,
  };
}

async function listConnections(userId: Types.ObjectId) {
  const docs = await PlatformConnectionModel.find({ userId }).lean();
  return docs.map((doc) => ({
    ...doc,
    hasToken: !!doc.accessTokenEncrypted,
  }));
}

async function deactivate(
  userId: Types.ObjectId,
  platform: PlatformConnection['platform'],
) {
  await PlatformConnectionModel.updateOne(
    { userId, platform },
    { isActive: false },
  );
}

export {
  getConnection,
  listConnections,
  deactivate,
  upsertConnection,
  getInstagramConnectionByUser,
  getFacebookConnectionByUser,
  getLinkedinConnectionByUser,
  getTiktokConnectionByUser,
  getTwitterConnectionByUser,
  getPlatformCredentials,
};
