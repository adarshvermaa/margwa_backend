# Route Service

Route creation, search, and management service for Margwa.

## Overview

Built with **TypeScript** and **Express.js**, handling:
- Route creation by drivers
- Route search with filters
- Recurring route scheduling
- Route instances management
- Distance and pricing calculations

## Port

**3002**

## Technology Stack

- TypeScript
- Express.js
- PostgreSQL with PostGIS
- Drizzle ORM
- Redis (caching)

## API Endpoints

### Create Route
```
POST /api/v1/routes
Authorization: Bearer <driver-token>
```

Request:
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
  "recurringDays": [1,3,5]
}
```

### Search Routes
```
POST /api/v1/routes/search
```

Request:
```json
{
  "fromCity": "Indore",
  "toCity": "Bhopal",
  "date": "2024-01-20",
  "timeFilter": "morning",
  "genderFilter": "any",
  "vehicleType": "suv",
  "page": 1,
  "limit": 20
}
```

Response:
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
          "availableSeats": 4,
          "amenities": ["AC", "WiFi", "Music"]
        },
        "driver": {
          "id": "uuid",
          "fullName": "John Doe",
          "totalTrips": 156,
          "averageRating": "4.8"
        },
        "vehicle": {
          "id": "uuid",
          "vehicleName": "Toyota Innova Crysta",
          "vehicleType": "suv",
          "vehicleNumber": "MP09AB1234"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### Get Driver Routes
```
GET /api/v1/routes/driver/:driverId
Authorization: Bearer <token>
```

### Get Route Details
```
GET /api/v1/routes/:id
```

### Update Route
```
PUT /api/v1/routes/:id
Authorization: Bearer <driver-token>
```

### Delete Route
```
DELETE /api/v1/routes/:id
Authorization: Bearer <driver-token>
```

### Get Popular Routes
```
GET /api/v1/routes/popular
```

## Features

### Recurring Routes

Routes can recur on specific days:
- `recurringDays`: Array of weekdays (0=Sunday, 6=Saturday)
- Automatically creates route instances for future dates
- Example: `[1,3,5]` = Monday, Wednesday, Friday

### Distance Calculation

Uses PostGIS to calculate:
- Distance between coordinates
- Pickup/drop radius matching
- Route optimization

### Search Filters

- **Time Filters**: morning, afternoon, evening, night
- **Gender Preference**: male, female, any
- **Vehicle Type**: sedan, suv, hatchback, etc.
- **Amenities**: AC, WiFi, Music, etc.

### Dynamic Pricing

Base price can be adjusted:
- Distance-based multiplier
- Peak time surge
- Demand-based pricing

## Database Schema

### routes Table
```sql
CREATE TABLE routes (
  id UUID PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id),
  vehicle_id UUID REFERENCES vehicles(id),
  from_city VARCHAR(100),
  from_latitude DECIMAL(10,8),
  from_longitude DECIMAL(11,8),
  to_city VARCHAR(100),
  to_latitude DECIMAL(10,8),
  to_longitude DECIMAL(11,8),
  departure_time TIME,
  arrival_time TIME,
  estimated_duration_minutes INTEGER,
  distance_km DECIMAL(6,2),
  base_price_per_seat DECIMAL(10,2),
  total_seats INTEGER,
  gender_preference VARCHAR(10),
  pickup_radius_km DECIMAL(4,2),
  drop_radius_km DECIMAL(4,2),
  amenities TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  recurring_days INTEGER[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

### route_instances Table
```sql
CREATE TABLE route_instances (
  id UUID PRIMARY KEY,
  route_id UUID REFERENCES routes(id),
  date DATE,
  available_seats INTEGER,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Environment Variables

```env
ROUTE_SERVICE_PORT=3002
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=your-secret
```

## Development

```bash
cd services/route-service
npm install
npm run dev
```

Service runs on http://localhost:3002

## Testing

```bash
# Search routes
curl -X POST http://localhost:3000/api/v1/routes/search \
  -H "Content-Type: application/json" \
  -d '{
    "fromCity": "Indore",
    "toCity": "Bhopal",
    "page": 1,
    "limit": 10
  }'
```

## Caching

Popular searches are cached in Redis:
- TTL: 5 minutes
- Cache key: `route:search:{fromCity}:{toCity}:{date}`

## Performance

- **PostGIS Indexes**: Fast geo queries
- **Redis Caching**: Reduced DB load  
- **Pagination**: Efficient large result sets
- **Connection Pooling**: Optimized DB connections

---

Complete API docs: [/docs/API.md](../../docs/API.md)
