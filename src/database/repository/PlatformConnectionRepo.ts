import { Types } from 'mongoose';
import {
  PlatformConnectionModel,
  PlatformConnection,
} from '../model/platformConnection';
import { encrypt, decrypt } from '../../helpers/crypto';

export default class PlatformConnectionRepo {
  static async upsertConnection(
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
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
    return doc;
  }

  static async getConnection(
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

  static async listConnections(userId: Types.ObjectId) {
    const docs = await PlatformConnectionModel.find({ userId }).lean();
    return docs.map((doc) => ({
      ...doc,
      hasToken: !!doc.accessTokenEncrypted,
    }));
  }

  static async deactivate(
    userId: Types.ObjectId,
    platform: PlatformConnection['platform'],
  ) {
    await PlatformConnectionModel.updateOne(
      { userId, platform },
      { isActive: false },
    );
  }
}
