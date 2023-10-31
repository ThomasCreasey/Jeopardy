package utils

import (
	"jeopardy/types"
)

type RoomQuestionData struct {
	Category string
	Question string
	Answers  []string
	Value    int
}

func CheckQuestionData(data types.RoomQuestionData) bool {
	if data.Category == "" || data.Question == "" || len(data.Answers) < 1 || data.Value == 0 { // Ensure there isn't already a question selected
		return false
	}

	return true
}
