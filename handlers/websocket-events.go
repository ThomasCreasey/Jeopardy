package handlers

import (
	"encoding/json"
	"fmt"
	"jeopardy/types"
	"jeopardy/utils"
	"strconv"
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
}

type UserAnswer struct {
	Username string
	Answer   string
	Correct  bool
}

type RoomState3 struct {
	Answers []UserAnswer `json:"answers"`
	Scores  []UserScore  `json:"scores"`
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

		if builtString == message {
			fmt.Println("Closing Read Letter Ch")
			manager.readLetterChClosed = true
			return
		}
		select {
		case <-manager.pauseReadLetterCh:
			fmt.Println("Read Letters Pause")
			manager.readLetterChPaused = true
			select {
			case <-manager.closeReadLetterCh:
				return
			case <-manager.resumeReadLetterCh:
				fmt.Println("Read Letters Resume")
				manager.readLetterChPaused = false
			}
		case <-manager.closeReadLetterCh:
			fmt.Println("Read Letters Close")
			manager.readLetterChClosed = true
			return
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
	fmt.Println("FUNC Round Over")
	c.manager.currRoomState = 3
	c.manager.waitingFor = ""
	c.manager.buzzed = []string{}

	if !c.manager.quesChClosed { // Ensure question channel is open
		c.manager.closeQuesCh <- true
	}
	fmt.Println("Answer Channel Closed: ", c.manager.ansChClosed)
	if !c.manager.ansChClosed { // Ensure answer channel is open
		c.manager.closeAnsCh <- true
	}

	if !c.manager.readLetterChClosed { // Ensure read letter channel is open
		c.manager.closeReadLetterCh <- true // Close read letter channel
	}

	c.manager.questionData = RoomQuestionData{}
	c.manager.questionState = ""

	c.manager.Broadcast(Event{
		Type: EventUpdateGameState,
	})

	for client := range c.manager.clients {
		client.lastAnswer = "" // Reset last answer
	}
	var newHost string
	if c.manager.correctClient != "" {
		for client := range c.manager.clients { // Switch host to user with correct answer
			if client.username == c.manager.correctClient && !client.host { // If user is not already the host
				client.host = true
				newHost = client.username
			} else if client.host && (client.username != c.manager.correctClient) { // Remove host status from existing host
				client.host = false
			}
		}
	}

	if newHost != "" { // If host changed broadcast event
		payloadBytes, err := json.Marshal(newHost)
		if err != nil {
			utils.Log(err)
		}
		c.manager.Broadcast(Event{
			Type:    EventSetHost,
			Payload: payloadBytes,
		})
	}
	c.manager.correctClient = "" // Reset correct client

	go func() {
		timer := time.NewTimer(8 * time.Second)
		<-timer.C

		c.manager.currRoomState = 1
		c.manager.Broadcast(Event{
			Type: EventUpdateGameState,
		})
	}()
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

		for catIndex, category := range c.manager.categories {
			if category.Category == clientSelectQuestion.Category {
				for valIndex, value := range category.Values {
					if value.Value == clientSelectQuestion.Value {
						if value.Question.Answered {
							return nil
						}

						var roomQuestionData RoomQuestionData

						questionValue, err := strconv.Atoi(value.Value)

						if err != nil {
							utils.Log(err)
						}

						roomQuestionData.Question = value.Question.Question
						roomQuestionData.Answer = value.Question.Answer
						roomQuestionData.Value = questionValue

						c.manager.currRoomState = 2
						c.manager.questionData = roomQuestionData

						c.manager.categories[catIndex].Values[valIndex].Question.Answered = true

						go readLetters(roomQuestionData.Question, c.manager)

						c.manager.Broadcast(Event{
							Type: EventUpdateGameState,
						})

						go func() {
							ticker := time.NewTicker(1 * time.Second)
							currTimer := 0
							maxTime := 9

							for {
								select {
								case <-ticker.C:
									if c.manager.questionData == (RoomQuestionData{}) {
										fmt.Println("No question data")
										return
									}

									if currTimer >= maxTime {
										fmt.Println("Next Round")
										RoundOver(c)
										if !c.manager.quesChClosed {
											c.manager.closeQuesCh <- true
										}
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
								case <-c.manager.resumeQuesCh:
									fmt.Println("Setting new ticker")
									ticker = time.NewTicker(1 * time.Second)
								case <-c.manager.closeQuesCh:
									fmt.Println("Closing QUES ticker")
									ticker.Stop()
									c.manager.quesChClosed = true
									return
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
				fmt.Println(value)
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

		c.manager.ansChClosed = false
		c.manager.quesChClosed = false
		c.manager.readLetterChClosed = false
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
	case 3:
		var roomState3 RoomState3
		roomState3.Scores = c.manager.scores

		var UserAnswers []UserAnswer

		for client := range c.manager.clients {
			UserAnswers = append(UserAnswers, UserAnswer{
				Username: client.username,
				Answer:   client.lastAnswer,
				Correct:  client.username == c.manager.correctClient,
			})
		}

		roomState3.Answers = UserAnswers

		dataBytes, err := json.Marshal(roomState3)
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

func BuzzHandler(event Event, c *Client) error {
	if c.manager.currRoomState == 2 {
		if c.manager.questionData == (RoomQuestionData{}) {
			fmt.Println("Manager has no question")
			return nil
		}

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

		fmt.Println("Ques Ch Closed: ", c.manager.quesChClosed)
		if !c.manager.quesChClosed {
			fmt.Println("Pausing Question Ch: Buzzed")
			c.manager.pauseQuesCh <- true
		}

		if !c.manager.readLetterChClosed {
			fmt.Println("Pausing Read Letter Ch: Buzzed")
			c.manager.pauseReadLetterCh <- true
		}

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
			maxTime := 9

			for {
				select {
				case <-ticker.C:
					c.egress <- Event{
						Type:    EventUpdateAnswerTimer,
						Payload: []byte(fmt.Sprintf("%d", maxTime-currTimer)),
					}

					currTimer++

					if currTimer >= maxTime {
						if !c.manager.quesChClosed {
							c.manager.resumeQuesCh <- true

							if !c.manager.readLetterChClosed {
								time.Sleep(1 * time.Second)
								fmt.Println("Times up: Resuming read letter ch")
								c.manager.resumeReadLetterCh <- true
							}
						}
						if !c.manager.ansChClosed {
							c.manager.closeAnsCh <- true
						}
					}
				case <-c.manager.closeAnsCh:
					fmt.Println("Closing ANS CH ticker")
					ticker.Stop()
					c.manager.ansChClosed = true
					return
				}
			}

		}()

		go func() {
			waitingFor := c.manager.waitingFor
			time.Sleep(10 * time.Second)

			if waitingFor != c.manager.waitingFor {
				return
			}

			if len(c.manager.buzzed) == len(c.manager.clients) {
				fmt.Println("All users have answered incorrectly")
				RoundOver(c)
				return
			}

			if !c.manager.quesChClosed {
				c.manager.resumeQuesCh <- true

				if !c.manager.readLetterChClosed {
					fmt.Println("Answer Timeout: Resuming read letter ch")
					c.manager.resumeReadLetterCh <- true
				}
			}
		}()
	}

	return nil
}

type Answer struct {
	Answer string `json:"answer"`
}

func CheckIfRoundOver(c *Client) bool {
	if len(c.manager.buzzed) == len(c.manager.clients) {
		fmt.Println("All users have answered incorrectly")
		RoundOver(c)
		return true
	}
	return false
}

func AnswerHandler(event Event, c *Client) error {
	fmt.Println("Current Room State: ")
	fmt.Println(c.manager.currRoomState)
	if c.manager.currRoomState == 2 {
		if c.manager.questionData == (RoomQuestionData{}) {
			fmt.Println("Manager has no question")
			return nil
		}

		if c.manager.waitingFor == "" {
			fmt.Println("Not waiting for anyone")
			return nil
		}

		if c.manager.waitingFor != c.username {
			fmt.Println("Not waiting for this user")
			return nil
		}

		var answer Answer
		err := json.Unmarshal(event.Payload, &answer)

		if err != nil {
			utils.Log(err)
			return err
		}

		c.lastAnswer = answer.Answer

		answerScore := utils.CompareTwoStrings(answer.Answer, c.manager.questionData.Answer)

		if answerScore >= 0.8 {
			fmt.Println("Correct Answer")
			c.manager.correctClient = c.username
			var foundScore bool
			for _, score := range c.manager.scores {
				if score.Username == c.username {
					foundScore = true
					score.Score += c.manager.questionData.Value
				}
			}

			if !foundScore {
				c.manager.scores = append(c.manager.scores, UserScore{
					Username: c.username,
					Score:    c.manager.questionData.Value,
				})
			}

			RoundOver(c)
		} else {
			fmt.Println("Incorrect Answer")
			c.manager.waitingFor = ""

			if CheckIfRoundOver(c) {
				return nil
			}

			if !c.manager.quesChClosed {
				fmt.Println("Closing answer channel")
				c.manager.closeAnsCh <- true
			}
			if !c.manager.readLetterChClosed {
				fmt.Println("Incorrect Answer: Resuming read letter channel")
				c.manager.resumeReadLetterCh <- true
			}
			if !c.manager.quesChClosed {
				fmt.Println("Resuming question channel")
				c.manager.resumeQuesCh <- true
			}

			dataBytes, err := json.Marshal(c.username)
			if err != nil {
				utils.Log(err)
				return err
			}

			c.manager.Broadcast(Event{
				Type:    EventIncorrectAnswer,
				Payload: dataBytes,
			})
		}
	}

	return nil
}
