package routes

import (
	"encoding/json"
	"jeopardy/controllers"
	"jeopardy/types"
	"jeopardy/utils"
	"net/http"
	"text/template"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/csrf"
)

func GetHome(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles("./public/templates/home.html")
	if err != nil {
		utils.Log(err)
		return
	}

	w.Header().Set("X-CSRF-Token", csrf.Token(r))
	err = tmpl.ExecuteTemplate(w, "home.html", map[string]interface{}{
		csrf.TemplateTag: csrf.TemplateField(r),
	})

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		utils.Log(err)
		return
	}
}

func PostCreateRoom(w http.ResponseWriter, r *http.Request) {
	var body *types.CreateRoomBody

	err := json.NewDecoder(r.Body).Decode(&body)

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		utils.Log(err)
		return
	}

	if body.Username == "" {
		w.WriteHeader(http.StatusBadRequest)
		utils.Log("Username is empty")
		return
	}

	session, _ := controllers.Store.Get(r, "jeopardy")
	session.Values["username"] = body.Username
	err = session.Save(r, w)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		utils.Log(err)
		return
	}

	roomCodeTaken := true

	for roomCodeTaken {
		roomCode := utils.GenerateRoomCode()
		var dbRoom *types.Room
		room := controllers.DB.First(&dbRoom, "id = ?", roomCode)
		if room.Error != nil {
			roomCodeTaken = false
			controllers.DB.Create(&types.Room{
				ID: roomCode,
			})

			w.Write([]byte(roomCode))
		}
	}
}

func PostJoinRoom(w http.ResponseWriter, r *http.Request) {
	var body *types.JoinRoomBody

	err := json.NewDecoder(r.Body).Decode(&body)

	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		utils.Log(err)
		return
	}

	if body.Username == "" {
		http.Error(w, "Username is empty", http.StatusBadRequest)
		return
	}

	session, _ := controllers.Store.Get(r, "jeopardy")
	session.Values["username"] = body.Username
	session.Save(r, w)

	roomExists := utils.CheckRoomExists(body.RoomId)

	if !roomExists {
		http.Error(w, "Room does not exist", http.StatusBadRequest)
		return
	}

	w.Write([]byte(body.RoomId))
}

func GetLobby(w http.ResponseWriter, r *http.Request) {
	roomId := chi.URLParam(r, "roomId")

	roomExists := utils.CheckRoomExists(roomId)

	if !roomExists {
		http.Redirect(w, r, "/", http.StatusSeeOther)
	}

	tmpl, err := template.ParseFiles("./public/templates/lobby.html")
	if err != nil {
		utils.Log(err)
		return
	}

	err = tmpl.Execute(w, nil)

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		utils.Log(err)
		return
	}
}
