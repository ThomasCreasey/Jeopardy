package handlers

import (
	"encoding/json"
	"errors"
	"jeopardy/controllers"
	"jeopardy/types"
	"jeopardy/utils"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

/* ROOM STATES
	0: Waiting for players
	1: Selecting categories
	2: Answering questions
    3: Displaying Scores
	4: Game Over
	5: Waiting for user to rejoin
*/

var (
	pongWait             = 10 * time.Second
	pingInterval         = (pongWait * 9) / 10
	ErrEventNotSupported = errors.New("this event type is not supported")
)

var allColours = []string{
	"#FF5733", // Red
	"#FFC300", // Yellow
	"#FF33FF", // Pink
	"#33FF33", // Green
	"#3366FF", // Blue
	"#FF9933", // Orange
	"#9933FF", // Purple
	"#33FFFF", // Cyan
	"#FF66CC", // Rose
	"#66FF66", // Lime
	"#FF6666", // Light Red
	"#FFCC33", // Light Yellow
	"#FF66FF", // Light Pink
	"#66FF99", // Light Green
	"#6666FF", // Light Blue
	"#FF9966", // Light Orange
	"#9966FF", // Light Purple
	"#66FFFF", // Light Cyan
	"#FF99CC", // Light Rose
	"#99FF99", // Light Lime
}

const (
	EventSendMessage         = "server_send_message"
	EventUpdatePlayers       = "server_update_players"
	EventSendError           = "server_send_error"
	EventUpdatePing          = "server_update_ping"
	EventSuccessfullyJoined  = "server_successfully_joined"
	EventSetHost             = "server_set_host"
	EventUserKicked          = "client_kick_user"
	EventStartedGame         = "server_started_game"
	EventUpdateGameState     = "server_update_game_state"
	EventStartGame           = "client_start_game"
	EventSelectQuestion      = "client_select_question"
	EventUpdateQuestion      = "server_update_question"
	EventBuzz                = "client_buzz"
	EventBuzzed              = "server_buzzed"
	EventUpdateAnswerTimer   = "server_update_answer_timer"
	EventUpdateQuestionTimer = "server_update_question_timer"
)

type UserKicked struct {
	Username string `json:"username"`
}

type Client struct {
	manager  *Manager
	conn     *websocket.Conn
	egress   chan Event
	username string
	host     bool
	pingSent time.Time
	ping     uint16
	score    int
	colour   string
}

type RoomQuestionData struct {
	Question string
	Answer   string
}

type UserScore struct {
	Username string `json:"username"`
	Score    int    `json:"score"`
}

type Manager struct {
	roomId           string
	clients          map[*Client]bool
	recentlyLeft     map[string]bool
	handlers         map[string]EventHandler
	started          bool
	prevRoomState    int8
	currRoomState    int8
	questionData     RoomQuestionData
	categories       []types.CategoryData
	pauseAnsCh       chan bool
	pauseQuesCh      chan bool
	resumeAnsCh      chan bool
	resumeQuesCh     chan bool
	questionState    string
	availableColours []string
	buzzed           []string
	scores           []UserScore
	waitingFor       string
	sync.RWMutex
}

type Event struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type EventHandler func(event Event, c *Client) error

type ClientPing struct {
	Username string `json:"username"`
	Ping     uint16 `json:"ping"`
}

type GameUser struct {
	Username string `json:"username"`
	Ping     uint16 `json:"ping"`
	Score    int    `json:"score"`
	Colour   string `json:"colour"`
}

type GameState struct {
	RoomState int8            `json:"roomState"`
	Data      json.RawMessage `json:"data"`
}

func (m *Manager) setupEventHandlers() {
	m.handlers[EventSendMessage] = handleSendMessage
	m.handlers[EventUpdatePing] = handleSendMessage
	m.handlers[EventUpdatePlayers] = handleSendMessage
	m.handlers[EventSuccessfullyJoined] = handleSendMessage
	m.handlers[EventUpdateGameState] = UpdateGameStateHandler
	m.handlers[EventSetHost] = handleSendMessage
	m.handlers[EventUserKicked] = UserKickedHandler
	m.handlers[EventStartGame] = StartGameHandler
	m.handlers[EventStartedGame] = handleSendMessage
	m.handlers[EventSelectQuestion] = SelectQuestionHandler
	m.handlers[EventUpdateQuestion] = handleSendMessage
	m.handlers[EventBuzz] = BuzzHandler
	m.handlers[EventBuzzed] = handleSendMessage
	m.handlers[EventUpdateAnswerTimer] = handleSendMessage
	m.handlers[EventUpdateQuestionTimer] = handleSendMessage
}

var Managers = make(map[string]*Manager)

func GetManager(roomId string) *Manager {
	for _, manager := range Managers {
		if manager.roomId == roomId { // Check if manager for room already exists
			return manager
		}
	}

	colourCopy := make([]string, len(allColours))
	copy(colourCopy, allColours)

	// If manager for room doesn't exist, create one
	manager := &Manager{
		clients:          make(map[*Client]bool),
		handlers:         make(map[string]EventHandler),
		recentlyLeft:     make(map[string]bool),
		scores:           make([]UserScore, 0),
		currRoomState:    0,
		prevRoomState:    0,
		roomId:           roomId,
		pauseQuesCh:      make(chan bool),
		pauseAnsCh:       make(chan bool),
		resumeQuesCh:     make(chan bool),
		resumeAnsCh:      make(chan bool),
		availableColours: colourCopy,
	}

	Managers[roomId] = manager // Add manager to map of managers

	manager.setupEventHandlers() // Setup event handlers

	return manager
}

func RemoveClient(conn *websocket.Conn, client *Client, eventType string, reason string) {
	conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, reason)) // Send event to client
	conn.Close()

	if client != nil {
		delete(client.manager.clients, client) // Remove client from room
	}
}

