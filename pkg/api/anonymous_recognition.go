package api

import (
	"bytes"
	"encoding/json"
	"io"
	"strings"
	"sync"
	"time"

	"github.com/Paxtiny/oscar/pkg/core"
	"github.com/Paxtiny/oscar/pkg/errs"
	"github.com/Paxtiny/oscar/pkg/llm"
	"github.com/Paxtiny/oscar/pkg/llm/data"
	"github.com/Paxtiny/oscar/pkg/log"
	"github.com/Paxtiny/oscar/pkg/models"
	"github.com/Paxtiny/oscar/pkg/settings"
	"github.com/Paxtiny/oscar/pkg/templates"
	"github.com/Paxtiny/oscar/pkg/utils"
)

// AnonymousRecognitionApi represents the anonymous receipt recognition api
type AnonymousRecognitionApi struct {
	ApiUsingConfig
	rateLimiter *anonymousRateLimiter
}

// Initialize the anonymous recognition api singleton
var (
	AnonymousRecognition = &AnonymousRecognitionApi{
		ApiUsingConfig: ApiUsingConfig{
			container: settings.Container,
		},
		rateLimiter: newAnonymousRateLimiter(),
	}
)

// ipRateEntry tracks per-IP usage within a 24-hour window
type ipRateEntry struct {
	count     int
	resetTime time.Time
}

// anonymousRateLimiter provides in-memory rate limiting by IP and globally per hour
type anonymousRateLimiter struct {
	mu          sync.Mutex
	perIP       map[string]*ipRateEntry
	globalCount int
	globalReset time.Time
}

func newAnonymousRateLimiter() *anonymousRateLimiter {
	return &anonymousRateLimiter{
		perIP:       make(map[string]*ipRateEntry),
		globalReset: time.Now().Add(time.Hour),
	}
}

// check returns true if the request is allowed, false if rate limited
func (rl *anonymousRateLimiter) check(ip string, perIPLimit int, globalLimit int) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()

	// Reset global counter every hour
	if now.After(rl.globalReset) {
		rl.globalCount = 0
		rl.globalReset = now.Add(time.Hour)
	}

	if rl.globalCount >= globalLimit {
		return false
	}

	// Check per-IP limit (24h window)
	entry, exists := rl.perIP[ip]

	if !exists || now.After(entry.resetTime) {
		entry = &ipRateEntry{
			count:     0,
			resetTime: now.Add(24 * time.Hour),
		}
		rl.perIP[ip] = entry
	}

	if entry.count >= perIPLimit {
		return false
	}

	entry.count++
	rl.globalCount++

	return true
}

// Generic category names for anonymous users (no user-specific data)
var (
	anonymousExpenseCategories  = []string{"Food & Dining", "Groceries", "Transport", "Shopping", "Entertainment", "Health", "Housing", "Utilities", "Education", "Travel", "Other"}
	anonymousIncomeCategories   = []string{"Salary", "Freelance", "Investment", "Gift", "Refund", "Other"}
	anonymousTransferCategories = []string{"Transfer"}
)

