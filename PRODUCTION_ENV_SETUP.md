# 🔧 Production Environment Variables Setup

## CRITICAL: Set These in Render Dashboard

Go to your Render service dashboard and add these environment variables:

### **Required Google OAuth Variables:**
```env
GOOGLE_CLIENT_ID=your-actual-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
GOOGLE_CALLBACK_URL=https://khronos-api-bp71.onrender.com/api/v1/auth/google/callback
```

### **Required Base URLs:**
```env
API_URL=https://khronos-api-bp71.onrender.com
FRONTEND_URL=https://khronos-client.vercel.app
```

### **Required State Secret:**
```env
STATE_SECRET=your-32-character-random-string-for-oauth-state
```

## Steps:
1. Go to Render Dashboard
2. Select your khronos-api service
3. Go to Environment tab
4. Add each variable above
5. Redeploy the service 