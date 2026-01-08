package middleware

import (
	"net/http"
	"strings"

	"margwa/auth-service/utils"

	"github.com/gin-gonic/gin"
)

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

		claims, err := utils.ValidateJWT(parts[1], jwtSecret)
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
