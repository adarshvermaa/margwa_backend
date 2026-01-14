package models

import (
	"time"

	"github.com/google/uuid"
)

// Driver Profile Models
type DriverProfile struct {
	ID                    uuid.UUID  `json:"id"`
	UserID                uuid.UUID  `json:"userId"`
	LicenseNumber         *string    `json:"licenseNumber"`
	LicenseExpiry         *time.Time `json:"licenseExpiry"`
	LicenseImageURL       *string    `json:"licenseImageUrl"`
	BackgroundCheckStatus string     `json:"backgroundCheckStatus"`
	TotalTrips            int        `json:"totalTrips"`
	TotalEarnings         string     `json:"totalEarnings"`
	AverageRating         string     `json:"averageRating"`
	IsOnline              bool       `json:"isOnline"`
	CurrentLatitude       *string    `json:"currentLatitude"`
	CurrentLongitude      *string    `json:"currentLongitude"`
	LastLocationUpdate    *time.Time `json:"lastLocationUpdate"`
	CreatedAt             time.Time  `json:"createdAt"`
	UpdatedAt             time.Time  `json:"updatedAt"`
}

type CreateDriverProfileRequest struct {
	LicenseNumber   *string    `json:"licenseNumber"`
	LicenseExpiry   *time.Time `json:"licenseExpiry"`
	LicenseImageURL *string    `json:"licenseImageUrl"`
}

type UpdateDriverProfileRequest struct {
	LicenseNumber   *string    `json:"licenseNumber"`
	LicenseExpiry   *time.Time `json:"licenseExpiry"`
	LicenseImageURL *string    `json:"licenseImageUrl"`
}

type UpdateLocationRequest struct {
	Latitude  float64 `json:"latitude" binding:"required"`
	Longitude float64 `json:"longitude" binding:"required"`
}

type UpdateOnlineStatusRequest struct {
	IsOnline bool `json:"isOnline" binding:"required"`
}

type DriverStats struct {
	TotalTrips    int    `json:"totalTrips"`
	TotalEarnings string `json:"totalEarnings"`
	AverageRating string `json:"averageRating"`
	WeekEarnings  string `json:"weekEarnings"`
	MonthEarnings string `json:"monthEarnings"`
	TodayEarnings string `json:"todayEarnings"`
}

// Vehicle Models
type Vehicle struct {
	ID                 uuid.UUID  `json:"id"`
	DriverID           uuid.UUID  `json:"driverId"`
	VehicleName        string     `json:"vehicleName"`
	VehicleType        string     `json:"vehicleType"`
	VehicleNumber      string     `json:"vehicleNumber"`
	VehicleColor       *string    `json:"vehicleColor"`
	ManufacturingYear  *int       `json:"manufacturingYear"`
	TotalSeats         int        `json:"totalSeats"`
	RCNumber           *string    `json:"rcNumber"`
	RCImageURL         *string    `json:"rcImageUrl"`
	InsuranceNumber    *string    `json:"insuranceNumber"`
	InsuranceExpiry    *time.Time `json:"insuranceExpiry"`
	InsuranceImageURL  *string    `json:"insuranceImageUrl"`
	PUCNumber          *string    `json:"pucNumber"`
	PUCExpiry          *time.Time `json:"pucExpiry"`
	PUCImageURL        *string    `json:"pucImageUrl"`
	PermitNumber       *string    `json:"permitNumber"`
	PermitImageURL     *string    `json:"permitImageUrl"`
	VerificationStatus string     `json:"verificationStatus"`
	IsActive           bool       `json:"isActive"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
}

type CreateVehicleRequest struct {
	VehicleName       string     `json:"vehicleName" binding:"required"`
	VehicleType       string     `json:"vehicleType" binding:"required"`
	VehicleNumber     string     `json:"vehicleNumber" binding:"required"`
	VehicleColor      *string    `json:"vehicleColor"`
	ManufacturingYear *int       `json:"manufacturingYear"`
	TotalSeats        int        `json:"totalSeats" binding:"required,min=1"`
	RCNumber          *string    `json:"rcNumber"`
	RCImageURL        *string    `json:"rcImageUrl"`
	InsuranceNumber   *string    `json:"insuranceNumber"`
	InsuranceExpiry   *time.Time `json:"insuranceExpiry"`
	InsuranceImageURL *string    `json:"insuranceImageUrl"`
	PUCNumber         *string    `json:"pucNumber"`
	PUCExpiry         *time.Time `json:"pucExpiry"`
	PUCImageURL       *string    `json:"pucImageUrl"`
	PermitNumber      *string    `json:"permitNumber"`
	PermitImageURL    *string    `json:"permitImageUrl"`
}

type UpdateVehicleRequest struct {
	VehicleName       *string    `json:"vehicleName"`
	VehicleType       *string    `json:"vehicleType"`
	VehicleColor      *string    `json:"vehicleColor"`
	ManufacturingYear *int       `json:"manufacturingYear"`
	TotalSeats        *int       `json:"totalSeats"`
	RCNumber          *string    `json:"rcNumber"`
	RCImageURL        *string    `json:"rcImageUrl"`
	InsuranceNumber   *string    `json:"insuranceNumber"`
	InsuranceExpiry   *time.Time `json:"insuranceExpiry"`
	InsuranceImageURL *string    `json:"insuranceImageUrl"`
	PUCNumber         *string    `json:"pucNumber"`
	PUCExpiry         *time.Time `json:"pucExpiry"`
	PUCImageURL       *string    `json:"pucImageUrl"`
	PermitNumber      *string    `json:"permitNumber"`
	PermitImageURL    *string    `json:"permitImageUrl"`
}

// Document Models
type Document struct {
	ID                 uuid.UUID  `json:"id"`
	DriverID           uuid.UUID  `json:"driverId"`
	DocumentType       string     `json:"documentType"`
	DocumentURL        string     `json:"documentUrl"`
	VerificationStatus string     `json:"verificationStatus"`
	VerifiedAt         *time.Time `json:"verifiedAt"`
	ExpiresAt          *time.Time `json:"expiresAt"`
	CreatedAt          time.Time  `json:"createdAt"`
}

type UploadDocumentRequest struct {
	DocumentType string     `json:"documentType" binding:"required"`
	DocumentData string     `json:"documentData" binding:"required"` // base64 encoded
	ExpiresAt    *time.Time `json:"expiresAt"`
}

// Response Models
type Response struct {
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

// Seat Configuration Models
type SeatConfiguration struct {
	ID          uuid.UUID `json:"id"`
	VehicleID   uuid.UUID `json:"vehicleId"`
	SeatID      string    `json:"seatId"`
	RowNumber   int       `json:"rowNumber"`
	Position    string    `json:"position"` // 'left', 'right', 'center'
	IsAvailable bool      `json:"isAvailable"`
	SeatType    string    `json:"seatType"` // 'driver', 'passenger'
	Price       *float64  `json:"price,omitempty"`
	Amenities   []string  `json:"amenities,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type SaveSeatConfigRequest struct {
	Seats []SeatConfigInput `json:"seats" binding:"required,min=1"`
}

type SeatConfigInput struct {
	SeatID      string   `json:"seatId" binding:"required"`
	RowNumber   int      `json:"rowNumber" binding:"required,min=1"`
	Position    string   `json:"position" binding:"required,oneof=left right center"`
	IsAvailable bool     `json:"isAvailable"`
	SeatType    string   `json:"seatType" binding:"required,oneof=driver passenger"`
	Price       *float64 `json:"price,omitempty"`
	Amenities   []string `json:"amenities,omitempty"`
}
