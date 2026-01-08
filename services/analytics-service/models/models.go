package models

import (
	"time"

	"github.com/google/uuid"
)

type DriverStats struct {
	DriverID             uuid.UUID `json:"driver_id"`
	TotalTrips           int64     `json:"total_trips"`
	CompletedTrips       int64     `json:"completed_trips"`
	CancelledTrips       int64     `json:"cancelled_trips"`
	TotalEarnings        float64   `json:"total_earnings"`
	AverageRating        float64   `json:"average_rating"`
	TotalDistanceKm      float64   `json:"total_distance_km"`
	TotalDurationMinutes int64     `json:"total_duration_minutes"`
	AcceptanceRate       float64   `json:"acceptance_rate"`
}

type DailyEarnings struct {
	Date          time.Time `json:"date"`
	TotalEarnings float64   `json:"total_earnings"`
	TripCount     int64     `json:"trip_count"`
	PlatformFee   float64   `json:"platform_fee"`
	NetEarnings   float64   `json:"net_earnings"`
}

type TripAnalytics struct {
	TripID          uuid.UUID `json:"trip_id"`
	DistanceKm      float64   `json:"distance_km"`
	DurationMinutes int       `json:"duration_minutes"`
	BaseFare        float64   `json:"base_fare"`
	TotalFare       float64   `json:"total_fare"`
	PassengerCount  int       `json:"passenger_count"`
	RouteEfficiency float64   `json:"route_efficiency"`
	WaitTimeMinutes *int      `json:"wait_time_minutes"`
}

type PlatformStats struct {
	TotalUsers          int64   `json:"total_users"`
	TotalDrivers        int64   `json:"total_drivers"`
	ActiveDrivers       int64   `json:"active_drivers"`
	TotalTripsToday     int64   `json:"total_trips_today"`
	TotalRevenueToday   float64 `json:"total_revenue_today"`
	AverageTripDuration float64 `json:"average_trip_duration"`
	PeakHours           []int   `json:"peak_hours"`
}

type RouteTrend struct {
	FromCity        string  `json:"from_city"`
	ToCity          string  `json:"to_city"`
	TripCount       int64   `json:"trip_count"`
	AverageFare     float64 `json:"average_fare"`
	AverageDuration float64 `json:"average_duration"`
	DemandScore     float64 `json:"demand_score"`
}

type ReportRequest struct {
	ReportType string     `json:"report_type"`
	StartDate  string     `json:"start_date"`
	EndDate    string     `json:"end_date"`
	DriverID   *uuid.UUID `json:"driver_id,omitempty"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIError   `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

type APIError struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}