// AnonymousRecognizeReceiptHandler handles anonymous receipt image recognition
func (a *AnonymousRecognitionApi) AnonymousRecognizeReceiptHandler(c *core.WebContext) (any, *errs.Error) {
	config := a.CurrentConfig()

	if !config.EnableAnonymousReceiptRecognition {
		return nil, errs.ErrAnonymousRecognitionNotEnabled
	}

	if config.ReceiptImageRecognitionLLMConfig == nil || config.ReceiptImageRecognitionLLMConfig.LLMProvider == "" {
		return nil, errs.ErrLargeLanguageModelProviderNotEnabled
	}

	// Rate limit check
	clientIP := c.ClientIP()

	if !a.rateLimiter.check(clientIP, config.AnonymousReceiptRecognitionPerIPLimit, config.AnonymousReceiptRecognitionGlobalLimit) {
		log.Warnf(c, "[anonymous_recognition.AnonymousRecognizeReceiptHandler] rate limited for ip \"%s\"", clientIP)
		return nil, errs.ErrAnonymousRecognitionRateLimited
	}

	clientTimezone, err := c.GetClientTimezone()

	if err != nil {
		log.Warnf(c, "[anonymous_recognition.AnonymousRecognizeReceiptHandler] cannot get client timezone, because %s", err.Error())
		return nil, errs.ErrClientTimezoneOffsetInvalid
	}

	// Parse multipart form
	form, err := c.MultipartForm()

	if err != nil {
		log.Errorf(c, "[anonymous_recognition.AnonymousRecognizeReceiptHandler] failed to get multi-part form data, because %s", err.Error())
		return nil, errs.ErrParameterInvalid
	}

	imageFiles := form.File["image"]

	if len(imageFiles) < 1 {
		log.Warnf(c, "[anonymous_recognition.AnonymousRecognizeReceiptHandler] there is no image in request")
		return nil, errs.ErrNoAIRecognitionImage
	}

	if imageFiles[0].Size < 1 {
		log.Warnf(c, "[anonymous_recognition.AnonymousRecognizeReceiptHandler] the size of image in request is zero")
		return nil, errs.ErrAIRecognitionImageIsEmpty
	}

	if imageFiles[0].Size > int64(config.MaxAIRecognitionPictureFileSize) {
		log.Warnf(c, "[anonymous_recognition.AnonymousRecognizeReceiptHandler] the upload file size \"%d\" exceeds the maximum size \"%d\"", imageFiles[0].Size, config.MaxAIRecognitionPictureFileSize)
		return nil, errs.ErrExceedMaxAIRecognitionImageFileSize
	}

	fileExtension := utils.GetFileNameExtension(imageFiles[0].Filename)
	contentType := utils.GetImageContentType(fileExtension)

	if contentType == "" {
		log.Warnf(c, "[anonymous_recognition.AnonymousRecognizeReceiptHandler] the file extension \"%s\" is not supported", fileExtension)
		return nil, errs.ErrImageTypeNotSupported
	}

	imageFile, err := imageFiles[0].Open()

	if err != nil {
		log.Errorf(c, "[anonymous_recognition.AnonymousRecognizeReceiptHandler] failed to open image file, because %s", err.Error())
		return nil, errs.ErrOperationFailed
	}

	defer imageFile.Close()

	imageData, err := io.ReadAll(imageFile)

	if err != nil {
		log.Errorf(c, "[anonymous_recognition.AnonymousRecognizeReceiptHandler] failed to read image file, because %s", err.Error())
		return nil, errs.ErrOperationFailed
	}

	// Build prompt with generic categories (no user-specific data)
	systemPrompt, err := templates.GetTemplate(templates.SYSTEM_PROMPT_RECEIPT_IMAGE_RECOGNITION)

	if err != nil {
		log.Errorf(c, "[anonymous_recognition.AnonymousRecognizeReceiptHandler] failed to get system prompt template, because %s", err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	systemPromptParams := map[string]any{
		"CurrentDateTime":          utils.FormatUnixTimeToLongDateTime(time.Now().Unix(), clientTimezone),
		"AllExpenseCategoryNames":  strings.Join(anonymousExpenseCategories, "\n"),
		"AllIncomeCategoryNames":   strings.Join(anonymousIncomeCategories, "\n"),
		"AllTransferCategoryNames": strings.Join(anonymousTransferCategories, "\n"),
		"AllAccountNames":          "",
		"AllTagNames":              "",
	}

	var bodyBuffer bytes.Buffer
	err = systemPrompt.Execute(&bodyBuffer, systemPromptParams)

	if err != nil {
		log.Errorf(c, "[anonymous_recognition.AnonymousRecognizeReceiptHandler] failed to execute system prompt template, because %s", err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	llmRequest := &data.LargeLanguageModelRequest{
		Stream:                false,
		SystemPrompt:          strings.ReplaceAll(bodyBuffer.String(), "\r\n", "\n"),
		UserPrompt:            imageData,
		UserPromptType:        data.LARGE_LANGUAGE_MODEL_REQUEST_PROMPT_TYPE_IMAGE_URL,
		UserPromptContentType: contentType,
	}

	// uid=0 for anonymous requests
	llmResponse, err := llm.Container.GetJsonResponseByReceiptImageRecognitionModel(c, 0, config, llmRequest)

	if err != nil {
		log.Errorf(c, "[anonymous_recognition.AnonymousRecognizeReceiptHandler] failed to get llm response, because %s", err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	if llmResponse == nil || len(llmResponse.Content) == 0 || strings.HasPrefix(llmResponse.Content, "{}") {
		return nil, errs.ErrNoTransactionInformationInImage
	}

	var result *models.RecognizedReceiptImageResult

	if err := json.Unmarshal([]byte(llmResponse.Content), &result); err != nil {
		log.Errorf(c, "[anonymous_recognition.AnonymousRecognizeReceiptHandler] failed to unmarshal llm response \"%s\", because %s", llmResponse.Content, err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	return a.parseAnonymousResult(c, clientTimezone, result)
}

// parseAnonymousResult converts the LLM result to a response without user-specific lookups
func (a *AnonymousRecognitionApi) parseAnonymousResult(c *core.WebContext, clientTimezone *time.Location, recognizedResult *models.RecognizedReceiptImageResult) (*models.RecognizedReceiptImageResponse, *errs.Error) {
	if recognizedResult == nil {
		log.Errorf(c, "[anonymous_recognition.parseAnonymousResult] recognized result is null")
		return nil, errs.ErrNoTransactionInformationInImage
	}

	response := &models.RecognizedReceiptImageResponse{
		Type: models.TRANSACTION_TYPE_EXPENSE,
	}

	if recognizedResult.Type == "income" {
		response.Type = models.TRANSACTION_TYPE_INCOME
	} else if recognizedResult.Type == "expense" {
		response.Type = models.TRANSACTION_TYPE_EXPENSE
	} else if recognizedResult.Type == "transfer" {
		response.Type = models.TRANSACTION_TYPE_TRANSFER
	} else if len(recognizedResult.Type) == 0 {
		return nil, errs.ErrNoTransactionInformationInImage
	} else {
		log.Errorf(c, "[anonymous_recognition.parseAnonymousResult] recognized transaction type \"%s\" is invalid", recognizedResult.Type)
		return nil, errs.ErrOperationFailed
	}

	if len(recognizedResult.Time) > 0 {
		longDateTime := getLongDateTime(recognizedResult.Time)
		timestamp, err := utils.ParseFromLongDateTimeInTimeZone(longDateTime, clientTimezone)

		if err != nil {
			log.Warnf(c, "[anonymous_recognition.parseAnonymousResult] recognized time \"%s\" is invalid", recognizedResult.Time)
		} else {
			response.Time = timestamp.Unix()
		}
	}

	if len(recognizedResult.Amount) > 0 {
		amount, err := utils.ParseAmount(recognizedResult.Amount)

		if err != nil {
			log.Errorf(c, "[anonymous_recognition.parseAnonymousResult] recognized amount \"%s\" is invalid", recognizedResult.Amount)
			return nil, errs.ErrOperationFailed
		}

		response.SourceAmount = amount
	}

	if len(recognizedResult.Description) > 0 {
		response.Comment = recognizedResult.Description
	}

	// CategoryId, AccountId, TagIds are left as zero/empty - anonymous users have no server-side entities
	return response, nil
}

// getLongDateTime normalizes date/time strings to YYYY-MM-DD HH:mm:ss format
func getLongDateTime(dateTime string) string {
	if utils.IsValidLongDateTimeFormat(dateTime) {
		return dateTime
	}

	if utils.IsValidLongDateTimeWithoutSecondFormat(dateTime) {
		return dateTime + ":00"
	}

	if utils.IsValidLongDateFormat(dateTime) {
		return dateTime + " 00:00:00"
	}

	return dateTime
}
