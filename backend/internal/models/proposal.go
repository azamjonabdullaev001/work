package models

import "time"

type ProposalStatus string

const (
	ProposalPending   ProposalStatus = "pending"
	ProposalAccepted  ProposalStatus = "accepted"
	ProposalRejected  ProposalStatus = "rejected"
	ProposalWithdrawn ProposalStatus = "withdrawn"
)

type Proposal struct {
	ID           int            `json:"id"`
	JobID        int            `json:"job_id"`
	FreelancerID int            `json:"freelancer_id"`
	CoverLetter  *string        `json:"cover_letter,omitempty"`
	BidAmount    float64        `json:"bid_amount"`
	Duration     *string        `json:"duration,omitempty"`
	Status       ProposalStatus `json:"status"`
	CreatedAt    time.Time      `json:"created_at"`
	// Populated separately
	Freelancer *User `json:"freelancer,omitempty"`
	Job        *Job  `json:"job,omitempty"`
}

type CreateProposalRequest struct {
	CoverLetter *string `json:"cover_letter,omitempty"`
	BidAmount   float64 `json:"bid_amount"`
	Duration    *string `json:"duration,omitempty"`
}

type Contract struct {
	ID           int        `json:"id"`
	JobID        int        `json:"job_id"`
	FreelancerID int        `json:"freelancer_id"`
	ClientID     int        `json:"client_id"`
	Amount       float64    `json:"amount"`
	Status       string     `json:"status"`
	StartedAt    time.Time  `json:"started_at"`
	EndedAt      *time.Time `json:"ended_at,omitempty"`
	// Populated
	Job        *Job  `json:"job,omitempty"`
	Freelancer *User `json:"freelancer,omitempty"`
	Client     *User `json:"client,omitempty"`
}

type Review struct {
	ID         int       `json:"id"`
	ContractID int       `json:"contract_id"`
	ReviewerID int       `json:"reviewer_id"`
	RevieweeID int       `json:"reviewee_id"`
	Rating     int       `json:"rating"`
	Comment    *string   `json:"comment,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	// Populated
	Reviewer *User `json:"reviewer,omitempty"`
}

type CreateReviewRequest struct {
	ContractID int     `json:"contract_id"`
	RevieweeID int     `json:"reviewee_id"`
	Rating     int     `json:"rating"`
	Comment    *string `json:"comment,omitempty"`
}
