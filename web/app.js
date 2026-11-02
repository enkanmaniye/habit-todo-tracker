/* HabitFlow frontend logic (vanilla JS, no dependencies) */
(() => {
  "use strict";

  /* ==========================================
     CONSTANTS AND STATE
  ========================================== */

  const PALETTE = [
    "#BA354D", "#B64D70", "#CD7182", 
    "#C66A43", "#C66B56", "#B85C49",
    "#C09A35", "#D1A943", "#CDB58E", 
    "#A8BB50", "#788F3F", "#83A68A" 
  ];

  const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  let currentLanguage = "en";

  function getFutureMessages() {
    return Array.from(
      { length: 10 },
      (_, index) => t(`futureMessage${index + 1}`)
    );
  }

let futureMessageIndex = 0;

  function getTranslations() {
    return TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;
  }

  function t(key) {
    return getTranslations().strings[key] || key;
  }
  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));

  const state = {
    habits: [],
    loading: true
  };

  // Stores the month currently displayed in each habit's mini heatmap.
  const monthSel = new Map();


  /* ==========================================
     DATE HELPERS
  ========================================== */

  const pad = (number) => String(number).padStart(2, "0");

  const fmt = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const todayStr = () => fmt(new Date());

  const currentYM = () => todayStr().slice(0, 7);

  // Parse YYYY-MM-DD as a local date, avoiding UTC date shifts.
  const parseYMD = (ymd) => {
    const [year, month, day] = ymd.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const dayDiff = (first, second) =>
    Math.round((second - first) / 86400000);

  function weekStart(date) {
    const result = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    // Monday is the first day of the week.
    result.setDate(result.getDate() - ((result.getDay() + 6) % 7));

    return result;
  }


  /* ==========================================
     API
  ========================================== */

  async function api(path, { method = "GET", body } = {}) {
    const options = {
      method,
      headers: {}
    };

    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
    const response = await fetch(path, options);

    let data = null;

    try {
      data = await response.json();
    } catch {
      // Some responses, such as DELETE, may have no JSON body.
    }

    if (!response.ok) {
      throw new Error(
        (data && data.error) ||
        `${response.status} ${response.statusText}`
      );
    }

    return data;
  }


  /* ==========================================
     STREAK CALCULATIONS
  ========================================== */

  function currentStreak(done) {
  const date = new Date();

  if (!done.has(fmt(date))) {
    date.setDate(date.getDate() - 1);
  }

  let streak = 0;

  while (done.has(fmt(date))) {
    streak++;
    date.setDate(date.getDate() - 1);
  }

  return streak;
}

  /* ==========================================
     MAIN RENDERING
  ========================================== */
/*
  function updateSummary(doneToday) {
    const pill = $("#summaryPill");

    if (!pill) return;

    if (state.habits.length === 0) {
      pill.hidden = true;
      return;
    }

    pill.hidden = false;
    pill.innerHTML =
      `<b>${doneToday}/${state.habits.length}</b> habits done today`;
  }
      ПОКАЗ ТИПА 3/5 HABITS COMPLETED
*/
  function updateSummary(doneToday) {
    const pill = $("#summaryPill");

    if (!pill) return;

    const total = state.habits.length;

    if (total === 0) {
      pill.hidden = true;
      return;
    }

    pill.hidden = false;

    const percentage = (doneToday / total) * 100;

    pill.innerHTML = `
      <div class="summary-progress-track">
        <div
          class="summary-progress-fill"
          style="width: ${percentage}%"
        ></div>
      </div>
    `;
}
  function render() {
    const list = $("#habitList");

    if (!list) return;

    list.replaceChildren();

    const loading = $("#loading");
    const emptyState = $("#emptyState");

    if (loading) {
      loading.hidden = !state.loading;
    }

    if (emptyState) {
      emptyState.hidden =
        state.loading || state.habits.length !== 0;
    }

    let doneToday = 0;

    for (const habit of state.habits) {
      const done = new Set(habit.completions || []);

      if (done.has(todayStr())) {
        doneToday++;
      }

      list.appendChild(habitCard(habit, done));
    }

    updateSummary(doneToday);
  }


  /* ==========================================
     HABIT CARD
  ========================================== */

  function habitCard(habit, done) {
    const doneToday = done.has(todayStr());
    const streak = currentStreak(done);
    const ym = monthSel.get(habit.id) || currentYM();

    const card = document.createElement("article");

    card.className = "card";
    card.tabIndex = 0;
    card.setAttribute("role", "group");
    card.setAttribute(
      "aria-label",
      `${habit.name}. Press Enter to view analytics.`
    );

    card.style.setProperty(
      "--c",
      habit.color || "#d97598"
    );

    // Clicking the card opens analytics.
    // Buttons inside the card keep their own functionality.
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      openHabitAnalytics(habit);
    });

    // Keyboard access for the card.
    card.addEventListener("keydown", (event) => {
      if (event.target !== card) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openHabitAnalytics(habit);
      }
    });

    card.innerHTML = `
      <div class="card-top">
        <div class="title-row">
          <span class="dot"></span>
          <h2>${esc(habit.name)}</h2>
        </div>

        <div class="icon-row">
          <button
            type="button"
            class="icon-btn act-edit"
            title="Edit habit"
            aria-label="Edit habit"
          ></button>

          <button
            type="button"
            class="icon-btn act-del"
            title="Delete habit"
            aria-label="Delete habit"
          ></button>
        </div>
      </div>

      ${
        habit.description
          ? `<p class="desc">${esc(habit.description)}</p>`
          : ""
      }

      <div class="card-actions">
        <button
          type="button"
          class="toggle-btn ${doneToday ? "done" : ""}"
          aria-pressed="${doneToday}"
        >
          ${doneToday ? " Reinforced today" : "○ Mark as done today"}
        </button>

        <div class="streak">
          ${
            streak > 0
              ? `<span class="fire"> ${streak} day${streak === 1 ? "" : "s"}</span>
                 <span class="sep">·</span>`
              : ""
          }
        </div>
      </div>

      <div class="heat">
        <div class="heat-head">
          <button
            type="button"
            class="nav-btn heat-prev"
            aria-label="Previous month"
          >‹</button>

          <div class="heat-title"></div>

          <button
            type="button"
            class="nav-btn heat-next"
            aria-label="Next month"
          >›</button>
        </div>

        <div class="heat-grid"></div>
        <div class="heat-foot" hidden></div>
      </div>
    `;


    /* ---------- Complete today ---------- */

    const toggleBtn = $(".toggle-btn", card);

    toggleBtn.addEventListener("click", async () => {
      toggleBtn.disabled = true;

      try {
        await toggleDay(habit.id, todayStr());
      } finally {
        toggleBtn.disabled = false;
      }
    });


    /* ---------- Edit and delete ---------- */

    $(".act-edit", card).addEventListener("click", () => {
      openHabitDialog(habit);
    });

    $(".act-del", card).addEventListener("click", () => {
      confirmDelete(habit);
    });


    const grid = $(".heat-grid", card);
    buildHeatmap(grid, null, null, habit, done, ym);
    return card;
  }


  /* ==========================================
     MINI HEATMAP INSIDE EACH CARD
  ========================================== */

  
