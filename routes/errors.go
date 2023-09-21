package routes

import (
	"net/http"
)

func ErrorPageNotFound(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(404)
	_, err := w.Write([]byte("404: Page Not Found"))
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

func ErrorMethodNotAllowed(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(405)
	_, err := w.Write([]byte("405: Method is not valid"))
	if err != nil {
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}
