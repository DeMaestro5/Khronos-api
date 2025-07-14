# Google OAuth Setup Guide for Khronos API

This guide will help you set up Google OAuth authentication for the Khronos API.

## Prerequisites

- Google Cloud Console account
- Node.js application with Express
- MongoDB database

## Step 1: Google Cloud Console Setup

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (if not already enabled)

### 1.2 Configure OAuth Consent Screen

1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name: "Khronos API"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. Add test users (your email addresses)

### 1.3 Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Set the following:
   - Name: "Khronos API OAuth Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/v1/auth/google/callback` (development)
     - `https://yourdomain.com/api/v1/auth/google/callback` (production)
5. Copy the Client ID and Client Secret

## Step 2: Environment Configuration

Add the following variables to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
```

## Step 3: API Endpoints

### 3.1 Google OAuth Login

**Endpoint:** `GET /api/v1/auth/google/login`

**Description:** Initiates Google OAuth flow

**Headers:**
```
x-api-key: YOUR_API_KEY
```

**Response:** Redirects to Google OAuth consent screen

### 3.2 Google OAuth Callback

**Endpoint:** `GET /api/v1/auth/google/callback`

**Description:** Handles Google OAuth callback after user authorization

**Headers:**
```
x-api-key: YOUR_API_KEY
```

**Response:**
```json
{
  "statusCode": "10000",
  "message": "Google login successful",
  "data": {
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "profilePicUrl": "https://lh3.googleusercontent.com/...",
      "role": "CONTENT_CREATOR",
      "verified": true,
      "authProvider": "google"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    },
    "isNewUser": false
  }
}
```

### 3.3 Google OAuth Failure

**Endpoint:** `GET /api/v1/auth/google/failure`

**Description:** Handles Google OAuth failures

**Response:**
```json
{
  "statusCode": "10001",
  "message": "Google authentication failed"
}
```

## Step 4: Frontend Integration

### 4.1 React Example

```jsx
import React from 'react';

const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    // Redirect to Google OAuth endpoint
    window.location.href = '/api/v1/auth/google/login';
  };

  return (
    <button onClick={handleGoogleLogin}>
      Sign in with Google
    </button>
  );
};

export default GoogleLoginButton;
```

### 4.2 Next.js Example

```jsx
// pages/auth/google-callback.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';

const GoogleCallback = () => {
  const router = useRouter();

  useEffect(() => {
    // Handle the callback response
    const handleCallback = async () => {
      try {
        const response = await fetch('/api/v1/auth/google/callback', {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Store tokens
          localStorage.setItem('accessToken', data.data.tokens.accessToken);
          localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
          
          // Redirect to dashboard
          router.push('/dashboard');
        } else {
          router.push('/login?error=google_auth_failed');
        }
      } catch (error) {
        console.error('Google auth error:', error);
        router.push('/login?error=google_auth_failed');
      }
    };

    handleCallback();
  }, [router]);

  return <div>Processing Google authentication...</div>;
};

export default GoogleCallback;
```

## Step 5: User Flow

### 5.1 New User Flow

1. User clicks "Sign in with Google"
2. Redirected to Google OAuth consent screen
3. User authorizes the application
4. Google redirects to `/api/v1/auth/google/callback`
5. System creates new user account with Google profile data
6. Returns JWT tokens and user data
7. Frontend stores tokens and redirects to dashboard

### 5.2 Existing User Flow

1. User clicks "Sign in with Google"
2. Redirected to Google OAuth consent screen
3. User authorizes the application
4. Google redirects to `/api/v1/auth/google/callback`
5. System finds existing user by Google ID or email
6. Returns JWT tokens and user data
7. Frontend stores tokens and redirects to dashboard

### 5.3 Account Linking Flow

1. User with existing email account signs in with Google
2. System detects existing account by email
3. System links Google account to existing account
4. User can now use either authentication method

## Step 6: Security Considerations

### 6.1 Environment Variables

- Never commit Google OAuth credentials to version control
- Use environment variables for all sensitive data
- Rotate credentials regularly

### 6.2 HTTPS in Production

- Always use HTTPS in production
- Update authorized origins and redirect URIs accordingly
- Configure secure cookie settings

### 6.3 Token Security

- JWT tokens are stateless and secure
- Access tokens have short expiration (1 hour)
- Refresh tokens have longer expiration (30 days)
- Implement proper token refresh logic

## Step 7: Testing

### 7.1 Local Testing

1. Start your development server
2. Navigate to `http://localhost:3000/api/v1/auth/google/login`
3. Complete Google OAuth flow
4. Verify callback response

### 7.2 Postman Testing

1. Import the provided Postman collection
2. Set up environment variables
3. Test the Google OAuth endpoints
4. Verify token responses

## Step 8: Troubleshooting

### 8.1 Common Issues

**"Invalid redirect URI"**
- Check that your redirect URI matches exactly in Google Console
- Ensure protocol (http/https) matches

**"Client ID not found"**
- Verify GOOGLE_CLIENT_ID in environment variables
- Check that the client ID is correct

**"CORS errors"**
- Update CORS configuration in app.ts
- Add your frontend domain to allowed origins

**"User not found"**
- Check database connection
- Verify user creation logic
- Check Google profile data structure

### 8.2 Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will log detailed information about the OAuth flow.

## Step 9: Production Deployment

### 9.1 Environment Setup

1. Update Google Console with production URLs
2. Set production environment variables
3. Configure HTTPS certificates
4. Update CORS settings

### 9.2 Monitoring

1. Monitor OAuth success/failure rates
2. Track user registration metrics
3. Set up error alerting
4. Monitor token refresh patterns

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Google OAuth documentation
3. Check server logs for detailed error messages
4. Verify environment variable configuration 