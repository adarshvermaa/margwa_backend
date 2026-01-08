package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/margwa/payment-service/config"
	"github.com/margwa/payment-service/database"
	"github.com/margwa/payment-service/handlers"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	// Initialize database
	db, err := database.InitDB()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Initialize Redis
	redisClient := database.InitRedis()
	defer redisClient.Close()

	// Initialize Gin router
	router := gin.Default()

	// CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"service":   "payment-service",
		})
	})

	// Initialize payment handler
	paymentHandler := handlers.NewPaymentHandler(db, redisClient)

	// Payment routes
	payments := router.Group("/payments")
	{
		payments.POST("/initiate", paymentHandler.InitiatePayment)
		payments.POST("/verify", paymentHandler.VerifyPayment)
		payments.GET("/:bookingId", paymentHandler.GetPaymentByBooking)
		payments.POST("/refund", paymentHandler.ProcessRefund)
		payments.POST("/webhook", paymentHandler.HandleWebhook)
	}

	// Earnings routes
	earnings := router.Group("/earnings")
	{
		earnings.POST("/calculate", paymentHandler.CalculateEarnings)
		earnings.GET("/driver/:driverId", paymentHandler.GetDriverEarnings)
		earnings.POST("/withdraw", paymentHandler.ProcessWithdrawal)
	}

	// Start server
	port := config.GetEnv("PAYMENT_SERVICE_PORT", "3007")
	log.Printf("💳 Payment Service running on port %s\n", port)
	log.Printf("Environment: %s\n", config.GetEnv("NODE_ENV", "development"))

	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
