package handlers

import (
	"encoding/json"
	"fmt"
	"jeopardy/types"
	"jeopardy/utils"
	"sort"
	"strconv"
	"strings"
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
	Values   []string
	Disabled []bool
}

type RoomState1 struct {
	Categories []RoomCategoryData
}

type RoomState4 struct {
	Scores []UserScore `json:"scores"`
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
	Answer  string       `json:"answer"`
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

		c.manager.Lock()
		c.manager.categories = utils.GetCategories()
		c.manager.Unlock()

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
			utils.Log("Closing Read Letter Ch: Built")
			manager.readLetterChClosed = true
			return
		}
		select {
		case <-manager.pauseReadLetterCh:
			utils.Log("Read Letters Pause")
			manager.Lock()
			manager.readLetterChPaused = true
			manager.Unlock()
			select {
			case <-manager.closeReadLetterCh:
				return
			case <-manager.resumeReadLetterCh:
				utils.Log("Read Letters Resume")
				manager.Lock()
				manager.readLetterChPaused = false
				manager.Unlock()
			}
		case <-manager.closeReadLetterCh:
			utils.Log("Read Letters Close")
			manager.Lock()
			defer manager.Unlock()
			manager.readLetterChClosed = true
			return
		default:
			data, err := json.Marshal(builtString)
			if err != nil {
				utils.Log(err)
			}
			manager.Lock()
			manager.questionState = builtString
			manager.Unlock()

			manager.Broadcast(Event{
				Type:    EventUpdateQuestion,
				Payload: data,
			})
			time.Sleep(100 * time.Millisecond) // Adjust the delay as needed
		}
	}

}

func RoundOver(c *Client) {
	utils.Log("FUNC Round Over")
	c.manager.currRoomState = 3
	c.manager.waitingFor = ""
	c.manager.buzzed = []string{}

	if !c.manager.quesChClosed { // Ensure question channel is open
		c.manager.closeQuesCh <- true
	}
	if !c.manager.ansChClosed { // Ensure answer channel is open
		c.manager.closeAnsCh <- true
	}

	if !c.manager.readLetterChClosed { // Ensure read letter channel is open
		c.manager.closeReadLetterCh <- true // Close read letter channel
	}

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
	c.manager.questionData = types.RoomQuestionData{}
	c.manager.questionState = ""

	go func() {
		time.Sleep(7 * time.Second)

		c.manager.Lock()

		gameOver := utils.CheckQuestionsAnswered(c.manager.categories)

		if gameOver {
			c.manager.currRoomState = 4
		} else {
			c.manager.currRoomState = 1
		}
		c.manager.Unlock()

		utils.Log("Broadcasting 2")
		c.manager.Broadcast(Event{
			Type: EventUpdateGameState,
		})
	}()
}

