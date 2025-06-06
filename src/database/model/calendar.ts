import { model, Schema, Types } from 'mongoose';

export const DOCUMENT_NAME = 'CalendarEvent';
export const COLLECTION_NAME = 'calendar_events';

export interface CalendarEventReminder {
  type: 'email' | 'push' | 'webhook';
  time: number; // minutes before event
  sent?: boolean;
}

export interface CalendarEventRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number; // every X frequency units
  daysOfWeek?: number[]; // 0-6, Sunday = 0
  endDate?: Date;
  occurrences?: number; // max number of occurrences
}

export interface CalendarEventAnalytics {
  impressions?: number;
  reach?: number;
  engagement?: number;
  clicks?: number;
  shares?: number;
  conversionRate?: number;
}

export default interface CalendarEvent {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  timezone: string;
  location?: string;
  eventType:
    | 'content_publishing'
    | 'meeting'
    | 'reminder'
    | 'deadline'
    | 'custom';
  status: 'scheduled' | 'published' | 'cancelled' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Content association
  contentId?: Types.ObjectId;
  platform?: string[];

  // Scheduling & automation
  autoPublish?: boolean;
  publishSettings?: {
    platforms: string[];
    optimizeForEngagement: boolean;
    crossPost: boolean;
  };

  // Recurrence
  recurrence?: CalendarEventRecurrence;
  parentEventId?: Types.ObjectId; // for recurring event instances

  // Reminders & notifications
  reminders?: CalendarEventReminder[];

  // Collaboration
  attendees?: Types.ObjectId[];
  createdBy: Types.ObjectId;

  // Analytics & tracking
  analytics?: CalendarEventAnalytics;

  // AI suggestions
  aiSuggested?: boolean;
  optimalTimeScore?: number;
  suggestedBy?:
    | 'engagement_analysis'
    | 'audience_activity'
    | 'competitor_analysis'
    | 'trend_analysis';

  // Metadata
  tags?: string[];
  color?: string;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<CalendarEvent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: Schema.Types.String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: Schema.Types.String,
      trim: true,
      maxlength: 1000,
    },
    startDate: {
      type: Schema.Types.Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Schema.Types.Date,
      required: true,
      index: true,
    },
    allDay: {
      type: Schema.Types.Boolean,
      default: false,
    },
    timezone: {
      type: Schema.Types.String,
      default: 'UTC',
    },
    location: {
      type: Schema.Types.String,
      trim: true,
    },
    eventType: {
      type: Schema.Types.String,
      required: true,
      enum: ['content_publishing', 'meeting', 'reminder', 'deadline', 'custom'],
      default: 'custom',
    },
    status: {
      type: Schema.Types.String,
      required: true,
      enum: ['scheduled', 'published', 'cancelled', 'completed', 'failed'],
      default: 'scheduled',
      index: true,
    },
    priority: {
      type: Schema.Types.String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },

    // Content association
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
      index: true,
    },
    platform: [
      {
        type: Schema.Types.String,
      },
    ],

    // Scheduling & automation
    autoPublish: {
      type: Schema.Types.Boolean,
      default: false,
    },
    publishSettings: {
      platforms: [{ type: Schema.Types.String }],
      optimizeForEngagement: { type: Schema.Types.Boolean, default: true },
      crossPost: { type: Schema.Types.Boolean, default: false },
    },

    // Recurrence
    recurrence: {
      frequency: {
        type: Schema.Types.String,
        enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
      },
      interval: {
        type: Schema.Types.Number,
        min: 1,
        default: 1,
      },
      daysOfWeek: [
        {
          type: Schema.Types.Number,
          min: 0,
          max: 6,
        },
      ],
      endDate: Schema.Types.Date,
      occurrences: {
        type: Schema.Types.Number,
        min: 1,
      },
    },
    parentEventId: {
      type: Schema.Types.ObjectId,
      ref: 'CalendarEvent',
    },

    // Reminders & notifications
    reminders: [
      {
        type: {
          type: Schema.Types.String,
          enum: ['email', 'push', 'webhook'],
          required: true,
        },
        time: {
          type: Schema.Types.Number,
          required: true,
          min: 0,
        },
        sent: {
          type: Schema.Types.Boolean,
          default: false,
        },
      },
    ],

    // Collaboration
    attendees: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Analytics & tracking
    analytics: {
      impressions: { type: Schema.Types.Number, default: 0 },
      reach: { type: Schema.Types.Number, default: 0 },
      engagement: { type: Schema.Types.Number, default: 0 },
      clicks: { type: Schema.Types.Number, default: 0 },
      shares: { type: Schema.Types.Number, default: 0 },
      conversionRate: { type: Schema.Types.Number, min: 0, max: 100 },
    },

    // AI suggestions
    aiSuggested: {
      type: Schema.Types.Boolean,
      default: false,
    },
    optimalTimeScore: {
      type: Schema.Types.Number,
      min: 0,
      max: 100,
    },
    suggestedBy: {
      type: Schema.Types.String,
      enum: [
        'engagement_analysis',
        'audience_activity',
        'competitor_analysis',
        'trend_analysis',
      ],
    },

    // Metadata
    tags: [
      {
        type: Schema.Types.String,
        trim: true,
      },
    ],
    color: {
      type: Schema.Types.String,
      default: '#3B82F6',
    },
    notes: {
      type: Schema.Types.String,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Indexes for better query performance
schema.index({ userId: 1, startDate: 1 });
schema.index({ userId: 1, endDate: 1 });
schema.index({ userId: 1, status: 1 });
schema.index({ contentId: 1 });
schema.index({ parentEventId: 1 });
schema.index({ 'recurrence.frequency': 1 });

export const CalendarEventModel = model<CalendarEvent>(
  DOCUMENT_NAME,
  schema,
  COLLECTION_NAME,
);
