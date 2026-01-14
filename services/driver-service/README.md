# Driver Service

Driver management microservice for the Margwa platform.

## Features
- Driver profile management
- Vehicle registration and management
- Document upload and verification
- Location tracking
- Online/offline status management

## API Endpoints

### Driver Profile
- `GET /api/v1/driver/profile` - Get driver profile
- `PUT /api/v1/driver/profile` - Update driver profile
- `PUT /api/v1/driver/online-status` - Toggle online/offline  
- `PUT /api/v1/driver/location` - Update location
- `GET /api/v1/driver/stats` - Get driver statistics

### Vehicles
- `GET /api/v1/driver/vehicles` - List all vehicles
- `GET /api/v1/driver/vehicles/:id` - Get vehicle details
- `POST /api/v1/driver/vehicles` - Add vehicle
- `PUT /api/v1/driver/vehicles/:id` - Update vehicle
- `DELETE /api/v1/driver/vehicles/:id` - Delete vehicle
- `PUT /api/v1/driver/vehicles/:id/activate` - Activate vehicle

### Documents
- `GET /api/v1/driver/documents` - List documents
- `POST /api/v1/driver/documents/upload` - Upload document (base64)
- `DELETE /api/v1/driver/documents/:id` - Delete document

## Running

```bash
go run main.go
```

Default port: 3003

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT validation
- `PORT` - Service port (default: 3003)
