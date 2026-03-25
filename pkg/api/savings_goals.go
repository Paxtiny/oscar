package api

import (
	"math"
	"time"

	"github.com/Paxtiny/oscar/pkg/core"
	"github.com/Paxtiny/oscar/pkg/errs"
	"github.com/Paxtiny/oscar/pkg/log"
	"github.com/Paxtiny/oscar/pkg/models"
	"github.com/Paxtiny/oscar/pkg/services"
	"github.com/Paxtiny/oscar/pkg/settings"
)

// SavingsGoalsApi represents savings goals api
type SavingsGoalsApi struct {
	ApiUsingConfig
	goals *services.SavingsGoalService
}

// Initialize a savings goals api singleton instance
var (
	SavingsGoalsApiInstance = &SavingsGoalsApi{
		ApiUsingConfig: ApiUsingConfig{
			container: settings.Container,
		},
		goals: services.SavingsGoals,
	}
)

// SavingsGoalListHandler returns all savings goals for current user
func (a *SavingsGoalsApi) SavingsGoalListHandler(c *core.WebContext) (any, *errs.Error) {
	uid := c.GetCurrentUid()

	goals, err := a.goals.GetSavingsGoalsByUid(c, uid)
	if err != nil {
		log.Errorf(c, "[savings_goals.ListHandler] failed to get goals for user \"uid:%d\", because %s", uid, err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	goalResps := make([]*models.SavingsGoalInfoResponse, len(goals))
	for i, goal := range goals {
		monthlyRequired := calculateMonthlyRequired(goal)
		goalResps[i] = goal.ToSavingsGoalInfoResponse(monthlyRequired)
	}

	return goalResps, nil
}

// SavingsGoalCreateHandler creates a new savings goal
func (a *SavingsGoalsApi) SavingsGoalCreateHandler(c *core.WebContext) (any, *errs.Error) {
	var req models.SavingsGoalCreateRequest
	err := c.ShouldBindJSON(&req)

	if err != nil {
		log.Warnf(c, "[savings_goals.CreateHandler] parse request failed, because %s", err.Error())
		return nil, errs.NewIncompleteOrIncorrectSubmissionError(err)
	}

	uid := c.GetCurrentUid()

	goal := &models.SavingsGoal{
		Uid:          uid,
		Name:         req.Name,
		TargetAmount: req.TargetAmount,
		Currency:     req.Currency,
		TargetDate:   req.TargetDate,
		SavedAmount:  0,
		Icon:         req.Icon,
		Color:        req.Color,
	}

	err = a.goals.CreateSavingsGoal(c, goal)
	if err != nil {
		log.Errorf(c, "[savings_goals.CreateHandler] failed to create goal for user \"uid:%d\", because %s", uid, err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	log.Infof(c, "[savings_goals.CreateHandler] user \"uid:%d\" created savings goal \"%s\" (id: %d)", uid, goal.Name, goal.GoalId)

	return goal.ToSavingsGoalInfoResponse(calculateMonthlyRequired(goal)), nil
}

// SavingsGoalModifyHandler updates an existing savings goal
func (a *SavingsGoalsApi) SavingsGoalModifyHandler(c *core.WebContext) (any, *errs.Error) {
	var req models.SavingsGoalModifyRequest
	err := c.ShouldBindJSON(&req)

	if err != nil {
		return nil, errs.NewIncompleteOrIncorrectSubmissionError(err)
	}

	uid := c.GetCurrentUid()

	goal, err := a.goals.GetSavingsGoalById(c, uid, req.Id)
	if err != nil {
		return nil, errs.Or(err, errs.ErrSavingsGoalNotFound)
	}

	goal.Name = req.Name
	goal.TargetAmount = req.TargetAmount
	goal.TargetDate = req.TargetDate
	goal.Icon = req.Icon
	goal.Color = req.Color

	err = a.goals.ModifySavingsGoal(c, goal)
	if err != nil {
		log.Errorf(c, "[savings_goals.ModifyHandler] failed to modify goal \"%d\" for user \"uid:%d\", because %s", goal.GoalId, uid, err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	return goal.ToSavingsGoalInfoResponse(calculateMonthlyRequired(goal)), nil
}

// SavingsGoalContributeHandler adds funds to a savings goal
func (a *SavingsGoalsApi) SavingsGoalContributeHandler(c *core.WebContext) (any, *errs.Error) {
	var req models.SavingsGoalContributeRequest
	err := c.ShouldBindJSON(&req)

	if err != nil {
		return nil, errs.NewIncompleteOrIncorrectSubmissionError(err)
	}

	uid := c.GetCurrentUid()

	err = a.goals.ContributeToSavingsGoal(c, uid, req.Id, req.Amount)
	if err != nil {
		log.Errorf(c, "[savings_goals.ContributeHandler] failed to contribute to goal \"%d\" for user \"uid:%d\", because %s", req.Id, uid, err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	goal, err := a.goals.GetSavingsGoalById(c, uid, req.Id)
	if err != nil {
		return nil, errs.Or(err, errs.ErrSavingsGoalNotFound)
	}

	log.Infof(c, "[savings_goals.ContributeHandler] user \"uid:%d\" contributed %d to goal \"%d\"", uid, req.Amount, req.Id)

	return goal.ToSavingsGoalInfoResponse(calculateMonthlyRequired(goal)), nil
}

// SavingsGoalDeleteHandler soft-deletes a savings goal
func (a *SavingsGoalsApi) SavingsGoalDeleteHandler(c *core.WebContext) (any, *errs.Error) {
	var req models.SavingsGoalDeleteRequest
	err := c.ShouldBindJSON(&req)

	if err != nil {
		return nil, errs.NewIncompleteOrIncorrectSubmissionError(err)
	}

	uid := c.GetCurrentUid()

	err = a.goals.DeleteSavingsGoal(c, uid, req.Id)
	if err != nil {
		log.Errorf(c, "[savings_goals.DeleteHandler] failed to delete goal \"%d\" for user \"uid:%d\", because %s", req.Id, uid, err.Error())
		return nil, errs.Or(err, errs.ErrOperationFailed)
	}

	log.Infof(c, "[savings_goals.DeleteHandler] user \"uid:%d\" deleted savings goal \"%d\"", uid, req.Id)

	return true, nil
}

// calculateMonthlyRequired returns the monthly contribution needed to reach the goal by target date
func calculateMonthlyRequired(goal *models.SavingsGoal) int64 {
	if goal.TargetDate <= 0 || goal.SavedAmount >= goal.TargetAmount {
		return 0
	}

	remaining := goal.TargetAmount - goal.SavedAmount
	targetTime := time.Unix(goal.TargetDate, 0)
	now := time.Now()

	if targetTime.Before(now) {
		return remaining // Past due - full amount needed
	}

	monthsLeft := (targetTime.Year()-now.Year())*12 + int(targetTime.Month()) - int(now.Month())
	if monthsLeft <= 0 {
		return remaining
	}

	return int64(math.Ceil(float64(remaining) / float64(monthsLeft)))
}
