package handlers

import (
	"context"
	"log"
	"net/http"

	"margwa/driver-service/models"
	"margwa/driver-service/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DriverHandler struct {
	db *pgxpool.Pool
}

func NewDriverHandler(db *pgxpool.Pool) *DriverHandler {
	return &DriverHandler{db: db}
}

// GetProfile gets or creates driver profile
func (h *DriverHandler) GetProfile(c *gin.Context) {
	userID := c.GetString("userId")

	var profile models.DriverProfile
	err := h.db.QueryRow(context.Background(),
		`SELECT id, user_id, license_number, license_expiry, license_image_url, 
		 background_check_status, total_trips, total_earnings, average_rating, 
		 is_online, current_latitude, current_longitude, last_location_update, 
		 created_at, updated_at
		 FROM driver_profiles WHERE user_id = $1`,
		userID,
	).Scan(&profile.ID, &profile.UserID, &profile.LicenseNumber, &profile.LicenseExpiry,
		&profile.LicenseImageURL, &profile.BackgroundCheckStatus, &profile.TotalTrips,
		&profile.TotalEarnings, &profile.AverageRating, &profile.IsOnline,
		&profile.CurrentLatitude, &profile.CurrentLongitude, &profile.LastLocationUpdate,
		&profile.CreatedAt, &profile.UpdatedAt)

	if err != nil {
		// Profile doesn't exist, create one
		newID := uuid.New()
		_, createErr := h.db.Exec(context.Background(),
			`INSERT INTO driver_profiles (id, user_id, background_check_status, total_trips, total_earnings, average_rating, is_online)
			 VALUES ($1, $2, 'pending', 0, 0, 0, false)`,
			newID, userID,
		)

		if createErr != nil {
			log.Printf("Error creating driver profile: %v", createErr)
			c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to create driver profile", nil))
			return
		}

		// Fetch the newly created profile
		h.db.QueryRow(context.Background(),
			`SELECT id, user_id, license_number, license_expiry, license_image_url, 
			 background_check_status, total_trips, total_earnings, average_rating, 
			 is_online, current_latitude, current_longitude, last_location_update, 
			 created_at, updated_at
			 FROM driver_profiles WHERE id = $1`,
			newID,
		).Scan(&profile.ID, &profile.UserID, &profile.LicenseNumber, &profile.LicenseExpiry,
			&profile.LicenseImageURL, &profile.BackgroundCheckStatus, &profile.TotalTrips,
			&profile.TotalEarnings, &profile.AverageRating, &profile.IsOnline,
			&profile.CurrentLatitude, &profile.CurrentLongitude, &profile.LastLocationUpdate,
			&profile.CreatedAt, &profile.UpdatedAt)
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(profile, "Profile retrieved successfully"))
}

// UpdateProfile updates driver profile
func (h *DriverHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetString("userId")

	var req models.UpdateDriverProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("VALIDATION_ERROR", "Invalid request data", err.Error()))
		return
	}

	_, err := h.db.Exec(context.Background(),
		`UPDATE driver_profiles SET 
		 license_number = COALESCE($1, license_number),
		 license_expiry = COALESCE($2, license_expiry),
		 license_image_url = COALESCE($3, license_image_url),
		 updated_at = NOW()
		 WHERE user_id = $4`,
		req.LicenseNumber, req.LicenseExpiry, req.LicenseImageURL, userID,
	)

	if err != nil {
		log.Printf("Error updating driver profile: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to update profile", nil))
		return
	}

	// Get updated profile
	var profile models.DriverProfile
	h.db.QueryRow(context.Background(),
		`SELECT id, user_id, license_number, license_expiry, license_image_url, 
		 background_check_status, total_trips, total_earnings, average_rating, 
		 is_online, current_latitude, current_longitude, last_location_update, 
		 created_at, updated_at
		 FROM driver_profiles WHERE user_id = $1`,
		userID,
	).Scan(&profile.ID, &profile.UserID, &profile.LicenseNumber, &profile.LicenseExpiry,
		&profile.LicenseImageURL, &profile.BackgroundCheckStatus, &profile.TotalTrips,
		&profile.TotalEarnings, &profile.AverageRating, &profile.IsOnline,
		&profile.CurrentLatitude, &profile.CurrentLongitude, &profile.LastLocationUpdate,
		&profile.CreatedAt, &profile.UpdatedAt)

	c.JSON(http.StatusOK, utils.SuccessResponse(profile, "Profile updated successfully"))
}

// UpdateOnlineStatus toggles driver online/offline status
func (h *DriverHandler) UpdateOnlineStatus(c *gin.Context) {
	userID := c.GetString("userId")

	var req models.UpdateOnlineStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("VALIDATION_ERROR", "Invalid request data", err.Error()))
		return
	}

	_, err := h.db.Exec(context.Background(),
		`UPDATE driver_profiles SET 
		 is_online = $1,
		 updated_at = NOW()
		 WHERE user_id = $2`,
		req.IsOnline, userID,
	)

	if err != nil {
		log.Printf("Error updating online status: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to update status", nil))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{"isOnline": req.IsOnline}, "Status updated successfully"))
}

// UpdateLocation updates driver's current location
func (h *DriverHandler) UpdateLocation(c *gin.Context) {
	userID := c.GetString("userId")

	var req models.UpdateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("VALIDATION_ERROR", "Invalid request data", err.Error()))
		return
	}

	_, err := h.db.Exec(context.Background(),
		`UPDATE driver_profiles SET 
		 current_latitude = $1,
		 current_longitude = $2,
		 last_location_update = NOW(),
		 updated_at = NOW()
		 WHERE user_id = $3`,
		req.Latitude, req.Longitude, userID,
	)

	if err != nil {
		log.Printf("Error updating location: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to update location", nil))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(nil, "Location updated successfully"))
}

// GetStats retrieves driver statistics
func (h *DriverHandler) GetStats(c *gin.Context) {
	userID := c.GetString("userId")

	var stats models.DriverStats
	err := h.db.QueryRow(context.Background(),
		`SELECT total_trips, total_earnings, average_rating
		 FROM driver_profiles WHERE user_id = $1`,
		userID,
	).Scan(&stats.TotalTrips, &stats.TotalEarnings, &stats.AverageRating)

	if err != nil {
		log.Printf("Error getting driver stats: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to get stats", nil))
		return
	}

	// TODO: Calculate weekly, monthly, and today earnings from bookings table
	stats.WeekEarnings = "0"
	stats.MonthEarnings = "0"
	stats.TodayEarnings = "0"

	c.JSON(http.StatusOK, utils.SuccessResponse(stats, "Stats retrieved successfully"))
}
