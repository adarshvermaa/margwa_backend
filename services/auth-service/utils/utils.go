package utils

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"time"

	"margwa/auth-service/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type JWTClaims struct {
	UserID      string `json:"userId"`
	UserType    string `json:"userType"`
	PhoneNumber string `json:"phoneNumber"`
	jwt.RegisteredClaims
}

// GenerateOTP creates a random OTP of specified length
func GenerateOTP(length int) (string, error) {
	const digits = "0123456789"
	otp := make([]byte, length)

	for i := 0; i < length; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			return "", err
		}
		otp[i] = digits[num.Int64()]
	}

	return string(otp), nil
}

// GenerateJWT creates a new JWT token
func GenerateJWT(user *models.User, secret string, expiresIn time.Duration) (string, error) {
	claims := JWTClaims{
		UserID:      user.ID.String(),
		UserType:    user.UserType,
		PhoneNumber: user.PhoneNumber,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiresIn)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			ID:        uuid.New().String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateJWT verifies and parses a JWT token
func ValidateJWT(tokenString string, secret string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

// ParseDuration parses duration string like "15m", "24h"
func ParseDuration(s string) time.Duration {
	duration, err := time.ParseDuration(s)
	if err != nil {
		return 15 * time.Minute
	}
	return duration
}

// SuccessResponse creates a success API response
func SuccessResponse(data interface{}, message string) models.AuthResponse {
	return models.AuthResponse{
		Success:   true,
		Data:      data,
		Message:   message,
		Timestamp: time.Now().Format(time.RFC3339),
	}
}

// ErrorResponse creates an error API response
func ErrorResponse(code, message string, details interface{}) models.AuthResponse {
	return models.AuthResponse{
		Success: false,
		Error: &models.ErrorData{
			Code:    code,
			Message: message,
			Details: details,
		},
		Timestamp: time.Now().Format(time.RFC3339),
	}
}
