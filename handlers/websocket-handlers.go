package handlers

import (
	"encoding/json"
	"jeopardy/utils"
	"time"
)

/* ROOM STATES
   0: Waiting for players
   1: Selecting categories
   2: Answering questions
   3: Displaying Scores
   4: Game Over
   5: Waiting for user to rejoin
*/

type RoomCategoryData struct {
	Category string
	Disabled []bool
}

type RoomState1 struct {
	Categories []RoomCategoryData
}

type RoomState2 struct {
	Question string
	Expires  time.Time
}

type RoomState5 struct {
	Username string
}

func StartGameHandler(event Event, c *Client) error {
	if c.host && !c.manager.started { // Ensure user is host, and game isn't already started
		c.manager.currRoomState = 1

		var gameState GameState
		gameState.RoomState = c.manager.currRoomState

		c.manager.categories = utils.GetCategories()

		event := Event{
			Type: EventUpdateGameState,
		}

		c.manager.Broadcast(event)

		c.manager.started = true // Set game as started
	}

	return nil
}

func UserKickedHandler(event Event, c *Client) error {
	if c.host { // Only host can kick
		var userKicked UserKicked
		err := json.Unmarshal(event.Payload, &userKicked)

		if err != nil {
			utils.Log(err)
			return err
		}

		for client := range c.manager.clients { // Get all clients in room
			if client.username == userKicked.Username {
				RemoveClient(client.conn, client, EventUserKicked, "You were kicked from the room")
			}
		}
	}

	return nil
}

func UpdateGameStateHandler(event Event, c *Client) error {
	currRoomState := c.manager.currRoomState

	var gameState GameState
	gameState.RoomState = currRoomState

	switch currRoomState {
	case 1:
		var categories []RoomCategoryData
		for _, category := range c.manager.categories {
			var disabled []bool

			for _, value := range category.Values {
				disabled = append(disabled, value.Question.Answered)
			}

			categories = append(categories, RoomCategoryData{
				Category: category.Category,
				Disabled: disabled,
			})
		}

		var roomState1 RoomState1
		roomState1.Categories = categories

		dataBytes, err := json.Marshal(roomState1)
		if err != nil {
			utils.Log(err)
			return err
		}

		gameState.Data = dataBytes
	case 2:
		var roomState2 RoomState2
		roomState2.Question = c.manager.questionData.Question
		roomState2.Expires = c.manager.questionData.Expires

		dataBytes, err := json.Marshal(roomState2)
		if err != nil {
			utils.Log(err)
			return err
		}

		gameState.Data = dataBytes
	case 5:
		var roomState5 RoomState5
		roomState5.Username = string(event.Payload)

		dataBytes, err := json.Marshal(roomState5)
		if err != nil {
			utils.Log(err)
			return err
		}

		gameState.Data = dataBytes

	}

	outGoingPayload, err := json.Marshal(gameState)
	if err != nil {
		utils.Log(err)
		return err
	}

	var outgoingEvent Event
	outgoingEvent.Type = EventUpdateGameState
	outgoingEvent.Payload = outGoingPayload

	c.egress <- outgoingEvent

	return nil

}

func handleSendMessage(event Event, c *Client) error {
	newEvent := Event{}              // Create a new event
	newEvent.Type = event.Type       // Set the type
	newEvent.Payload = event.Payload // Set the payload

	c.egress <- newEvent // Send the event to the client's egress channel

	return nil
}