func NewClient(conn *websocket.Conn, manager *Manager, roomId string, username string) *Client {
	if username == "" || username == "undefined" {
		RemoveClient(conn, nil, EventSendError, "Username must be provided")
		return nil
	}

	for client := range manager.clients {
		if client.username == username {
			RemoveClient(conn, nil, EventSendError, "Username is taken")
			return nil
		}
	}

	if manager.started {
		var foundClient bool
		for client := range manager.recentlyLeft {
			if client == username {
				foundClient = true
				break
			}
		}

		if !foundClient {
			RemoveClient(conn, nil, EventSendError, "Game has already started")
			return nil
		}

		// set room state back to before
		manager.currRoomState = manager.prevRoomState

		manager.Broadcast(Event{
			Type: EventUpdateGameState,
		})

	}

	return &Client{
		manager:  manager,
		conn:     conn,
		egress:   make(chan Event),
		username: username,
		host:     len(manager.clients) == 0,
		score:    0,
	}
}

func (c *Client) SetRandomColour() {
	m := c.manager
	m.Lock()
	defer m.Unlock()

	if len(m.availableColours) == 0 {
		return
	}

	randomIndex := rand.Intn(len(m.availableColours))

	colour := m.availableColours[randomIndex]

	m.availableColours = append(m.availableColours[:randomIndex], m.availableColours[randomIndex+1:]...)

	c.colour = colour
}

func (m *Manager) registerClient(client *Client) {
	m.Lock()
	defer m.Unlock()
	m.clients[client] = true
}

func (m *Manager) gracefulShutdown(reason string) {
	for client := range m.clients {
		client.conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, "Server is shutting down: "+reason))
		client.conn.Close()
	}
}

