package utils

import (
	"jeopardy/controllers"
	"jeopardy/types"
)

func CheckRoomExists(roomId string) bool {
	var dbRoom *types.Room
	room := controllers.DB.First(&dbRoom, "id = ?", roomId)

	return room.Error == nil
}
