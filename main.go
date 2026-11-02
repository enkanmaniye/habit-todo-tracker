package main

import (
	"embed"
	"flag"
	"io/fs"
	"log"
	"net/http"
	"strings"
	"time"
)

//go:embed web
var webFiles embed.FS

func main() {
	addr := flag.String("addr", "127.0.0.1:8080", "HTTP listen address")
	dbPath := flag.String("db", "habit.db", "SQLite database file path")
	flag.Parse()

	st, err := openStore(*dbPath)
	if err != nil {
		log.Fatalf("open database %q: %v", *dbPath, err)
	}
	defer st.close()

	api := &apiServer{store: st}

	webFS, err := fs.Sub(webFiles, "web")
	if err != nil {
		log.Fatalf("embedded web assets: %v", err)
	}
	_, err = fs.ReadFile(webFS, "images/logo.svg")
	if err != nil {
		log.Printf("LOGO FILE NOT FOUND: %v", err)
	} else {
		log.Println("LOGO FILE FOUND in embedded filesystem")
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", api.health)
	mux.HandleFunc("GET /api/habits", api.listHabits)
	mux.HandleFunc("POST /api/habits", api.createHabit)
	mux.HandleFunc("PUT /api/habits/{id}", api.updateHabit)
	mux.HandleFunc("DELETE /api/habits/{id}", api.deleteHabit)
	mux.HandleFunc("POST /api/habits/{id}/toggle", api.toggleDay)
	mux.Handle("/", http.FileServerFS(webFS))

	display := *addr
	if strings.HasPrefix(display, ":") {
		display = "localhost" + display
	}
	log.Printf("Habit tracker running →  http://%s", display)
	log.Fatal(http.ListenAndServe(*addr, logRequests(mux)))
}

// logRequests writes one line per HTTP request to standard output.
func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%-6s %-28s %s", r.Method, r.URL.Path, time.Since(start).Round(time.Millisecond))
	})
}
