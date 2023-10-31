package utils

import "fmt"

var useLogging bool = true

func Log(message interface{}) {
	if useLogging {
		fmt.Println(message)
	}
}
