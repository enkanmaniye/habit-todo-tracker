A complete habit / daily to-do tracker written in Go with an embedded SQLite
database and a built-in single-page frontend (no CGO required).

## Features

- **Create, edit, delete habits** — name, description and a color.
- **Daily reinforcement** — one click marks a habit as done for today
  (click again to undo).
- **Monthly heatmap** — every habit card shows a calendar heatmap for the
  selected month; colored cells are days the habit was reinforced.
- **Backfill & fix history** — click any past day in the heatmap to mark it
  done or undone.
- **Streaks** — current and best streak per habit, plus a "done today"
  counter in the header.
- **Single binary** — the web UI is embedded via `go:embed`; the SQLite file
  (WAL mode) is created automatically next to the executable.

## Run

```powershell
go run .
# or
go build -o habittracker.exe .
.\habittracker.exe
```

Then open <http://localhost:8080>.

Options: `-addr 127.0.0.1:8080`, `-db habit.db` (SQLite file path).

## API

| Method | Endpoint                      | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| GET    | `/api/health`                 | Liveness check                       |
| GET    | `/api/habits`                 | All habits incl. completion history  |
| POST   | `/api/habits`                 | `{name, description?, color?}`       |
| PUT    | `/api/habits/{id}`            | Update a habit                       |
| DELETE | `/api/habits/{id}`            | Delete habit + history               |
| POST   | `/api/habits/{id}/toggle`     | `{date: "YYYY-MM-DD"}` toggle a day  |

## Structure

```
main.go     server, routing, embedded frontend
api.go      JSON handlers & validation
store.go    SQLite persistence layer
web/        index.html, style.css, app.js (embedded in the binary)
```