function buildHeatmap(grid, title, foot, habit, done, ym) {
    if (!grid) return;

    grid.replaceChildren();

    // Все привычки нужны для расчёта общей consistency.
    const allHabits = state.habits || [habit];
    const totalHabits = allHabits.length;

    // Считаем количество выполненных привычек для каждой даты.
    const completionCounts = new Map();

    allHabits.forEach(item => {
        const dates = new Set(item.completions || []);

        dates.forEach(date => {
            completionCounts.set(
                date,
                (completionCounts.get(date) || 0) + 1
            );
        });
    });

    // Начало текущей недели (понедельник).
    const today = new Date();
    const currentWeekStart = weekStart(today);

    // Начало предыдущей недели.
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    // Всего 14 дней: предыдущая неделя + текущая.
    for (let i = 0; i < 14; i++) {
        const date = new Date(previousWeekStart);
        date.setDate(date.getDate() + i);

        const dateString = fmt(date);
        const isFuture = dateString > todayStr();
        const completedHabits = completionCounts.get(dateString) || 0;

        // Уровень насыщенности от 0 до 4.
        const level = isFuture || totalHabits === 0
            ? 0
            : Math.round((completedHabits / totalHabits) * 4);

        const cell = document.createElement("div");

        cell.className = "consistency-cell";
        cell.dataset.level = level;
        cell.title =
            `$DIL1: $DIL2/$DIL3 habits completed`;

        if (dateString === todayStr()) {
            cell.classList.add("today");
        }

        grid.appendChild(cell);
    }
}

  /* ==========================================
     INDIVIDUAL HABIT ANALYTICS
  ========================================== */

  let analyticsHabit = null;
  let analyticsMode = "month";
  let analyticsAnchor = new Date();

  const analyticsDialog = $("#habitAnalyticsDialog");

  function openHabitAnalytics(habit) {
    // Analytics are optional: the main habit tracker still works
    // if the analytics dialog has not been added to index.html.
    if (!analyticsDialog) {
      console.error("Analytics dialog is missing from index.html");
      return;
    }

    analyticsHabit = habit;
    analyticsMode = "month";
    analyticsAnchor = new Date();

    $("#analyticsTitle").textContent = ` ${habit.name}`;

    $("#analyticsDescription").textContent =
      habit.description || "Your personal activity and consistency";

    document.querySelectorAll(".analytics-tab").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.period === "month"
      );
    });

    renderHabitAnalytics();

    if (!analyticsDialog.open) {
      analyticsDialog.showModal();
    }
  }


  /* ==========================================
     ANALYTICS: MAIN RENDER FUNCTION
  ========================================== */

  function renderHabitAnalytics() {
    if (!analyticsHabit || !analyticsDialog) return;

    const done = new Set(analyticsHabit.completions || []);
    const today = todayStr();

    let start;
    let end;
    let label;

    if (analyticsMode === "week") {
      start = weekStart(analyticsAnchor);

      end = new Date(start);
      end.setDate(end.getDate() + 6);

      label =
        `${start.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric"
        })} – ` +
        `${end.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric"
        })}`;

      $("#analyticsChartTitle").textContent = "Daily activity";

      $("#analyticsChartDescription").textContent =
        "Your completion history for each weekday";

    } else {
      start = new Date(
        analyticsAnchor.getFullYear(),
        analyticsAnchor.getMonth(),
        1
      );

      end = new Date(
        analyticsAnchor.getFullYear(),
        analyticsAnchor.getMonth() + 1,
        0
      );

      label =
        `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;

      $("#analyticsChartTitle").textContent = "Weekly activity";

      $("#analyticsChartDescription").textContent =
        "Number of completed days in each week";
    }

    $("#analyticsPeriodLabel").textContent = label;


    /* ---------- Completion statistics ---------- */

    // Only dates up to today count toward the success rate.
    const todayDate = parseYMD(today);

    const effectiveEnd =
      end < todayDate ? end : todayDate;

    const elapsedDays =
      effectiveEnd < start
        ? 0
        : dayDiff(start, effectiveEnd) + 1;

    const periodDates = [...done].filter((dateString) => {
      return (
        dateString >= fmt(start) &&
        dateString <= fmt(end) &&
        dateString <= today
      );
    });

    const completed = periodDates.length;

    const rate = elapsedDays > 0
      ? Math.round((completed / elapsedDays) * 100)
      : 0;

    $("#analyticsCompleted").textContent = completed;
    $("#analyticsRate").textContent = `${rate}%`;


    /* ---------- Navigation limits ---------- */

    $("#analyticsNext").disabled = false;

    /* ---------- Heatmap and chart ---------- */

    renderAnalyticsHeatmap(start, end, done, today);

    if (analyticsMode === "week") {
      renderWeeklyChart(start, done, today);
    } else {
      renderMonthlyChart(start, end, done, today);
    }
  }


  /* ==========================================
     ANALYTICS: HEATMAP
  ========================================== */

  function renderAnalyticsHeatmap(start, end, done, today) {
    const grid = $("#analyticsHeatmap");

    grid.replaceChildren();
  
    // Weekday headings.
   const weekdays = getTranslations().weekdays;

  for (const weekday of weekdays) {
    const heading = document.createElement("div");

    heading.className = "analytics-weekday";
    heading.textContent = weekday;

    grid.appendChild(heading);
}

    const offset = (start.getDay() + 6) % 7;

    // In month mode, add empty cells before day 1.
    if (analyticsMode === "month") {
      for (let i = 0; i < offset; i++) {
        const blank = document.createElement("div");

        blank.className = "analytics-day blank";
        grid.appendChild(blank);
      }
    }

    const totalDays =
      analyticsMode === "week"
        ? 7
        : end.getDate();

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(start);

      date.setDate(start.getDate() + i);

      const dateString = fmt(date);

      const isDone = done.has(dateString);
      const isFuture = dateString > today;
      const isToday = dateString === today;

      const cell = document.createElement("div");

      cell.className = "analytics-day";

      if (isDone) cell.classList.add("done");
      if (isFuture) cell.classList.add("future");
      if (isToday) cell.classList.add("today");

      cell.textContent = date.getDate();

      cell.title =
      `${dateString}: ` +
      (
        isDone
        ? t("completed") + " ✓"
        : isFuture
        ? t("upcoming")
        : t("notCompleted")
      );

      grid.appendChild(cell);
  }
}

  /* ==========================================
     ANALYTICS: WEEKLY HISTOGRAM
  ========================================== */

function renderWeeklyChart(start, done, today) {
  const chart = $("#analyticsChart");

  chart.replaceChildren();

  // Get weekdays in the currently selected language.
  const weekdays = getTranslations().weekdays;

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);

    date.setDate(start.getDate() + i);

    const dateString = fmt(date);

    const completed = done.has(dateString);
    const future = dateString > today;

    const group = document.createElement("div");
    group.className = "analytics-bar-group";

    const value = document.createElement("span");
    value.className = "analytics-bar-value";
    value.textContent =
      future ? "—" : completed ? "1" : "0";

    const bar = document.createElement("div");
    bar.className = "analytics-bar";

    // Fixed pixel heights avoid depending on percentage-height
    // calculations from the parent container.
    bar.style.height = completed ? "90px" : "3px";

    if (!completed) {
      bar.style.opacity = future ? "0.2" : "0.35";
    }

    const label = document.createElement("span");
    label.className = "analytics-bar-label";
    label.textContent = weekdays[i];

    group.append(value, bar, label);
    chart.appendChild(group);
  }
}

  /* ==========================================
     ANALYTICS: MONTHLY HISTOGRAM
  ========================================== */

  function renderMonthlyChart(start, end, done, today) {
    const chart = $("#analyticsChart");

    chart.replaceChildren();

    const daysInMonth = end.getDate();
    const offset = (start.getDay() + 6) % 7;

    const numberOfWeeks =
      Math.ceil((offset + daysInMonth) / 7);

    const counts = Array(numberOfWeeks).fill(0);
    const available = Array(numberOfWeeks).fill(0);

    // Count completed days and elapsed days in each calendar week.
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        start.getFullYear(),
        start.getMonth(),
        day
      );

      const dateString = fmt(date);

      const weekIndex =
        Math.floor((offset + day - 1) / 7);

      if (dateString <= today) {
        available[weekIndex]++;

        if (done.has(dateString)) {
          counts[weekIndex]++;
        }
      }
    }

    const maxAvailable = Math.max(...available, 1);

    for (let i = 0; i < numberOfWeeks; i++) {
      const group = document.createElement("div");
      group.className = "analytics-bar-group";

      const value = document.createElement("span");
      value.className = "analytics-bar-value";
      value.textContent = `${counts[i]}/${available[i]}`;

      const bar = document.createElement("div");
      bar.className = "analytics-bar";

      const height = available[i] > 0
      ? (counts[i] / available[i]) * 90
      : 0;

      bar.style.height = `${Math.max(height, 3)}px`;

      if (available[i] === 0) {
        bar.style.opacity = "0.2";
      }

      const label = document.createElement("span");
      label.className = "analytics-bar-label";
      label.textContent = `${t("week")} ${i + 1}`;

      group.append(value, bar, label);
      chart.appendChild(group);
    }
  }

  /* ==========================================
     ANALYTICS: EVENT LISTENERS
  ========================================== */

  if (analyticsDialog) {

    // Switch between weekly and monthly analytics.
    document.querySelectorAll(".analytics-tab").forEach((button) => {
      button.addEventListener("click", () => {
        analyticsMode = button.dataset.period;

        document.querySelectorAll(".analytics-tab").forEach((tab) => {
          tab.classList.toggle("active", tab === button);
        });

        analyticsAnchor = new Date();

        renderHabitAnalytics();
      });
    });


    // Previous week or month.
    $("#analyticsPrev").addEventListener("click", () => {
      if (analyticsMode === "week") {
        analyticsAnchor.setDate(
          analyticsAnchor.getDate() - 7
        );
      } else {
        analyticsAnchor.setDate(1);
        analyticsAnchor.setMonth(
          analyticsAnchor.getMonth() - 1
        );
      }

      renderHabitAnalytics();
    });


    // Next week or month.
    $("#analyticsNext").addEventListener("click", () => {
      if ($("#analyticsNext").disabled) return;

      if (analyticsMode === "week") {
        analyticsAnchor.setDate(
          analyticsAnchor.getDate() + 7
        );
      } else {
        analyticsAnchor.setDate(1);
        analyticsAnchor.setMonth(
          analyticsAnchor.getMonth() + 1
        );
      }

      renderHabitAnalytics();
    });


    // Close analytics dialog.
    $("#analyticsClose").addEventListener("click", () => {
      analyticsDialog.close();
    });
  }

  
  /* ==========================================
     HABIT ACTIONS
  ========================================== */

  async function toggleDay(id, day) {
      // Prevent completing habits on future dates
      if (day > todayStr()) {
        const futureMessages = getFutureMessages();
        
        const message =
        futureMessages[
          futureMessageIndex % futureMessages.length
        ];
        
      toast(message);
      futureMessageIndex++;
      return;
}
    try {
      const response = await api(
        `/api/habits/${id}/toggle`,
        {
          method: "POST",
          body: { date: day }
        }
      );

      const index = state.habits.findIndex(
        (habit) => habit.id === id
      );

      if (index >= 0) {
        state.habits[index] = response.habit;
      }

      // Keep analytics data synchronized if the same habit is open.
      if (analyticsHabit && analyticsHabit.id === id) {
        analyticsHabit = response.habit;
      }

      render();

      if (analyticsDialog && analyticsDialog.open) {
        renderHabitAnalytics();
      }

      toast(
        response.completed
          ? `Reinforced for ${day} ✓`
          : `Marked as not done for ${day}`
      );

    } catch (error) {
      toast(error.message, "err");
    }
  }


  /* ==========================================
     HABIT CREATE / EDIT DIALOG
  ========================================== */

  const dlg = $("#habitDialog");
  const nameInput = $("#inName");
  const descInput = $("#inDesc");
  const customColor = $("#customColor");

  function buildSwatches() {
    const wrap = $("#swatches");

    wrap.replaceChildren();

    for (const color of PALETTE) {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "swatch";
      button.style.setProperty("--sw", color);
      button.dataset.color = color;
      button.setAttribute("aria-label", `Color ${color}`);

      button.addEventListener("click", () => {
        setColor(color);
      });

      wrap.appendChild(button);
    }
  }

  function setColor(color) {
    dlg.dataset.color = color;
    customColor.value = color;

    for (const button of $("#swatches").children) {
      button.classList.toggle(
        "active",
        button.dataset.color === color
      );
    }
  }

  function openHabitDialog(habit) {
    $("#dlgTitle").textContent =
      habit ? "Edit habit" : "New habit";

    $("#btnSave").textContent =
      habit ? "Save changes" : "Create habit";

    nameInput.value = habit ? habit.name : "";
    descInput.value = habit ? habit.description : "";

    dlg.dataset.editId =
      habit ? String(habit.id) : "";

    setColor(
      habit
        ? (habit.color || PALETTE[0])
        : PALETTE[state.habits.length % PALETTE.length]
    );

    dlg.showModal();

    requestAnimationFrame(() => {
      nameInput.setSelectionRange(0, 0);
      nameInput.focus();
    });
  }


  /* ---------- Save habit ---------- */

  $("#habitForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = dlg.dataset.editId || "";

    const payload = {
      name: nameInput.value.trim(),
      description: descInput.value.trim(),
      color: dlg.dataset.color || PALETTE[0]
    };

    if (!payload.name) {
      nameInput.focus();
      toast("Please give the habit a name", "err");
      return;
    }

    try {
      const habit = id
        ? await api(`/api/habits/${id}`, {
            method: "PUT",
            body: payload
          })
        : await api("/api/habits", {
            method: "POST",
            body: payload
          });

      if (id) {
        const index = state.habits.findIndex(
          (item) => String(item.id) === id
        );

        if (index >= 0) {
          state.habits[index] = habit;
        }

        if (analyticsHabit && String(analyticsHabit.id) === id) {
          analyticsHabit = habit;
        }

      } else {
        state.habits.push(habit);
      }

      dlg.close();

      render();

      toast(
        id ? "Habit updated" : "Habit created "
      );

    } catch (error) {
      toast(error.message, "err");
    }
  });


  $("#btnCancel").addEventListener("click", () => {
    dlg.close();
  });


  customColor.addEventListener("input", () => {
    setColor(customColor.value.toLowerCase());
  });


  /* ==========================================
     DELETE CONFIRMATION
  ========================================== */

  const cdlg = $("#confirmDialog");

  let deleteId = null;

  function confirmDelete(habit) {
    deleteId = habit.id;

    $("#confirmText").innerHTML =
      `Delete <b>${esc(habit.name)}</b>?<br>` +
      `Its full history and heatmap will be removed too.`;

    cdlg.showModal();
  }


  $("#btnYes").addEventListener("click", async () => {
    cdlg.close();

    if (deleteId == null) return;

    try {
      await api(
        `/api/habits/${deleteId}`,
        { method: "DELETE" }
      );

      state.habits = state.habits.filter(
        (habit) => habit.id !== deleteId
      );

      monthSel.delete(deleteId);

      if (analyticsHabit && analyticsHabit.id === deleteId) {
        analyticsHabit = null;

        if (analyticsDialog && analyticsDialog.open) {
          analyticsDialog.close();
        }
      }

      render();

      toast("Habit deleted");

    } catch (error) {
      toast(error.message, "err");

    } finally {
      deleteId = null;
    }
  });


  $("#btnNo").addEventListener("click", () => {
    cdlg.close();
  });


  /* ==========================================
     TOAST NOTIFICATIONS
  ========================================== */

  function toast(message, kind) {
    const container = $("#toasts");

    if (!container) return;

    const element = document.createElement("div");

    element.className =
      "toast" + (kind === "err" ? " err" : "");

    element.textContent = message;

    container.appendChild(element);

    setTimeout(() => {
      element.classList.add("hide");
    }, 2600);

    setTimeout(() => {
      element.remove();
    }, 3050);
  }


  /* ==========================================
     INITIAL DATA LOADING
  ========================================== */

  async function load() {
    const todayLabel = $("#todayLabel");

    if (todayLabel) {
      todayLabel.textContent =
        new Date().toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric"
        });
    }

    state.loading = true;
    render();

    try {
      const habits = await api("/api/habits");

      state.habits = Array.isArray(habits)
        ? habits
        : [];

    } catch (error) {
      toast(
        "Could not load habits: " + error.message,
        "err"
      );

    } finally {
      state.loading = false;
      render();
    }
  }
  /* ==========================================
   LANGUAGE SELECTOR
========================================== */

const languageSelect = $("#languageSelect");

if (languageSelect) {
  languageSelect.value = currentLanguage;

  languageSelect.addEventListener("change", () => {
    currentLanguage = languageSelect.value;

    render();

    if (analyticsDialog && analyticsDialog.open) {
      renderHabitAnalytics();
    }

    const todayLabel = $("#todayLabel");

    if (todayLabel) {
      todayLabel.textContent =
        new Date().toLocaleDateString(
          currentLanguage,
          {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
          }
        );
    }
  });
}

  /* ==========================================
     INITIALIZATION
  ========================================== */

  $("#btnAdd").addEventListener("click", () => {
    openHabitDialog(null);
  });

  $("#btnAddEmpty").addEventListener("click", () => {
    openHabitDialog(null);
  });

  buildSwatches();

  load();

})();