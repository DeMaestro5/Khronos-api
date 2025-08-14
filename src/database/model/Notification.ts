import { model, Schema, Types } from 'mongoose';

export const DOCUMENT_NAME = 'Notification';
export const COLLECTION_NAME = 'notifications';

export enum NotificationType {
  SCHEDULE = 'schedule',
  PERFORMANCE = 'performance',
  TREND = 'trend',
  SYSTEM = 'system',
  // Additional categories to support UI toggles
  SECURITY = 'security',
  REMINDER = 'reminder',
  MESSAGE = 'message',
  MARKETING = 'marketing',
  PRODUCT_UPDATE = 'product_update',
  REPORT = 'report',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
}

export default interface Notification {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  data?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<Notification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    type: {
      type: Schema.Types.String,
      required: true,
      enum: Object.values(NotificationType),
    },
    title: {
      type: Schema.Types.String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: Schema.Types.String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    priority: {
      type: Schema.Types.String,
      required: true,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.MEDIUM,
    },
    status: {
      type: Schema.Types.String,
      required: true,
      enum: Object.values(NotificationStatus),
      default: NotificationStatus.UNREAD,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
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
schema.index({ userId: 1, status: 1 });
schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, type: 1 });
schema.index({ userId: 1, priority: 1 });

export const NotificationModel = model<Notification>(
  DOCUMENT_NAME,
  schema,
  COLLECTION_NAME,
);
