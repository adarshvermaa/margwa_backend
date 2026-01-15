# Realtime Service

WebSocket-based real-time communication service for Margwa.

## Overview

Built with **TypeScript** and **Socket.IO**, providing:
- Real-time location tracking
- Live booking updates
- Chat message broadcasting
- Driver online/offline status
- Push notification delivery

## Port

**3004**

## Technology Stack

- TypeScript
- Socket.IO
- Redis (pub/sub for scaling)
- Express.js

## WebSocket Connection

### Client Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3004', {
  auth: {
    token: 'jwt-access-token'
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### Authentication

Socket connections are authenticated via JWT:
1. Client sends token in `auth.token`
2. Server verifies JWT
3. Connection established if valid
4. User data attached to socket

## Events

### Client → Server

#### Location Update (Driver)
```javascript
socket.emit('location:update', {
  latitude: 22.7196,
  longitude: 75.8577,
  heading: 45.5,
  speed: 60,
  rideId: 'ride-uuid'
});
```

#### Join Ride Room
```javascript
socket.emit('ride:join', 'ride-uuid');
```

#### Leave Ride Room
```javascript
socket.emit('ride:leave', 'ride-uuid');
```

#### Send Chat Message
```javascript
socket.emit('chat:message', {
  conversationId: 'conv-uuid',
  receiverId: 'user-uuid',
  message: 'Hello!'
});
```

#### Driver Online Status
```javascript
socket.emit('driver:online');
socket.emit('driver:offline');
```

### Server → Client

#### Location Updated
```javascript
socket.on('location:updated', (data) => {
  console.log('Driver location:', data);
  // { latitude, longitude, heading, speed, timestamp, driverId }
});
```

#### Booking New Request
```javascript
socket.on('booking:new', (data) => {
  console.log('New booking:', data);
  // { bookingId, clientId, route, ... }
});
```

#### Booking Status Updated
```javascript
socket.on('booking:updated', (data) => {
  console.log('Booking status:', data.status);
  // { bookingId, status, driverId, ... }
});
```

#### Chat Message Received
```javascript
socket.on('chat:message', (data) => {
  console.log('New message:', data);
  // { conversationId, senderId, message, timestamp }
});
```

#### Notification
```javascript
socket.on('notification:new', (data) => {
  console.log('Notification:', data);
  // { title, body, type, data }
});
```

#### Driver Status Changed
```javascript
socket.on('driver:status', (data) => {
  console.log('Driver is:', data.isOnline ? 'online' : 'offline');
});
```

## Rooms

Socket.IO rooms are used for targeted broadcasting:

### Ride Rooms
- Room: `ride:{rideId}`
- Members: Driver + all passengers
- Purpose: Location updates, ride status

### User Rooms
- Room: `user:{userId}`
- Members: Single user
- Purpose: Personal notifications, messages

### Driver Room
- Room: `driver:{driverId}`
- Members: Single driver
- Purpose: Booking requests, notifications

## Redis Pub/Sub

For horizontal scaling across multiple server instances:

```
Instance 1                Instance 2                Instance 3
    ↓                        ↓                        ↓
    └─────────────── Redis Pub/Sub ───────────────────┘
```

Events published to Redis are broadcast to all instances.

## Example Use Cases

### 1. Live Location Tracking

**Driver App:**
```javascript
// Update location every 5 seconds
setInterval(() => {
  navigator.geolocation.getCurrentPosition((position) => {
    socket.emit('location:update', {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      heading: position.coords.heading,
      speed: position.coords.speed,
      rideId: currentRideId
    });
  });
}, 5000);
```

** Client App:**
```javascript
// Join ride to receive location updates
socket.emit('ride:join', bookingId);

socket.on('location:updated', (data) => {
  // Update map marker
  updateDriverMarker(data.latitude, data.longitude);
});
```

### 2. Real-time Booking

**Client App:**
```javascript
// Listen for booking confirmation
socket.on('booking:updated', (data) => {
  if (data.status === 'accepted') {
    alert('Driver accepted your booking!');
    navigateToRideScreen(data);
  }
});
```

**Driver App:**
```javascript
// Receive booking requests
socket.on('booking:new', (data) => {
  showBookingRequestNotification(data);
});
```

### 3. Live Chat

```javascript
// Send message
socket.emit('chat:message', {
  conversationId: convId,
  receiverId: otherId,
  message: 'On my way!'
});

// Receive messages
socket.on('chat:message', (data) => {
  if (data.conversationId === currentConvId) {
    addMessageToChat(data);
  }
});
```

## Environment Variables

```env
REALTIME_SERVICE_PORT=3004
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret
CORS_ORIGIN=*
NODE_ENV=development
```

## Development

```bash
cd services/realtime-service
npm install
npm run dev
```

Service runs on http://localhost:3004

## Testing

### Using Socket.IO Client

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:3004', {
  auth: { token: 'test-jwt-token' }
});

socket.on('connect', () => {
  console.log('Connected!');
  
  // Test location update
  socket.emit('location:update', {
    latitude: 22.7196,
    longitude: 75.8577,
    rideId: 'test-ride'
  });
});
```

### Health Check

```bash
curl http://localhost:3004/health
```

## Production Considerations

### Scaling

- Use Redis adapter for multi-instance deployment
- Sticky sessions if not using Redis
- Load balancer with WebSocket support

### Performance

- Max connections per instance: ~10,000
- Use binary protocol for efficiency
- Compress messages over 1KB

### Security

- Always validate JWT tokens
- Rate limit socket events
- Sanitize user input
- Use HTTPS/WSS in production

## Architecture

```
Mobile Apps
    ↓↑ WebSocket
Realtime Service (Socket.IO)
    ↓↑ Pub/Sub
Redis
    ↓↑
Other Services
```

## Error Handling

```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Reconnect manually
    socket.connect();
  }
});
```

---

For integration examples, see [docs/INTEGRATION_EXAMPLES.md](../../docs/INTEGRATION_EXAMPLES.md).
