package api

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"github.com/Paxtiny/oscar/pkg/core"
	"github.com/Paxtiny/oscar/pkg/errs"
	"github.com/Paxtiny/oscar/pkg/log"
	"github.com/Paxtiny/oscar/pkg/models"
	"github.com/Paxtiny/oscar/pkg/services"
	"github.com/Paxtiny/oscar/pkg/settings"
)

// UserStorageApi represents user storage configuration api
type UserStorageApi struct {
	ApiUsingConfig
	storage *services.UserStorageService
	users   *services.UserService
}

// Initialize a user storage api singleton instance
var (
	UserStorageApiInstance = &UserStorageApi{
		ApiUsingConfig: ApiUsingConfig{
			container: settings.Container,
		},
		storage: services.UserStorage,
		users:   services.Users,
	}
)

// UserStorageGetHandler returns the user's current storage config
func (a *UserStorageApi) UserStorageGetHandler(c *core.WebContext) (any, *errs.Error) {
	uid := c.GetCurrentUid()

	config, err := a.storage.GetUserStorageConfig(c, uid)
	if err != nil {
		log.Errorf(c, "[user_storage.GetHandler] failed to get storage config for uid:%d, because %s", uid, err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	if config == nil {
		return &models.UserStorageConfigInfoResponse{
			StorageType:     models.USER_STORAGE_DEFAULT,
			StorageTypeName: "nicodAImus hosted",
		}, nil
	}

	return config.ToInfoResponse(), nil
}

// UserStorageUpdateHandler saves the user's storage config
func (a *UserStorageApi) UserStorageUpdateHandler(c *core.WebContext) (any, *errs.Error) {
	uid := c.GetCurrentUid()

	// Tier check: alfred+ only
	user, err := a.users.GetUserById(c, uid)
	if err != nil {
		return nil, errs.Or(err, errs.ErrUserNotFound)
	}

	tier := user.NicodaimusTier
	if tier == "" || tier == "free" {
		log.Warnf(c, "[user_storage.UpdateHandler] user uid:%d (tier: %s) attempted BYOS, requires alfred+", uid, tier)
		return nil, errs.ErrOperationFailed
	}

	var req models.UserStorageConfigUpdateRequest
	err = c.ShouldBindJSON(&req)
	if err != nil {
		return nil, errs.NewIncompleteOrIncorrectSubmissionError(err)
	}

	config := &models.UserStorageConfig{
		Uid:            uid,
		StorageType:    req.StorageType,
		S3Endpoint:     req.S3Endpoint,
		S3Bucket:       req.S3Bucket,
		S3Region:       req.S3Region,
		S3AccessKey:    req.S3AccessKey,
		S3SecretKey:    req.S3SecretKey,
		S3RootPath:     req.S3RootPath,
		S3UseSSL:       req.S3UseSSL,
		WebDAVUrl:      req.WebDAVUrl,
		WebDAVUsername: req.WebDAVUsername,
		WebDAVPassword: req.WebDAVPassword,
		WebDAVRootPath: req.WebDAVRootPath,
	}

	err = a.storage.SaveUserStorageConfig(c, config)
	if err != nil {
		log.Errorf(c, "[user_storage.UpdateHandler] failed to save storage config for uid:%d, because %s", uid, err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	log.Infof(c, "[user_storage.UpdateHandler] user uid:%d updated storage to type %d", uid, req.StorageType)

	return config.ToInfoResponse(), nil
}

// UserStorageTestHandler tests the connection to the user's configured storage backend
func (a *UserStorageApi) UserStorageTestHandler(c *core.WebContext) (any, *errs.Error) {
	uid := c.GetCurrentUid()

	config, err := a.storage.GetUserStorageConfig(c, uid)
	if err != nil || config == nil {
		return nil, errs.ErrOperationFailed
	}

	var testErr error

	switch config.StorageType {
	case models.USER_STORAGE_S3:
		testErr = testS3Connection(config)
	case models.USER_STORAGE_WEBDAV:
		testErr = testWebDAVConnection(config)
	default:
		// Default storage doesn't need testing
		return map[string]any{"success": true, "message": "Using nicodAImus hosted storage"}, nil
	}

	success := testErr == nil
	message := "Connection successful"
	if !success {
		message = fmt.Sprintf("Connection failed: %s", testErr.Error())
	}

	// Update test result in DB
	updateErr := a.storage.UpdateTestResult(c, uid, success)
	if updateErr != nil {
		log.Warnf(c, "[user_storage.TestHandler] failed to update test result for uid:%d, because %s", uid, updateErr.Error())
	}

	log.Infof(c, "[user_storage.TestHandler] user uid:%d tested storage type %d, success=%v", uid, config.StorageType, success)

	return map[string]any{"success": success, "message": message}, nil
}

// UserStorageResetHandler removes the user's custom storage config (reverts to default)
func (a *UserStorageApi) UserStorageResetHandler(c *core.WebContext) (any, *errs.Error) {
	uid := c.GetCurrentUid()

	err := a.storage.DeleteUserStorageConfig(c, uid)
	if err != nil {
		log.Errorf(c, "[user_storage.ResetHandler] failed to delete storage config for uid:%d, because %s", uid, err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	log.Infof(c, "[user_storage.ResetHandler] user uid:%d reset storage to default", uid)

	return true, nil
}

// testS3Connection tests if the S3 credentials and bucket work
func testS3Connection(config *models.UserStorageConfig) error {
	client, err := minio.New(config.S3Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(config.S3AccessKey, config.S3SecretKey, ""),
		Secure: config.S3UseSSL,
	})
	if err != nil {
		return fmt.Errorf("failed to create S3 client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	exists, err := client.BucketExists(ctx, config.S3Bucket)
	if err != nil {
		return fmt.Errorf("failed to check bucket: %w", err)
	}
	if !exists {
		return fmt.Errorf("bucket '%s' does not exist", config.S3Bucket)
	}

	return nil
}

// testWebDAVConnection tests if the WebDAV URL and credentials work
func testWebDAVConnection(config *models.UserStorageConfig) error {
	client := &http.Client{Timeout: 10 * time.Second}

	url := strings.TrimSuffix(config.WebDAVUrl, "/")
	if config.WebDAVRootPath != "" {
		url += "/" + strings.TrimPrefix(config.WebDAVRootPath, "/")
	}

	req, err := http.NewRequest("PROPFIND", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Depth", "0")
	if config.WebDAVUsername != "" {
		req.SetBasicAuth(config.WebDAVUsername, config.WebDAVPassword)
	}

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer func() {
		io.Copy(io.Discard, resp.Body)
		resp.Body.Close()
	}()

	// 207 Multi-Status is success for PROPFIND
	if resp.StatusCode != 207 && resp.StatusCode != 200 {
		return fmt.Errorf("server returned status %d", resp.StatusCode)
	}

	return nil
}