func (m *Manager) removeClient(client *Client) {
	m.Lock()
	defer m.Unlock()

	if _, ok := m.clients[client]; ok {
		defer client.conn.Close()

		m.availableColours = append(m.availableColours, client.colour)

		delete(m.clients, client)

		wasHost := client.host

		var data []GameUser

		for client := range m.clients { // Get all clients in room
			data = append(data, GameUser{ // Append client's ping to data
				Username: client.username,
				Ping:     client.ping,
				Score:    client.score,
				Colour:   client.colour,
			})
		}

		if wasHost {
			client.host = false
			for otherClient := range m.clients {
				otherClient.host = true

				data := true
				dataBytes, err := json.Marshal(data) // Marshal data to bytes

				if err != nil {
					utils.Log(err)
					return
				}
				m.routeEvent(Event{
					Type:    EventSetHost,
					Payload: dataBytes,
				}, otherClient)

				m.routeEvent(Event{ // Inform client that they successfully joined
					Type: EventUpdateGameState,
				}, otherClient)
				break
			}
		}

		dataBytes, err := json.Marshal(data) // Marshal data to bytes

		if err != nil {
			utils.Log(err)
			return
		}

		client.manager.Broadcast(Event{ // Inform all clients in room that user left
			Type:    EventUpdatePlayers,
			Payload: dataBytes,
		})

		if !m.started {
			return
		}

		client.manager.prevRoomState = client.manager.currRoomState
		client.manager.currRoomState = 5

		dataBytes, err = json.Marshal(client.username)
		if err != nil {
			utils.Log(err)
			return
		}

		var updateEvent Event
		updateEvent.Type = EventUpdateGameState
		updateEvent.Payload = dataBytes

		client.manager.Broadcast(updateEvent)

		username := client.username

		client.manager.recentlyLeft[username] = true // Add client to recently left map
		go func() {
			timer := time.NewTimer(15 * time.Second)
			for range timer.C {
				if client.manager.recentlyLeft[username] {
					delete(client.manager.recentlyLeft, username)

					if len(client.manager.clients) < 2 {
						client.manager.gracefulShutdown("Not enough players")
					}
				}
			}
		}()
	}
}

func checkOrigin(r *http.Request) bool {

	// Grab the request origin
	origin := r.Header.Get("Origin")
	_ = origin

	return true
}

func (m *Manager) routeEvent(event Event, c *Client) error {
	// Check if Handler is present in Map
	if handler, ok := m.handlers[event.Type]; ok {
		// Execute the handler and return any err
		if err := handler(event, c); err != nil {
			return err
		}
		return nil
	} else {
		return ErrEventNotSupported
	}
}

func (c *Client) readMessages() {
	defer func() {
		c.manager.removeClient(c)
	}()

	c.conn.SetReadLimit(512) // Set the max size of a message
	// Configure Wait time for Pong response, use Current time + pongWait
	// This has to be done here to set the first initial timer.
	if err := c.conn.SetReadDeadline(time.Now().Add(pongWait)); err != nil {
		log.Println(err)
		return
	}
	// Configure how to handle Pong responses
	c.conn.SetPongHandler(c.pongHandler)

	// Loop Forever
	for {
		// ReadMessage is used to read the next message in queue
		// in the connection
		_, payload, err := c.conn.ReadMessage()

		if err != nil {
			// If Connection is closed, we will Recieve an error here
			// We only want to log Strange errors, but simple Disconnection
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error reading message: %v", err)
			}
			break // Break the loop to close conn & Cleanup
		}
		// Marshal incoming data into a Event struct
		var request Event
		if err := json.Unmarshal(payload, &request); err != nil {
			log.Printf("error marshalling message: %v", err)
			break // Breaking the connection here might be harsh xD
		}
		// Route the Event
		if err := c.manager.routeEvent(request, c); err != nil {
			log.Println("Error handeling Message: ", err)
		}
	}
}

