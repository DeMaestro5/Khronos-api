import { model, Schema, Types } from 'mongoose';

export const DOCUMENT_NAME = 'NotificationSettings';
export const COLLECTION_NAME = 'notification_settings';

export default interface NotificationSettings {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  email: boolean;
  push: boolean;
  inApp: boolean;
  scheduleNotifications: boolean;
  performanceAlerts: boolean;
  trendUpdates: boolean;
  systemUpdates: boolean;
  quietHours?: {
    start: string;
    end: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<NotificationSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'User',
    },
    email: {
      type: Schema.Types.Boolean,
      default: true,
    },
    push: {
      type: Schema.Types.Boolean,
      default: true,
    },
    inApp: {
      type: Schema.Types.Boolean,
      default: true,
    },
    scheduleNotifications: {
      type: Schema.Types.Boolean,
      default: true,
    },
    performanceAlerts: {
      type: Schema.Types.Boolean,
      default: true,
    },
    trendUpdates: {
      type: Schema.Types.Boolean,
      default: true,
    },
    systemUpdates: {
      type: Schema.Types.Boolean,
      default: true,
    },
    quietHours: {
      start: {
        type: Schema.Types.String,
        default: '22:00',
      },
      end: {
        type: Schema.Types.String,
        default: '08:00',
      },
    },
    createdAt: {
      type: Schema.Types.Date,
      required: true,
      default: Date.now,
    },
    updatedAt: {
      type: Schema.Types.Date,
      required: true,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

// Indexes
schema.index({ userId: 1 });

export const NotificationSettingsModel = model<NotificationSettings>(
  DOCUMENT_NAME,
  schema,
  COLLECTION_NAME,
);
