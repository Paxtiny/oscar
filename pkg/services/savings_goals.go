package services

import (
	"time"

	"xorm.io/xorm"

	"github.com/Paxtiny/oscar/pkg/core"
	"github.com/Paxtiny/oscar/pkg/datastore"
	"github.com/Paxtiny/oscar/pkg/errs"
	"github.com/Paxtiny/oscar/pkg/models"
	"github.com/Paxtiny/oscar/pkg/uuid"
)

// SavingsGoalService represents savings goal service
type SavingsGoalService struct {
	ServiceUsingDB
	ServiceUsingUuid
}

// Initialize a savings goal service singleton instance
var (
	SavingsGoals = &SavingsGoalService{
		ServiceUsingDB: ServiceUsingDB{
			container: datastore.Container,
		},
		ServiceUsingUuid: ServiceUsingUuid{
			container: uuid.Container,
		},
	}
)

// GetSavingsGoalsByUid returns all savings goals for a user
func (s *SavingsGoalService) GetSavingsGoalsByUid(c core.Context, uid int64) ([]*models.SavingsGoal, error) {
	var goals []*models.SavingsGoal
	err := s.UserDB().NewSession(c).Where("uid=? AND deleted=?", uid, false).Find(&goals)

	if err != nil {
		return nil, err
	}

	return goals, nil
}

// GetSavingsGoalById returns a single savings goal by ID
func (s *SavingsGoalService) GetSavingsGoalById(c core.Context, uid int64, goalId int64) (*models.SavingsGoal, error) {
	goal := &models.SavingsGoal{}
	has, err := s.UserDB().NewSession(c).Where("goal_id=? AND uid=? AND deleted=?", goalId, uid, false).Get(goal)

	if err != nil {
		return nil, err
	} else if !has {
		return nil, errs.ErrSavingsGoalNotFound
	}

	return goal, nil
}

// CreateSavingsGoal saves a new savings goal to the database
func (s *SavingsGoalService) CreateSavingsGoal(c core.Context, goal *models.SavingsGoal) error {
	goal.GoalId = s.GenerateUuid(uuid.UUID_TYPE_SAVINGS_GOAL)

	if goal.GoalId < 1 {
		return errs.ErrSystemIsBusy
	}

	goal.Deleted = false
	goal.CreatedUnixTime = time.Now().Unix()
	goal.UpdatedUnixTime = time.Now().Unix()

	return s.UserDB().DoTransaction(c, func(sess *xorm.Session) error {
		_, err := sess.Insert(goal)
		return err
	})
}

// ModifySavingsGoal updates an existing savings goal
func (s *SavingsGoalService) ModifySavingsGoal(c core.Context, goal *models.SavingsGoal) error {
	goal.UpdatedUnixTime = time.Now().Unix()

	return s.UserDB().DoTransaction(c, func(sess *xorm.Session) error {
		_, err := sess.ID(goal.GoalId).Cols(
			"name", "target_amount", "target_date", "icon", "color", "updated_unix_time",
		).Update(goal)
		return err
	})
}

// ContributeToSavingsGoal adds funds to a savings goal
func (s *SavingsGoalService) ContributeToSavingsGoal(c core.Context, uid int64, goalId int64, amount int64) error {
	goal, err := s.GetSavingsGoalById(c, uid, goalId)
	if err != nil {
		return err
	}

	goal.SavedAmount += amount
	goal.UpdatedUnixTime = time.Now().Unix()

	return s.UserDB().DoTransaction(c, func(sess *xorm.Session) error {
		_, err := sess.ID(goal.GoalId).Cols("saved_amount", "updated_unix_time").Update(goal)
		return err
	})
}

// DeleteSavingsGoal soft-deletes a savings goal
func (s *SavingsGoalService) DeleteSavingsGoal(c core.Context, uid int64, goalId int64) error {
	now := time.Now().Unix()

	return s.UserDB().DoTransaction(c, func(sess *xorm.Session) error {
		_, err := sess.Where("goal_id=? AND uid=? AND deleted=?", goalId, uid, false).
			Cols("deleted", "deleted_unix_time").
			Update(&models.SavingsGoal{Deleted: true, DeletedUnixTime: now})
		return err
	})
}
