package errs

import "net/http"

// Error codes related to savings goals
var (
	ErrSavingsGoalNotFound  = NewNormalError(NormalSubcategorySavingsGoal, 0, http.StatusBadRequest, "savings goal not found")
	ErrSavingsGoalIdInvalid = NewNormalError(NormalSubcategorySavingsGoal, 1, http.StatusBadRequest, "savings goal id is invalid")
)
