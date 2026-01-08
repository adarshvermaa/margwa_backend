package config

import "os"

type Config struct {
	DatabaseURL string
	RedisURL    string
	Port        string
	JWTSecret   string
}

func LoadConfig() *Config {
	return &Config{
		DatabaseURL: getEnv("DATABASE_URL", "postgresql://margwa_user:margwa_password@localhost:5432/margwa_db"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		Port:        getEnv("ANALYTICS_PORT", "3008"),
		JWTSecret:   getEnv("JWT_SECRET", "your-secret-key"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
