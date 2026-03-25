package api

import (
	"time"

	"github.com/Paxtiny/oscar/pkg/core"
	"github.com/Paxtiny/oscar/pkg/errs"
	"github.com/Paxtiny/oscar/pkg/log"
	"github.com/Paxtiny/oscar/pkg/models"
	"github.com/Paxtiny/oscar/pkg/services"
	"github.com/Paxtiny/oscar/pkg/settings"
)

// BudgetsApi represents budget api
type BudgetsApi struct {
	ApiUsingConfig
	budgets      *services.BudgetService
	transactions *services.TransactionService
}

// Initialize a budget api singleton instance
var (
	BudgetsApiInstance = &BudgetsApi{
		ApiUsingConfig: ApiUsingConfig{
			container: settings.Container,
		},
		budgets:      services.Budgets,
		transactions: services.Transactions,
	}
)

// BudgetListHandler returns all budgets for current user with spent amounts
func (a *BudgetsApi) BudgetListHandler(c *core.WebContext) (any, *errs.Error) {
	uid := c.GetCurrentUid()

	budgets, err := a.budgets.GetBudgetsByUid(c, uid)
	if err != nil {
		log.Errorf(c, "[budgets.BudgetListHandler] failed to get budgets for user \"uid:%d\", because %s", uid, err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	budgetResps := make([]*models.BudgetInfoResponse, len(budgets))
	for i, budget := range budgets {
		minTime, maxTime := getCurrentPeriodBounds(budget.Period)
		spent, spentErr := a.transactions.GetExpenseAmountSumByCategory(c, uid, budget.CategoryId, budget.AccountId, minTime, maxTime)
		if spentErr != nil {
			log.Warnf(c, "[budgets.BudgetListHandler] failed to get spent amount for budget \"%d\", because %s", budget.BudgetId, spentErr.Error())
			spent = 0
		}
		budgetResps[i] = budget.ToBudgetInfoResponse(spent)
	}

	return budgetResps, nil
}

// BudgetGetHandler returns a single budget by ID
func (a *BudgetsApi) BudgetGetHandler(c *core.WebContext) (any, *errs.Error) {
	var budgetGetReq models.BudgetDeleteRequest // reuse for ID-only request
	err := c.ShouldBindQuery(&budgetGetReq)

	if err != nil {
		return nil, errs.NewIncompleteOrIncorrectSubmissionError(err)
	}

	uid := c.GetCurrentUid()
	budget, err := a.budgets.GetBudgetByBudgetId(c, uid, budgetGetReq.Id)

	if err != nil {
		log.Warnf(c, "[budgets.BudgetGetHandler] failed to get budget \"id:%d\" for user \"uid:%d\", because %s", budgetGetReq.Id, uid, err.Error())
		return nil, errs.Or(err, errs.ErrBudgetNotFound)
	}

	// TODO: calculate spent amount
	return budget.ToBudgetInfoResponse(0), nil
}

// BudgetCreateHandler creates a new budget for current user
func (a *BudgetsApi) BudgetCreateHandler(c *core.WebContext) (any, *errs.Error) {
	var budgetCreateReq models.BudgetCreateRequest
	err := c.ShouldBindJSON(&budgetCreateReq)

	if err != nil {
		log.Warnf(c, "[budgets.BudgetCreateHandler] parse request failed, because %s", err.Error())
		return nil, errs.NewIncompleteOrIncorrectSubmissionError(err)
	}

	uid := c.GetCurrentUid()

	budget := &models.Budget{
		Uid:          uid,
		Name:         budgetCreateReq.Name,
		CategoryId:   budgetCreateReq.CategoryId,
		AccountId:    budgetCreateReq.AccountId,
		Amount:       budgetCreateReq.Amount,
		Currency:     budgetCreateReq.Currency,
		Period:       budgetCreateReq.Period,
		StartDate:    budgetCreateReq.StartDate,
		Rollover:     budgetCreateReq.Rollover,
		AlertPercent: budgetCreateReq.AlertPercent,
	}

	if budget.AlertPercent == 0 {
		budget.AlertPercent = 80
	}

	err = a.budgets.CreateBudget(c, budget)

	if err != nil {
		log.Errorf(c, "[budgets.BudgetCreateHandler] failed to create budget for user \"uid:%d\", because %s", uid, err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	log.Infof(c, "[budgets.BudgetCreateHandler] user \"uid:%d\" has created budget \"%s\" with id \"%d\"", uid, budget.Name, budget.BudgetId)

	return budget.ToBudgetInfoResponse(0), nil
}

// BudgetModifyHandler updates an existing budget
func (a *BudgetsApi) BudgetModifyHandler(c *core.WebContext) (any, *errs.Error) {
	var budgetModifyReq models.BudgetModifyRequest
	err := c.ShouldBindJSON(&budgetModifyReq)

	if err != nil {
		log.Warnf(c, "[budgets.BudgetModifyHandler] parse request failed, because %s", err.Error())
		return nil, errs.NewIncompleteOrIncorrectSubmissionError(err)
	}

	uid := c.GetCurrentUid()

	budget, err := a.budgets.GetBudgetByBudgetId(c, uid, budgetModifyReq.Id)
	if err != nil {
		return nil, errs.Or(err, errs.ErrBudgetNotFound)
	}

	budget.Name = budgetModifyReq.Name
	budget.CategoryId = budgetModifyReq.CategoryId
	budget.AccountId = budgetModifyReq.AccountId
	budget.Amount = budgetModifyReq.Amount
	budget.Period = budgetModifyReq.Period
	budget.Rollover = budgetModifyReq.Rollover
	budget.AlertPercent = budgetModifyReq.AlertPercent

	err = a.budgets.ModifyBudget(c, budget)

	if err != nil {
		log.Errorf(c, "[budgets.BudgetModifyHandler] failed to modify budget \"%d\" for user \"uid:%d\", because %s", budget.BudgetId, uid, err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	log.Infof(c, "[budgets.BudgetModifyHandler] user \"uid:%d\" has modified budget \"%d\"", uid, budget.BudgetId)

	return budget.ToBudgetInfoResponse(0), nil
}

// BudgetDeleteHandler soft-deletes a budget
func (a *BudgetsApi) BudgetDeleteHandler(c *core.WebContext) (any, *errs.Error) {
	var budgetDeleteReq models.BudgetDeleteRequest
	err := c.ShouldBindJSON(&budgetDeleteReq)

	if err != nil {
		log.Warnf(c, "[budgets.BudgetDeleteHandler] parse request failed, because %s", err.Error())
		return nil, errs.NewIncompleteOrIncorrectSubmissionError(err)
	}

	uid := c.GetCurrentUid()

	err = a.budgets.DeleteBudget(c, uid, budgetDeleteReq.Id)

	if err != nil {
		log.Errorf(c, "[budgets.BudgetDeleteHandler] failed to delete budget \"%d\" for user \"uid:%d\", because %s", budgetDeleteReq.Id, uid, err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	log.Infof(c, "[budgets.BudgetDeleteHandler] user \"uid:%d\" has deleted budget \"%d\"", uid, budgetDeleteReq.Id)

	return true, nil
}

// getCurrentPeriodBounds returns the unix timestamps for the start and end of the current budget period
func getCurrentPeriodBounds(period models.BudgetPeriod) (int64, int64) {
	now := time.Now()
	var start, end time.Time

	switch period {
	case models.BUDGET_PERIOD_WEEKLY:
		weekday := int(now.Weekday())
		if weekday == 0 {
			weekday = 7 // Sunday = 7 (ISO)
		}
		start = time.Date(now.Year(), now.Month(), now.Day()-weekday+1, 0, 0, 0, 0, now.Location())
		end = start.AddDate(0, 0, 7).Add(-time.Second)
	case models.BUDGET_PERIOD_MONTHLY:
		start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		end = start.AddDate(0, 1, 0).Add(-time.Second)
	case models.BUDGET_PERIOD_YEARLY:
		start = time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
		end = start.AddDate(1, 0, 0).Add(-time.Second)
	default:
		start = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
		end = start.AddDate(0, 1, 0).Add(-time.Second)
	}

	return start.Unix(), end.Unix()
}
