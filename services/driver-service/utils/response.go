package utils

import (
	"margwa/driver-service/models"
	"time"
)

func SuccessResponse(data interface{}, message string) models.Response {
	return models.Response{
		Success:   true,
		Data:      data,
		Message:   message,
		Timestamp: time.Now().Format(time.RFC3339),
	}
}

func ErrorResponse(code, message string, details interface{}) models.Response {
	return models.Response{
		Success: false,
		Error: &models.ErrorData{
			Code:    code,
			Message: message,
			Details: details,
		},
		Timestamp: time.Now().Format(time.RFC3339),
	}
}
