package services

import (
	"time"

	"xorm.io/xorm"

	"github.com/Paxtiny/oscar/pkg/core"
	"github.com/Paxtiny/oscar/pkg/datastore"
	"github.com/Paxtiny/oscar/pkg/errs"
	"github.com/Paxtiny/oscar/pkg/models"
)

// UserStorageService represents user storage configuration service
type UserStorageService struct {
	ServiceUsingDB
}

// Initialize a user storage service singleton instance
var (
	UserStorage = &UserStorageService{
		ServiceUsingDB: ServiceUsingDB{
			container: datastore.Container,
		},
	}
)

// GetUserStorageConfig returns the storage config for a user, or nil if using default
func (s *UserStorageService) GetUserStorageConfig(c core.Context, uid int64) (*models.UserStorageConfig, error) {
	config := &models.UserStorageConfig{}
	has, err := s.UserDB().NewSession(c).Where("uid=?", uid).Get(config)

	if err != nil {
		return nil, err
	} else if !has {
		return nil, nil // User uses server default
	}

	return config, nil
}

// SaveUserStorageConfig creates or updates the user's storage config
func (s *UserStorageService) SaveUserStorageConfig(c core.Context, config *models.UserStorageConfig) error {
	now := time.Now().Unix()

	return s.UserDB().DoTransaction(c, func(sess *xorm.Session) error {
		existing := &models.UserStorageConfig{}
		has, err := sess.Where("uid=?", config.Uid).Get(existing)

		if err != nil {
			return err
		}

		if has {
			config.UpdatedUnixTime = now
			_, err = sess.Where("uid=?", config.Uid).AllCols().Update(config)
		} else {
			config.CreatedUnixTime = now
			config.UpdatedUnixTime = now
			_, err = sess.Insert(config)
		}

		return err
	})
}

// UpdateTestResult updates the connection test result
func (s *UserStorageService) UpdateTestResult(c core.Context, uid int64, success bool) error {
	return s.UserDB().DoTransaction(c, func(sess *xorm.Session) error {
		_, err := sess.Where("uid=?", uid).Cols("last_tested_unix_time", "last_test_success").
			Update(&models.UserStorageConfig{
				LastTestedUnixTime: time.Now().Unix(),
				LastTestSuccess:    success,
			})
		return err
	})
}

// DeleteUserStorageConfig removes the user's custom storage config (reverts to default)
func (s *UserStorageService) DeleteUserStorageConfig(c core.Context, uid int64) error {
	return s.UserDB().DoTransaction(c, func(sess *xorm.Session) error {
		_, err := sess.Where("uid=?", uid).Delete(&models.UserStorageConfig{})
		return err
	})
}

// ErrStorageConfigNotFound is returned when user has no custom storage config
var ErrStorageConfigNotFound = errs.ErrOperationFailed
