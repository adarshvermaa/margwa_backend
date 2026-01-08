package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/margwa/payment-service/models"
	razorpay "github.com/razorpay/razorpay-go"
	"github.com/redis/go-redis/v9"
)

type PaymentHandler struct {
	db             *pgxpool.Pool
	redis          *redis.Client
	razorpayClient *razorpay.Client
}

func NewPaymentHandler(db *pgxpool.Pool, redis *redis.Client) *PaymentHandler {
	// Initialize Razorpay client (configure in production)
	client := razorpay.NewClient("key_id", "key_secret")

	return &PaymentHandler{
		db:             db,
		redis:          redis,
		razorpayClient: client,
	}
}

// POST /payments/initiate - Initiate a payment
func (h *PaymentHandler) InitiatePayment(c *gin.Context) {
	var req models.InitiatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "VALIDATION_ERROR",
				Message: "Invalid request data",
				Details: err.Error(),
			},
		})
		return
	}

	// Create payment record
	paymentID := uuid.New()
	query := `
		INSERT INTO payments (id, booking_id, payer_id, amount, payment_method, payment_status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, booking_id, payer_id, amount, payment_method, payment_status, created_at
	`

	var payment models.Payment
	err := h.db.QueryRow(
		context.Background(),
		query,
		paymentID,
		req.BookingID,
		req.PayerID,
		req.Amount,
		req.PaymentMethod,
		models.PaymentStatusPending,
		time.Now(),
	).Scan(
		&payment.ID,
		&payment.BookingID,
		&payment.PayerID,
		&payment.Amount,
		&payment.PaymentMethod,
		&payment.PaymentStatus,
		&payment.CreatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "Failed to initiate payment",
			},
		})
		return
	}

	// For UPI/Card, create Razorpay order
	var razorpayOrderID string
	if req.PaymentMethod == models.PaymentMethodCard || req.PaymentMethod == models.PaymentMethodUPI {
		// Create Razorpay order (simplified - configure in production)
		razorpayOrderID = fmt.Sprintf("order_%s", paymentID.String()[:8])
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Data: gin.H{
			"payment":           payment,
			"razorpay_order_id": razorpayOrderID,
		},
		Message: "Payment initiated successfully",
	})
}

// POST /payments/verify - Verify payment
func (h *PaymentHandler) VerifyPayment(c *gin.Context) {
	var req models.VerifyPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "VALIDATION_ERROR",
				Message: "Invalid request data",
			},
		})
		return
	}

	// Update payment record
	query := `
		UPDATE payments
		SET payment_status = $1, transaction_id = $2, gateway_response = $3, paid_at = $4
		WHERE id = $5
		RETURNING id, booking_id, payer_id, amount, payment_method, payment_status, transaction_id, paid_at, created_at
	`

	var payment models.Payment
	err := h.db.QueryRow(
		context.Background(),
		query,
		models.PaymentStatusCompleted,
		req.TransactionID,
		req.GatewayResponse,
		time.Now(),
		req.PaymentID,
	).Scan(
		&payment.ID,
		&payment.BookingID,
		&payment.PayerID,
		&payment.Amount,
		&payment.PaymentMethod,
		&payment.PaymentStatus,
		&payment.TransactionID,
		&payment.PaidAt,
		&payment.CreatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "Failed to verify payment",
			},
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    payment,
		Message: "Payment verified successfully",
	})
}

// GET /payments/:bookingId - Get payment by booking ID
func (h *PaymentHandler) GetPaymentByBooking(c *gin.Context) {
	bookingID := c.Param("bookingId")

	query := `
		SELECT id, booking_id, payer_id, amount, payment_method, payment_status, 
		       transaction_id, gateway_response, paid_at, refunded_at, created_at
		FROM payments
		WHERE booking_id = $1
	`

	var payment models.Payment
	err := h.db.QueryRow(context.Background(), query, bookingID).Scan(
		&payment.ID,
		&payment.BookingID,
		&payment.PayerID,
		&payment.Amount,
		&payment.PaymentMethod,
		&payment.PaymentStatus,
		&payment.TransactionID,
		&payment.GatewayResponse,
		&payment.PaidAt,
		&payment.RefundedAt,
		&payment.CreatedAt,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "NOT_FOUND",
				Message: "Payment not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    payment,
		Message: "Payment retrieved successfully",
	})
}

