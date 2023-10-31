package utils

import "math/rand"

func GenerateRoomCode() string {
	characters := "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

	combination := make([]byte, 4)

	for i := range combination {
		combination[i] = characters[rand.Intn(len(characters))]
	}

	return string(combination)
}
