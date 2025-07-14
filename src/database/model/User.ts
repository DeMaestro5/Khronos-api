import { model, Schema, Types } from 'mongoose';

export const DOCUMENT_NAME = 'User';
export const COLLECTION_NAME = 'users';

export enum UserRole {
  ADMIN = 'ADMIN',
  CONTENT_CREATOR = 'CONTENT_CREATOR',
}

export default interface User {
  _id: Types.ObjectId;
  name?: string;
  profilePicUrl?: string;
  email?: string;
  password?: string;
  role: string;
  verified?: boolean;
  status?: boolean;
  resetPasswordToken?: string;
  resetPasswordCode?: string;
  resetPasswordExpires?: Date;
  // Google OAuth fields
  googleId?: string;
  googleEmail?: string;
  authProvider?: 'local' | 'google';
  createdAt?: Date;
  updatedAt?: Date;
}

const schema = new Schema<User>(
  {
    name: {
      type: Schema.Types.String,
      trim: true,
      maxlength: 200,
    },
    profilePicUrl: {
      type: Schema.Types.String,
      trim: true,
    },
    email: {
      type: Schema.Types.String,
      unique: true,
      sparse: true, // allows null
      trim: true,
      select: false,
    },
    password: {
      type: Schema.Types.String,
      select: false,
    },
    role: {
      type: Schema.Types.String,
      required: true,
      enum: Object.values(UserRole),
      default: UserRole.CONTENT_CREATOR,
    },
    verified: {
      type: Schema.Types.Boolean,
      default: false,
    },
    status: {
      type: Schema.Types.Boolean,
      default: true,
    },
    resetPasswordToken: {
      type: Schema.Types.String,
      select: false,
    },
    resetPasswordCode: {
      type: Schema.Types.String,
      select: false,
    },
    resetPasswordExpires: {
      type: Schema.Types.Date,
      select: false,
    },
    // Google OAuth fields
    googleId: {
      type: Schema.Types.String,
      unique: true,
      sparse: true,
      select: false,
    },
    googleEmail: {
      type: Schema.Types.String,
      unique: true,
      sparse: true,
      select: false,
    },
    authProvider: {
      type: Schema.Types.String,
      enum: ['local', 'google'],
      default: 'local',
    },
    createdAt: {
      type: Schema.Types.Date,
      required: true,
      select: false,
    },
    updatedAt: {
      type: Schema.Types.Date,
      required: true,
      select: false,
    },
  },
  {
    versionKey: false,
  },
);

schema.index({ _id: 1, status: 1 });
schema.index({ email: 1 });
schema.index({ status: 1 });
schema.index({ googleId: 1 });
schema.index({ googleEmail: 1 });

export const UserModel = model<User>(DOCUMENT_NAME, schema, COLLECTION_NAME);
