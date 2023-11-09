package utils

import "strings"

func ReplaceSpaces(str string) string {
	return strings.ReplaceAll(str, " ", "_")
}
