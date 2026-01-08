package models

import (
	"time"

	"github.com/google/uuid"
)

type PaymentMethod string
type PaymentStatus string
type WithdrawalStatus string

const (
	PaymentMethodCash   PaymentMethod = "cash"
	PaymentMethodCard   PaymentMethod = "card"
	PaymentMethodUPI    PaymentMethod = "upi"
	PaymentMethodWallet PaymentMethod = "wallet"
)

const (
	PaymentStatusPending   PaymentStatus = "pending"
	PaymentStatusCompleted PaymentStatus = "completed"
	PaymentStatusFailed    PaymentStatus = "failed"
	PaymentStatusRefunded  PaymentStatus = "refunded"
)

const (
	WithdrawalStatusPending   WithdrawalStatus = "pending"
	WithdrawalStatusWithdrawn WithdrawalStatus = "withdrawn"
)

type Payment struct {
	ID              uuid.UUID     `json:"id"`
	BookingID       uuid.UUID     `json:"booking_id"`
	PayerID         uuid.UUID     `json:"payer_id"`
	Amount          float64       `json:"amount"`
	PaymentMethod   PaymentMethod `json:"payment_method"`
	PaymentStatus   PaymentStatus `json:"payment_status"`
	TransactionID   *string       `json:"transaction_id,omitempty"`
	GatewayResponse *string       `json:"gateway_response,omitempty"`
	PaidAt          *time.Time    `json:"paid_at,omitempty"`
	RefundedAt      *time.Time    `json:"refunded_at,omitempty"`
	CreatedAt       time.Time     `json:"created_at"`
}

type Earning struct {
	ID                 uuid.UUID        `json:"id"`
	DriverID           uuid.UUID        `json:"driver_id"`
	BookingID          uuid.UUID        `json:"booking_id"`
	GrossAmount        float64          `json:"gross_amount"`
	PlatformCommission float64          `json:"platform_commission"`
	NetAmount          float64          `json:"net_amount"`
	PaymentDate        time.Time        `json:"payment_date"`
	WithdrawalStatus   WithdrawalStatus `json:"withdrawal_status"`
	WithdrawnAt        *time.Time       `json:"withdrawn_at,omitempty"`
	CreatedAt          time.Time        `json:"created_at"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
}

type APIError struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

type InitiatePaymentRequest struct {
	BookingID     uuid.UUID     `json:"booking_id" binding:"required"`
	PayerID       uuid.UUID     `json:"payer_id" binding:"required"`
	Amount        float64       `json:"amount" binding:"required,gt=0"`
	PaymentMethod PaymentMethod `json:"payment_method" binding:"required"`
}

type VerifyPaymentRequest struct {
	PaymentID       uuid.UUID `json:"payment_id" binding:"required"`
	TransactionID   string    `json:"transaction_id" binding:"required"`
	GatewayResponse string    `json:"gateway_response"`
}

type RefundRequest struct {
	PaymentID uuid.UUID `json:"payment_id" binding:"required"`
	Reason    string    `json:"reason"`
}

type CalculateEarningsRequest struct {
	DriverID  uuid.UUID `json:"driver_id" binding:"required"`
	BookingID uuid.UUID `json:"booking_id" binding:"required"`
	Amount    float64   `json:"amount" binding:"required,gt=0"`
}

type WithdrawalRequest struct {
	DriverID uuid.UUID `json:"driver_id" binding:"required"`
	Amount   float64   `json:"amount" binding:"required,gt=0"`
}
