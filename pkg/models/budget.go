package models

// BudgetPeriod represents the budget period type
type BudgetPeriod byte

// Budget periods
const (
	BUDGET_PERIOD_WEEKLY  BudgetPeriod = 1
	BUDGET_PERIOD_MONTHLY BudgetPeriod = 2
	BUDGET_PERIOD_YEARLY  BudgetPeriod = 3
)

// Budget represents a budget entry stored in database
type Budget struct {
	BudgetId        int64                   `xorm:"PK" json:"id,string"`
	Uid             int64                   `xorm:"NOT NULL" json:"-"`
	Name            string                  `xorm:"VARCHAR(64) NOT NULL" json:"name"`
	CategoryId      int64                   `json:"categoryId,string"`
	AccountId       int64                   `json:"accountId,string"`
	Amount          int64                   `xorm:"NOT NULL" json:"amount"`
	Currency        string                  `xorm:"VARCHAR(3) NOT NULL" json:"currency"`
	Period          BudgetPeriod            `xorm:"TINYINT NOT NULL" json:"period"`
	StartDate       int64                   `json:"startDate"`
	Rollover        bool                    `json:"rollover"`
	AlertPercent    int                     `xorm:"TINYINT NOT NULL DEFAULT 80" json:"alertPercent"`
	Deleted         bool                    `xorm:"NOT NULL" json:"-"`
	CreatedUnixTime int64                   `json:"createdUnixTime"`
	UpdatedUnixTime int64                   `json:"updatedUnixTime"`
	DeletedUnixTime int64                   `json:"-"`
}

// BudgetCreateRequest represents all parameters of budget creation request
type BudgetCreateRequest struct {
	Name         string       `json:"name" binding:"required,notBlank,max=64"`
	CategoryId   int64        `json:"categoryId,string" binding:"min=0"`
	AccountId    int64        `json:"accountId,string" binding:"min=0"`
	Amount       int64        `json:"amount" binding:"required,min=1,max=99999999999"`
	Currency     string       `json:"currency" binding:"required,len=3,validCurrency"`
	Period       BudgetPeriod `json:"period" binding:"required,min=1,max=3"`
	StartDate    int64        `json:"startDate" binding:"min=0"`
	Rollover     bool         `json:"rollover"`
	AlertPercent int          `json:"alertPercent" binding:"min=0,max=100"`
}

// BudgetModifyRequest represents all parameters of budget modification request
type BudgetModifyRequest struct {
	Id           int64        `json:"id,string" binding:"required,min=1"`
	Name         string       `json:"name" binding:"required,notBlank,max=64"`
	CategoryId   int64        `json:"categoryId,string" binding:"min=0"`
	AccountId    int64        `json:"accountId,string" binding:"min=0"`
	Amount       int64        `json:"amount" binding:"required,min=1,max=99999999999"`
	Period       BudgetPeriod `json:"period" binding:"required,min=1,max=3"`
	Rollover     bool         `json:"rollover"`
	AlertPercent int          `json:"alertPercent" binding:"min=0,max=100"`
}

// BudgetDeleteRequest represents all parameters of budget deletion request
type BudgetDeleteRequest struct {
	Id int64 `json:"id,string" binding:"required,min=1"`
}

// BudgetInfoResponse represents a budget response
type BudgetInfoResponse struct {
	Id           int64        `json:"id,string"`
	Name         string       `json:"name"`
	CategoryId   int64        `json:"categoryId,string"`
	AccountId    int64        `json:"accountId,string"`
	Amount       int64        `json:"amount"`
	Currency     string       `json:"currency"`
	Period       BudgetPeriod `json:"period"`
	StartDate    int64        `json:"startDate"`
	Rollover     bool         `json:"rollover"`
	AlertPercent int          `json:"alertPercent"`
	Spent        int64        `json:"spent"`
	SpentPercent int          `json:"spentPercent"`
}

// ToBudgetInfoResponse converts a Budget to BudgetInfoResponse
func (b *Budget) ToBudgetInfoResponse(spent int64) *BudgetInfoResponse {
	spentPercent := 0
	if b.Amount > 0 {
		spentPercent = int(spent * 100 / b.Amount)
	}

	return &BudgetInfoResponse{
		Id:           b.BudgetId,
		Name:         b.Name,
		CategoryId:   b.CategoryId,
		AccountId:    b.AccountId,
		Amount:       b.Amount,
		Currency:     b.Currency,
		Period:       b.Period,
		StartDate:    b.StartDate,
		Rollover:     b.Rollover,
		AlertPercent: b.AlertPercent,
		Spent:        spent,
		SpentPercent: spentPercent,
	}
}
