package types

// Structure to decode the client's request to select a question
type ClientSelectQuestion struct {
	Category string
	Value    string
}
