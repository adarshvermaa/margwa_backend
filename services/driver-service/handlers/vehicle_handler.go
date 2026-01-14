package handlers

import (
	"bytes"
	"context"
	"strings"

	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"os"

	"margwa/driver-service/models"
	"margwa/driver-service/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type VehicleHandler struct {
	db *pgxpool.Pool
}

func NewVehicleHandler(db *pgxpool.Pool) *VehicleHandler {
	return &VehicleHandler{db: db}
}

// Storage service helper function
func uploadToStorageService(file *multipart.FileHeader, documentType string, vehicleID string) (string, error) {
	storageURL := os.Getenv("STORAGE_SERVICE_URL")
	if storageURL == "" {
		storageURL = "http://localhost:3010"
	}

	// Open the file
	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	// Create multipart form
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Add file with content type
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="%s"; filename="%s"`, "file", file.Filename))
	if file.Header.Get("Content-Type") != "" {
		h.Set("Content-Type", file.Header.Get("Content-Type"))
	} else {
		h.Set("Content-Type", "application/octet-stream")
	}

	part, err := writer.CreatePart(h)
	if err != nil {
		return "", err
	}
	_, err = io.Copy(part, src)
	if err != nil {
		return "", err
	}

	// Add metadata
	writer.WriteField("type", documentType)
	writer.WriteField("vehicleId", vehicleID)

	err = writer.Close()
	if err != nil {
		return "", err
	}

	// Send request to storage service
	req, err := http.NewRequest("POST", storageURL+"/api/v1/storage/upload/vehicle-document", body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("storage service error: %s", string(bodyBytes))
	}

	// Parse response
	var result struct {
		Success bool `json:"success"`
		Data    struct {
			URL string `json:"url"`
		} `json:"data"`
	}

	err = json.NewDecoder(resp.Body).Decode(&result)
	if err != nil {
		return "", err
	}

	if !result.Success {
		return "", fmt.Errorf("upload failed")
	}

	return result.Data.URL, nil
}

// Helper to get or create driver profile
func (h *VehicleHandler) getOrCreateDriverID(ctx context.Context, userID string) (uuid.UUID, error) {
	var driverID uuid.UUID
	err := h.db.QueryRow(ctx, `SELECT id FROM driver_profiles WHERE user_id = $1`, userID).Scan(&driverID)

	if err != nil {
		// If profile doesn't exist, create one
		newID := uuid.New()
		_, createErr := h.db.Exec(ctx,
			`INSERT INTO driver_profiles (id, user_id, background_check_status, total_trips, total_earnings, average_rating, is_online)
			 VALUES ($1, $2, 'pending', 0, 0, 0, false)`,
			newID, userID,
		)
		if createErr != nil {
			return uuid.Nil, fmt.Errorf("failed to create driver profile: %v", createErr)
		}
		return newID, nil
	}
	return driverID, nil
}

// GetVehicles retrieves all vehicles for a driver
func (h *VehicleHandler) GetVehicles(c *gin.Context) {
	userID := c.GetString("userId")

	driverID, err := h.getOrCreateDriverID(context.Background(), userID)
	if err != nil {
		log.Printf("Error getting/creating driver ID: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to process driver profile", nil))
		return
	}

	rows, err := h.db.Query(context.Background(),
		`SELECT id, driver_id, vehicle_name, vehicle_type, vehicle_number, vehicle_color,
		 manufacturing_year, total_seats, rc_number, rc_image_url, insurance_number,
		 insurance_expiry, insurance_image_url, puc_number, puc_expiry, puc_image_url,
		 permit_number, permit_image_url, verification_status, is_active, created_at, updated_at
		 FROM vehicles WHERE driver_id = $1 AND is_active = true ORDER BY created_at DESC`,
		driverID,
	)

	if err != nil {
		log.Printf("Error getting vehicles: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to get vehicles", nil))
		return
	}
	defer rows.Close()

	var vehicles []models.Vehicle
	for rows.Next() {
		var v models.Vehicle
		err := rows.Scan(&v.ID, &v.DriverID, &v.VehicleName, &v.VehicleType, &v.VehicleNumber,
			&v.VehicleColor, &v.ManufacturingYear, &v.TotalSeats, &v.RCNumber, &v.RCImageURL,
			&v.InsuranceNumber, &v.InsuranceExpiry, &v.InsuranceImageURL, &v.PUCNumber,
			&v.PUCExpiry, &v.PUCImageURL, &v.PermitNumber, &v.PermitImageURL,
			&v.VerificationStatus, &v.IsActive, &v.CreatedAt, &v.UpdatedAt)

		if err != nil {
			log.Printf("Error scanning vehicle: %v", err)
			continue
		}
		vehicles = append(vehicles, v)
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(vehicles, "Vehicles retrieved successfully"))
}

// GetVehicle retrieves a single vehicle by ID
func (h *VehicleHandler) GetVehicle(c *gin.Context) {
	vehicleID := c.Param("id")

	var vehicle models.Vehicle
	err := h.db.QueryRow(context.Background(),
		`SELECT id, driver_id, vehicle_name, vehicle_type, vehicle_number, vehicle_color,
		 manufacturing_year, total_seats, rc_number, rc_image_url, insurance_number,
		 insurance_expiry, insurance_image_url, puc_number, puc_expiry, puc_image_url,
		 permit_number, permit_image_url, verification_status, is_active, created_at, updated_at
		 FROM vehicles WHERE id = $1`,
		vehicleID,
	).Scan(&vehicle.ID, &vehicle.DriverID, &vehicle.VehicleName, &vehicle.VehicleType, &vehicle.VehicleNumber,
		&vehicle.VehicleColor, &vehicle.ManufacturingYear, &vehicle.TotalSeats, &vehicle.RCNumber, &vehicle.RCImageURL,
		&vehicle.InsuranceNumber, &vehicle.InsuranceExpiry, &vehicle.InsuranceImageURL, &vehicle.PUCNumber,
		&vehicle.PUCExpiry, &vehicle.PUCImageURL, &vehicle.PermitNumber, &vehicle.PermitImageURL,
		&vehicle.VerificationStatus, &vehicle.IsActive, &vehicle.CreatedAt, &vehicle.UpdatedAt)

	if err != nil {
		log.Printf("Error getting vehicle: %v", err)
		c.JSON(http.StatusNotFound, utils.ErrorResponse("NOT_FOUND", "Vehicle not found", nil))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(vehicle, "Vehicle retrieved successfully"))
}

// CreateVehicle creates a new vehicle with multipart file upload
func (h *VehicleHandler) CreateVehicle(c *gin.Context) {
	userID := c.GetString("userId")

	// Get driver ID
	// Get driver ID
	driverID, err := h.getOrCreateDriverID(context.Background(), userID)
	if err != nil {
		log.Printf("Error getting/creating driver ID: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to process driver profile", nil))
		return
	}

	// Parse multipart form
	err = c.Request.ParseMultipartForm(10 << 20) // 10MB max
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("PARSE_ERROR", "Failed to parse form data", err.Error()))
		return
	}

	// Get form fields
	vehicleName := c.PostForm("vehicleName")
	vehicleType := c.PostForm("vehicleType")
	vehicleNumber := c.PostForm("vehicleNumber")
	vehicleColor := c.PostForm("vehicleColor")
	manufacturingYear := c.PostForm("manufacturingYear")
	totalSeats := c.PostForm("totalSeats")
	rcNumber := c.PostForm("rcNumber")
	insuranceNumber := c.PostForm("insuranceNumber")
	insuranceExpiry := c.PostForm("insuranceExpiry")
	pucNumber := c.PostForm("pucNumber")
	pucExpiry := c.PostForm("pucExpiry")
	permitNumber := c.PostForm("permitNumber")

	vehicleID := uuid.New()

	// Upload documents to storage service
	var rcImageURL, insuranceImageURL, pucImageURL, permitImageURL *string

	// Upload RC document
	if rcFile, err := c.FormFile("rcDocument"); err == nil {
		url, uploadErr := uploadToStorageService(rcFile, "rc", vehicleID.String())
		if uploadErr != nil {
			log.Printf("Error uploading RC document: %v", uploadErr)
		} else {
			rcImageURL = &url
		}
	}

	// Upload Insurance document
	if insuranceFile, err := c.FormFile("insuranceDocument"); err == nil {
		url, uploadErr := uploadToStorageService(insuranceFile, "insurance", vehicleID.String())
		if uploadErr != nil {
			log.Printf("Error uploading insurance document: %v", uploadErr)
		} else {
			insuranceImageURL = &url
		}
	}

	// Upload PUC document
	if pucFile, err := c.FormFile("pucDocument"); err == nil {
		url, uploadErr := uploadToStorageService(pucFile, "puc", vehicleID.String())
		if uploadErr != nil {
			log.Printf("Error uploading PUC document: %v", uploadErr)
		} else {
			pucImageURL = &url
		}
	}

	// Upload Permit document
	if permitFile, err := c.FormFile("permitDocument"); err == nil {
		url, uploadErr := uploadToStorageService(permitFile, "permit", vehicleID.String())
		if uploadErr != nil {
			log.Printf("Error uploading permit document: %v", uploadErr)
		} else {
			permitImageURL = &url
		}
	}

	// Helper for dates
	toNullString := func(s string) *string {
		if s == "" {
			return nil
		}
		return &s
	}

	// Insert vehicle into database
	_, err = h.db.Exec(context.Background(),
		`INSERT INTO vehicles (id, driver_id, vehicle_name, vehicle_type, vehicle_number, 
		 vehicle_color, manufacturing_year, total_seats, rc_number, rc_image_url, 
		 insurance_number, insurance_expiry, insurance_image_url, puc_number, puc_expiry, 
		 puc_image_url, permit_number, permit_image_url, verification_status, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'pending', true)`,
		vehicleID, driverID, vehicleName, vehicleType, vehicleNumber,
		vehicleColor, manufacturingYear, totalSeats, rcNumber, rcImageURL,
		insuranceNumber, toNullString(insuranceExpiry), insuranceImageURL, pucNumber,
		toNullString(pucExpiry), pucImageURL, permitNumber, permitImageURL,
	)

	if err != nil {
		log.Printf("Error creating vehicle: %v", err)

		// Check for duplicate vehicle number constraint violation
		if strings.Contains(err.Error(), "vehicles_vehicle_number_unique") ||
			strings.Contains(err.Error(), "duplicate key value") {
			c.JSON(http.StatusConflict, utils.ErrorResponse(
				"DUPLICATE_VEHICLE",
				"This vehicle number is already registered. Please check the number or contact support if this is your vehicle.",
				nil,
			))
			return
		}

		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to create vehicle", nil))
		return
	}

	// Fetch the created vehicle
	var vehicle models.Vehicle
	h.db.QueryRow(context.Background(),
		`SELECT id, driver_id, vehicle_name, vehicle_type, vehicle_number, vehicle_color,
		 manufacturing_year, total_seats, rc_number, rc_image_url, insurance_number,
		 insurance_expiry, insurance_image_url, puc_number, puc_expiry, puc_image_url,
		 permit_number, permit_image_url, verification_status, is_active, created_at, updated_at
		 FROM vehicles WHERE id = $1`,
		vehicleID,
	).Scan(&vehicle.ID, &vehicle.DriverID, &vehicle.VehicleName, &vehicle.VehicleType, &vehicle.VehicleNumber,
		&vehicle.VehicleColor, &vehicle.ManufacturingYear, &vehicle.TotalSeats, &vehicle.RCNumber, &vehicle.RCImageURL,
		&vehicle.InsuranceNumber, &vehicle.InsuranceExpiry, &vehicle.InsuranceImageURL, &vehicle.PUCNumber,
		&vehicle.PUCExpiry, &vehicle.PUCImageURL, &vehicle.PermitNumber, &vehicle.PermitImageURL,
		&vehicle.VerificationStatus, &vehicle.IsActive, &vehicle.CreatedAt, &vehicle.UpdatedAt)

	c.JSON(http.StatusCreated, utils.SuccessResponse(vehicle, "Vehicle created successfully"))
}

// UpdateVehicle updates an existing vehicle
func (h *VehicleHandler) UpdateVehicle(c *gin.Context) {
	vehicleID := c.Param("id")
	log.Printf("Starting UpdateVehicle for ID: %s", vehicleID)

	// Check content type to decide how to parse
	contentType := c.GetHeader("Content-Type")
	log.Printf("UpdateVehicle received Content-Type: %s", contentType)

	var req models.UpdateVehicleRequest

	if strings.Contains(contentType, "application/json") {
		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("UpdateVehicle JSON bind failed: %v", err)
			c.JSON(http.StatusBadRequest, utils.ErrorResponse("VALIDATION_ERROR", "Invalid request data", err.Error()))
			return
		}
	} else {
		// Parse multipart form
		if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
			log.Printf("UpdateVehicle multipart parse failed: %v", err)
			c.JSON(http.StatusBadRequest, utils.ErrorResponse("PARSE_ERROR", "Failed to parse form data", err.Error()))
			return
		}

		// Helper to get string pointer
		strPtr := func(s string) *string {
			if s == "" {
				return nil
			}
			return &s
		}

		// Helper to get int pointer
		intPtr := func(s string) *int {
			if s == "" {
				return nil
			}
			val := 0
			fmt.Sscanf(s, "%d", &val)
			return &val
		}

		// Map form fields to request struct
		if v := c.PostForm("vehicleName"); v != "" {
			req.VehicleName = strPtr(v)
		}
		if v := c.PostForm("vehicleType"); v != "" {
			req.VehicleType = strPtr(v)
		}
		if v := c.PostForm("vehicleColor"); v != "" {
			req.VehicleColor = strPtr(v)
		}
		if v := c.PostForm("manufacturingYear"); v != "" {
			req.ManufacturingYear = intPtr(v)
		}
		if v := c.PostForm("totalSeats"); v != "" {
			req.TotalSeats = intPtr(v)
		}
		if v := c.PostForm("rcNumber"); v != "" {
			req.RCNumber = strPtr(v)
		}
		if v := c.PostForm("insuranceNumber"); v != "" {
			req.InsuranceNumber = strPtr(v)
		}
		if v := c.PostForm("pucNumber"); v != "" {
			req.PUCNumber = strPtr(v)
		}
		if v := c.PostForm("permitNumber"); v != "" {
			req.PermitNumber = strPtr(v)
		}

		// Handle file uploads
		if file, err := c.FormFile("rcDocument"); err == nil {
			url, uploadErr := uploadToStorageService(file, "rc", vehicleID)
			if uploadErr == nil {
				req.RCImageURL = strPtr(url)
			}
		}
		if file, err := c.FormFile("insuranceDocument"); err == nil {
			url, uploadErr := uploadToStorageService(file, "insurance", vehicleID)
			if uploadErr == nil {
				req.InsuranceImageURL = strPtr(url)
			}
		}
		if file, err := c.FormFile("pucDocument"); err == nil {
			url, uploadErr := uploadToStorageService(file, "puc", vehicleID)
			if uploadErr == nil {
				req.PUCImageURL = strPtr(url)
			}
		}
		if file, err := c.FormFile("permitDocument"); err == nil {
			url, uploadErr := uploadToStorageService(file, "permit", vehicleID)
			if uploadErr == nil {
				req.PermitImageURL = strPtr(url)
			}
		}
	}

	log.Printf("UpdateVehicle request processed: %+v", req)

	_, err := h.db.Exec(context.Background(),
		`UPDATE vehicles SET 
		 vehicle_name = COALESCE($1, vehicle_name),
		 vehicle_type = COALESCE($2, vehicle_type),
		 vehicle_color = COALESCE($3, vehicle_color),
		 manufacturing_year = COALESCE($4, manufacturing_year),
		 total_seats = COALESCE($5, total_seats),
		 rc_number = COALESCE($6, rc_number),
		 rc_image_url = COALESCE($7, rc_image_url),
		 insurance_number = COALESCE($8, insurance_number),
		 insurance_expiry = COALESCE($9, insurance_expiry),
		 insurance_image_url = COALESCE($10, insurance_image_url),
		 puc_number = COALESCE($11, puc_number),
		 puc_expiry = COALESCE($12, puc_expiry),
		 puc_image_url = COALESCE($13, puc_image_url),
		 permit_number = COALESCE($14, permit_number),
		 permit_image_url = COALESCE($15, permit_image_url),
		 updated_at = NOW()
		 WHERE id = $16`,
		req.VehicleName, req.VehicleType, req.VehicleColor, req.ManufacturingYear,
		req.TotalSeats, req.RCNumber, req.RCImageURL, req.InsuranceNumber,
		req.InsuranceExpiry, req.InsuranceImageURL, req.PUCNumber, req.PUCExpiry,
		req.PUCImageURL, req.PermitNumber, req.PermitImageURL, vehicleID,
	)

	if err != nil {
		log.Printf("Error updating vehicle: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to update vehicle", nil))
		return
	}

	// Get updated vehicle
	var vehicle models.Vehicle
	err = h.db.QueryRow(context.Background(),
		`SELECT id, driver_id, vehicle_name, vehicle_type, vehicle_number, vehicle_color,
		 manufacturing_year, total_seats, rc_number, rc_image_url, insurance_number,
		 insurance_expiry, insurance_image_url, puc_number, puc_expiry, puc_image_url,
		 permit_number, permit_image_url, verification_status, is_active, created_at, updated_at
		 FROM vehicles WHERE id = $1`,
		vehicleID,
	).Scan(&vehicle.ID, &vehicle.DriverID, &vehicle.VehicleName, &vehicle.VehicleType, &vehicle.VehicleNumber,
		&vehicle.VehicleColor, &vehicle.ManufacturingYear, &vehicle.TotalSeats, &vehicle.RCNumber, &vehicle.RCImageURL,
		&vehicle.InsuranceNumber, &vehicle.InsuranceExpiry, &vehicle.InsuranceImageURL, &vehicle.PUCNumber,
		&vehicle.PUCExpiry, &vehicle.PUCImageURL, &vehicle.PermitNumber, &vehicle.PermitImageURL,
		&vehicle.VerificationStatus, &vehicle.IsActive, &vehicle.CreatedAt, &vehicle.UpdatedAt)

	if err != nil {
		log.Printf("Error fetching updated vehicle: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to fetch updated vehicle", nil))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(vehicle, "Vehicle updated successfully"))
}

// DeleteVehicle soft-deletes a vehicle
func (h *VehicleHandler) DeleteVehicle(c *gin.Context) {
	vehicleID := c.Param("id")

	_, err := h.db.Exec(context.Background(),
		`UPDATE vehicles SET is_active = false, updated_at = NOW() WHERE id = $1`,
		vehicleID,
	)

	if err != nil {
		log.Printf("Error deleting vehicle: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to delete vehicle", nil))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(nil, "Vehicle deleted successfully"))
}

// SetActiveVehicle activates a specific vehicle
func (h *VehicleHandler) SetActiveVehicle(c *gin.Context) {
	vehicleID := c.Param("id")

	_, err := h.db.Exec(context.Background(),
		`UPDATE vehicles SET is_active = true, updated_at = NOW() WHERE id = $1`,
		vehicleID,
	)

	if err != nil {
		log.Printf("Error activating vehicle: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to activate vehicle", nil))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(nil, "Vehicle activated successfully"))
}

// SaveSeatConfiguration saves or updates seat configuration for a vehicle
func (h *VehicleHandler) SaveSeatConfiguration(c *gin.Context) {
	vehicleID := c.Param("id")
	userID := c.GetString("userId")

	// Verify vehicle ownership
	var driverID uuid.UUID
	err := h.db.QueryRow(context.Background(),
		`SELECT driver_id FROM vehicles WHERE id = $1`,
		vehicleID,
	).Scan(&driverID)

	if err != nil {
		log.Printf("Error verifying vehicle ownership: %v", err)
		c.JSON(http.StatusNotFound, utils.ErrorResponse("NOT_FOUND", "Vehicle not found", nil))
		return
	}

	// Verify driver owns this vehicle
	var ownerUserID uuid.UUID
	err = h.db.QueryRow(context.Background(),
		`SELECT user_id FROM driver_profiles WHERE id = $1`,
		driverID,
	).Scan(&ownerUserID)

	if err != nil || ownerUserID.String() != userID {
		c.JSON(http.StatusForbidden, utils.ErrorResponse("FORBIDDEN", "You don't have permission to modify this vehicle", nil))
		return
	}

	var req models.SaveSeatConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("VALIDATION_ERROR", "Invalid request data", err.Error()))
		return
	}

	// Delete existing seat configuration
	_, err = h.db.Exec(context.Background(),
		`DELETE FROM vehicle_seat_configurations WHERE vehicle_id = $1`,
		vehicleID,
	)
	if err != nil {
		log.Printf("Error deleting old seat config: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to update seat configuration", nil))
		return
	}

	// Insert new seat configurations
	for _, seat := range req.Seats {
		var amenitiesJSON []byte
		if len(seat.Amenities) > 0 {
			amenitiesJSON, _ = json.Marshal(seat.Amenities)
		}

		_, err = h.db.Exec(context.Background(),
			`INSERT INTO vehicle_seat_configurations 
			(vehicle_id, seat_id, row_number, position, is_available, seat_type, price, amenities)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			vehicleID, seat.SeatID, seat.RowNumber, seat.Position, seat.IsAvailable,
			seat.SeatType, seat.Price, amenitiesJSON,
		)

		if err != nil {
			log.Printf("Error inserting seat config: %v", err)
			c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to save seat configuration", nil))
			return
		}
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(nil, "Seat configuration saved successfully"))
}

