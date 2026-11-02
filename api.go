package main
import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var colorRe = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

const defaultColor = "#6366f1"

type apiServer struct {
	store *store
}

// ---- helpers ---------------------------------------------------------------

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func httpError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func readJSONBody(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 8192)
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		httpError(w, http.StatusBadRequest, "invalid JSON body")
		return false
	}
	return true
}

func pathID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		httpError(w, http.StatusBadRequest, "invalid habit id")
		return 0, false
	}
	return id, true
}

type habitInput struct {
	name  string
	desc  string
	color string
}

func readHabitInput(w http.ResponseWriter, r *http.Request) (habitInput, bool) {
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		Color       string `json:"color"`
	}
	if !readJSONBody(w, r, &body) {
		return habitInput{}, false
	}
	name := strings.TrimSpace(body.Name)
	desc := strings.TrimSpace(body.Description)
	color := strings.TrimSpace(body.Color)

	if name == "" || len(name) > 80 {
		httpError(w, http.StatusBadRequest, "name must be 1-80 characters")
		return habitInput{}, false
	}
	if len(desc) > 300 {
		httpError(w, http.StatusBadRequest, "description must be at most 300 characters")
		return habitInput{}, false
	}
	if color == "" {
		color = defaultColor
	} else if !colorRe.MatchString(color) {
		httpError(w, http.StatusBadRequest, "color must look like #rrggbb")
		return habitInput{}, false
	}
	return habitInput{name: name, desc: desc, color: strings.ToLower(color)}, true
}

// parseDay validates a "YYYY-MM-DD" date and rejects future days.
func parseDay(w http.ResponseWriter, s string) (string, bool) {
	s = strings.TrimSpace(s)
	t, err := time.ParseInLocation("2006-01-02", s, time.Local)
	if err != nil {
		httpError(w, http.StatusBadRequest, "invalid date, expected YYYY-MM-DD")
		return "", false
	}
	if t.After(time.Now()) {
		httpError(w, http.StatusBadRequest, "you cannot reinforce a habit on a future date")
		return "", false
	}
	return s, true
}

// ---- handlers --------------------------------------------------------------

func (a *apiServer) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *apiServer) listHabits(w http.ResponseWriter, r *http.Request) {
	habits, err := a.store.listHabits()
	if err != nil {
		httpError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, habits)
}

func (a *apiServer) createHabit(w http.ResponseWriter, r *http.Request) {
	in, ok := readHabitInput(w, r)
	if !ok {
		return
	}
	h, err := a.store.createHabit(in.name, in.desc, in.color)
	if err != nil {
		httpError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, h)
}

func (a *apiServer) updateHabit(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	in, ok := readHabitInput(w, r)
	if !ok {
		return
	}
	h, err := a.store.updateHabit(id, in.name, in.desc, in.color)
	switch {
	case errors.Is(err, ErrNotFound):
		httpError(w, http.StatusNotFound, "habit not found")
	case err != nil:
		httpError(w, http.StatusInternalServerError, err.Error())
	default:
		writeJSON(w, http.StatusOK, h)
	}
}

func (a *apiServer) deleteHabit(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	err := a.store.deleteHabit(id)
	switch {
	case errors.Is(err, ErrNotFound):
		httpError(w, http.StatusNotFound, "habit not found")
	case err != nil:
		httpError(w, http.StatusInternalServerError, err.Error())
	default:
		w.WriteHeader(http.StatusNoContent)
	}
}

func (a *apiServer) toggleDay(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r)
	if !ok {
		return
	}
	var in struct {
		Date string `json:"date"`
	}
	if !readJSONBody(w, r, &in) {
		return
	}
	day, ok := parseDay(w, in.Date)
	if !ok {
		return
	}
	completed, err := a.store.toggleDay(id, day)
	switch {
	case errors.Is(err, ErrNotFound):
		httpError(w, http.StatusNotFound, "habit not found")
	case err != nil:
		httpError(w, http.StatusInternalServerError, err.Error())
	default:
		h, err := a.store.getHabit(id)
		if err != nil {
			httpError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"completed": completed, "habit": h})
	}
}
