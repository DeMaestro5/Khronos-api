import { redis } from '../config';
import { createClient } from 'redis';
import Logger from '../core/Logger';

// Handle Redis configuration - prefer REDIS_URL if available
const redisUrl = process.env.REDIS_URL;
const redisHost = redis.host || 'localhost';
const redisPort = redis.port || 6379;
const redisPassword = redis.password || '';

Logger.info('Redis Configuration:', {
  hasRedisUrl: !!redisUrl,
  host: redisHost,
  port: redisPort,
  hasPassword: !!redisPassword,
  passwordLength: redisPassword ? redisPassword.length : 0,
});

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

const client = createClient(clientConfig);

client.on('connect', () => Logger.info('Cache is connecting'));
client.on('ready', () => Logger.info('Cache is ready'));
client.on('end', () => Logger.info('Cache disconnected'));
client.on('reconnecting', () => Logger.info('Cache is reconnecting'));
client.on('error', (e) => Logger.error('Redis connection error:', e));

// Connection function with retry logic
const connectWithRetry = async (maxRetries = 3, delay = 5000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await client.connect();
      Logger.info('Successfully connected to Redis');
      return;
    } catch (error) {
      Logger.error(`Redis connection attempt ${i + 1} failed:`, error);

      if (i === maxRetries - 1) {
        Logger.warn(
          'Cache functionality will be disabled - check Redis configuration',
        );
        return;
      }

      Logger.info(`Retrying Redis connection in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// Connect to Redis with retry logic
connectWithRetry();

// If the Node process ends, close the Cache connection
process.on('SIGINT', async () => {
  await client.disconnect();
});

export default client;
