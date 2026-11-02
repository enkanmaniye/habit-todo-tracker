package main

import (
	"database/sql"
	"errors"
	"fmt"
	"path/filepath"

	_ "modernc.org/sqlite" // pure-Go SQLite driver (no CGO)
)

// ErrNotFound is returned by the store when a habit id does not exist.
var ErrNotFound = errors.New("habit not found")

// Habit is one habit plus its completed days ("YYYY-MM-DD", ascending).
type Habit struct {
	ID          int64    `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Color       string   `json:"color"`
	CreatedAt   string   `json:"created_at"`
	Completions []string `json:"completions"`
}

type store struct {
	db *sql.DB
}

func openStore(path string) (*store, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return nil, err
	}
	// busy_timeout: wait instead of failing when the DB is momentarily locked.
	// foreign_keys: cascade completion rows when a habit is deleted.
	// WAL: better concurrency and durability.
	dsn := fmt.Sprintf("file:%s?_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)", filepath.ToSlash(abs))
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	// SQLite is happiest with a single writer for a small app like this.
	db.SetMaxOpenConns(1)
	if err := db.Ping(); err != nil {
		return nil, err
	}
	schema := `
CREATE TABLE IF NOT EXISTS habits (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	name        TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	color       TEXT NOT NULL DEFAULT '#6366f1',
	created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS completions (
	habit_id     INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
	day          TEXT NOT NULL,
	completed_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
	PRIMARY KEY (habit_id, day)
);`
	if _, err := db.Exec(schema); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return &store{db: db}, nil
}

func (s *store) close() { s.db.Close() }

const habitCols = "id, name, description, color, created_at"

// listHabits returns every habit with its full completion history.
func (s *store) listHabits() ([]Habit, error) {
	rows, err := s.db.Query("SELECT " + habitCols + " FROM habits ORDER BY id")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byID := map[int64]*Habit{}
	order := []int64{}
	for rows.Next() {
		h := &Habit{Completions: []string{}}
		if err := rows.Scan(&h.ID, &h.Name, &h.Description, &h.Color, &h.CreatedAt); err != nil {
			return nil, err
		}
		byID[h.ID] = h
		order = append(order, h.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	crows, err := s.db.Query("SELECT habit_id, day FROM completions ORDER BY habit_id, day")
	if err != nil {
		return nil, err
	}
	defer crows.Close()
	var id int64
	var day string
	for crows.Next() {
		if err := crows.Scan(&id, &day); err != nil {
			return nil, err
		}
		if h, ok := byID[id]; ok {
			h.Completions = append(h.Completions, day)
		}
	}
	if err := crows.Err(); err != nil {
		return nil, err
	}

	out := make([]Habit, 0, len(order))
	for _, id := range order {
		out = append(out, *byID[id])
	}
	return out, nil
}

// getHabit fetches a single habit with its completion days.
func (s *store) getHabit(id int64) (Habit, error) {
	h := Habit{Completions: []string{}}
	err := s.db.QueryRow("SELECT "+habitCols+" FROM habits WHERE id = ?", id).
		Scan(&h.ID, &h.Name, &h.Description, &h.Color, &h.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return h, ErrNotFound
	}
	if err != nil {
		return h, err
	}
	rows, err := s.db.Query("SELECT day FROM completions WHERE habit_id = ? ORDER BY day", id)
	if err != nil {
		return h, err
	}
	defer rows.Close()
	for rows.Next() {
		var day string
		if err := rows.Scan(&day); err != nil {
			return h, err
		}
		h.Completions = append(h.Completions, day)
	}
	return h, rows.Err()
}

func (s *store) createHabit(name, desc, color string) (Habit, error) {
	res, err := s.db.Exec("INSERT INTO habits (name, description, color) VALUES (?, ?, ?)", name, desc, color)
	if err != nil {
		return Habit{}, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return Habit{}, err
	}
	return s.getHabit(id)
}

func (s *store) updateHabit(id int64, name, desc, color string) (Habit, error) {
	res, err := s.db.Exec("UPDATE habits SET name = ?, description = ?, color = ? WHERE id = ?", name, desc, color, id)
	if err != nil {
		return Habit{}, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return Habit{}, ErrNotFound
	}
	return s.getHabit(id)
}

func (s *store) deleteHabit(id int64) error {
	res, err := s.db.Exec("DELETE FROM habits WHERE id = ?", id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	_, err = s.db.Exec("DELETE FROM completions WHERE habit_id = ?", id)
	return err
}

// toggleDay flips the completion flag for the given day and reports the new
// state to callers.
func (s *store) toggleDay(id int64, day string) (bool, error) {
	if _, err := s.getHabit(id); err != nil {
		return false, err
	}
	res, err := s.db.Exec("DELETE FROM completions WHERE habit_id = ? AND day = ?", id, day)
	if err != nil {
		return false, err
	}
	if n, _ := res.RowsAffected(); n > 0 {
		return false, nil
	}
	_, err = s.db.Exec("INSERT INTO completions (habit_id, day) VALUES (?, ?)", id, day)
	if err != nil {
		return false, err
	}
	return true, nil
}