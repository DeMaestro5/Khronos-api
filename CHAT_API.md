# Chat API Documentation

The Chat API enables users to have AI-powered conversations about their content, get optimization suggestions, and generate content based on chat insights.

## Endpoints

### 1. Start a New Chat Session
**POST** `/api/v1/chat/start`

Start a new chat session, optionally linked to specific content or using a template.

#### Request Body
```json
{
  "title": "Content Optimization Chat",
  "description": "Discussing optimization strategies for my Instagram post",
  "contentId": "650a1b2c3d4e5f6g7h8i9j0k", // Optional: Link to specific content
  "templateId": "650a1b2c3d4e5f6g7h8i9j0k", // Optional: Start from template
  "settings": { // Optional: Custom AI settings
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "maxTokens": 1000
  }
}
```

#### Response
```json
{
  "statusCode": 200,
  "message": "Chat session started successfully",
  "data": {
    "session": {
      "id": "650a1b2c3d4e5f6g7h8i9j0k",
      "title": "Content Optimization Chat",
      "description": "Discussing optimization strategies for my Instagram post",
      "contentId": "650a1b2c3d4e5f6g7h8i9j0k",
      "status": "active",
      "settings": {
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "maxTokens": 1000
      },
      "metadata": {
        "totalTokens": 0,
        "lastActiveAt": "2024-01-15T10:30:00Z",
        "context": "Content Context: ..."
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 2. Send Message to AI Assistant
**POST** `/api/v1/chat/message`

Send a message to the AI assistant and receive a response.

#### Request Body
```json
{
  "sessionId": "650a1b2c3d4e5f6g7h8i9j0k",
  "message": "How can I optimize this Instagram post for better engagement?"
}
```

#### Response
```json
{
  "statusCode": 200,
  "message": "Message sent successfully",
  "data": {
    "message": {
      "role": "assistant",
      "content": "Here are several ways to optimize your Instagram post for better engagement...",
      "timestamp": "2024-01-15T10:35:00Z",
      "metadata": {
        "tokens": 245,
        "model": "gpt-4o-mini"
      }
    },
    "suggestions": [
      "Can you suggest hashtags?",
      "What are the best posting times?",
      "How can I improve engagement?"
    ],
    "actions": [
      {
        "type": "optimize",
        "label": "Optimize Content",
        "description": "Get platform-specific optimization suggestions"
      },
      {
        "type": "analyze",
        "label": "Analyze Performance",
        "description": "Get insights on content performance potential"
      }
    ],
    "session": {
      "id": "650a1b2c3d4e5f6g7h8i9j0k",
      "totalMessages": 4,
      "totalTokens": 1250,
      "lastActiveAt": "2024-01-15T10:35:00Z"
    }
  }
}
```

### 3. Get All Chat Sessions
**GET** `/api/v1/chat/sessions`

Retrieve all chat sessions for the authenticated user.

#### Query Parameters
- `status` (optional): Filter by status (`active`, `archived`, `completed`)
- `limit` (optional): Number of sessions to return (1-50, default: 20)
- `skip` (optional): Number of sessions to skip (default: 0)
- `contentId` (optional): Filter sessions linked to specific content

#### Response
```json
{
  "statusCode": 200,
  "message": "Chat sessions retrieved successfully",
  "data": {
    "sessions": [
      {
        "id": "650a1b2c3d4e5f6g7h8i9j0k",
        "title": "Instagram Post Optimization",
        "description": "Optimizing content for better engagement",
        "contentId": "650a1b2c3d4e5f6g7h8i9j0k",
        "content": {
          "id": "650a1b2c3d4e5f6g7h8i9j0k",
          "title": "My Instagram Post",
          "type": "social",
          "platform": ["instagram"]
        },
        "status": "active",
        "messageCount": 8,
        "totalTokens": 2340,
        "lastActiveAt": "2024-01-15T10:35:00Z",
        "createdAt": "2024-01-15T10:00:00Z",
        "tags": ["optimization", "instagram"]
      }
    ],
    "total": 1
  }
}
```

### 4. Get Specific Chat Session
**GET** `/api/v1/chat/sessions/:id`

Retrieve a specific chat session with full message history.

#### Response
```json
{
  "statusCode": 200,
  "message": "Chat session retrieved successfully",
  "data": {
    "session": {
      "id": "650a1b2c3d4e5f6g7h8i9j0k",
      "title": "Instagram Post Optimization",
      "description": "Optimizing content for better engagement",
      "contentId": "650a1b2c3d4e5f6g7h8i9j0k",
      "content": {
        "id": "650a1b2c3d4e5f6g7h8i9j0k",
        "title": "My Instagram Post",
        "type": "social",
        "platform": ["instagram"]
      },
      "messages": [
        {
          "role": "assistant",
          "content": "Hi! I'm here to help optimize your Instagram post. What would you like to focus on?",
          "timestamp": "2024-01-15T10:00:00Z",
          "metadata": {}
        },
        {
          "role": "user",
          "content": "How can I improve engagement on this post?",
          "timestamp": "2024-01-15T10:02:00Z",
          "metadata": {}
        }
      ],
      "status": "active",
      "tags": ["optimization", "instagram"],
      "settings": {
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "maxTokens": 1000
      },
      "metadata": {
        "totalTokens": 1250,
        "lastActiveAt": "2024-01-15T10:35:00Z"
      },
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:35:00Z"
    }
  }
}
```

### 5. Delete Chat Session
**DELETE** `/api/v1/chat/sessions/:id`

Delete a specific chat session.

#### Response
```json
{
  "statusCode": 200,
  "message": "Chat session deleted successfully",
  "data": {
    "deleted": true,
    "sessionId": "650a1b2c3d4e5f6g7h8i9j0k"
  }
}
```

### 6. Generate Content from Chat Session
**POST** `/api/v1/chat/sessions/:id/content`

Generate content based on the insights and conversation from a chat session.

#### Request Body
```json
{
  "contentType": "social",
  "platform": ["instagram", "twitter"],
  "title": "Optimized Instagram Post" // Optional
}
```

#### Response
```json
{
  "statusCode": 200,
  "message": "Content generated successfully",
  "data": {
    "content": {
      "title": "Optimized Instagram Post",
      "body": "Here's your optimized content based on our conversation...",
      "type": "social",
      "platform": ["instagram", "twitter"],
      "insights": [
        "AI provided recommendations based on conversation",
        "Optimization strategies discussed"
      ],
      "sessionId": "650a1b2c3d4e5f6g7h8i9j0k",
      "generatedAt": "2024-01-15T10:40:00Z"
    }
  }
}
```

### 7. Get Available Chat Templates
**GET** `/api/v1/chat/content-templates`

Get available chat templates for starting specialized conversations.

#### Query Parameters
- `category` (optional): Filter by category (`content-optimization`, `content-creation`, `strategy`, `analysis`, `custom`)
- `limit` (optional): Number of templates to return (1-50, default: 20)
- `search` (optional): Search templates by name, description, or tags

#### Response
```json
{
  "statusCode": 200,
  "message": "Chat templates retrieved successfully",
  "data": {
    "templates": [
      {
        "id": "650a1b2c3d4e5f6g7h8i9j0k",
        "name": "Content Optimization Expert",
        "description": "Get expert advice on optimizing your content for better engagement and reach.",
        "category": "content-optimization",
        "tags": ["optimization", "SEO", "engagement", "social-media"],
        "isPublic": true,
        "usageCount": 150,
        "author": {
          "id": "650a1b2c3d4e5f6g7h8i9j0k",
          "name": "System"
        },
        "settings": {
          "model": "gpt-4o-mini",
          "temperature": 0.7,
          "maxTokens": 1000
        },
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 1
  }
}
```

### 8. Save Chat Session as Template
**POST** `/api/v1/chat/sessions/:id/save-template`

Save a chat session as a reusable template.

#### Request Body
```json
{
  "name": "My Custom Optimization Template",
  "description": "A template for optimizing social media content",
  "category": "content-optimization",
  "tags": ["optimization", "social-media", "custom"],
  "isPublic": false
}
```

#### Response
```json
{
  "statusCode": 200,
  "message": "Chat session saved as template successfully",
  "data": {
    "template": {
      "id": "650a1b2c3d4e5f6g7h8i9j0k",
      "name": "My Custom Optimization Template",
      "description": "A template for optimizing social media content",
      "category": "content-optimization",
      "tags": ["optimization", "social-media", "custom"],
      "isPublic": false,
      "settings": {
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "maxTokens": 1000
      },
      "createdAt": "2024-01-15T10:45:00Z"
    }
  }
}
```

## Features

### Content-Aware Conversations
- Chat sessions can be linked to specific content pieces
- AI has context about the content (title, type, platform, description)
- Conversations are tailored to the specific content being discussed

### Templates for Common Use Cases
- Pre-built templates for content optimization, strategy planning, creation assistance
- Custom templates can be created and shared
- Templates include specialized system prompts and initial messages

### AI-Powered Suggestions
- Context-aware response suggestions
- Quick actions for common tasks (optimize, analyze, generate, schedule)
- Smart recommendations based on conversation flow

### Performance Tracking
- Token usage tracking per session and message
- Session statistics and analytics
- Conversation history preservation

### Multi-Platform Integration
- Works with existing content management system
- Supports all content types (article, video, social, podcast, etc.)
- Platform-specific optimization advice

## Authentication

All endpoints require authentication via the existing API key and JWT token system. Include the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Handling

The API uses standard HTTP status codes and returns error responses in the following format:

```json
{
  "statusCode": 400,
  "message": "Invalid session ID",
  "error": "BadRequestError"
}
```

## Rate Limiting

Chat endpoints may be subject to rate limiting based on:
- Number of messages per minute
- Token usage per hour
- Concurrent active sessions

## Getting Started

1. **Start a new chat session** using a template or create a blank session
2. **Link to content** (optional) for content-specific conversations
3. **Send messages** to get AI assistance and suggestions
4. **Generate content** based on chat insights
5. **Save successful conversations** as templates for future use

## Example Workflow

```javascript
// 1. Start a chat session with a template
const session = await fetch('/api/v1/chat/start', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' },
  body: JSON.stringify({
    title: 'Instagram Post Optimization',
    contentId: 'my-content-id',
    templateId: 'content-optimization-template-id'
  })
});

// 2. Send messages and get AI responses
const response = await fetch('/api/v1/chat/message', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' },
  body: JSON.stringify({
    sessionId: session.data.session.id,
    message: 'How can I improve engagement on this post?'
  })
});

// 3. Generate optimized content
const content = await fetch(`/api/v1/chat/sessions/${session.data.session.id}/content`, {
  method: 'POST',
  headers: { 'Authorization': 'Bearer <token>' },
  body: JSON.stringify({
    contentType: 'social',
    platform: ['instagram']
  })
});
``` 