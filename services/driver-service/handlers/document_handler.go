package handlers

import (
	"bytes"
	"context"
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

type DocumentHandler struct {
	db *pgxpool.Pool
}

func NewDocumentHandler(db *pgxpool.Pool) *DocumentHandler {
	return &DocumentHandler{db: db}
}

// getOrCreateDriverID is a shared helper to get or create driver profile
func getOrCreateDriverID(ctx context.Context, db *pgxpool.Pool, userID string) (uuid.UUID, error) {
	var driverID uuid.UUID
	err := db.QueryRow(ctx, `SELECT id FROM driver_profiles WHERE user_id = $1`, userID).Scan(&driverID)

	if err != nil {
		// If profile doesn't exist, create one
		newID := uuid.New()
		_, createErr := db.Exec(ctx,
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

// GetDocuments retrieves all documents for a driver
func (h *DocumentHandler) GetDocuments(c *gin.Context) {
	userID := c.GetString("userId")

	// Get driver ID
	var driverID uuid.UUID
	err := h.db.QueryRow(context.Background(),
		`SELECT id FROM driver_profiles WHERE user_id = $1`,
		userID,
	).Scan(&driverID)

	if err != nil {
		log.Printf("Error getting driver ID: %v", err)
		c.JSON(http.StatusNotFound, utils.ErrorResponse("NOT_FOUND", "Driver profile not found", nil))
		return
	}

	rows, err := h.db.Query(context.Background(),
		`SELECT id, driver_id, document_type, document_url, verification_status, 
		 verified_at, expires_at, created_at
		 FROM driver_documents WHERE driver_id = $1 ORDER BY created_at DESC`,
		driverID,
	)

	if err != nil {
		log.Printf("Error getting documents: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to get documents", nil))
		return
	}
	defer rows.Close()

	var documents []models.Document
	for rows.Next() {
		var doc models.Document
		err := rows.Scan(&doc.ID, &doc.DriverID, &doc.DocumentType, &doc.DocumentURL,
			&doc.VerificationStatus, &doc.VerifiedAt, &doc.ExpiresAt, &doc.CreatedAt)

		if err != nil {
			log.Printf("Error scanning document: %v", err)
			continue
		}
		documents = append(documents, doc)
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(documents, "Documents retrieved successfully"))
}

// UploadDocument uploads a document via multipart upload
func (h *DocumentHandler) UploadDocument(c *gin.Context) {
	userID := c.GetString("userId")

	// Get driver ID (with auto-create)
	driverID, err := getOrCreateDriverID(c.Request.Context(), h.db, userID)
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
	documentType := c.PostForm("documentType")
	expiresAt := c.PostForm("expiresAt")

	if documentType == "" {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("VALIDATION_ERROR", "Document type is required", nil))
		return
	}

	// Get uploaded file
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, utils.ErrorResponse("VALIDATION_ERROR", "File is required", nil))
		return
	}

	// Upload to storage service
	documentURL, err := uploadDocumentToStorage(file, documentType, driverID.String())
	if err != nil {
		log.Printf("Error uploading document to storage: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("UPLOAD_ERROR", "Failed to upload document", err.Error()))
		return
	}

	// Check if document type already exists
	var existingID uuid.UUID
	err = h.db.QueryRow(context.Background(),
		`SELECT id FROM driver_documents WHERE driver_id = $1 AND document_type = $2`,
		driverID, documentType,
	).Scan(&existingID)

	// Parse expiry date if provided
	var expiryTime *string
	if expiresAt != "" {
		expiryTime = &expiresAt
	}

	if err == nil {
		// Update existing document
		_, err = h.db.Exec(context.Background(),
			`UPDATE driver_documents SET 
			 document_url = $1,
			 expires_at = $2,
			 verification_status = 'pending',
			 verified_at = NULL
			 WHERE id = $3`,
			documentURL, expiryTime, existingID,
		)

		if err != nil {
			log.Printf("Error updating document: %v", err)
			c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to update document", nil))
			return
		}

		c.JSON(http.StatusOK, utils.SuccessResponse(gin.H{"id": existingID}, "Document updated successfully"))
		return
	}

	// Create new document
	documentID := uuid.New()
	_, err = h.db.Exec(context.Background(),
		`INSERT INTO driver_documents (id, driver_id, document_type, document_url, expires_at, verification_status)
		 VALUES ($1, $2, $3, $4, $5, 'pending')`,
		documentID, driverID, documentType, documentURL, expiryTime,
	)

	if err != nil {
		log.Printf("Error saving document: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to save document", nil))
		return
	}

	c.JSON(http.StatusCreated, utils.SuccessResponse(gin.H{"id": documentID}, "Document uploaded successfully"))
}

// Helper function to upload document to storage service
func uploadDocumentToStorage(file *multipart.FileHeader, documentType string, driverID string) (string, error) {
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
	writer.WriteField("driverId", driverID)

	err = writer.Close()
	if err != nil {
		return "", err
	}

	// Send request to storage service
	req, err := http.NewRequest("POST", storageURL+"/api/v1/storage/upload/driver-document", body)
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

// DeleteDocument deletes a document
func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
	documentID := c.Param("id")

	_, err := h.db.Exec(context.Background(),
		`DELETE FROM driver_documents WHERE id = $1`,
		documentID,
	)

	if err != nil {
		log.Printf("Error deleting document: %v", err)
		c.JSON(http.StatusInternalServerError, utils.ErrorResponse("DATABASE_ERROR", "Failed to delete document", nil))
		return
	}

	c.JSON(http.StatusOK, utils.SuccessResponse(nil, "Document deleted successfully"))
}
