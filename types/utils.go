package types

type GetQuestionOutput struct {
	Question string
	Answer   string
}

type QuestionData struct {
	Question string
	Answers  []string
	Answered bool
}

type ValueData struct {
	Value    string
	Question QuestionData
}

type CategoryData struct {
	Category string
	Values   []ValueData
}
