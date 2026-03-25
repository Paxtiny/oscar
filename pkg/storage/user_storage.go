package storage

import (
	"sync"

	"github.com/Paxtiny/oscar/pkg/core"
	"github.com/Paxtiny/oscar/pkg/models"
	"github.com/Paxtiny/oscar/pkg/settings"
)

// UserStorageResolver resolves the correct ObjectStorage backend for a user.
// Users on default storage use the server's configured backend.
// Users with BYOS config get a per-user backend instance (cached).
type UserStorageResolver struct {
	defaultStorage ObjectStorage
	cache          sync.Map // map[int64]ObjectStorage - keyed by uid
}

// NewUserStorageResolver creates a resolver with the given default backend
func NewUserStorageResolver(defaultStorage ObjectStorage) *UserStorageResolver {
	return &UserStorageResolver{
		defaultStorage: defaultStorage,
	}
}

// Resolve returns the ObjectStorage for a user, creating it from their config if needed.
// If the user has no custom config or config is default, returns the server default.
func (r *UserStorageResolver) Resolve(ctx core.Context, uid int64, userConfig *models.UserStorageConfig, pathPrefix string) ObjectStorage {
	if userConfig == nil || userConfig.StorageType == models.USER_STORAGE_DEFAULT {
		return r.defaultStorage
	}

	// Check cache
	if cached, ok := r.cache.Load(uid); ok {
		return cached.(ObjectStorage)
	}

	// Create backend from user config
	storage, err := newObjectStorageFromUserConfig(userConfig, pathPrefix)
	if err != nil {
		// Fall back to default on error
		return r.defaultStorage
	}

	// Cache it
	r.cache.Store(uid, storage)
	return storage
}

// InvalidateCache removes a user's cached backend (call after config change)
func (r *UserStorageResolver) InvalidateCache(uid int64) {
	r.cache.Delete(uid)
}

// newObjectStorageFromUserConfig creates an ObjectStorage from per-user config
func newObjectStorageFromUserConfig(config *models.UserStorageConfig, pathPrefix string) (ObjectStorage, error) {
	switch config.StorageType {
	case models.USER_STORAGE_S3:
		return NewMinIOObjectStorage(&settings.Config{
			StorageType: settings.MinIOStorageType,
			MinIOConfig: &settings.MinIOConfig{
				Endpoint:       config.S3Endpoint,
				Location:       config.S3Region,
				AccessKeyID:    config.S3AccessKey,
				SecretAccessKey: config.S3SecretKey,
				Bucket:         config.S3Bucket,
				RootPath:       config.S3RootPath,
				UseSSL:         config.S3UseSSL,
			},
		}, pathPrefix)
	case models.USER_STORAGE_WEBDAV:
		return NewWebDAVObjectStorage(&settings.Config{
			StorageType: settings.WebDAVStorageType,
			WebDAVConfig: &settings.WebDAVConfig{
				Url:      config.WebDAVUrl,
				Username: config.WebDAVUsername,
				Password: config.WebDAVPassword,
				RootPath: config.WebDAVRootPath,
			},
		}, pathPrefix)
	default:
		return nil, nil
	}
}
