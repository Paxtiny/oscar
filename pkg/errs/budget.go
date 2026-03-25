package errs

import "net/http"

// Error codes related to budgets
var (
	ErrBudgetNotFound     = NewNormalError(NormalSubcategoryBudget, 0, http.StatusBadRequest, "budget not found")
	ErrBudgetIdInvalid    = NewNormalError(NormalSubcategoryBudget, 1, http.StatusBadRequest, "budget id is invalid")
	ErrBudgetPeriodInvalid = NewNormalError(NormalSubcategoryBudget, 2, http.StatusBadRequest, "budget period is invalid")
)
