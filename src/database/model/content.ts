import { model, Schema, Types } from 'mongoose';
import User from './User';

export const DOCUMENT_NAME = 'Content';
export const COLLECTION_NAME = 'contents';

export default interface Content {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  metadata: {
    title: string;
    description: string;
    type: 'article' | 'video' | 'social' | 'podcast';
    status: 'draft' | 'scheduled' | 'published';
    scheduledDate?: Date;
    publishedDate?: Date;
    platform: string[];
    tags: string[];
  };
  title: string;
  description: string;
  type: 'article' | 'video' | 'social' | 'podcast';
  status: 'draft' | 'scheduled' | 'published';
  platform: string[];
  tags: string[];
  engagement?: {
    likes?: number;
    shares?: number;
    comments?: number;
    views?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<Content>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    metadata: {
      title: {
        type: Schema.Types.String,
        required: true,
        trim: true,
        maxlength: 200,
      },
      description: {
        type: Schema.Types.String,
        required: true,
        trim: true,
      },
      type: {
        type: Schema.Types.String,
        required: true,
        enum: ['article', 'video', 'social', 'podcast'],
      },
      status: {
        type: Schema.Types.String,
        required: true,
        enum: ['draft', 'scheduled', 'published'],
        default: 'draft',
      },
      scheduledDate: {
        type: Schema.Types.Date,
      },
      publishedDate: {
        type: Schema.Types.Date,
      },
      platform: [
        {
          type: Schema.Types.String,
        },
      ],
      tags: [
        {
          type: Schema.Types.String,
        },
      ],
    },
    title: {
      type: Schema.Types.String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: Schema.Types.String,
      required: true,
      trim: true,
    },
    type: {
      type: Schema.Types.String,
      required: true,
      enum: ['article', 'video', 'social', 'podcast'],
    },
    status: {
      type: Schema.Types.String,
      required: true,
      enum: ['draft', 'scheduled', 'published'],
      default: 'draft',
    },
    platform: [
      {
        type: Schema.Types.String,
      },
    ],
    tags: [
      {
        type: Schema.Types.String,
      },
    ],
    engagement: {
      likes: {
        type: Schema.Types.Number,
        default: 0,
      },
      shares: {
        type: Schema.Types.Number,
        default: 0,
      },
      comments: {
        type: Schema.Types.Number,
        default: 0,
      },
      views: {
        type: Schema.Types.Number,
        default: 0,
      },
    },
    createdAt: {
      type: Schema.Types.Date,
      required: true,
    },
    updatedAt: {
      type: Schema.Types.Date,
      required: true,
    },
  },
  {
    versionKey: false,
  },
);

schema.index({ _id: 1, status: 1 });
schema.index({ userId: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });
schema.index({ 'metadata.tags': 1 });
schema.index({ 'metadata.platform': 1 });

export const ContentModel = model<Content>(
  DOCUMENT_NAME,
  schema,
  COLLECTION_NAME,
);
