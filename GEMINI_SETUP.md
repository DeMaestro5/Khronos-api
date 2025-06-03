# Gemini Integration Setup Guide

## Overview
This application now supports both OpenAI and Google's Gemini AI models with automatic fallback functionality. When one provider hits quota limits or fails, the system automatically switches to the other provider.

## Setting up Gemini API Key

### 1. Get Your Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure Environment Variables
Add the following to your `.env` file:

```bash
# Add this alongside your existing OPENAI_API_KEY
GEMINI_API_KEY=your_gemini_api_key_here
```

## Provider Configuration

### Default Behavior
- **Primary Provider**: Gemini (uses the free `gemini-1.5-flash` model)
- **Fallback Provider**: OpenAI
- **Auto-Switch**: When OpenAI quota is exceeded, automatically switches to Gemini

### Available Models
- **Gemini**: `gemini-1.5-flash` (Free tier with generous limits)
- **OpenAI**: `gpt-3.5-turbo` (Paid usage)

## API Endpoints

### Check Provider Status
```bash
GET /api/v1/llm/status
```
Returns current primary/fallback providers and availability.

### Switch Primary Provider
```bash
POST /api/v1/llm/switch/gemini
POST /api/v1/llm/switch/openai
```

### Test LLM Integration
```bash
POST /api/v1/llm/test
{
  "content": "Test content to optimize",
  "platform": "twitter"
}
```

## Benefits

### 1. Cost Optimization
- Gemini offers generous free tier limits
- Automatic fallback reduces failed requests
- Primary use of free models when possible

### 2. Reliability
- No single point of failure
- Automatic quota limit handling
- Seamless provider switching

### 3. Performance
- Multiple model options
- Provider-specific optimizations
- Error handling and retries

## Quota Limits

### Gemini (Free Tier)
- 15 requests per minute
- 1,500 requests per day
- 1 million tokens per minute

### OpenAI (Paid)
- Varies by plan
- Rate limits based on usage tier

## Error Handling

The system automatically:
1. Detects quota/rate limit errors (429 status codes)
2. Switches to the fallback provider
3. Logs provider switches for monitoring
4. Retries failed operations with the alternate provider

## Monitoring

Check logs for provider switching:
```
Attempting optimizeContent with gemini
OpenAI quota exceeded, switching to gemini
Attempting optimizeContent with openai as fallback
```

## Troubleshooting

### Provider Not Available
- Ensure API keys are set in environment variables
- Check API key validity
- Verify network connectivity

### Both Providers Failing
- Check API key permissions
- Verify account status with providers
- Review error logs for specific issues

## Production Considerations

1. **API Key Security**: Store keys securely, never commit to version control
2. **Rate Limiting**: Monitor usage across both providers
3. **Cost Management**: Set up billing alerts for paid providers
4. **Monitoring**: Track provider performance and switch frequency 