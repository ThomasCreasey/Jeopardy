package controllers

import (
	"fmt"
	"jeopardy/types"
	"log"
	"os"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func init() {
	os.Remove("database.sqlite")
	var err error

	newLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags), // io writer
		logger.Config{
			SlowThreshold:             time.Second,   // Slow SQL threshold
			LogLevel:                  logger.Silent, // Log level
			IgnoreRecordNotFoundError: true,          // Ignore ErrRecordNotFound error for logger
			ParameterizedQueries:      true,          // Don't include params in the SQL log
			Colorful:                  true,          // Enable color
		},
	)

	DB, err = gorm.Open(sqlite.Open("database.sqlite"), &gorm.Config{
		Logger: newLogger,
	})
	if err != nil {
		panic("failed to connect database")
	}
	fmt.Println("\033[0;36mDatabase connected successfully\033[0m")

	// Migrate the schema
	err = DB.AutoMigrate(&types.Room{})
	if err != nil {
		panic("failed to migrate database")
	}

}
