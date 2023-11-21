package utils

import "strings"

// Replaces all spaces in a string with underscores
func ReplaceSpaces(str string) string {
	return strings.ReplaceAll(str, " ", "_")
}
