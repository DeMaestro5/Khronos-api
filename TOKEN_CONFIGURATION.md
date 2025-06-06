# Token Configuration Guide

## Overview
This guide explains how to properly configure tokens and handle token refresh to prevent frequent logouts.

## Server-Side Configuration

### 1. Environment Variables

Create a `.env` file in your project root with the following configuration:

```env
# Token Configuration
# Access token validity in seconds (3600 = 1 hour)
ACCESS_TOKEN_VALIDITY_SEC=3600
# Refresh token validity in seconds (2592000 = 30 days)  
REFRESH_TOKEN_VALIDITY_SEC=2592000
TOKEN_ISSUER=api.yourapp.com
TOKEN_AUDIENCE=yourapp.com

# Other required environment variables
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/your_database_name
```

### 2. Token Validity Settings

The default values have been updated in `src/config.ts`:
- **Access Token**: 1 hour (3600 seconds)
- **Refresh Token**: 30 days (2592000 seconds)

## Client-Side Implementation

### 1. HTTP Interceptor for Token Refresh

Implement an HTTP interceptor that automatically handles token refresh:

```javascript
// axios-interceptor.js
import axios from 'axios';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor - Add access token to all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if error is due to invalid access token
    if (error.response?.status === 401 && 
        error.response?.data?.statusCode === '10003' && 
        error.response?.headers?.instruction === 'refresh_token' &&
        !originalRequest._retry) {
      
      if (isRefreshing) {
        // If already refreshing, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return axios(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        // No refresh token, redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post('/api/v1/token/refresh', {
          refreshToken: refreshToken
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        
        // Update stored tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // Update authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        
        processQueue(null, accessToken);
        
        return axios(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axios;
```

### 2. Token Storage

```javascript
// auth-service.js
class AuthService {
  setTokens(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  getAccessToken() {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated() {
    return !!this.getAccessToken();
  }
}

export default new AuthService();
```

### 3. React Implementation Example

```jsx
// useAuth.js (React Hook)
import { useState, useEffect, createContext, useContext } from 'react';
import authService from './auth-service';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on app load
    const token = authService.getAccessToken();
    if (token) {
      setIsAuthenticated(true);
      // Optionally fetch user data
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/v1/login', { email, password });
      const { user, tokens } = response.data.data;
      
      authService.setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message };
    }
  };

  const logout = () => {
    authService.clearTokens();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      loading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Server-Side Token Response

The server now properly handles token expiration by sending:

### On Token Expiration:
```json
{
  "statusCode": "10003",
  "status": 401,
  "message": "Access token invalid"
}
```
**Headers:**
- `instruction: refresh_token`

### On Successful Token Refresh:
```json
{
  "statusCode": "10000",
  "status": 200,
  "message": "Token Issued",
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token"
}
```

## Testing the Configuration

1. **Set Environment Variables**: Create `.env` file with proper values
2. **Restart Server**: Ensure new token validity is loaded
3. **Test Token Expiration**: Wait for access token to expire and verify automatic refresh
4. **Test Refresh Token Expiration**: Verify user is redirected to login when refresh token expires

## Key Improvements Made

1. **Fixed Token Validity**: Changed default from 0 to reasonable values (1 hour for access, 30 days for refresh)
2. **Fixed Authorization Logic**: All routes now properly handle populated userId fields
3. **Clear Error Response**: Server sends specific status code (10003) for token expiration
4. **Refresh Token Instruction**: Server includes `instruction: refresh_token` header
5. **Comprehensive Client Guide**: Detailed implementation for automatic token refresh

## Recommended Token Lifetimes

- **Development**: Access: 1 hour, Refresh: 30 days
- **Production**: Access: 15-30 minutes, Refresh: 7-14 days
- **High Security**: Access: 5-15 minutes, Refresh: 1-7 days

Adjust these values based on your security requirements and user experience preferences. 