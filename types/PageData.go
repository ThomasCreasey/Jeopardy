package types

// Structure that stores the username of a user requesting to create a room
type CreateRoomBody struct {
	Username string `json:"username"`
}

// Structure that stores the username and room ID of a user requesting to join a room
type JoinRoomBody struct {
	Username string `json:"username"`
	RoomId   string `json:"roomId"`
}
