package models

// UserStorageType represents the user's chosen storage backend
type UserStorageType byte

// User storage types
const (
	USER_STORAGE_DEFAULT    UserStorageType = 0 // Use server default (nicodAImus hosted)
	USER_STORAGE_S3         UserStorageType = 1 // S3-compatible (AWS, Backblaze, GCS, MinIO, etc.)
	USER_STORAGE_WEBDAV     UserStorageType = 2 // WebDAV (Nextcloud, ownCloud, NAS)
)

// UserStorageConfig represents per-user storage configuration stored in database
type UserStorageConfig struct {
	Uid             int64           `xorm:"PK" json:"-"`
	StorageType     UserStorageType `xorm:"TINYINT NOT NULL DEFAULT 0" json:"storageType"`

	// S3-compatible settings (encrypted with user's vault DEK)
	S3Endpoint      string `xorm:"VARCHAR(255)" json:"s3Endpoint,omitempty"`
	S3Bucket        string `xorm:"VARCHAR(255)" json:"s3Bucket,omitempty"`
	S3Region        string `xorm:"VARCHAR(64)" json:"s3Region,omitempty"`
	S3AccessKey     string `xorm:"VARCHAR(512)" json:"s3AccessKey,omitempty"`   // Encrypted
	S3SecretKey     string `xorm:"VARCHAR(512)" json:"s3SecretKey,omitempty"`   // Encrypted
	S3RootPath      string `xorm:"VARCHAR(255)" json:"s3RootPath,omitempty"`
	S3UseSSL        bool   `json:"s3UseSSL"`

	// WebDAV settings (encrypted with user's vault DEK)
	WebDAVUrl       string `xorm:"VARCHAR(512)" json:"webdavUrl,omitempty"`
	WebDAVUsername  string `xorm:"VARCHAR(255)" json:"webdavUsername,omitempty"` // Encrypted
	WebDAVPassword  string `xorm:"VARCHAR(512)" json:"webdavPassword,omitempty"` // Encrypted
	WebDAVRootPath  string `xorm:"VARCHAR(255)" json:"webdavRootPath,omitempty"`

	// Connection status
	LastTestedUnixTime int64 `json:"lastTestedUnixTime"`
	LastTestSuccess    bool  `json:"lastTestSuccess"`

	CreatedUnixTime int64 `json:"createdUnixTime"`
	UpdatedUnixTime int64 `json:"updatedUnixTime"`
}

// UserStorageConfigUpdateRequest represents parameters for updating storage config
type UserStorageConfigUpdateRequest struct {
	StorageType    UserStorageType `json:"storageType" binding:"min=0,max=2"`

	// S3
	S3Endpoint     string `json:"s3Endpoint" binding:"max=255"`
	S3Bucket       string `json:"s3Bucket" binding:"max=255"`
	S3Region       string `json:"s3Region" binding:"max=64"`
	S3AccessKey    string `json:"s3AccessKey" binding:"max=255"`
	S3SecretKey    string `json:"s3SecretKey" binding:"max=255"`
	S3RootPath     string `json:"s3RootPath" binding:"max=255"`
	S3UseSSL       bool   `json:"s3UseSSL"`

	// WebDAV
	WebDAVUrl      string `json:"webdavUrl" binding:"max=512"`
	WebDAVUsername string `json:"webdavUsername" binding:"max=255"`
	WebDAVPassword string `json:"webdavPassword" binding:"max=255"`
	WebDAVRootPath string `json:"webdavRootPath" binding:"max=255"`
}

// UserStorageConfigInfoResponse represents the response for storage config (no secrets)
type UserStorageConfigInfoResponse struct {
	StorageType        UserStorageType `json:"storageType"`
	StorageTypeName    string          `json:"storageTypeName"`

	// S3 (secrets masked)
	S3Endpoint         string `json:"s3Endpoint,omitempty"`
	S3Bucket           string `json:"s3Bucket,omitempty"`
	S3Region           string `json:"s3Region,omitempty"`
	S3AccessKeyMasked  string `json:"s3AccessKeyMasked,omitempty"`
	S3RootPath         string `json:"s3RootPath,omitempty"`
	S3UseSSL           bool   `json:"s3UseSSL"`

	// WebDAV (secrets masked)
	WebDAVUrl          string `json:"webdavUrl,omitempty"`
	WebDAVUsernameMasked string `json:"webdavUsernameMasked,omitempty"`
	WebDAVRootPath     string `json:"webdavRootPath,omitempty"`

	LastTestedUnixTime int64  `json:"lastTestedUnixTime"`
	LastTestSuccess    bool   `json:"lastTestSuccess"`
}

// ToInfoResponse converts config to a safe response (secrets masked)
func (c *UserStorageConfig) ToInfoResponse() *UserStorageConfigInfoResponse {
	resp := &UserStorageConfigInfoResponse{
		StorageType:        c.StorageType,
		LastTestedUnixTime: c.LastTestedUnixTime,
		LastTestSuccess:    c.LastTestSuccess,
	}

	switch c.StorageType {
	case USER_STORAGE_DEFAULT:
		resp.StorageTypeName = "nicodAImus hosted"
	case USER_STORAGE_S3:
		resp.StorageTypeName = "S3-compatible"
		resp.S3Endpoint = c.S3Endpoint
		resp.S3Bucket = c.S3Bucket
		resp.S3Region = c.S3Region
		resp.S3RootPath = c.S3RootPath
		resp.S3UseSSL = c.S3UseSSL
		resp.S3AccessKeyMasked = maskSecret(c.S3AccessKey, 4)
	case USER_STORAGE_WEBDAV:
		resp.StorageTypeName = "WebDAV"
		resp.WebDAVUrl = c.WebDAVUrl
		resp.WebDAVRootPath = c.WebDAVRootPath
		resp.WebDAVUsernameMasked = maskSecret(c.WebDAVUsername, 3)
	}

	return resp
}

// maskSecret returns a masked version of a secret string, showing only the last N chars
func maskSecret(s string, showLast int) string {
	if len(s) == 0 {
		return ""
	}
	if len(s) <= showLast {
		return s
	}
	masked := ""
	for i := 0; i < len(s)-showLast; i++ {
		masked += "*"
	}
	return masked + s[len(s)-showLast:]
}
