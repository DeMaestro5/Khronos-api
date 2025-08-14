# Test Content ID in Notifications

## Test Steps:

### 1. Create a calendar event with contentId
**POST** `/calendar/event`
```json
{
  "title": "Test Content Event",
  "description": "Testing contentId in notification",
  "startDate": "2025-01-15T10:00:00.000Z",
  "endDate": "2025-01-15T11:00:00.000Z",
  "eventType": "content_publishing",
  "contentId": "507f1f77bcf86cd799439011",
  "platform": ["twitter"],
  "reminders": [
    { "type": "push", "time": 5 }
  ]
}
```

### 2. Trigger scheduler (if testing)
**POST** `/notifications/test/run-scheduler`

### 3. Check notifications
**GET** `/notifications?type=schedule&limit=5`

### Expected Response:
```json
{
  "notifications": [
    {
      "_id": "...",
      "userId": "...",
      "type": "schedule",
      "title": "Upcoming Event: Test Content Event",
      "message": "Test Content Event is starting in 5 minutes.",
      "priority": "medium",
      "status": "unread",
      "data": {
        "eventId": "...",
        "startDate": "2025-01-15T10:00:00.000Z",
        "endDate": "2025-01-15T11:00:00.000Z",
        "type": "content_publishing",
        "reminderType": "push",
        "contentId": "507f1f77bcf86cd799439011"  // ← This should be included
      },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

## What Changed:

1. **Scheduler Service**: Modified `generateEventNotification()` and `generateEventFollowUpNotification()` to include `contentId` in notification data when the event has an associated content.

2. **Notification Service**: Updated `generatePerformanceAlert()`, `generateTrendAlert()`, and `generateScheduleReminder()` to:
   - Accept `userId` as first parameter
   - Use `createNotification()` method instead of returning raw objects
   - This ensures proper broadcasting and settings enforcement

## Benefits:

- **Direct Content Access**: You can now access content directly from notifications via `notification.data.contentId`
- **Consistent Broadcasting**: All notification types now go through the same `createNotification()` flow
- **Settings Enforcement**: Performance and trend alerts now respect user notification settings and quiet hours
- **WebSocket Support**: All notifications are properly broadcast to connected clients

## Usage in Client:

```typescript
// Access content from notification
const contentId = notification.data?.contentId;
if (contentId) {
  // Fetch content details
  const content = await fetchContent(contentId);
  // Show content preview in notification UI
}
``` 