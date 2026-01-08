# Margwa Payment Service (Go)

Payment processing and driver earnings service for Margwa.

## Features

- Payment initiation and verification
- Integration with Razorpay payment gateway
- Refund processing
- Driver earnings calculation (15% platform commission)
- Earnings withdrawal management
- Payment webhook handling

## Getting Started

### Prerequisites
- Go 1.21+
- PostgreSQL (with payments & earnings tables)
- Razorpay API credentials

### Installation

```bash
cd services/payment-service
go mod download
```

### Environment Variables

Add to root `.env`:
```env
PAYMENT_SERVICE_PORT=3007
DATABASE_URL=postgresql://user:pass@localhost:5432/margwa_db
REDIS_URL=redis://localhost:6379
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

### Run

```bash
go run main.go
```

Service runs on port 3007.

## API Endpoints

### Payments
```
POST   /payments/initiate      - Initiate payment
POST   /payments/verify        - Verify payment
GET    /payments/:bookingId    - Get payment details
POST   /payments/refund        - Process refund
POST   /payments/webhook       - Handle gateway webhooks
```

### Earnings
```
POST   /earnings/calculate     - Calculate driver earnings
GET    /earnings/driver/:id    - Get driver earnings history
POST   /earnings/withdraw      - Process withdrawal request
```

### Health
```
GET    /health                 - Health check
```

## Payment Flow

```
1. Client initiates payment → POST /payments/initiate
2. Receive Razorpay order_id
3. Client completes payment in app
4. Verify payment → POST /payments/verify
5. Update booking status
6. Calculate driver earnings → POST /earnings/calculate
```

## Razorpay Integration

1. Sign up at https://razorpay.com
2. Get API keys from Dashboard
3. Configure webhook URL for payment events
4. Test with test mode keys first

## Earnings Calculation

- Platform commission: **15%** of booking amount
- Driver receives: **85%** of booking amount
- Example: ₹100 booking → ₹15 platform, ₹85 driver

## Architecture

```
Client Checkout → API Gateway → Payment Service (Go)
                                      ↓
                  ┌───────────────────┼─────────────────┐
                  ↓                   ↓                 ↓
           Razorpay API        Database           Notification
          (payment gateway)   (payments/earnings)   Service
```

## Production Checklist

- [ ] Configure production Razorpay keys
- [ ] Set up webhook signature verification
- [ ] Implement idempotency for payment operations
- [ ] Add payment reconciliation
- [ ] Set up error alerting
- [ ] Configure rate limiting
- [ ] Enable audit logging
