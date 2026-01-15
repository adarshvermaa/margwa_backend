# Margwa Backend - Complete API Integration Flow

Visual guide to how all Margwa services work together.

## Complete System Architecture

```mermaid
graph TB
    subgraph "Mobile Applications"
        CA[Client App]
        DA[Driver App]
    end
    
    subgraph "API Layer"
        AG[API Gateway<br/>:3000]
    end
    
    subgraph "Core Services"
        AUTH[Auth Service<br/>:3001<br/>Go]
        DRIVER[Driver Service<br/>:3003<br/>Go]
        ROUTE[Route Service<br/>:3002<br/>TS]
        PAYMENT[Payment Service<br/>:3007<br/>Go]
    end
    
    subgraph "Communication"
        RT[Realtime Service<br/>:3004<br/>TS]
        CHAT[Chat Service<br/>:3005<br/>TS]
        NOTIF[Notification Service<br/>:3006<br/>TS]
    end
    
    subgraph "Supporting Services"
        PLACES[Places Service<br/>:3009<br/>TS]
        STORAGE[Storage Service<br/>:3010<br/>TS]
        ANALYTICS[Analytics Service<br/>:3008<br/>Go]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>+PostGIS)]
        REDIS[(Redis)]
        MINIO[(MinIO<br/>S3)]
    end
    
    subgraph "External APIs"
        GOOGLE[Google Places]
        RAZORPAY[Razorpay]
        FCM[Firebase FCM]
    end
    
    CA --> AG
    DA --> AG
    
    AG --> AUTH
    AG --> DRIVER
    AG --> ROUTE
    AG --> PAYMENT
    AG --> CHAT
    AG --> NOTIF
    AG --> PLACES
    AG --> STORAGE
    
    AUTH --> PG
    AUTH --> REDIS
    
    DRIVER --> PG
    DRIVER --> STORAGE
    
    ROUTE --> PG
    ROUTE --> REDIS
    
    PAYMENT --> PG
    PAYMENT --> RAZORPAY
    
    CHAT --> PG
    CHAT --> RT
    
    NOTIF --> PG
    NOTIF --> FCM
    NOTIF --> RT
    
    RT <-->|WebSocket| CA
    RT <-->|WebSocket| DA
    
    PLACES --> REDIS
    PLACES --> GOOGLE
    
    STORAGE --> MINIO
    
    ANALYTICS --> PG
    ANALYTICS --> REDIS
```

## Complete Booking Flow

```mermaid
sequenceDiagram
    participant Client as Client App
    participant Driver as Driver App
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant Route as Route Service
    participant RT as Realtime Service
    participant Notif as Notification Service
    participant Payment as Payment Service
    participant Chat as Chat Service

    Note over Client,Chat: 1. Authentication
    Client->>Gateway: Send OTP
    Gateway->>Auth: Forward request
    Auth-->>Gateway: OTP sent
    Gateway-->>Client: Success
    
    Client->>Gateway: Verify OTP
    Gateway->>Auth: Verify
    Auth-->>Client: JWT Token

    Note over Client,Chat: 2. Search Routes
    Client->>Gateway: Search routes
    Gateway->>Route: Search (Indore-Bhopal)
    Route-->>Client: Available routes

    Note over Client,Chat: 3. Create Booking
    Client->>Gateway: Request booking
    Gateway->>RT: Broadcast to driver
    RT-->>Driver: New booking notification
    
    Note over Client,Chat: 4. Driver Accepts
    Driver->>Gateway: Accept booking
    Gateway->>RT: Update booking status
    RT-->>Client: Booking accepted
    Gateway->>Notif: Send notification
    Notif-->>Client: Push notification

    Note over Client,Chat: 5. Chat Communication
    Client->>Gateway: Send message
    Gateway->>Chat: Save message
    Chat->>RT: Broadcast
    RT-->>Driver: New message

    Note over Client,Chat: 6. Live Tracking
    Driver->>RT: Update location (every 5s)
    RT-->>Client: Driver location

    Note over Client,Chat: 7. Complete Ride
    Driver->>Gateway: Complete ride
    Gateway->>Payment: Initiate payment
    Payment-->>Client: Payment request
    Client->>Payment: Complete payment
    Payment-->>Gateway: Payment success
    Gateway->>Notif: Trip completed
    Notif-->>Client: Receipt
    Notif-->>Driver: Earnings updated
```

## User Workflows

### Client Journey

```mermaid
flowchart TD
    START([Download App]) --> A1[Enter Phone Number]
    A1 --> A2[Receive OTP]
    A2 --> A3[Verify OTP]
    A3 --> A4{First Time?}
    A4 -->|Yes| A5[Complete Profile]
    A4 -->|No| A6[Dashboard]
    A5 --> A6
    
    A6 --> B1[Search Route]
    B1 --> B2[Select from/to cities]
    B2 --> B3[Choose Date/Time]
    B3 --> B4[View Available Routes]
    
    B4 --> C1[Select Route]
    C1 --> C2[Choose Seat]
    C2 --> C3[Request Booking]
    
    C3 --> D1{Driver Accepts?}
    D1 -->|No| B4
    D1 -->|Yes| D2[Booking Confirmed]
    
    D2 --> E1[Chat with Driver]
    D2 --> E2[Track Location]
    
    E2 --> F1[Ride Starts]
    F1 --> F2[Live Tracking]
    F2 --> F3[Ride Completes]
    
    F3 --> G1[Make Payment]
    G1 --> G2[Rate Driver]
    G2 --> END([Trip Complete])
```

