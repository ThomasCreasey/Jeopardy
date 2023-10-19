package types

type CreateRoomBody struct {
	Username string `json:"username"`
}

type JoinRoomBody struct {
	Username string `json:"username"`
	RoomId   string `json:"roomId"`
}
