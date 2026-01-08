FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY services/payment-service/go.mod services/payment-service/go.sum ./
RUN go mod download

# Copy source code
COPY services/payment-service .

# Build
RUN CGO_ENABLED=0 GOOS=linux go build -o payment-service .

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy binary
COPY --from=builder /app/payment-service .

EXPOSE 3007

CMD ["./payment-service"]
