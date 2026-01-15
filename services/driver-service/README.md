# Driver Service

Comprehensive driver profile, vehicle, and document management service.

## Overview

Built with **Go** and **Gin framework**, managing:
- Driver profiles and statistics
- Vehicle registration and management
- Seat configuration
- Document upload/verification (license, permits, etc.)
- Online status and location tracking

## Port

**3003**

## Technology Stack

- Go 1.21+
- Gin Web Framework
- PostgreSQL
- Integration with Storage Service (MinIO)

## API Endpoints

### Driver Profile

```bash
GET    /api/v1/driver/profile            # Get driver profile
PUT    /api/v1/driver/profile            # Update profile
PUT    /api/v1/driver/online-status      # Set online/offline
PUT    /api/v1/driver/location           # Update location
GET    /api/v1/driver/stats              # Get statistics
```

### Vehicles

```bash
GET    /api/v1/driver/vehicles           # List all vehicles
GET    /api/v1/driver/vehicles/:id       # Get vehicle details
POST   /api/v1/driver/vehicles           # Register new vehicle
PUT    /api/v1/driver/vehicles/:id       # Update vehicle
DELETE /api/v1/driver/vehicles/:id       # Delete vehicle
PUT    /api/v1/driver/vehicles/:id/activate  # Set as active
```

### Seat Configuration

```bash
POST   /api/v1/driver/vehicles/:id/seats   # Save seat layout
GET    /api/v1/driver/vehicles/:id/seats   # Get seat configuration
```

### Documents

```bash
GET    /api/v1/driver/documents          # List documents
POST   /api/v1/driver/documents/upload   # Upload document
DELETE /api/v1/driver/documents/:id      # Delete document
```

## Example Requests

### Create Vehicle

```bash
curl -X POST http://localhost:3000/api/v1/driver/vehicles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleName": "Toyota Innova Crysta",
    "vehicleNumber": "MP09AB1234",
    "vehicleType": "suv",
    "vehicleModel": "Crysta",
    "vehicleColor": "White",
    "vehicleYear": 2022,
    "seatingCapacity": 6,
    "ac": true,
    "fuelType": "diesel"
  }'
```

### Save Seat Configuration

```bash
curl -X POST http://localhost:3000/api/v1/driver/vehicles/{id}/seats \
  -H "Authorization: Bearer <token>"\
  -H "Content-Type: application/json" \
  -d '{
    "rows": 3,
    "columns": 3,
    "seatLayout": [
      {"row": 0, "col": 0, "type": "driver", "number": "D"},
      {"row": 0, "col": 2, "type": "seat", "number": "1"},
      {"row": 1, "col": 0, "type": "seat", "number": "2"},
      {"row": 1, "col": 1, "type": "seat", "number": "3"},
      {"row": 1, "col": 2, "type": "seat", "number": "4"},
      {"row": 2, "col": 1, "type": "seat", "number": "5"},
      {"row": 2, "col": 2, "type": "seat", "number": "6"}
    ]
  }'
```

### Upload Document

```bash
curl -X POST http://localhost:3000/api/v1/driver/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@license.jpg" \
  -F "documentType=license" \
  -F "expiryDate=2026-12-31"
```

## Document Types

- **license**: Driving license
- **permit**: Cab permit
- **aadhar**: Aadhar card (ID proof)
- **pan**: PAN card 
- **vehicle_rc**: Vehicle registration certificate
- **vehicle_insurance**: Insurance papers
- **vehicle_puc**: Pollution certificate
- **vehicle_permit**: Commercial permit

## Database Schema

### drivers Table
```sql
CREATE TABLE drivers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  total_trips INTEGER DEFAULT 0,
  completed_trips INTEGER DEFAULT 0,
  cancelled_trips INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  is_online BOOLEAN DEFAULT FALSE,
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  last_location_update TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### vehicles Table
```sql
CREATE TABLE vehicles (
  id UUID PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id),
  vehicle_name VARCHAR(100),
  vehicle_number VARCHAR(20) UNIQUE,
  vehicle_type VARCHAR(50),
  seating_capacity INTEGER,
  ac BOOLEAN,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### seat_configurations Table
```sql
CREATE TABLE seat_configurations (
  id UUID PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id),
  rows INTEGER,
  columns INTEGER,
  seat_layout JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### driver_documents Table
```sql
CREATE TABLE driver_documents (
  id UUID PRIMARY KEY,
  driver_id UUID REFERENCES drivers(id),
  document_type VARCHAR(50),
  document_url VARCHAR(500),
  expiry_date DATE,
  verification_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Environment Variables

```env
DRIVER_SERVICE_PORT=3003
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
STORAGE_SERVICE_URL=http://localhost:3010
```

## Development

```bash
cd services/driver-service
go mod download
go run main.go
```

## Testing

```bash
# Health check
curl http://localhost:3003/health

# Get profile (requires auth)
curl http://localhost:3000/api/v1/driver/profile \
  -H "Authorization: Bearer <token>"
```

## Integration

### With Storage Service

Document uploads are proxied to Storage Service (MinIO):
1. Driver uploads document via Driver Service API
2. Driver Service forwards to Storage Service
3. Storage Service saves to MinIO and returns URL
4. Driver Service saves metadata in database

### With Auth Service

- Uses JWT tokens from Auth Service
- Validates driver permissions
- Links driver profile to user account

---

Complete API docs: [/docs/API.md](../../docs/API.md)
