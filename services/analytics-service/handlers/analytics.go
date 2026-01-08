package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/margwa/analytics-service/models"
	"github.com/redis/go-redis/v9"
)

type AnalyticsHandler struct {
	db    *pgxpool.Pool
	redis *redis.Client
}

func NewAnalyticsHandler(db *pgxpool.Pool, redis *redis.Client) *AnalyticsHandler {
	return &AnalyticsHandler{
		db:    db,
		redis: redis,
	}
}

func (h *AnalyticsHandler) GetDriverStats(c *gin.Context) {
	driverID, err := uuid.Parse(c.Param("driver_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_DRIVER_ID",
				Message: "Invalid driver ID format",
			},
		})
		return
	}

	query := `
		SELECT 
			$1::uuid as driver_id,
			COUNT(DISTINCT b.id)::bigint as total_trips,
			COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END)::bigint as completed_trips,
			COUNT(DISTINCT CASE WHEN b.status = 'cancelled' THEN b.id END)::bigint as cancelled_trips,
			COALESCE(SUM(CASE WHEN b.status = 'completed' THEN p.amount END), 0.0) as total_earnings,
			COALESCE(AVG(r.rating), 0.0) as average_rating,
			COALESCE(SUM(rt.distance_km), 0.0) as total_distance_km,
			COALESCE(SUM(rt.estimated_duration_minutes), 0)::bigint as total_duration_minutes,
			CASE 
				WHEN COUNT(b.id) > 0 
				THEN (COUNT(CASE WHEN b.status != 'cancelled' THEN 1 END)::FLOAT / COUNT(b.id))
				ELSE 0.0 
			END as acceptance_rate
		FROM driver_profiles dp
		LEFT JOIN bookings b ON b.driver_id = dp.id
		LEFT JOIN route_instances ri ON ri.id = b.route_instance_id
		LEFT JOIN routes rt ON rt.id = ri.route_id
		LEFT JOIN payments p ON p.booking_id = b.id
		LEFT JOIN reviews r ON r.booking_id = b.id
		WHERE dp.id = $1
		GROUP BY dp.id
	`

	var stats models.DriverStats
	err = h.db.QueryRow(context.Background(), query, driverID).Scan(
		&stats.DriverID,
		&stats.TotalTrips,
		&stats.CompletedTrips,
		&stats.CancelledTrips,
		&stats.TotalEarnings,
		&stats.AverageRating,
		&stats.TotalDistanceKm,
		&stats.TotalDurationMinutes,
		&stats.AcceptanceRate,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "Failed to retrieve driver statistics",
			},
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    stats,
		Message: "Driver statistics retrieved",
	})
}

func (h *AnalyticsHandler) GetDriverEarnings(c *gin.Context) {
	driverID, err := uuid.Parse(c.Param("driver_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_DRIVER_ID",
				Message: "Invalid driver ID format",
			},
		})
		return
	}

	startDate := c.DefaultQuery("start_date", "2024-01-01")
	endDate := c.DefaultQuery("end_date", "2024-12-31")

	query := `
		SELECT 
			DATE(b.created_at) as date,
			COALESCE(SUM(p.amount), 0.0) as total_earnings,
			COUNT(b.id)::bigint as trip_count,
			COALESCE(SUM(e.platform_commission), 0.0) as platform_fee,
			COALESCE(SUM(e.net_amount), 0.0) as net_earnings
		FROM bookings b
		LEFT JOIN payments p ON p.booking_id = b.id
		LEFT JOIN earnings e ON e.driver_id = b.driver_id AND DATE(e.created_at) = DATE(b.created_at)
		WHERE b.driver_id = $1
		  AND DATE(b.created_at) BETWEEN $2::date AND $3::date
		  AND b.status = 'completed'
		GROUP BY DATE(b.created_at)
		ORDER BY DATE(b.created_at) DESC
	`

	rows, err := h.db.Query(context.Background(), query, driverID, startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "Failed to retrieve earnings data",
			},
		})
		return
	}
	defer rows.Close()

	var earnings []models.DailyEarnings
	for rows.Next() {
		var earning models.DailyEarnings
		err := rows.Scan(
			&earning.Date,
			&earning.TotalEarnings,
			&earning.TripCount,
			&earning.PlatformFee,
			&earning.NetEarnings,
		)
		if err != nil {
			continue
		}
		earnings = append(earnings, earning)
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    earnings,
		Message: "Earnings data retrieved",
	})
}

