package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port              string
	Environment       string
	DatabaseURL       string
	RedisURL          string
	JWTSecret         string
	JWTRefreshSecret  string
	JWTExpiresIn      string
	JWTRefreshExpires string
	OTPExpiryMinutes  int
	OTPLength         int
	TwilioSID         string
	TwilioAuthToken   string
	TwilioPhoneNumber string
}

func LoadConfig() *Config {
	otpExpiry, _ := strconv.Atoi(getEnv("OTP_EXPIRY_MINUTES", "10"))
	otpLength, _ := strconv.Atoi(getEnv("OTP_LENGTH", "4"))

	return &Config{
		Port:              getEnv("AUTH_SERVICE_PORT", "3001"),
		Environment:       getEnv("NODE_ENV", "development"),
		DatabaseURL:       getEnv("DATABASE_URL", "postgresql://margwa_user:margwa_password@localhost:5432/margwa_db"),
		RedisURL:          getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:         getEnv("JWT_SECRET", "your-super-secret-jwt-key"),
		JWTRefreshSecret:  getEnv("JWT_REFRESH_SECRET", "your-super-secret-refresh-key"),
		JWTExpiresIn:      getEnv("JWT_EXPIRES_IN", "15m"),
		JWTRefreshExpires: getEnv("JWT_REFRESH_EXPIRES_IN", "30d"),
		OTPExpiryMinutes:  otpExpiry,
		OTPLength:         otpLength,
		TwilioSID:         getEnv("TWILIO_ACCOUNT_SID", ""),
		TwilioAuthToken:   getEnv("TWILIO_AUTH_TOKEN", ""),
		TwilioPhoneNumber: getEnv("TWILIO_PHONE_NUMBER", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
