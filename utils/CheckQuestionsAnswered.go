package utils

import (
	"jeopardy/types"
)

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
