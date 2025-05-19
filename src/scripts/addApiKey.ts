import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { ApiKeyModel, Permission } from '../database/model/ApiKey';

// Load environment variables from .env file first
dotenv.config({ path: path.resolve(__dirname, '.env') });

// The connection should be established after environment variables are loaded
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error(
    'MongoDB connection string is missing. Please check your .env file.',
  );
  process.exit(1);
}

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function addApiKey() {
  const key = 'GCMUDibV5a7WvyUNt9n3QztToSHZk7Uj';
  const version = 1;
  const permissions = [Permission.GENERAL];
  const comments = ['General API key for Khronos'];
  const status = true;
  const now = new Date();

  try {
    const existing = await ApiKeyModel.findOne({ key });
    if (existing) {
      console.log('API key already exists:', existing);
      return;
    }
    const apiKey = new ApiKeyModel({
      key,
      version,
      permissions,
      comments,
      status,
      createdAt: now,
      updatedAt: now,
    });
    await apiKey.save();
    console.log('API key saved successfully:', apiKey);
  } catch (err) {
    console.error('Error saving API key:', err);
  } finally {
    console.log('Closing database connection...');
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

addApiKey();
