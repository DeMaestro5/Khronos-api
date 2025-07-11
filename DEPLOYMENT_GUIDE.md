# Khronos API Deployment Guide for Render

## Prerequisites

1. [Render account](https://render.com) (free tier available)
2. GitHub repository with your code pushed
3. API keys for external services (OpenAI, Gemini, social media APIs, etc.)

## Quick Deploy Option

### Option 1: Using render.yaml (Recommended)

1. **Connect your GitHub repository to Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file

2. **Configure Environment Variables**
   - The basic variables are already configured in render.yaml
   - Add your API keys manually in the Render dashboard:
     - `OPENAI_API_KEY`
     - `GEMINI_API_KEY`
     - `TWITTER_BEARER_TOKEN`
     - `INSTAGRAM_ACCESS_TOKEN`
     - And other API keys from your env.template

### Option 2: Manual Setup (Alternative)

1. **Create Web Service**
   - Go to Render Dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm run serve`
     - **Environment**: `Node`

2. **Create Redis Service**
   - Click "New" → "Redis"
   - Name: `khronos-redis`
   - Plan: Starter (free)

3. **Create MongoDB Service**
   - Click "New" → "Private Service"
   - Use the `mongo.dockerfile`
   - Add a persistent disk for data

## Environment Variables Setup

### Required Variables (Set in Render Dashboard)
```
NODE_ENV=production
JWT_SECRET=your-jwt-secret-key-here
FRONTEND_URL=https://your-frontend-domain.com
CORS_URL=https://your-frontend-domain.com
```

### Database & Cache (Auto-configured in render.yaml)
```
MONGODB_URI=mongodb://...
REDIS_HOST=...
REDIS_PORT=...
REDIS_PASSWORD=...
```

### API Keys (Add these manually)
```
OPENAI_API_KEY=your-openai-api-key
GEMINI_API_KEY=your-gemini-api-key
TWITTER_BEARER_TOKEN=your-twitter-bearer-token
INSTAGRAM_ACCESS_TOKEN=your-instagram-access-token
YOUTUBE_API_KEY=your-youtube-api-key
LINKEDIN_ACCESS_TOKEN=your-linkedin-access-token
FACEBOOK_ACCESS_TOKEN=your-facebook-access-token
```

## Post-Deployment Steps

1. **Test your API**
   ```bash
   curl https://your-app-name.onrender.com/health
   ```

2. **Set up your frontend**
   - Update your frontend's API base URL to: `https://your-app-name.onrender.com/api/v1`

3. **Monitor logs**
   - Check Render dashboard for deployment logs
   - Monitor application logs for any issues

## Scaling & Production Considerations

### Upgrade Plans
- **Starter**: Free tier with limitations
- **Standard**: $25/month for better performance
- **Pro**: $85/month for high availability

### Database Considerations
- For production workloads, consider using:
  - [MongoDB Atlas](https://www.mongodb.com/atlas) (managed MongoDB)
  - [Redis Cloud](https://redis.com/redis-enterprise-cloud/) (managed Redis)

### Security
- All sensitive API keys should be set as environment variables
- Enable HTTPS (automatically provided by Render)
- Consider implementing rate limiting in production

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check if all dependencies are in package.json
   - Verify TypeScript compilation works locally

2. **Database Connection Issues**
   - Ensure MongoDB service is running
   - Check connection string format

3. **Redis Connection Issues**
   - Verify Redis service is active
   - Check host/port configuration

4. **API Key Issues**
   - Verify all required API keys are set
   - Check API key permissions and quotas

### Getting Help
- Check Render documentation: https://render.com/docs
- Monitor application logs in Render dashboard
- Use the health endpoint: `/health` for basic connectivity tests

## Cost Estimation

### Free Tier
- Web Service: Free (with limitations)
- Redis: Free starter plan
- MongoDB: Free starter plan
- **Total**: $0/month (with usage limits)

### Production Tier
- Web Service: $25/month
- Redis: $10/month
- MongoDB: $15/month (or use Atlas)
- **Total**: ~$50/month

## Auto-Deploy Setup

1. **Enable Auto-Deploy**
   - In Render dashboard → your service → Settings
   - Enable "Auto-Deploy" from GitHub

2. **Branch Configuration**
   - Set to deploy from `main` or `production` branch
   - Configure build notifications

Your API will be available at: `https://your-app-name.onrender.com` 