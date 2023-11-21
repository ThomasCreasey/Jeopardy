package types

// Structure that stores that current state of the question in the room
type QuestionData struct {
	Question string
	Answers  []string
	Answered bool
}

// Structure that represents a question with its value
type ValueData struct {
	Value    string
	Question QuestionData
}

// Structure that represents a category with its values, each value also represents all its questions
type CategoryData struct {
	Category string
	Values   []ValueData
}
