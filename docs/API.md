# Margwa Backend - API Documentation

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Routes API

### Search Routes

Search for available routes between cities.

**Endpoint:** `POST /routes/search`  
**Auth Required:** No  
**Request Body:**

```json
{
  "fromCity": "Indore",
  "toCity": "Bhopal",
  "date": "2024-01-15",
  "timeFilter": "morning",
  "genderFilter": "any",
  "vehicleType": "suv",
  "page": 1,
  "limit": 20
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "route": {
          "id": "uuid",
          "fromCity": "Indore",
          "toCity": "Bhopal",
          "departureTime": "09:00:00",
          "arrivalTime": "12:00:00",
          "basePricePerSeat": "450",
          "totalSeats": 6,
          "genderPreference": "any",
          "amenities": ["AC", "WiFi", "Music"]
        },
        "driver": {
          "id": "uuid",
          "totalTrips": 156,
          "averageRating": "4.8"
        },
        "vehicle": {
          "id": "uuid",
          "vehicleName": "Toyota Innova Crysta",
          "vehicleType": "suv"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

### Create Route

Create a new route (drivers only).

**Endpoint:** `POST /routes`  
**Auth Required:** Yes (Driver)  
**Request Body:**

```json
{
  "driverId": "uuid",
  "vehicleId": "uuid",
  "fromCity": "Indore",
  "fromLatitude": 22.7196,
  "fromLongitude": 75.8577,
  "toCity": "Bhopal",
  "toLatitude": 23.2599,
  "toLongitude": 77.4126,
  "departureTime": "09:00:00",
  "arrivalTime": "12:00:00",
  "estimatedDurationMinutes": 180,
  "distanceKm": 195,
  "basePricePerSeat": 450,
  "totalSeats": 6,
  "genderPreference": "any",
  "pickupRadiusKm": 5,
  "dropRadiusKm": 5,
  "amenities": ["AC", "WiFi", "Music"],
  "isActive": true,
  "recurringDays": [1, 3, 5]
}
```

### Get Driver Routes

Get all routes for a specific driver.

**Endpoint:** `GET /routes/driver/:driverId`  
**Auth Required:** Yes  
**Response:** Array of route objects

### Get Route by ID

**Endpoint:** `GET /routes/:id`  
**Auth Required:** Yes

### Update Route

**Endpoint:** `PUT /routes/:id`  
**Auth Required:** Yes (Driver)

### Delete Route

**Endpoint:** `DELETE /routes/:id`  
**Auth Required:** Yes (Driver)

### Get Popular Routes

**Endpoint:** `GET /routes/popular`  
**Auth Required:** No

---

## Chat API

### Create Conversation

Create or get an existing conversation.

**Endpoint:** `POST /chat/conversations`  
**Auth Required:** Yes  
**Request Body:**

```json
{
  "bookingId": "uuid",
  "clientId": "uuid",
  "driverId": "uuid"
}
```

### Send Message

**Endpoint:** `POST /chat/messages`  
**Auth Required:** Yes  
**Request Body:**

```json
{
  "conversationId": "uuid",
  "senderId": "uuid",
  "receiverId": "uuid",
  "messageText": "Hello, what time will you arrive?",
  "messageType": "text"
}
```

### Get Messages

**Endpoint:** `GET /chat/messages/:conversationId?page=1&limit=50`  
**Auth Required:** Yes

### Mark Messages as Read

**Endpoint:** `PUT /chat/messages/:conversationId/read`  
**Auth Required:** Yes  
**Request Body:**

```json
{
  "userId": "uuid"
}
```

### Get User Conversations

**Endpoint:** `GET /chat/conversations/user/:userId`  
**Auth Required:** Yes

### Get Unread Count

**Endpoint:** `GET /chat/unread/:userId`  
**Auth Required:** Yes

---

## WebSocket Events

### Connection

Connect to WebSocket server with JWT token:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3004', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events (Client → Server)

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

### Events (Server → Client)

#### Location Updated

```javascript
socket.on('location:updated', (data) => {
  console.log('Driver at:', data.latitude, data.longitude);
});
```

#### New Booking

```javascript
socket.on('booking:new', (data) => {
  console.log('New booking request:', data);
});
```

#### Booking Status Updated

```javascript
socket.on('booking:updated', (data) => {
  console.log('Booking status:', data.status);
});
```

#### Chat Message

```javascript
socket.on('chat:message', (data) => {
  console.log('New message:', data.message);
});
```

#### Notification

```javascript
socket.on('notification:new', (data) => {
  console.log('Notification:', data.title, data.body);
});
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Common Error Codes

- `UNAUTHORIZED` - Missing or invalid authentication token
- `VALIDATION_ERROR` - Request validation failed
- `INTERNAL_ERROR` - Server error
- `SERVICE_UNAVAILABLE` - Downstream service unavailable
- `TOKEN_EXPIRED` - JWT token expired
- `INVALID_OTP` - Invalid OTP code

---

## Rate Limiting

- **Rate:** 100 requests per minute per user
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

When rate limited, you'll receive a `429 Too Many Requests` response.

---

## Pagination

Paginated endpoints return data in this format:

```json
{
  "success": true,
  "data": {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

---

## Testing

Use the test script to verify all services:

```bash
npm run test:api
```

Or use cURL:

```bash
# Test route search
curl -X POST http://localhost:3000/api/v1/routes/search \
  -H "Content-Type: application/json" \
  -d '{
    "fromCity": "Indore",
    "toCity": "Bhopal",
    "page": 1,
    "limit": 10
  }'
```
