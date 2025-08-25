import { Schema, Types, Document, model } from 'mongoose';

export interface PlatformConnection extends Document {
  userId: Types.ObjectId;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'linkedin';
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
  },
  { timestamps: true },
);

schema.index({ userId: 1, platform: 1 }, { unique: true });
export const PlatformConnectionModel = model<PlatformConnection>(
  'PlatformConnection',
  schema,
);
