package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID                 uuid.UUID  `json:"id"`
	PhoneNumber        string     `json:"phoneNumber"`
	PhoneCountryCode   string     `json:"phoneCountryCode"`
	FullName           *string    `json:"fullName"`
	Email              *string    `json:"email"`
	ProfileImageURL    *string    `json:"profileImageUrl"`
	DateOfBirth        *time.Time `json:"dob"`
	Gender             *string    `json:"gender"`
	IsProfileComplete  *bool      `json:"isProfileComplete"`
	UserType           string     `json:"userType"`
	IsVerified         bool       `json:"isVerified"`
	IsActive           bool       `json:"isActive"`
	LanguagePreference string     `json:"languagePreference"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
	LastLoginAt        *time.Time `json:"lastLoginAt"`
}

type OTPVerification struct {
	ID          uuid.UUID  `json:"id"`
	UserID      *uuid.UUID `json:"userId"`
	PhoneNumber string     `json:"phoneNumber"`
	OTPCode     string     `json:"otpCode"`
	ExpiresAt   time.Time  `json:"expiresAt"`
	VerifiedAt  *time.Time `json:"verifiedAt"`
	Attempts    int        `json:"attempts"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type Session struct {
	ID           uuid.UUID  `json:"id"`
	UserID       uuid.UUID  `json:"userId"`
	RefreshToken string     `json:"refreshToken"`
	DeviceID     *string    `json:"deviceId"`
	DeviceType   *string    `json:"deviceType"`
	FCMToken     *string    `json:"fcmToken"`
	IPAddress    *string    `json:"ipAddress"`
	ExpiresAt    time.Time  `json:"expiresAt"`
	CreatedAt    time.Time  `json:"createdAt"`
	LastUsedAt   *time.Time `json:"lastUsedAt"`
}

type RegisterRequest struct {
	PhoneNumber      string `json:"phoneNumber" binding:"required"`
	PhoneCountryCode string `json:"phoneCountryCode" binding:"required"`
	UserType         string `json:"userType" binding:"required,oneof=client driver both"`
}

type SendOTPRequest struct {
	PhoneNumber      string `json:"phoneNumber" binding:"required"`
	PhoneCountryCode string `json:"phoneCountryCode" binding:"required"`
}

type VerifyOTPRequest struct {
	PhoneNumber      string  `json:"phoneNumber" binding:"required"`
	PhoneCountryCode string  `json:"phoneCountryCode" binding:"required"`
	OTPCode          string  `json:"otpCode" binding:"required"`
	DeviceID         *string `json:"deviceId"`
	DeviceType       *string `json:"deviceType"`
	FCMToken         *string `json:"fcmToken"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

type UpdateProfileRequest struct {
	FullName           *string    `json:"fullName"`
	Email              *string    `json:"email"`
	ProfileImageURL    *string    `json:"profileImageUrl"`
	DateOfBirth        *time.Time `json:"dob"`
	Gender             *string    `json:"gender"`
	IsProfileComplete  *bool      `json:"isProfileComplete"`
	LanguagePreference *string    `json:"languagePreference"`
}

type AuthResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Message   string      `json:"message,omitempty"`
	Error     *ErrorData  `json:"error,omitempty"`
	Timestamp string      `json:"timestamp"`
}

type ErrorData struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    string `json:"expiresIn"`
}

type UserWithTokens struct {
	User   *User      `json:"user"`
	Tokens *TokenPair `json:"tokens"`
}
