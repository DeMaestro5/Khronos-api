import { Schema, Types, Document, model } from 'mongoose';

export interface PlatformConnection extends Document {
  userId: Types.ObjectId;
  platform:
    | 'youtube'
    | 'tiktok'
    | 'instagram'
    | 'facebook'
    | 'linkedin'
    | 'twitter';
  accountId?: string;
  accountName?: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string;
  tokenExpiresAt?: Date;
  permissions: string[];
  isActive: boolean;
  connectAt: Date;
  lastSyncAt?: Date;
  accountInfo?: {
    username?: string;
    avatarUrl?: string;
    followers?: number;
    url?: string;
  };

  platformCredentials?: {
    instagram?: {
      igBusinessAccountId?: string;
      igUserAccessTokenEnc?: string;
    };
    facebook?: {
      pageId?: string;
      pageAccessTokenEnc: string;
    };
    linkedin?: {
      memberUrn: string;
      organizationUrn: string;
      accessTokenEnc: string;
    };
    tiktok?: {
      openId: string;
      accessTokenEnc: string;
    };
    youtube?: {
      channelId: string;
      accessTokenEnc: string;
    };
    twitter?: {
      userId?: string;
      screenName?: string;
      accessTokenEnc: string;
      accessSecretEnc?: string;
    };
  };
}

const schema = new Schema<PlatformConnection>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: [
        'youtube',
        'tiktok',
        'instagram',
        'facebook',
        'linkedin',
        'twitter',
      ],
      required: true,
      index: true,
    },

    accountId: { type: String },
    accountName: { type: String },
    accessTokenEncrypted: { type: String, required: true },
    refreshTokenEncrypted: { type: String },
    tokenExpiresAt: { type: Date },
    permissions: { type: [String], default: ['read'] },
    isActive: { type: Boolean, default: true },
    connectAt: { type: Date, default: () => new Date() },
    lastSyncAt: { type: Date },
    accountInfo: {
      type: Object,
    },
    platformCredentials: {
      instagram: {
        igBusinessAccountId: { type: String },
        igUserAccessTokenEnc: { type: String },
      },
      facebook: {
        pageId: { type: String },
        pageAccessTokenEnc: { type: String },
      },
      linkedin: {
        memberUrn: { type: String },
        organizationUrn: { type: String },
        accessTokenEnc: { type: String },
      },
      tiktok: {
        openId: { type: String },
        accessTokenEnc: { type: String },
      },
      youtube: {
        channelId: { type: String },
        accessTokenEnc: { type: String },
      },
      twitter: {
        userId: { type: String },
        screenName: { type: String },
        accessTokenEnc: { type: String },
        accessSecretEnc: { type: String },
      },
    },
  },
  { timestamps: true },
);

schema.index({ userId: 1, platform: 1 }, { unique: true });
export const PlatformConnectionModel = model<PlatformConnection>(
  'PlatformConnection',
  schema,
);
