package middleware

import (
	"net/http"
	"strings"

	"margwa/driver-service/utils"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID      string `json:"userId"`
	UserType    string `json:"userType"`
	PhoneNumber string `json:"phoneNumber"`
	jwt.RegisteredClaims
}

func ValidateJWT(tokenString string, secret string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		return nil, err
	}

	return claims, nil
}

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse(
				"UNAUTHORIZED",
				"No authentication token provided",
				nil,
			))
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse(
				"UNAUTHORIZED",
				"Invalid authentication token format",
				nil,
			))
			c.Abort()
			return
		}

		claims, err := ValidateJWT(parts[1], jwtSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, utils.ErrorResponse(
				"TOKEN_EXPIRED",
				"Authentication token expired or invalid",
				nil,
			))
			c.Abort()
			return
		}

		c.Set("userId", claims.UserID)
		c.Set("userType", claims.UserType)
		c.Set("phoneNumber", claims.PhoneNumber)
		c.Next()
	}
}