// GetSeatConfiguration retrieves seat configuration for a vehicle
func (h *VehicleHandler) GetSeatConfiguration(c *gin.Context) {
	vehicleID := c.Param("id")

	rows, err := h.db.Query(context.Background(),
		`SELECT id, vehicle_id, seat_id, row_number, position, is_available, 
		 seat_type, price, amenities, created_at, updated_at
		 FROM vehicle_seat_configurations 
		 WHERE vehicle_id = $1
		 ORDER BY row_number, position`,
		vehicleID,
	)

	if err != nil {
		log.Printf("Error getting seat configuration: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to get seat configuration", nil))
		return
	}
	defer rows.Close()

	var seats []models.SeatConfiguration
	for rows.Next() {
		var seat models.SeatConfiguration
		var amenitiesJSON []byte

		err := rows.Scan(
			&seat.ID, &seat.VehicleID, &seat.SeatID, &seat.RowNumber,
			&seat.Position, &seat.IsAvailable, &seat.SeatType, &seat.Price,
			&amenitiesJSON, &seat.CreatedAt, &seat.UpdatedAt,
		)

		if err != nil {
			log.Printf("Error scanning seat: %v", err)
			continue
		}

		// Parse amenities JSON
		if len(amenitiesJSON) > 0 {
			json.Unmarshal(amenitiesJSON, &seat.Amenities)
		}

		seats = append(seats, seat)
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(seats, "Seat configuration retrieved successfully"))
}
