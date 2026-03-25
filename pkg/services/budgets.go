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

// BudgetService represents budget service
type BudgetService struct {
	ServiceUsingDB
	ServiceUsingUuid
}

// Initialize a budget service singleton instance
var (
	Budgets = &BudgetService{
		ServiceUsingDB: ServiceUsingDB{
			container: datastore.Container,
		},
		ServiceUsingUuid: ServiceUsingUuid{
			container: uuid.Container,
		},
	}
)

// GetBudgetsByUid returns all budgets for a user
func (s *BudgetService) GetBudgetsByUid(c core.Context, uid int64) ([]*models.Budget, error) {
	var budgets []*models.Budget
	err := s.UserDB().NewSession(c).Where("uid=? AND deleted=?", uid, false).Find(&budgets)

	if err != nil {
		return nil, err
	}

	return budgets, nil
}

// GetBudgetByBudgetId returns a single budget by ID
func (s *BudgetService) GetBudgetByBudgetId(c core.Context, uid int64, budgetId int64) (*models.Budget, error) {
	budget := &models.Budget{}
	has, err := s.UserDB().NewSession(c).Where("budget_id=? AND uid=? AND deleted=?", budgetId, uid, false).Get(budget)

	if err != nil {
		return nil, err
	} else if !has {
		return nil, errs.ErrBudgetNotFound
	}

	return budget, nil
}

// CreateBudget saves a new budget to the database
func (s *BudgetService) CreateBudget(c core.Context, budget *models.Budget) error {
	budget.BudgetId = s.GenerateUuid(uuid.UUID_TYPE_BUDGET)

	if budget.BudgetId < 1 {
		return errs.ErrSystemIsBusy
	}

	budget.Deleted = false
	budget.CreatedUnixTime = time.Now().Unix()
	budget.UpdatedUnixTime = time.Now().Unix()

	return s.UserDB().DoTransaction(c, func(sess *xorm.Session) error {
		_, err := sess.Insert(budget)
		return err
	})
}

// ModifyBudget updates an existing budget
func (s *BudgetService) ModifyBudget(c core.Context, budget *models.Budget) error {
	budget.UpdatedUnixTime = time.Now().Unix()

	return s.UserDB().DoTransaction(c, func(sess *xorm.Session) error {
		_, err := sess.ID(budget.BudgetId).Cols(
			"name", "category_id", "account_id", "amount",
			"period", "rollover", "alert_percent", "updated_unix_time",
		).Update(budget)
		return err
	})
}

// DeleteBudget soft-deletes a budget
func (s *BudgetService) DeleteBudget(c core.Context, uid int64, budgetId int64) error {
	now := time.Now().Unix()

	return s.UserDB().DoTransaction(c, func(sess *xorm.Session) error {
		_, err := sess.Where("budget_id=? AND uid=? AND deleted=?", budgetId, uid, false).
			Cols("deleted", "deleted_unix_time").
			Update(&models.Budget{Deleted: true, DeletedUnixTime: now})
		return err
	})
}
