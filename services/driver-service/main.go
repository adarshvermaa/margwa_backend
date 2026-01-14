package main

import (
	"log"

	"margwa/driver-service/config"
	"margwa/driver-service/database"
	"margwa/driver-service/handlers"
	"margwa/driver-service/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("../../.env"); err != nil {
		log.Println("No .env file found, using system environment variables")
	}
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize database
	db, err := database.NewPostgresDB(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	log.Println("✅ Connected to database")

	// Initialize handlers
	driverHandler := handlers.NewDriverHandler(db)
	vehicleHandler := handlers.NewVehicleHandler(db)
	documentHandler := handlers.NewDocumentHandler(db)

	// Setup Gin router
	router := gin.Default()

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "driver-service"})
	})

	// API v1 routes
	api := router.Group("/api/v1")
	{
		// Driver profile routes (protected)
		driver := api.Group("/driver")
		driver.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		{
			driver.GET("/profile", driverHandler.GetProfile)
			driver.PUT("/profile", driverHandler.UpdateProfile)
			driver.PUT("/online-status", driverHandler.UpdateOnlineStatus)
			driver.PUT("/location", driverHandler.UpdateLocation)
			driver.GET("/stats", driverHandler.GetStats)

			// Vehicle routes
			driver.GET("/vehicles", vehicleHandler.GetVehicles)
			driver.GET("/vehicles/:id", vehicleHandler.GetVehicle)
			driver.POST("/vehicles", vehicleHandler.CreateVehicle)
			driver.PUT("/vehicles/:id", vehicleHandler.UpdateVehicle)
			driver.DELETE("/vehicles/:id", vehicleHandler.DeleteVehicle)
			driver.PUT("/vehicles/:id/activate", vehicleHandler.SetActiveVehicle)

			// Seat configuration routes
			driver.POST("/vehicles/:id/seats", vehicleHandler.SaveSeatConfiguration)
			driver.GET("/vehicles/:id/seats", vehicleHandler.GetSeatConfiguration)

			// Document routes
			driver.GET("/documents", documentHandler.GetDocuments)
			driver.POST("/documents/upload", documentHandler.UploadDocument)
			driver.DELETE("/documents/:id", documentHandler.DeleteDocument)
		}
	}

	// Start server
	log.Printf("🚀 Driver Service running on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
