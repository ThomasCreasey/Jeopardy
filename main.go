package main

import (
	"jeopardy/handlers"
	"jeopardy/routes"
	"jeopardy/utils"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httplog"
	"github.com/unrolled/secure"
	"github.com/unrolled/secure/cspbuilder"
)

func main() {
	useLogs := false
	logger := httplog.NewLogger("httplog-example", httplog.Options{
		Concise: true,
	})

	cspBuilder := cspbuilder.Builder{
		Directives: map[string][]string{
			cspbuilder.DefaultSrc: {"'self'"},
			cspbuilder.StyleSrc:   {"'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/css/bootstrap.min.css"},
			cspbuilder.ScriptSrc:  {"'self'", "$NONCE", "https://cdn.jsdelivr.net/npm/bootstrap@5.3.1/dist/js/bootstrap.bundle.min.js", "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"},
			cspbuilder.ImgSrc:     {"'self'", "data:", "*"},
		},
	}

	secureMiddleware := secure.New(secure.Options{
		AllowedHosts:          []string{"example\\.com", ".*\\.example\\.com"},
		AllowedHostsAreRegex:  true,
		HostsProxyHeaders:     []string{"X-Forwarded-Host"},
		SSLRedirect:           true,
		SSLHost:               "",
		SSLProxyHeaders:       map[string]string{"X-Forwarded-Proto": "https"},
		STSSeconds:            31536000,
		STSIncludeSubdomains:  true,
		STSPreload:            true,
		FrameDeny:             true,
		ContentTypeNosniff:    true,
		BrowserXssFilter:      true,
		ContentSecurityPolicy: cspBuilder.MustBuild(),
		IsDevelopment:         true,
	})

	// CHANGE IN PRODUCTION
	// CHANGE TO SECURE TRUE IN PRODUCTION
	//csrfMiddleware := csrf.Protect([]byte(os.Getenv("CSRF_KEY")), csrf.Secure(false), csrf.MaxAge(0), csrf.SameSite(csrf.SameSiteStrictMode))

	r := chi.NewRouter()
	if useLogs {
		r.Use(httplog.RequestLogger(logger))
	}
	r.Use(middleware.Recoverer)
	r.Use(secureMiddleware.Handler)
	r.Use(middleware.CleanPath)
	r.Use(middleware.Heartbeat("/ping"))
	r.Handle("/css/*", http.StripPrefix("/css/", http.FileServer(http.Dir("./public/assets/css"))))
	r.Handle("/img/*", http.StripPrefix("/img/", http.FileServer(http.Dir("./public/assets/img"))))
	r.Handle("/js/*", http.StripPrefix("/js/", http.FileServer(http.Dir("./public/assets/js"))))
	r.Handle("/fonts/*", http.StripPrefix("/fonts/", http.FileServer(http.Dir("./public/assets/fonts"))))

	r.Group(func(r chi.Router) { // Errors
		r.NotFound(routes.ErrorPageNotFound)
		r.MethodNotAllowed(routes.ErrorMethodNotAllowed)
	})

	r.Group(func(r chi.Router) { // Home
		r.Get("/", routes.GetHome)
		r.Post("/create", routes.PostCreateRoom)
		r.Post("/join", routes.PostJoinRoom)

		r.Get("/lobby/{roomId}", routes.GetLobby)
	})

	r.Get("/ws", handlers.HandleWs)

	port := os.Getenv("PORT")
	utils.Log("\033[0;32mServer running on port " + port + "\033[0m")
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 3 * time.Second,
	}
	err := server.ListenAndServe()
	if err != nil {
		panic(err)
	}
}
