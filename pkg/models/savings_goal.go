package models

// SavingsGoal represents a savings goal stored in database
type SavingsGoal struct {
	GoalId          int64  `xorm:"PK" json:"id,string"`
	Uid             int64  `xorm:"NOT NULL" json:"-"`
	Name            string `xorm:"VARCHAR(64) NOT NULL" json:"name"`
	TargetAmount    int64  `xorm:"NOT NULL" json:"targetAmount"`
	Currency        string `xorm:"VARCHAR(3) NOT NULL" json:"currency"`
	TargetDate      int64  `json:"targetDate"`
	SavedAmount     int64  `xorm:"NOT NULL DEFAULT 0" json:"savedAmount"`
	Icon            string `xorm:"VARCHAR(32)" json:"icon"`
	Color           string `xorm:"VARCHAR(6)" json:"color"`
	Deleted         bool   `xorm:"NOT NULL" json:"-"`
	CreatedUnixTime int64  `json:"createdUnixTime"`
	UpdatedUnixTime int64  `json:"updatedUnixTime"`
	DeletedUnixTime int64  `json:"-"`
}

// SavingsGoalCreateRequest represents parameters for creating a savings goal
type SavingsGoalCreateRequest struct {
	Name         string `json:"name" binding:"required,notBlank,max=64"`
	TargetAmount int64  `json:"targetAmount" binding:"required,min=1,max=99999999999"`
	Currency     string `json:"currency" binding:"required,len=3,validCurrency"`
	TargetDate   int64  `json:"targetDate" binding:"min=0"`
	Icon         string `json:"icon" binding:"max=32"`
	Color        string `json:"color" binding:"max=6"`
}

// SavingsGoalModifyRequest represents parameters for modifying a savings goal
type SavingsGoalModifyRequest struct {
	Id           int64  `json:"id,string" binding:"required,min=1"`
	Name         string `json:"name" binding:"required,notBlank,max=64"`
	TargetAmount int64  `json:"targetAmount" binding:"required,min=1,max=99999999999"`
	TargetDate   int64  `json:"targetDate" binding:"min=0"`
	Icon         string `json:"icon" binding:"max=32"`
	Color        string `json:"color" binding:"max=6"`
}

// SavingsGoalContributeRequest represents adding funds to a savings goal
type SavingsGoalContributeRequest struct {
	Id     int64 `json:"id,string" binding:"required,min=1"`
	Amount int64 `json:"amount" binding:"required,min=1,max=99999999999"`
}

// SavingsGoalDeleteRequest represents parameters for deleting a savings goal
type SavingsGoalDeleteRequest struct {
	Id int64 `json:"id,string" binding:"required,min=1"`
}

// SavingsGoalInfoResponse represents a savings goal response
type SavingsGoalInfoResponse struct {
	Id              int64  `json:"id,string"`
	Name            string `json:"name"`
	TargetAmount    int64  `json:"targetAmount"`
	Currency        string `json:"currency"`
	TargetDate      int64  `json:"targetDate"`
	SavedAmount     int64  `json:"savedAmount"`
	SavedPercent    int    `json:"savedPercent"`
	MonthlyRequired int64  `json:"monthlyRequired"`
	Icon            string `json:"icon"`
	Color           string `json:"color"`
}

// ToSavingsGoalInfoResponse converts a SavingsGoal to response with calculated fields
func (g *SavingsGoal) ToSavingsGoalInfoResponse(monthlyRequired int64) *SavingsGoalInfoResponse {
	savedPercent := 0
	if g.TargetAmount > 0 {
		savedPercent = int(g.SavedAmount * 100 / g.TargetAmount)
	}

	return &SavingsGoalInfoResponse{
		Id:              g.GoalId,
		Name:            g.Name,
		TargetAmount:    g.TargetAmount,
		Currency:        g.Currency,
		TargetDate:      g.TargetDate,
		SavedAmount:     g.SavedAmount,
		SavedPercent:    savedPercent,
		MonthlyRequired: monthlyRequired,
		Icon:            g.Icon,
		Color:           g.Color,
	}
}
