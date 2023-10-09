package handlers

import (
	"encoding/json"
	"fmt"
	"jeopardy/types"
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

type UserColours struct {
	Username string
	Colour   string
}

type RoomState2 struct {
	Question    string
	UserColours []UserColours
	Expires     time.Time
}

type RoomState5 struct {
	Username string
}

func StartGameHandler(event Event, c *Client) error {
	if c.host && !c.manager.started { // Ensure user is host, and game isn't already started

		if len(c.manager.clients) < 2 { // Ensure there are at least 2 players
			return nil
		}

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

func readLetters(message string, manager *Manager) {
	var builtString string
	for _, letter := range message {
		builtString += string(letter)

		if letter == ' ' {
			continue
		}
		select {
		case <-manager.pauseQuesCh:
			fmt.Println("Read Letters Pause")
			// Paused, wait for resume signal
			<-manager.resumeQuesCh
		default:
			data, err := json.Marshal(builtString)
			if err != nil {
				utils.Log(err)
			}

			manager.questionState = builtString

			manager.Broadcast(Event{
				Type:    EventUpdateQuestion,
				Payload: data,
			})

			time.Sleep(100 * time.Millisecond) // Adjust the delay as needed
		}
	}
}

func RoundOver(c *Client) {
	c.manager.currRoomState = 3
	c.manager.questionData = RoomQuestionData{}
	c.manager.waitingFor = ""
	c.manager.buzzed = []string{}
	c.manager.buzzedAt = time.Time{}
}

func SelectQuestionHandler(event Event, c *Client) error {
	fmt.Println("SelectQuestionHandler")
	if c.host { // Only host can select question
		fmt.Println("Is Host")
		var clientSelectQuestion types.ClientSelectQuestion
		err := json.Unmarshal(event.Payload, &clientSelectQuestion)

		if err != nil {
			utils.Log(err)
			return err
		}

		if c.manager.questionData != (RoomQuestionData{}) { // Ensure there isn't already a question selected
			return nil
		}

		for _, category := range c.manager.categories {
			if category.Category == clientSelectQuestion.Category {
				for _, value := range category.Values {
					if value.Value == clientSelectQuestion.Value {
						if value.Question.Answered {
							return nil
						}

						var roomQuestionData RoomQuestionData

						roomQuestionData.Question = value.Question.Question
						roomQuestionData.Answer = value.Question.Answer
						value.Question.Answered = true

						c.manager.currRoomState = 2
						c.manager.questionData = roomQuestionData

						go readLetters(roomQuestionData.Question, c.manager)

						event := Event{
							Type: EventUpdateGameState,
						}

						c.manager.Broadcast(event)

						go func() {
							ticker := time.NewTicker(1 * time.Second)
							currTimer := 0
							maxTime := 10

							for {
								select {
								case <-ticker.C:
									if c.manager.questionData == (RoomQuestionData{}) {
										return
									}

									if currTimer >= maxTime {
										RoundOver(c)
										fmt.Println("Next Round")
										ticker.Stop()
										return
									}

									c.manager.Broadcast(Event{
										Type:    EventUpdateQuestionTimer,
										Payload: []byte(fmt.Sprintf("%d", maxTime-currTimer)),
									})

									currTimer++
								case <-c.manager.pauseQuesCh:
									fmt.Println("Received Pause Question Ch")
									ticker.Stop()
									c.manager.pauseQuesCh <- true
								case <-c.manager.resumeQuesCh:
									fmt.Println("Setting new ticker")
									ticker = time.NewTicker(1 * time.Second)
								}
							}
						}()
					}
				}
			}
		}
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

		if userKicked.Username == c.username { // Ensure user isn't kicking themselves
			return nil
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
		roomState2.Question = c.manager.questionState

		dataBytes, err := json.Marshal(roomState2)
		if err != nil {
			utils.Log(err)
			return err
		}

		gameState.Data = dataBytes

		var userColours []UserColours

		for client := range c.manager.clients {
			userColours = append(userColours, UserColours{
				Username: client.username,
				Colour:   client.colour,
			})
		}

		roomState2.UserColours = userColours
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

func BuzzHandler(event Event, c *Client) error {
	if c.manager.currRoomState == 2 {
		/*if c.manager.questionData.Expires.Before(time.Now()) {

			return nil
		}*/

		fmt.Println("Buzzed")
		if c.manager.waitingFor != "" {
			fmt.Println("Already waiting for someone")
			return nil
		}

		var foundUser bool
		for _, user := range c.manager.buzzed {
			if user == c.username {
				foundUser = true
			}
		}

		if foundUser {
			fmt.Println("Already buzzed")
			return nil
		}

		c.manager.waitingFor = c.username
		c.manager.buzzed = append(c.manager.buzzed, c.username)
		c.manager.buzzedAt = time.Now()

		fmt.Println("Pausing Question Ch: Buzzed")
		c.manager.pauseQuesCh <- true

		dataBytes, err := json.Marshal(c.username)
		if err != nil {
			utils.Log(err)
			return err
		}

		fmt.Println("Broadcasting")

		c.manager.Broadcast(Event{
			Type:    EventBuzzed,
			Payload: dataBytes,
		})

		go func() {
			ticker := time.NewTicker(1 * time.Second)
			currTimer := 0
			maxTime := 10

			for {
				select {
				case <-ticker.C:
					fmt.Println("Tick")
					if c.manager.waitingFor == "" {
						fmt.Println("Resuming question ch: no longer waiting for someone")
						ticker.Stop()
					}

					c.egress <- Event{
						Type:    EventUpdateAnswerTimer,
						Payload: []byte(fmt.Sprintf("%d", maxTime-currTimer)),
					}

					currTimer++

					if currTimer >= maxTime {
						c.manager.waitingFor = ""
						ticker.Stop()
						return
					}
				case <-c.manager.resumeAnsCh:
					fmt.Println("Received Resume Answer")
					ticker.Stop()
					c.manager.resumeQuesCh <- true
				}
			}
		}()

		go func() {
			time.Sleep(10 * time.Second)
			fmt.Println("Resuming Question Ch: Answer Timeout")
			c.manager.waitingFor = ""
			c.manager.resumeQuesCh <- true
		}()
	}

	return nil
}
