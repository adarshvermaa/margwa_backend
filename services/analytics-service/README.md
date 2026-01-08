# Margwa Analytics Service (Rust)

High-performance analytics and data processing service.

## Features

- Driver statistics & performance metrics
- Earnings calculations & reports
- Trip analytics & insights
- Platform-wide statistics
- Route trends & demand analysis
- Report generation

## Getting Started

### Prerequisites
- Rust 1.75+
- PostgreSQL
- Redis

### Installation

```bash
cd services/analytics-service
cargo build --release
```

### Run

```bash
cargo run --release
```

Service runs on port 3007.

## API Endpoints

```
GET  /health                                 - Health check
GET  /analytics/driver/:driver_id/stats      - Driver statistics
GET  /analytics/driver/:driver_id/earnings   - Driver earnings data
GET  /analytics/trip/:trip_id                - Trip analytics
GET  /analytics/platform/stats               - Platform statistics
POST /analytics/reports/generate             - Generate custom report
GET  /analytics/trends/routes                - Popular route trends
```

## Performance

Built with Rust for maximum performance:
- Memory-safe operations
- Zero-cost abstractions
- Concurrent request handling
- Optimized SQL queries

## Environment Variables

See `.env.example` for required variables.