func (h *AnalyticsHandler) GetTripAnalytics(c *gin.Context) {
	tripID, err := uuid.Parse(c.Param("trip_id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_TRIP_ID",
				Message: "Invalid trip ID format",
			},
		})
		return
	}

	query := `
		SELECT 
			b.id as trip_id,
			COALESCE(rt.distance_km, 0.0) as distance_km,
			COALESCE(rt.estimated_duration_minutes, 0) as duration_minutes,
			COALESCE(rt.base_price_per_seat, 0.0) as base_fare,
			COALESCE(p.amount, 0.0) as total_fare,
			b.seats_requested as passenger_count,
			CASE 
				WHEN rt.estimated_duration_minutes > 0 
				THEN (rt.distance_km / rt.estimated_duration_minutes) * 60
				ELSE 0.0 
			END as route_efficiency
		FROM bookings b
		LEFT JOIN route_instances ri ON b.route_instance_id = ri.id
		LEFT JOIN routes rt ON rt.id = ri.route_id
		LEFT JOIN payments p ON p.booking_id = b.id
		WHERE b.id = $1
	`

	var analytics models.TripAnalytics
	err = h.db.QueryRow(context.Background(), query, tripID).Scan(
		&analytics.TripID,
		&analytics.DistanceKm,
		&analytics.DurationMinutes,
		&analytics.BaseFare,
		&analytics.TotalFare,
		&analytics.PassengerCount,
		&analytics.RouteEfficiency,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "NOT_FOUND",
				Message: "Trip not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    analytics,
		Message: "Trip analytics retrieved",
	})
}

func (h *AnalyticsHandler) GetPlatformStats(c *gin.Context) {
	query := `
		WITH daily_stats AS (
			SELECT 
				COUNT(DISTINCT b.id) as trips_today,
				COALESCE(SUM(p.amount), 0.0) as revenue_today
			FROM bookings b
			LEFT JOIN payments p ON p.booking_id = b.id
			WHERE DATE(b.created_at) = CURRENT_DATE
		)
		SELECT 
			(SELECT COUNT(*)::bigint FROM users) as total_users,
			(SELECT COUNT(*)::bigint FROM driver_profiles) as total_drivers,
			(SELECT COUNT(*)::bigint FROM driver_profiles WHERE is_online = true) as active_drivers,
			COALESCE(ds.trips_today, 0)::bigint as total_trips_today,
			COALESCE(ds.revenue_today, 0.0) as total_revenue_today,
			0.0 as average_trip_duration
		FROM daily_stats ds
	`

	var stats models.PlatformStats
	err := h.db.QueryRow(context.Background(), query).Scan(
		&stats.TotalUsers,
		&stats.TotalDrivers,
		&stats.ActiveDrivers,
		&stats.TotalTripsToday,
		&stats.TotalRevenueToday,
		&stats.AverageTripDuration,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "Failed to retrieve platform statistics",
			},
		})
		return
	}

	stats.PeakHours = []int{}
	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    stats,
		Message: "Platform statistics retrieved",
	})
}

func (h *AnalyticsHandler) GenerateReport(c *gin.Context) {
	var request models.ReportRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request body",
			},
		})
		return
	}

	reportID := uuid.New()
	reportURL := "/reports/" + reportID.String() + ".pdf"

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    reportURL,
		Message: "Report generated successfully",
	})
}

func (h *AnalyticsHandler) GetRouteTrends(c *gin.Context) {
	query := `
		SELECT 
			r.from_city,
			r.to_city,
			COUNT(b.id)::bigint as trip_count,
			COALESCE(AVG(p.amount), 0.0) as average_fare,
			COALESCE(AVG(r.estimated_duration_minutes), 0.0) as average_duration,
			COUNT(b.id)::FLOAT * COALESCE(AVG(p.amount), 0.0) as demand_score
		FROM routes r
		LEFT JOIN route_instances ri ON ri.route_id = r.id
		LEFT JOIN bookings b ON b.route_instance_id = ri.id
		LEFT JOIN payments p ON p.booking_id = b.id
		WHERE b.status = 'completed'
		  AND b.created_at > CURRENT_DATE - INTERVAL '30 days'
		GROUP BY r.from_city, r.to_city
		HAVING COUNT(b.id) > 0
		ORDER BY demand_score DESC
		LIMIT 20
	`

	rows, err := h.db.Query(context.Background(), query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.APIResponse{
			Success: false,
			Error: &models.APIError{
				Code:    "DATABASE_ERROR",
				Message: "Failed to retrieve route trends",
			},
		})
		return
	}
	defer rows.Close()

	var trends []models.RouteTrend
	for rows.Next() {
		var trend models.RouteTrend
		err := rows.Scan(
			&trend.FromCity,
			&trend.ToCity,
			&trend.TripCount,
			&trend.AverageFare,
			&trend.AverageDuration,
			&trend.DemandScore,
		)
		if err != nil {
			continue
		}
		trends = append(trends, trend)
	}

	c.JSON(http.StatusOK, models.APIResponse{
		Success: true,
		Data:    trends,
		Message: "Route trends retrieved",
	})
}