func (c *Client) writeMessages() {
	// Create a ticker that triggers a ping at given interval
	ticker := time.NewTicker(pingInterval)
	defer func() {
		ticker.Stop()
		// Graceful close if this triggers a closing
		c.manager.removeClient(c)
	}()

	for {
		select {
		case message, ok := <-c.egress:
			// Ok will be false Incase the egress channel is closed
			if !ok {
				// Manager has closed this connection channel, so communicate that to frontend
				if err := c.conn.WriteMessage(websocket.CloseMessage, nil); err != nil {
					// Log that the connection is closed and the reason
					log.Println("connection closed: ", err)
				}
				// Return to close the goroutine
				return
			}

			data, err := json.Marshal(message)
			if err != nil {
				log.Println(err)
				return // closes the connection, should we really
			}
			// Write a Regular text message to the connection
			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				log.Println(err)
			}
		case <-ticker.C:
			// Send the Ping
			c.pingSent = time.Now() // Set the time when the ping was sent
			if err := c.conn.WriteMessage(websocket.PingMessage, []byte{}); err != nil {
				log.Println("writemsg: ", err)
				return // return to break this goroutine triggeing cleanup
			}
		}

	}
}

func (c *Client) pongHandler(pongMsg string) error {
	// Current time + Pong Wait time
	pingSent := c.pingSent                                   // Get the time when the ping was sent
	c.ping = uint16(time.Since(pingSent) / time.Millisecond) // Calculate the ping
	return c.conn.SetReadDeadline(time.Now().Add(pongWait))
}

func (m *Manager) Broadcast(event Event) {
	for client := range m.clients {
		m.routeEvent(event, client)
	}
}

func PingTicker() {
	for _, manager := range Managers { // Loop through all rooms
		var data []ClientPing
		for client := range manager.clients { // Get all clients in room
			data = append(data, ClientPing{ // Append client's ping to data
				Username: client.username,
				Ping:     client.ping,
			})
		}
		dataBytes, err := json.Marshal(data) // Marshal data to bytes

		if err != nil {
			utils.Log(err)
			return
		}

		event := Event{
			Type:    EventUpdatePing,
			Payload: dataBytes,
		}

		manager.Broadcast(event) // Broadcast event to all clients in room
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin:     checkOrigin,
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func HandleWs(w http.ResponseWriter, r *http.Request) {
	roomId := r.URL.Query().Get("roomId")
	session, _ := controllers.Store.Get(r, "jeopardy")

	var username string

	if session.Values["username"] == nil {
		username = "undefined"
	} else {
		username = session.Values["username"].(string)
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		utils.Log(err)
	}

	m := GetManager(roomId)
	client := NewClient(conn, m, roomId, username)
	if client != nil { // If client was created successfully
		m.registerClient(client)

		client.SetRandomColour()
		go client.readMessages()  // Setup listener for incoming messages
		go client.writeMessages() // Setup listener for outgoing messages

		var data []GameUser

		for client := range m.clients { // Get all clients in room
			data = append(data, GameUser{ // Append client's ping to data
				Username: client.username,
				Ping:     client.ping,
				Score:    client.score,
				Colour:   client.colour,
			})
		}

		dataBytes, err := json.Marshal(data) // Marshal data to bytes

		if err != nil {
			utils.Log(err)
			return
		}

		client.manager.Broadcast(Event{ // Inform all clients in room that user left
			Type:    EventUpdatePlayers,
			Payload: dataBytes,
		})

		var joinedData struct {
			Username string `json:"username"`
			IsHost   bool   `json:"isHost"`
		}

		joinedData.Username = client.username
		joinedData.IsHost = client.host

		dataBytes, err = json.Marshal(joinedData) // Marshal data to bytes

		if err != nil {
			utils.Log(err)
			return
		}

		m.routeEvent(Event{ // Inform client that they successfully joined
			Type:    EventSuccessfullyJoined,
			Payload: dataBytes,
		}, client)

		m.routeEvent(Event{
			Type: EventUpdateGameState,
		}, client)

	}
}

func init() {
	ticker := time.NewTicker(15 * time.Second)

	go func() { // Send client's ping in each room every tick
		for range ticker.C {
			PingTicker()
		}
	}()
}
