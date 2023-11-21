package types

// Structure that represents a question that is sent to the client
type RoomQuestionData struct {
	Category string
	Question string
	Answers  []string
	Value    int
}
