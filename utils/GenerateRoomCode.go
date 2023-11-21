package utils

import "math/rand"

// Generates a random 4 character string
// Used for the room code
func GenerateRoomCode() string {
	characters := "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

	combination := make([]byte, 4)

	for i := range combination {
		combination[i] = characters[rand.Intn(len(characters))]
	}

	return string(combination)
}
