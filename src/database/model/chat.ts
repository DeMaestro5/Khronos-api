import { Schema, model, Document, Types } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    contentId?: string;
    platform?: string;
    tokens?: number;
    model?: string;
    inappropriate?: boolean;
    severity?: 'low' | 'medium' | 'high';
  };
}

export interface IChatSession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  description?: string;
  contentId?: Types.ObjectId; // Reference to the content being discussed
  messages: IChatMessage[];
  status: 'active' | 'archived' | 'completed';
  tags: string[];
  metadata: {
    totalTokens: number;
    lastActiveAt: Date;
    createdAt: Date;
    updatedAt: Date;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    context?: string; // Additional context about the content
  };
  settings: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatTemplate extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  description: string;
  category:
    | 'content-optimization'
    | 'content-creation'
    | 'strategy'
    | 'analysis'
    | 'custom';
  systemPrompt: string;
  initialMessages: IChatMessage[];
  tags: string[];
  isPublic: boolean;
  usageCount: number;
  settings: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    contentId: {
      type: String,
      ref: 'Content',
    },
    platform: String,
    tokens: Number,
    model: String,
    inappropriate: Boolean,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
    },
  },
});

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    contentId: {
      type: Schema.Types.ObjectId,
      ref: 'Content',
    },
    messages: [ChatMessageSchema],
    status: {
      type: String,
      enum: ['active', 'archived', 'completed'],
      default: 'active',
    },
    tags: [String],
    metadata: {
      totalTokens: {
        type: Number,
        default: 0,
      },
      lastActiveAt: {
        type: Date,
        default: Date.now,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
      model: String,
      temperature: Number,
      maxTokens: Number,
      context: String,
    },
    settings: {
      model: {
        type: String,
        default: 'gpt-4o-mini',
      },
      temperature: {
        type: Number,
        default: 0.7,
        min: 0,
        max: 2,
      },
      maxTokens: {
        type: Number,
        default: 1000,
        min: 1,
        max: 4000,
      },
      systemPrompt: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const ChatTemplateSchema = new Schema<IChatTemplate>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 300,
    },
    category: {
      type: String,
      enum: [
        'content-optimization',
        'content-creation',
        'strategy',
        'analysis',
        'custom',
      ],
      required: true,
    },
    systemPrompt: {
      type: String,
      required: true,
    },
    initialMessages: [ChatMessageSchema],
    tags: [String],
    isPublic: {
      type: Boolean,
      default: false,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    settings: {
      model: {
        type: String,
        default: 'gpt-4o-mini',
      },
      temperature: {
        type: Number,
        default: 0.7,
        min: 0,
        max: 2,
      },
      maxTokens: {
        type: Number,
        default: 1000,
        min: 1,
        max: 4000,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Indexes for better performance
ChatSessionSchema.index({ userId: 1, status: 1 });
ChatSessionSchema.index({ contentId: 1 });
ChatSessionSchema.index({ 'metadata.lastActiveAt': -1 });
ChatSessionSchema.index({ tags: 1 });

ChatTemplateSchema.index({ userId: 1, category: 1 });
ChatTemplateSchema.index({ isPublic: 1, category: 1 });
ChatTemplateSchema.index({ tags: 1 });

export const ChatSession = model<IChatSession>(
  'ChatSession',
  ChatSessionSchema,
);
export const ChatTemplate = model<IChatTemplate>(
  'ChatTemplate',
  ChatTemplateSchema,
);

export default ChatSession;
