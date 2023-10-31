package utils

import (
	"fmt"
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

	fmt.Println("All Questions Answered: ", allAnswered)

	return allAnswered
}