// POST /payments/refund - Process refund
func (h *PaymentHandler) ProcessRefund(c *gin.Context) {
	var req models.RefundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "VALIDATION_ERROR",
				Message: "Invalid request data",
			},
		})
		return
	}

	query := `
		UPDATE payments
		SET payment_status = $1, refunded_at = $2
		WHERE id = $3 AND payment_status = $4
		RETURNING id, booking_id, payer_id, amount, payment_status, refunded_at
	`

	var payment models.Payment
	err := h.db.QueryRow(
		context.Background(),
		query,
		models.PaymentStatusRefunded,
		time.Now(),
		req.PaymentID,
		models.PaymentStatusCompleted,
	).Scan(
		&payment.ID,
		&payment.BookingID,
		&payment.PayerID,
		&payment.Amount,
		&payment.PaymentStatus,
		&payment.RefundedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "REFUND_FAILED",
				Message: "Failed to process refund",
			},
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    payment,
		Message: "Refund processed successfully",
	})
}

// POST /payments/webhook - Handle payment gateway webhooks
func (h *PaymentHandler) HandleWebhook(c *gin.Context) {
	// Webhook verification and processing logic
	// This is a placeholder - implement based on gateway requirements

	c.JSON(http.StatusOK, gin.H{
		"status": "received",
	})
}

// POST /earnings/calculate - Calculate driver earnings
func (h *PaymentHandler) CalculateEarnings(c *gin.Context) {
	var req models.CalculateEarningsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "VALIDATION_ERROR",
				Message: "Invalid request data",
			},
		})
		return
	}

	// Platform commission: 15%
	platformCommission := req.Amount * 0.15
	netAmount := req.Amount - platformCommission

	earningID := uuid.New()
	query := `
		INSERT INTO earnings (id, driver_id, booking_id, gross_amount, platform_commission, net_amount, payment_date, withdrawal_status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, driver_id, booking_id, gross_amount, platform_commission, net_amount, payment_date, withdrawal_status, created_at
	`

	var earning models.Earning
	err := h.db.QueryRow(
		context.Background(),
		query,
		earningID,
		req.DriverID,
		req.BookingID,
		req.Amount,
		platformCommission,
		netAmount,
		time.Now(),
		models.WithdrawalStatusPending,
		time.Now(),
	).Scan(
		&earning.ID,
		&earning.DriverID,
		&earning.BookingID,
		&earning.GrossAmount,
		&earning.PlatformCommission,
		&earning.NetAmount,
		&earning.PaymentDate,
		&earning.WithdrawalStatus,
		&earning.CreatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "Failed to calculate earnings",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, models.APIResponse{
		Success: true,
		Data:    earning,
		Message: "Earnings calculated successfully",
	})
}

// GET /earnings/driver/:driverId - Get driver earnings
func (h *PaymentHandler) GetDriverEarnings(c *gin.Context) {
	driverID := c.Param("driverId")

	query := `
		SELECT id, driver_id, booking_id, gross_amount, platform_commission, net_amount,
		       payment_date, withdrawal_status, withdrawn_at, created_at
		FROM earnings
		WHERE driver_id = $1
		ORDER BY created_at DESC
		LIMIT 50
	`

	rows, err := h.db.Query(context.Background(), query, driverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "Failed to fetch earnings",
			},
		})
		return
	}
	defer rows.Close()

	var earnings []models.Earning
	for rows.Next() {
		var earning models.Earning
		err := rows.Scan(
			&earning.ID,
			&earning.DriverID,
			&earning.BookingID,
			&earning.GrossAmount,
			&earning.PlatformCommission,
			&earning.NetAmount,
			&earning.PaymentDate,
			&earning.WithdrawalStatus,
			&earning.WithdrawnAt,
			&earning.CreatedAt,
		)
		if err != nil {
			continue
		}
		earnings = append(earnings, earning)
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    earnings,
		Message: "Earnings retrieved successfully",
	})
}

// POST /earnings/withdraw - Process withdrawal
func (h *PaymentHandler) ProcessWithdrawal(c *gin.Context) {
	var req models.WithdrawalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "VALIDATION_ERROR",
				Message: "Invalid request data",
			},
		})
		return
	}

	// Update earnings to withdrawn
	query := `
		UPDATE earnings
		SET withdrawal_status = $1, withdrawn_at = $2
		WHERE driver_id = $3 AND withdrawal_status = $4
		RETURNING id
	`

	var updatedIDs []uuid.UUID
	rows, err := h.db.Query(
		context.Background(),
		query,
		models.WithdrawalStatusWithdrawn,
		time.Now(),
		req.DriverID,
		models.WithdrawalStatusPending,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "WITHDRAWAL_FAILED",
				Message: "Failed to process withdrawal",
			},
		})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var id uuid.UUID
		rows.Scan(&id)
		updatedIDs = append(updatedIDs, id)
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data: gin.H{
			"withdrawn_count": len(updatedIDs),
			"amount":          req.Amount,
		},
		Message: "Withdrawal processed successfully",
	})
}
