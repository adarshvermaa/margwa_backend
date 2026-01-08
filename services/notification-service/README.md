# Margwa Notification Service (TypeScript)

Push notification and in-app notification service for Margwa.

## Features

- In-app notification storage and retrieval
- Push notifications via Firebase Cloud Messaging (FCM)
- Real-time notification broadcasting via WebSocket
- Notification read/unread status tracking
- User-specific notification filtering

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL (with notifications table)
- Firebase Admin SDK credentials
- Realtime Service running (for WebSocket)

### Installation

```bash
cd services/notification-service
npm install
```

### Environment Variables

Add to root `.env`:
```env
NOTIFICATION_SERVICE_PORT=3006
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
REALTIME_SERVICE_URL=http://localhost:3004
SERVICE_TOKEN=internal-service-token
```

### Run

```bash
npm run dev
```

Service runs on port 3006.

## API Endpoints

```
POST   /notifications           - Create notification
GET    /notifications/:userId   - Get user notifications
PUT    /notifications/:id/read  - Mark as read
DELETE /notifications/:id       - Delete notification
GET    /health                  - Health check
```

## Notification Types

- `booking:new` - New booking request
- `booking:accepted` - Booking accepted by driver
- `booking:rejected` - Booking rejected
- `booking:cancelled` - Booking cancelled
- `payment:success` - Payment successful
- `payment:failed` - Payment failed
- `ride:started` - Ride started
- `ride:completed` - Ride completed
- `chat:message` - New chat message

## Integration

### From Other Services

```typescript
// Example: Send notification from booking-service
await fetch('http://localhost:3006/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        userId: 'user-uuid',
        title: 'Booking Confirmed',
        body: 'Your ride has been confirmed!',
        notificationType: 'booking:accepted',
        data: { bookingId: 'booking-uuid' },
        deviceToken: 'fcm-device-token',
    }),
});
```

### Firebase Setup

1. Create Firebase project at https://console.firebase.google.com
2. Generate service account key
3. Download JSON file and set path in `.env`
4. Add Firebase to your mobile app (client/driver apps)

## Architecture

```
Client Action → API Gateway → Service (booking/payment/etc)
                                    ↓
                         Notification Service
                                    ↓
              ┌─────────────────────┼─────────────────────┐
              ↓                     ↓                     ↓
         Database            Realtime Service        Firebase FCM
       (notifications)     (WebSocket broadcast)   (Push notification)
```
