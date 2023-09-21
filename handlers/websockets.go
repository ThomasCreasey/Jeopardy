package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"jeopardy/controllers"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var (
	pongWait             = 10 * time.Second
	pingInterval         = (pongWait * 9) / 10
	ErrEventNotSupported = errors.New("this event type is not supported")
)

const (
	EventSendMessage        = "server_send_message"
	EventUserJoined         = "server_user_joined"
	EventSendError          = "server_send_error"
	EventUpdatePing         = "server_update_ping"
	EventSuccessfullyJoined = "server_successfully_joined"
	EventUserKicked         = "client_kick_user"
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
}

type Manager struct {
	roomId   string
	clients  map[*Client]bool
	handlers map[string]EventHandler
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

var Managers = make(map[string]*Manager)

func GetManager(roomId string) *Manager {
	for _, manager := range Managers {
		if manager.roomId == roomId { // Check if manager for room already exists
			return manager
		}
	}

	// If manager for room doesn't exist, create one
	manager := &Manager{
		clients:  make(map[*Client]bool),
		handlers: make(map[string]EventHandler),
		roomId:   roomId,
	}

	Managers[roomId] = manager // Add manager to map of managers

	manager.setupEventHandlers() // Setup event handlers

	return manager
}

func RemoveClient(conn *websocket.Conn, client *Client, eventType string, reason string) {
	marshalledReason, err := json.Marshal(reason) // Marshal reason to bytes

	if err != nil {
		return
	}

	message := Event{ // Create event
		Type:    eventType,
		Payload: marshalledReason,
	}

	data, err := json.Marshal(message) // Marshal event to bytes

	if err != nil {
		return
	}

	conn.WriteMessage(websocket.CloseMessage, data) // Send event to client
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

	return &Client{
		manager:  manager,
		conn:     conn,
		egress:   make(chan Event),
		username: username,
		host:     len(manager.clients) == 0,
	}
}

func (m *Manager) registerClient(client *Client) {
	m.Lock()
	defer m.Unlock()
	m.clients[client] = true
}

func (m *Manager) removeClient(client *Client) {
	m.Lock()
	defer m.Unlock()
	if _, ok := m.clients[client]; ok {
		// close connection
		client.conn.Close()
		// remove
		delete(m.clients, client)
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

func handleSendMessage(event Event, c *Client) error {
	newEvent := Event{}              // Create a new event
	newEvent.Type = event.Type       // Set the type
	newEvent.Payload = event.Payload // Set the payload

	c.egress <- newEvent // Send the event to the client's egress channel

	return nil
}

func (m *Manager) setupEventHandlers() {
	m.handlers[EventSendMessage] = handleSendMessage
	m.handlers[EventUpdatePing] = handleSendMessage
	m.handlers[EventUserJoined] = UserJoinedHandler
	m.handlers[EventUserKicked] = UserKickedHandler
	m.handlers[EventSuccessfullyJoined] = SuccessfullyJoinedHandler
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

func SuccessfullyJoinedHandler(event Event, c *Client) error {
	type ClientData struct {
		Username string `json:"username"`
		Host     bool   `json:"host"`
	}

	var data []ClientData

	for client := range c.manager.clients { // Get all clients in room
		data = append(data, ClientData{ // Append client's ping to data
			Username: client.username,
			Host:     client.host,
		})
	}

	dataBytes, err := json.Marshal(data) // Marshal data to bytes

	if err != nil {
		fmt.Println(err)
		return err
	}

	var outgoingEvent Event
	outgoingEvent.Type = EventSuccessfullyJoined
	outgoingEvent.Payload = dataBytes

	c.egress <- outgoingEvent // Send event to client

	return nil
}

func UserJoinedHandler(event Event, c *Client) error {
	fmt.Println("User joined handler")

	username := string(event.Payload)

	data, err := json.Marshal(username)

	if err != nil {
		fmt.Println(err)
		return err
	}

	var outgoingEvent Event
	outgoingEvent.Type = EventUserJoined
	outgoingEvent.Payload = data

	c.manager.Broadcast(outgoingEvent) // Broadcast event to all clients in room
	return nil
}

func UserKickedHandler(event Event, c *Client) error {
	if c.host { // Only host can kick
		var userKicked UserKicked
		err := json.Unmarshal(event.Payload, &userKicked)

		if err != nil {
			fmt.Println(err)
			return err
		}
		fmt.Println(userKicked)

		for client := range c.manager.clients { // Get all clients in room
			if client.username == userKicked.Username {
				RemoveClient(client.conn, client, EventUserKicked, "You were kicked from the room")
			}
		}
	}

	return nil
}

func (m *Manager) Broadcast(event Event) {
	for client := range m.clients {
		client.egress <- event // Send event to all clients in room
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
			fmt.Println(err)
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
		fmt.Println(err)
	}

	m := GetManager(roomId)
	client := NewClient(conn, m, roomId, username)

	if client != nil { // If client was created successfully
		m.registerClient(client)

		go client.readMessages()  // Setup listener for incoming messages
		go client.writeMessages() // Setup listener for outgoing messages

		m.routeEvent(Event{ // Inform all clients in room that user joined
			Type:    EventUserJoined,
			Payload: []byte(username),
		}, client)

		m.routeEvent(Event{ // Inform client that they successfully joined
			Type: EventSuccessfullyJoined,
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
