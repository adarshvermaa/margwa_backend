package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"margwa/auth-service/config"
	"margwa/auth-service/models"
	"margwa/auth-service/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type AuthHandler struct {
	db     *pgxpool.Pool
	redis  *redis.Client
	config *config.Config
}

func NewAuthHandler(db *pgxpool.Pool, redis *redis.Client, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		db:     db,
		redis:  redis,
		config: cfg,
	}
}

// Register creates a new user account or upgrades existing user role
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("VALIDATION_ERROR", "Invalid request data", err.Error()))
		return
	}

	// Check if user already exists
	var existingUser models.User
	err := h.db.QueryRow(context.Background(),
		`SELECT id, user_type FROM users WHERE phone_number = $1 AND phone_country_code = $2`,
		req.PhoneNumber, req.PhoneCountryCode,
	).Scan(&existingUser.ID, &existingUser.UserType)

	if err == nil {
		// User exists - check if we need to upgrade role
		if existingUser.UserType != "both" && existingUser.UserType != req.UserType {
			// Existing user registered in one app, now registering in the other
			// Upgrade to 'both'
			log.Printf("Upgrading user %s from '%s' to 'both'", existingUser.ID, existingUser.UserType)

			_, err = h.db.Exec(context.Background(),
				`UPDATE users SET user_type = 'both', updated_at = NOW() WHERE id = $1`,
				existingUser.ID,
			)

			if err != nil {
				log.Printf("Error upgrading user role: %v", err)
				c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to upgrade user role", nil))
				return
			}

			// Fetch updated user
			err = h.db.QueryRow(context.Background(),
				`SELECT id, phone_number, phone_country_code, full_name, email, profile_image_url, user_type, 
				        is_verified, is_active, language_preference, created_at, updated_at, last_login_at
				 FROM users WHERE id = $1`,
				existingUser.ID,
			).Scan(&existingUser.ID, &existingUser.PhoneNumber, &existingUser.PhoneCountryCode, &existingUser.FullName,
				&existingUser.Email, &existingUser.ProfileImageURL, &existingUser.UserType, &existingUser.IsVerified,
				&existingUser.IsActive, &existingUser.LanguagePreference, &existingUser.CreatedAt,
				&existingUser.UpdatedAt, &existingUser.LastLoginAt)

			c.JSON(http.StatusOK, utils.SuccessResponse(existingUser, "User role upgraded to 'both'. Please verify with OTP."))
			return
		}

		// User already has this role or 'both'
		c.JSON(http.StatusConflict, utils.ErrorResponse("USER_ALREADY_EXISTS", "User with this phone number already exists", nil))
		return
	}

	// Create new user
	var user models.User
	err = h.db.QueryRow(context.Background(),
		`INSERT INTO users (phone_number, phone_country_code, user_type, is_verified, is_active, language_preference)
		 VALUES ($1, $2, $3, false, true, 'en')
		 RETURNING id, phone_number, phone_country_code, full_name, email, profile_image_url, user_type, 
		           is_verified, is_active, language_preference, created_at, updated_at, last_login_at`,
		req.PhoneNumber, req.PhoneCountryCode, req.UserType,
	).Scan(&user.ID, &user.PhoneNumber, &user.PhoneCountryCode, &user.FullName, &user.Email,
		&user.ProfileImageURL, &user.UserType, &user.IsVerified, &user.IsActive,
		&user.LanguagePreference, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt)

	if err != nil {
		log.Printf("Error creating user: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to create user", nil))
		return
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse(user, "User registered successfully. Please verify with OTP."))
}

// SendOTP generates and sends an OTP to the user's phone
func (h *AuthHandler) SendOTP(c *gin.Context) {
	var req models.SendOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("VALIDATION_ERROR", "Invalid request data", err.Error()))
		return
	}

	// Check if user exists
	var userID uuid.UUID
	err := h.db.QueryRow(context.Background(),
		"SELECT id FROM users WHERE phone_number = $1 AND phone_country_code = $2",
		req.PhoneNumber, req.PhoneCountryCode,
	).Scan(&userID)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("USER_NOT_FOUND", "User not found", nil))
		return
	}

	// Generate OTP
	otpCode, err := utils.GenerateOTP(h.config.OTPLength)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("INTERNAL_ERROR", "Failed to generate OTP", nil))
		return
	}

	// Store OTP in database
	expiresAt := time.Now().Add(time.Duration(h.config.OTPExpiryMinutes) * time.Minute)
	otpID := uuid.New()

	_, err = h.db.Exec(context.Background(),
		`INSERT INTO otp_verifications (id, user_id, phone_number, otp_code, expires_at, attempts)
		 VALUES ($1, $2, $3, $4, $5, 0)`,
		otpID, userID, req.PhoneNumber, otpCode, expiresAt,
	)

	if err != nil {
		log.Printf("Error storing OTP: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to store OTP", nil))
		return
	}

	// TODO: Send OTP via Twilio SMS
	// For development, log the OTP
	log.Printf("OTP for %s: %s (Expires at: %v)", req.PhoneNumber, otpCode, expiresAt)

	c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{
		"otpId":     otpID,
		"expiresAt": expiresAt,
		"message":   fmt.Sprintf("OTP sent to %s", req.PhoneNumber),
		// In development, return OTP in response
		"otp": otpCode,
	}, "OTP sent successfully"))
}