### Driver Journey

```mermaid
flowchart TD
    START([Download Driver App]) --> A1[Phone Verification]
    A1 --> A2[Complete Profile]
    A2 --> A3[Add Vehicle]
    A3 --> A4[Upload Documents]
    
    A4 --> B1{Documents Approved?}
    B1 -->|Pending| WAIT[Wait for Approval]
    WAIT --> B1
    B1 -->|Approved| B2[Dashboard]
    
    B2 --> C1[Create Route]
    C1 --> C2[Set From/To Cities]
    C2 --> C3[Set Schedule]
    C3 --> C4[Set Pricing]
    C4 --> C5[Configure Seats]
    C5 --> C6[Publish Route]
    
    C6 --> D1[Go Online]
    D1 --> D2[Receive Booking Requests]
    
    D2 --> E1{Accept Booking?}
    E1 -->|No| D2
    E1 -->|Yes| E2[Booking Confirmed]
    
    E2 --> F1[Chat with Passenger]
    E2 --> F2[Start Ride]
    F2 --> F3[Share Live Location]
    F3 --> F4[Complete Ride]
    
    F4 --> G1[Earnings Added]
    G1 --> G2[Rate Passenger]
    G2 --> H1{More Bookings?}
    H1 -->|Yes| D2
    H1 -->|No| H2[Go Offline]
    H2 --> END([End Session])
```

## Service Integration Patterns

### Event-Driven Architecture

```mermaid
graph LR
    subgraph "Event Publishers"
        S1[Route Service]
        S2[Payment Service]
        S3[Driver Service]
    end
    
    subgraph "Event Bus"
        RT[Realtime Service<br/>+ Redis Pub/Sub]
    end
    
    subgraph "Event Subscribers"
        C1[Client Apps]
        C2[Driver Apps]
        N1[Notification Service]
        A1[Analytics Service]
    end
    
    S1 -->|booking:created| RT
    S1 -->|booking:updated| RT
    S2 -->|payment:success| RT
    S3 -->|location:update| RT
    
    RT -->|WebSocket| C1
    RT -->|WebSocket| C2
    RT -->|HTTP| N1
    RT -->|HTTP| A1
```

### Data Flow Patterns

```mermaid
graph TD
    A[User Action] --> B{Requires Auth?}
    B -->|Yes| C[API Gateway + Auth Middleware]
    B -->|No| D[API Gateway]
    
    C --> E{Which Service?}
    D --> E
    
    E -->|Profile/Vehicle| F[Driver Service]
    E -->|Routes/Search| G[Route Service]
    E -->|Messages| H[Chat Service]
    E -->|Payments| I[Payment Service]
    
    F --> J[(PostgreSQL)]
    G --> J
    H --> J
    I --> J
    
    F --> K[(Redis Cache)]
    G --> K
    I --> K
    
    F --> L[Response]
    G --> L
    H --> L
    I --> L
    
    L --> M[API Gateway]
    M --> N[User]
```

## Technology Stack Summary

```mermaid
mindmap
    root((Margwa Backend))
        Languages
            TypeScript
                7 Services
                Express.js
                Socket.IO
            Go
                4 Services
                Gin Framework
                High Performance
        Data Stores
            PostgreSQL
                Primary Database
                PostGIS Extension
                Drizzle ORM
            Redis
                Caching
                Pub/Sub
                Sessions
            MinIO
                Object Storage
                S3 Compatible
                Image Processing
        Infrastructure
            Docker
                Containerization
                Docker Compose
                Multi-stage Builds
            Kubernetes
                Orchestration
                Auto-scaling
                Load Balancing
            Monitoring
                Prometheus
                Grafana
                Health Checks
        External APIs
            Razorpay
                Payment Gateway
            Google Places
                Location Services
            Firebase
                Push Notifications
```

## Quick Reference

### Service Ports

| Port | Service | Tech | Purpose |
|------|---------|------|---------|
| 3000 | API Gateway | TS | Main entry point |
| 3001 | Auth Service | Go | OTP authentication |
| 3002 | Route Service | TS | Route management |
| 3003 | Driver Service | Go | Driver profiles |
| 3004 | Realtime Service | TS | WebSocket |
| 3005 | Chat Service | TS | Messaging |
| 3006 | Notification Service | TS | Push notifications |
| 3007 | Payment Service | Go | Payments |
| 3008 | Analytics Service | Go | Analytics |
| 3009 | Places Service | TS | Google Places |
| 3010 | Storage Service | TS | MinIO storage |

### Database Tables

- **users** - User accounts
- **drivers** - Driver profiles
- **vehicles** - Vehicle registration
- **routes** - Route definitions
- **route_instances** - Scheduled routes
- **bookings** - Ride bookings
- **payments** - Payment records
- **conversations** - Chat conversations
- **messages** - Chat messages
- **notifications** - Push notifications
- **driver_documents** - Document verification

### Key Features

- ✅ OTP-based authentication
- ✅ Real-time location tracking
- ✅ Live chat messaging
- ✅ Push notifications
- ✅ Payment processing (Razorpay)
- ✅ Image upload & compression
- ✅ Auto-scaling (Kubernetes)
- ✅ Load balancing (NGINX)
- ✅ Caching (Redis)
- ✅ Monitoring (Prometheus/Grafana)

---

For detailed API documentation, see [API.md](./API.md).  
For deployment workflows, see [COMPLETE_WORKFLOW.md](./COMPLETE_WORKFLOW.md).