func SelectQuestionHandler(event Event, c *Client) error {
	utils.Log("SelectQuestionHandler")
	if c.host { // Only host can select question
		var clientSelectQuestion types.ClientSelectQuestion
		err := json.Unmarshal(event.Payload, &clientSelectQuestion)

		if err != nil {
			utils.Log(err)
			return err
		}

		for catIndex, category := range c.manager.categories {
			if category.Category == clientSelectQuestion.Category {
				for valIndex, value := range category.Values {
					if value.Value == clientSelectQuestion.Value {
						if value.Question.Answered {
							return nil
						}

						var RoomQuestionData types.RoomQuestionData

						questionValue, err := strconv.Atoi(value.Value)

						if err != nil {
							utils.Log(err)
						}

						RoomQuestionData.Category = category.Category
						RoomQuestionData.Question = value.Question.Question
						RoomQuestionData.Answers = value.Question.Answers
						RoomQuestionData.Value = questionValue

						c.manager.currRoomState = 2
						c.manager.questionData = RoomQuestionData

						c.manager.categories[catIndex].Values[valIndex].Question.Answered = true

						go readLetters(RoomQuestionData.Question, c.manager)

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
									if !utils.CheckQuestionData(c.manager.questionData) {
										ticker.Stop()
										return
									}

									if currTimer >= maxTime {
										utils.Log("Next Round")
										if !c.manager.quesChClosed {
											c.manager.Lock()
											c.manager.quesChClosed = true
											ticker.Stop()
											c.manager.Unlock()
										}
										RoundOver(c)
										return
									}

									c.manager.Broadcast(Event{
										Type:    EventUpdateQuestionTimer,
										Payload: []byte(fmt.Sprintf("%d", maxTime-currTimer)),
									})

									currTimer++
								case <-c.manager.pauseQuesCh:
									utils.Log("Received Pause Question Ch")
									ticker.Stop()
									c.manager.Lock()
									utils.Log("PAUSED QUES CH")
									c.manager.quesChPaused = true
									c.manager.Unlock()
								case <-c.manager.resumeQuesCh:
									utils.Log("RESUMING QUES CH")
									ticker = time.NewTicker(1 * time.Second)
									c.manager.Lock()
									c.manager.quesChPaused = false
									c.manager.Unlock()
								case <-c.manager.closeQuesCh:
									c.manager.Lock()
									utils.Log("Closing QUES ticker")
									ticker.Stop()
									c.manager.quesChClosed = true
									c.manager.Unlock()
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
			disabled := make([]bool, len(category.Values))

			sort.Slice(category.Values, func(i, j int) bool {
				firstAsInt, err := strconv.Atoi(category.Values[i].Value)
				if err != nil {
					utils.Log(err)
				}
				secondAsInt, err := strconv.Atoi(category.Values[j].Value)
				if err != nil {
					utils.Log(err)
				}
				return firstAsInt < secondAsInt
			})

			categoryValues := make([]string, len(category.Values))
			for i, value := range category.Values {
				categoryValues[i] = value.Value
				disabled[i] = value.Question.Answered
			}

			categories = append(categories, RoomCategoryData{
				Category: category.Category,
				Values:   categoryValues,
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

		c.manager.Lock()
		c.manager.ansChClosed = true
		c.manager.quesChClosed = false
		c.manager.readLetterChClosed = false
		c.manager.Unlock()
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
		var scores []UserScore

		for client := range c.manager.clients {
			scores = append(scores, UserScore{
				Username: client.username,
				Score:    client.score,
			})
		}

		roomState3.Scores = scores
		roomState3.Answer = strings.Join(c.manager.questionData.Answers, ", ")

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
	case 4:
		var roomState4 RoomState4
		var scores []UserScore

		for client := range c.manager.clients {
			scores = append(scores, UserScore{
				Username: client.username,
				Score:    client.score,
			})
		}
		roomState4.Scores = scores

		dataBytes, err := json.Marshal(roomState4)
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
		if !utils.CheckQuestionData(c.manager.questionData) {
			return nil
		}

		utils.Log("Buzzed")
		if c.manager.waitingFor != "" {
			utils.Log("Already waiting for someone")
			return nil
		}

		var foundUser bool
		for _, user := range c.manager.buzzed {
			if user == c.username {
				foundUser = true
			}
		}

		if foundUser {
			utils.Log("Already buzzed")
			return nil
		}

		c.manager.waitingFor = c.username
		c.manager.buzzed = append(c.manager.buzzed, c.username)

		if !c.manager.quesChClosed {
			c.manager.pauseQuesCh <- true
		}

		if !c.manager.readLetterChClosed {
			c.manager.pauseReadLetterCh <- true
		}

		dataBytes, err := json.Marshal(c.username)
		if err != nil {
			utils.Log(err)
			return err
		}

		utils.Log("Broadcasting")

		c.manager.Broadcast(Event{
			Type:    EventBuzzed,
			Payload: dataBytes,
		})

		go func() {
			utils.Log("Spawn new answer timer")
			currTimer := 0
			maxTime := 9

			c.manager.ansChClosed = false // Open answer channel

			ticker := time.NewTicker(1 * time.Second)

			for {
				select {
				case <-ticker.C:
					c.egress <- Event{
						Type:    EventUpdateAnswerTimer,
						Payload: []byte(fmt.Sprintf("%d", maxTime-currTimer)),
					}

					currTimer++

					if currTimer >= maxTime {
						if !c.manager.quesChClosed && c.manager.quesChPaused {
							utils.Log("Times up: Resuming question ch")
							c.manager.resumeQuesCh <- true
							c.manager.waitingFor = ""

							if !c.manager.readLetterChClosed {
								time.Sleep(1 * time.Second)
								if c.manager.readLetterChPaused { // Ensure read letter channel is paused
									utils.Log("Times up: Resuming read letter ch")
									c.manager.resumeReadLetterCh <- true
								}
							}
						}
						if !c.manager.ansChClosed {
							c.manager.Lock()
							c.manager.ansChClosed = true // Mark the answer channel as closed
							ticker.Stop()
							c.manager.Unlock()
							return

						}
					}
				case <-c.manager.closeAnsCh:
					c.manager.Lock()
					ticker.Stop()
					c.manager.ansChClosed = true // Mark the answer channel as closed
					c.manager.Unlock()
					currTimer = 0
					return
				}
			}
		}()

		go func() {
			currQuestion := c.manager.questionData
			waitingFor := c.manager.waitingFor
			time.Sleep(10 * time.Second)

			if fmt.Sprintf("%v", currQuestion) != fmt.Sprintf("%v", c.manager.questionData) {
				return
			}

			if waitingFor != c.manager.waitingFor {
				return
			}

			if len(c.manager.buzzed) == len(c.manager.clients) {
				RoundOver(c)
				return
			}

			if !c.manager.quesChClosed && c.manager.quesChPaused {
				c.manager.resumeQuesCh <- true

				if !c.manager.readLetterChClosed && c.manager.readLetterChPaused {
					c.manager.waitingFor = ""
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
		utils.Log("All users have answered incorrectly")
		RoundOver(c)
		return true
	}
	return false
}

func AnswerHandler(event Event, c *Client) error {
	utils.Log("Current Room State: ")
	utils.Log(c.manager.currRoomState)
	if c.manager.currRoomState == 2 {
		if !utils.CheckQuestionData(c.manager.questionData) {
			return nil
		}

		if c.manager.waitingFor == "" {
			utils.Log("Not waiting for anyone")
			return nil
		}

		if c.manager.waitingFor != c.username {
			utils.Log("Not waiting for this user")
			return nil
		}

		var answer Answer
		err := json.Unmarshal(event.Payload, &answer)

		if err != nil {
			utils.Log(err)
			return err
		}

		c.lastAnswer = answer.Answer

		var highestScore float32
		for _, quesAns := range c.manager.questionData.Answers {
			answerScore := utils.CompareTwoStrings(answer.Answer, string(quesAns))
			if answerScore > highestScore {
				highestScore = answerScore
			}
		}

		if highestScore >= 0.8 {
			utils.Log("Correct Answer")
			c.manager.correctClient = c.username
			c.score += c.manager.questionData.Value

			RoundOver(c)
		} else {
			utils.Log("Incorrect Answer")
			c.manager.waitingFor = ""

			if CheckIfRoundOver(c) {
				return nil
			}

			if !c.manager.quesChClosed {
				utils.Log("Closing answer channel")
				c.manager.closeAnsCh <- true
			}
			if !c.manager.readLetterChClosed && c.manager.readLetterChPaused {
				utils.Log("Incorrect Answer: Resuming read letter channel")
				c.manager.resumeReadLetterCh <- true
			}
			if !c.manager.quesChClosed && c.manager.quesChPaused {
				utils.Log("Resuming question channel")
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
