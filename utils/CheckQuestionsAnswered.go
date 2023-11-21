package utils

import (
	"jeopardy/types"
)

// Checks to see if there are any questions in the category that are still waiting to be answered
// Used to check if the game is over
func CheckQuestionsAnswered(category []types.CategoryData) bool {
	allAnswered := true

	for _, cat := range category {
		for _, value := range cat.Values {
			if !value.Question.Answered {
				allAnswered = false
				break
			}
		}
	}
	return allAnswered
}
