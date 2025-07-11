import { redis } from '../config';
import { createClient } from 'redis';
import Logger from '../core/Logger';

// Handle Redis configuration - prefer REDIS_URL if available
const redisUrl = process.env.REDIS_URL;
const redisHost = redis.host || 'localhost';
const redisPort = redis.port || 6379;
const redisPassword = redis.password || '';

// Check if Redis is configured for production
const isProduction = process.env.NODE_ENV === 'production';
const hasRedisConfig = redisUrl || (redisHost && redisHost !== 'localhost');

Logger.info('Redis Configuration:', {
  environment: process.env.NODE_ENV,
  hasRedisUrl: !!redisUrl,
  host: redisHost,
  port: redisPort,
  hasPassword: !!redisPassword,
  passwordLength: redisPassword ? redisPassword.length : 0,
  hasRedisConfig,
});

// If in production but no Redis config, warn and provide setup instructions
if (isProduction && !hasRedisConfig) {
  Logger.warn(
    'Production environment detected but no Redis configuration found.',
  );
  Logger.info('Caching will be disabled until Redis is configured.');
  Logger.info('To enable Redis:');
  Logger.info('1. Create Redis service on Render dashboard');
  Logger.info('2. Add REDIS_URL environment variable to your web service');
  Logger.info('3. Redeploy to enable caching functionality');
}

// Create Redis client only if configuration is available
let client: any;

if (hasRedisConfig) {
  // Create Redis client with proper configuration
  let clientConfig: any;

  if (redisUrl) {
    // Use Redis URL (preferred for Render)
    clientConfig = {
      url: redisUrl,
      socket: {
        connectTimeout: 60000,
        lazyConnect: true,
      },
    };
  } else {
    // Use individual components
    clientConfig = {
      socket: {
        host: redisHost,
        port: redisPort,
        connectTimeout: 60000, // 60 seconds timeout for initial connection
        lazyConnect: true, // Don't connect immediately
      },
    };
  }

  // Only add password if it's actually provided and not empty (for individual components only)
  if (!redisUrl && redisPassword && redisPassword.trim() !== '') {
    clientConfig.password = redisPassword;
    Logger.info('Redis: Using password authentication');
  } else if (!redisUrl) {
    Logger.info('Redis: No password authentication');
  }

  client = createClient(clientConfig);

  client.on('connect', () => Logger.info('Cache is connecting'));
  client.on('ready', () => Logger.info('Cache is ready'));
  client.on('end', () => Logger.info('Cache disconnected'));
  client.on('reconnecting', () => Logger.info('Cache is reconnecting'));
  client.on('error', (e: any) => Logger.error('Redis connection error:', e));
} else {
  // Create a mock client for environments without Redis
  Logger.info('Creating mock Redis client - no Redis configuration available');
  client = {
    isReady: false,
    isMock: true,
    connect: async () => {
      Logger.debug('Mock Redis client - connect called but ignored');
      return Promise.resolve();
    },
    disconnect: async () => Promise.resolve(),
    get: async () => null,
    set: async () => null,
    del: async () => 0,
    exists: async () => 0,
    on: () => {}, // Mock event listener
  };
}

// Connection function with retry logic
const connectWithRetry = async (maxRetries = 3, delay = 5000) => {
  // Skip connection if no Redis config or using mock client
  if (!hasRedisConfig) {
    Logger.info('No Redis configuration available - skipping connection');
    return;
  }

  // Skip if using mock client
  if (client.isMock) {
    Logger.info('Using mock Redis client - no connection needed');
    return;
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      await client.connect();
      Logger.info('Successfully connected to Redis');
      return;
    } catch (error) {
      Logger.error(`Redis connection attempt ${i + 1} failed:`, error);

      if (i === maxRetries - 1) {
        Logger.warn(
          'All Redis connection attempts failed - disabling cache functionality',
        );
        return;
      }

      Logger.info(`Retrying Redis connection in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// Only attempt connection if we have proper Redis configuration
if (hasRedisConfig) {
  connectWithRetry();
} else {
  Logger.info('Redis configuration not found - running without cache');
}

// If the Node process ends, close the Cache connection
process.on('SIGINT', async () => {
  if (!client.isMock && client.disconnect) {
    await client.disconnect();
  }
});

// Create a safe Redis client wrapper
const safeRedisClient = {
  ...client,
  // Override methods to handle disconnected state gracefully
  get: async (key: string) => {
    if (client.isMock || !client.isReady) {
      if (client.isMock) {
        Logger.debug(`Mock Redis client - skipping GET for key: ${key}`);
      } else {
        Logger.debug(`Redis not available, skipping GET for key: ${key}`);
      }
      return null;
    }
    try {
      return await client.get(key);
    } catch (error) {
      Logger.warn(`Redis GET failed for key ${key}:`, error);
      return null;
    }
  },

  set: async (key: string, value: string, options?: any) => {
    if (client.isMock || !client.isReady) {
      if (client.isMock) {
        Logger.debug(`Mock Redis client - skipping SET for key: ${key}`);
      } else {
        Logger.debug(`Redis not available, skipping SET for key: ${key}`);
      }
      return null;
    }
    try {
      return await client.set(key, value, options);
    } catch (error) {
      Logger.warn(`Redis SET failed for key ${key}:`, error);
      return null;
    }
  },

  del: async (key: string) => {
    if (client.isMock || !client.isReady) {
      if (client.isMock) {
        Logger.debug(`Mock Redis client - skipping DEL for key: ${key}`);
      } else {
        Logger.debug(`Redis not available, skipping DEL for key: ${key}`);
      }
      return 0;
    }
    try {
      return await client.del(key);
    } catch (error) {
      Logger.warn(`Redis DEL failed for key ${key}:`, error);
      return 0;
    }
  },

  exists: async (key: string) => {
    if (client.isMock || !client.isReady) {
      if (client.isMock) {
        Logger.debug(`Mock Redis client - skipping EXISTS for key: ${key}`);
      } else {
        Logger.debug(`Redis not available, skipping EXISTS for key: ${key}`);
      }
      return 0;
    }
    try {
      return await client.exists(key);
    } catch (error) {
      Logger.warn(`Redis EXISTS failed for key ${key}:`, error);
      return 0;
    }
  },
};

export default safeRedisClient;
