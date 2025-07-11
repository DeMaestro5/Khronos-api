# API Testing Guide for Khronos API

Your API is **LIVE** at: `https://khronos-api-bp71onrender.com`

## 🟢 **Public Endpoints (No Authentication Required)**

### 1. Main Health Check
```bash
curl https://khronos-api-bp71onrender.com/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-07-11T10:00:00.000Z",
  "environment": "production",
  "message": "Khronos API is running"
}
```

### 2. Cache Health Check
```bash
curl https://khronos-api-bp71onrender.com/api/v1/cache/health
```

### 3. Cache Performance Metrics
```bash
curl https://khronos-api-bp71onrender.com/api/v1/cache/metrics
```

## 🔒 **Protected Endpoints (API Key Required)**

All other endpoints require the `x-api-key` header.

### Default API Key
```
x-api-key: GCMUDibV5a7WvyUNt9n3QztToSHZk7Uj
```

### Example API Key Tests

#### Test Analytics Endpoints
```bash
# Get platform status
curl -H "x-api-key: GCMUDibV5a7WvyUNt9n3QztToSHZk7Uj" \
     https://khronos-api-bp71onrender.com/api/v1/analytics/platform-status

# Get LLM status  
curl -H "x-api-key: GCMUDibV5a7WvyUNt9n3QztToSHZk7Uj" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://khronos-api-bp71onrender.com/api/v1/llm/status
```

#### Test User Registration
```bash
# Sign up new user
curl -X POST \
     -H "x-api-key: GCMUDibV5a7WvyUNt9n3QztToSHZk7Uj" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "email": "test@example.com", 
       "password": "password123"
     }' \
     https://khronos-api-bp71onrender.com/api/v1/signup
```

#### Test User Login
```bash
# Login existing user
curl -X POST \
     -H "x-api-key: GCMUDibV5a7WvyUNt9n3QztToSHZk7Uj" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }' \
     https://khronos-api-bp71onrender.com/api/v1/login
```

## 🔐 **JWT Protected Endpoints (API Key + JWT Required)**

Some endpoints require both API key AND user authentication (JWT token).

### Get JWT Token First
1. **Sign up** or **Login** (examples above)
2. **Extract** the `accessToken` from response
3. **Use** in Authorization header

### Example JWT Request
```bash
curl -H "x-api-key: GCMUDibV5a7WvyUNt9n3QztToSHZk7Uj" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
     https://khronos-api-bp71onrender.com/api/v1/profile/my
```

## 🛠 **Testing with Postman**

### 1. Import Collection
- Use the collection: `addons/postman/NodeJS Backend Architecture Typescript.postman_collection.json`
- Import environment: `addons/postman/PROD ENV.postman_environment.json`

### 2. Set Environment Variables
```
BASE_URL: https://khronos-api-bp71onrender.com
API_KEY: GCMUDibV5a7WvyUNt9n3QztToSHZk7Uj
```

### 3. Test Flow
1. **Health Check** → Verify API is running
2. **Sign Up** → Create test user  
3. **Login** → Get JWT tokens
4. **Profile** → Test authenticated endpoints
5. **Analytics** → Test feature endpoints

## 🚨 **Common Error Codes**

### Authentication Errors
```json
{
  "statusCode": "10001", 
  "message": "X-api-key is required"
}
```
**Solution**: Add `x-api-key` header

```json
{
  "statusCode": "10003",
  "message": "Authentication failure"  
}
```
**Solution**: Check JWT token or login again

### Validation Errors
```json
{
  "statusCode": "10002",
  "message": "Bad Parameters"
}
```
**Solution**: Check request body format

## 🔍 **API Key Management**

### Current Default Keys
- **API Key**: `GCMUDibV5a7WvyUNt9n3QztToSHZk7Uj`
- **Permissions**: `["GENERAL"]`
- **Status**: Active

### Creating New API Keys
Use the settings endpoint to create additional API keys:
```bash
curl -X POST \
     -H "x-api-key: GCMUDibV5a7WvyUNt9n3QztToSHZk7Uj" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "My Custom API Key",
       "permissions": ["read", "write"]
     }' \
     https://khronos-api-bp71onrender.com/api/v1/settings/api-keys
```

## 📊 **Available Endpoints**

### Public (No Auth)
- `GET /health` - API health status
- `GET /api/v1/cache/health` - Cache health  
- `GET /api/v1/cache/metrics` - Cache metrics

### API Key Required
- `POST /api/v1/signup` - User registration
- `POST /api/v1/login` - User login
- `GET /api/v1/analytics/platform-status` - Platform status

### JWT Required (API Key + User Auth)
- `GET /api/v1/profile/my` - User profile
- `GET /api/v1/llm/status` - LLM provider status
- `GET /api/v1/analytics/dashboard` - Analytics dashboard
- `POST /api/v1/chat/message` - AI chat
- `GET /api/v1/content` - Content management
- `GET /api/v1/calendar` - Calendar events
- `GET /api/v1/trends` - Trending topics

## 🎯 **Quick Test Commands**

### Test if API is Running
```bash
curl https://khronos-api-bp71onrender.com/health
```

### Test API Key Authentication
```bash
curl -H "x-api-key: GCMUDibV5a7WvyUNt9n3QztToSHZk7Uj" \
     https://khronos-api-bp71onrender.com/api/v1/analytics/platform-status
```

### Full Authentication Test
```bash
# 1. Sign up
curl -X POST -H "x-api-key: GCMUDibV5a7WvyUNt9n3QztToSHZk7Uj" \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","email":"test@example.com","password":"test123"}' \
     https://khronos-api-bp71onrender.com/api/v1/signup

# 2. Use the accessToken from response in subsequent requests
```

## 🚀 **Production Considerations**

- **API Key Security**: Rotate keys regularly in production
- **Rate Limiting**: Monitor usage patterns  
- **Error Monitoring**: Track error rates and response times
- **Health Monitoring**: Use `/health` endpoint for uptime monitoring

Your API is fully functional and ready for testing! 🎉 