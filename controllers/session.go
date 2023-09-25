package controllers

import (
	"log"
	"os"

	"github.com/gorilla/sessions"
	"github.com/joho/godotenv"
)

var Key []byte
var Store *sessions.CookieStore

func init() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	Key = []byte(os.Getenv("SESSION_KEY"))
	Store = sessions.NewCookieStore(Key)

	Store.Options = &sessions.Options{
		Path:   "/",
		MaxAge: 15 * 3600,
	}
}
