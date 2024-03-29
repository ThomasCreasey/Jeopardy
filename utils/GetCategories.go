package utils

import (
	"encoding/json"
	"jeopardy/types"
	"math/rand"
	"os"
	"sync"
)

var (
	dataCache  map[string]interface{}
	cacheMutex sync.Mutex
	fileName   = "categories.json" // Replace with your actual file name
)

// Loads the data from the categories.json file into a cache
func init() {
	jsonData, err := os.ReadFile(fileName)
	if err != nil {
		panic(err)
	}

	err = json.Unmarshal(jsonData, &dataCache)
	if err != nil {
		panic(err)
	}
}

// Gets up to 5 categories from the cache
// Also appends a random question from each value in the category
// Returns an array of CategoryData
func GetCategories() []types.CategoryData {
	cacheMutex.Lock()
	defer cacheMutex.Unlock()

	categories := make([]types.CategoryData, 0, len(dataCache))

	counter := 0

	for k, v := range dataCache {
		if counter >= 5 || counter >= len(dataCache) { // Max 5 categories
			break
		}

		categoryData, ok := v.([]interface{})
		if ok && len(categoryData) > 0 {
			categories = append(categories, types.CategoryData{
				Category: k,
			})

			categoryValues, ok := categoryData[0].(map[string]interface{})
			if !ok || len(categoryValues) == 0 {
				return nil
			}

			for k, v := range categoryValues {
				valueQuestions := v.([]interface{})

				randomIndex := rand.Intn(len(valueQuestions))
				var question map[string]interface{}

				for {
					question, ok = valueQuestions[randomIndex].(map[string]interface{})
					if ok && question != nil {
						break
					}
					randomIndex = rand.Intn(len(valueQuestions))
				}
				answers := make([]string, 0)
				for _, answer := range question["answer"].([]interface{}) {
					answers = append(answers, answer.(string))
				}
				categories[counter].Values = append(categories[counter].Values, types.ValueData{
					Value: k,
					Question: types.QuestionData{
						Question: question["question"].(string),
						Answers:  answers,
						Answered: false,
					},
				})

			}

			counter++
		}
	}
	return categories
}