// VerifyOTP verifies the OTP and logs in the user
func (h *AuthHandler) VerifyOTP(c *gin.Context) {
	var req models.VerifyOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("VALIDATION_ERROR", "Invalid request data", err.Error()))
		return
	}
	log.Printf(req.PhoneNumber, req.PhoneCountryCode)
	// Get user
	var user models.User
	err := h.db.QueryRow(context.Background(),
		`SELECT id, phone_number, phone_country_code, full_name, email, profile_image_url, user_type,
		  is_verified, is_active, language_preference, created_at, updated_at, last_login_at
		 FROM users WHERE phone_number = $1 AND phone_country_code = $2`,
		req.PhoneNumber, req.PhoneCountryCode,
	).Scan(&user.ID, &user.PhoneNumber, &user.PhoneCountryCode, &user.FullName, &user.Email,
		&user.ProfileImageURL, &user.UserType, &user.IsVerified, &user.IsActive,
		&user.LanguagePreference, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("USER_NOT_FOUND", "User not found", nil))
		return
	}

	// Verify OTP
	var otp models.OTPVerification
	err = h.db.QueryRow(context.Background(),
		`SELECT id, otp_code, expires_at, verified_at, attempts
		 FROM otp_verifications 
		 WHERE user_id = $1 AND phone_number = $2 AND verified_at IS NULL
		 ORDER BY created_at DESC LIMIT 1`,
		user.ID, req.PhoneNumber,
	).Scan(&otp.ID, &otp.OTPCode, &otp.ExpiresAt, &otp.VerifiedAt, &otp.Attempts)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("OTP_NOT_FOUND", "No valid OTP found", nil))
		return
	}

	// Check if OTP expired
	if time.Now().After(otp.ExpiresAt) {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("OTP_EXPIRED", "OTP has expired", nil))
		return
	}

	// Check attempts
	if otp.Attempts >= 3 {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("TOO_MANY_ATTEMPTS", "Too many failed attempts", nil))
		return
	}

	// Verify OTP code
	if otp.OTPCode != req.OTPCode {
		// Increment attempts
		h.db.Exec(context.Background(),
			"UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1",
			otp.ID,
		)
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("INVALID_OTP", "Invalid OTP code", nil))
		return
	}

	// Mark OTP as verified
	now := time.Now()
	h.db.Exec(context.Background(),
		"UPDATE otp_verifications SET verified_at = $1 WHERE id = $2",
		now, otp.ID,
	)

	// Mark user as verified
	h.db.Exec(context.Background(),
		"UPDATE users SET is_verified = true, last_login_at = $1 WHERE id = $2",
		now, user.ID,
	)
	user.IsVerified = true
	user.LastLoginAt = &now

	// Generate tokens
	accessTokenDuration := utils.ParseDuration(h.config.JWTExpiresIn)
	refreshTokenDuration := utils.ParseDuration(h.config.JWTRefreshExpires)

	accessToken, err := utils.GenerateJWT(&user, h.config.JWTSecret, accessTokenDuration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("INTERNAL_ERROR", "Failed to generate access token", nil))
		return
	}

	refreshToken, err := utils.GenerateJWT(&user, h.config.JWTRefreshSecret, refreshTokenDuration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("INTERNAL_ERROR", "Failed to generate refresh token", nil))
		return
	}

	// Store session
	sessionID := uuid.New()
	sessionExpiresAt := time.Now().Add(refreshTokenDuration)

	_, err = h.db.Exec(context.Background(),
		`INSERT INTO sessions (id, user_id, refresh_token, device_id, device_type, fcm_token, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		sessionID, user.ID, refreshToken, req.DeviceID, req.DeviceType, req.FCMToken, sessionExpiresAt,
	)

	if err != nil {
		log.Printf("Error storing session: %v", err)
	}

	tokens := models.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    h.config.JWTExpiresIn,
	}

	result := models.UserWithTokens{
		User:   &user,
		Tokens: &tokens,
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(result, "Login successful"))
}

// RefreshToken generates a new access token using refresh token
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req models.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("VALIDATION_ERROR", "Invalid request data", err.Error()))
		return
	}

	// Validate refresh token
	claims, err := utils.ValidateJWT(req.RefreshToken, h.config.JWTRefreshSecret)
	if err != nil {
		c.JSON(http.StatusUnauthorized, utils.ErrorResponse("INVALID_TOKEN", "Invalid refresh token", nil))
		return
	}

	// Get user
	userID, _ := uuid.Parse(claims.UserID)
	var user models.User
	err = h.db.QueryRow(context.Background(),
		`SELECT id, phone_number, phone_country_code, full_name, email, profile_image_url, user_type,
		  is_verified, is_active, language_preference, created_at, updated_at, last_login_at
		 FROM users WHERE id = $1`,
		userID,
	).Scan(&user.ID, &user.PhoneNumber, &user.PhoneCountryCode, &user.FullName, &user.Email,
		&user.ProfileImageURL, &user.UserType, &user.IsVerified, &user.IsActive,
		&user.LanguagePreference, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("USER_NOT_FOUND", "User not found", nil))
		return
	}

	// Generate new access token
	accessTokenDuration := utils.ParseDuration(h.config.JWTExpiresIn)
	accessToken, err := utils.GenerateJWT(&user, h.config.JWTSecret, accessTokenDuration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("INTERNAL_ERROR", "Failed to generate access token", nil))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{
		"accessToken": accessToken,
		"expiresIn":   h.config.JWTExpiresIn,
	}, "Token refreshed successfully"))
}

// Logout invalidates the user's session
func (h *AuthHandler) Logout(c *gin.Context) {
	userID := c.GetString("userId")

	// Delete all sessions for the user
	_, err := h.db.Exec(context.Background(),
		"DELETE FROM sessions WHERE user_id = $1",
		userID,
	)

	if err != nil {
		log.Printf("Error deleting sessions: %v", err)
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(nil, "Logged out successfully"))
}

// GetProfile returns the user's profile
func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID := c.GetString("userId")

	var user models.User
	err := h.db.QueryRow(context.Background(),
		`SELECT id, phone_number, phone_country_code, full_name, email, profile_image_url, user_type,
		  is_verified, is_active, language_preference, created_at, updated_at, last_login_at
		 FROM users WHERE id = $1`,
		userID,
	).Scan(&user.ID, &user.PhoneNumber, &user.PhoneCountryCode, &user.FullName, &user.Email,
		&user.ProfileImageURL, &user.UserType, &user.IsVerified, &user.IsActive,
		&user.LanguagePreference, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt)

	if err != nil {
		c.JSON(http.StatusNotFound, utils.ErrorResponse("USER_NOT_FOUND", "User not found", nil))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(user, "Profile retrieved successfully"))
}

// UpdateProfile updates the user's profile
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetString("userId")

	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("VALIDATION_ERROR", "Invalid request data", err.Error()))
		return
	}

	// Update user
	_, err := h.db.Exec(context.Background(),
		`UPDATE users SET 
		  full_name = COALESCE($1, full_name),
		  email = COALESCE($2, email),
		  profile_image_url = COALESCE($3, profile_image_url),
		  dob = COALESCE($4, dob),
		  gender = COALESCE($5, gender),
		  is_profile_complete = COALESCE($6, is_profile_complete),
		  language_preference = COALESCE($7, language_preference),
		  updated_at = NOW()
		 WHERE id = $8`,
		req.FullName, req.Email, req.ProfileImageURL, req.DateOfBirth, req.Gender, req.IsProfileComplete, req.LanguagePreference, userID,
	)

	if err != nil {
		log.Printf("Error updating profile: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to update profile", nil))
		return
	}

	// Get updated user
	var user models.User
	h.db.QueryRow(context.Background(),
		`SELECT id, phone_number, phone_country_code, full_name, email, profile_image_url, dob, gender, is_profile_complete, user_type,
		  is_verified, is_active, language_preference, created_at, updated_at, last_login_at
		 FROM users WHERE id = $1`,
		userID,
	).Scan(&user.ID, &user.PhoneNumber, &user.PhoneCountryCode, &user.FullName, &user.Email,
		&user.ProfileImageURL, &user.DateOfBirth, &user.Gender, &user.IsProfileComplete, &user.UserType, &user.IsVerified, &user.IsActive,
		&user.LanguagePreference, &user.CreatedAt, &user.UpdatedAt, &user.LastLoginAt)

	c.JSON(http.StatusOK, utils.SuccessResponse(user, "Profile updated successfully"))
}
