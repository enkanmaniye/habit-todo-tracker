(() => {
  "use strict";

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

  const monthSel = new Map();

  const pad = (number) => String(number).padStart(2, "0");

  const fmt = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const todayStr = () => fmt(new Date());

  const currentYM = () => todayStr().slice(0, 7);

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

    result.setDate(result.getDate() - ((result.getDay() + 6) % 7));

    return result;
  }

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

    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      openHabitAnalytics(habit);
    });

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

    const toggleBtn = $(".toggle-btn", card);

    toggleBtn.addEventListener("click", async () => {
      toggleBtn.disabled = true;

      try {
        await toggleDay(habit.id, todayStr());
      } finally {
        toggleBtn.disabled = false;
      }
    });

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

  function buildHeatmap(grid, title, foot, habit, done, ym) {
    if (!grid) return;

    grid.replaceChildren();

    const allHabits = state.habits || [habit];
    const totalHabits = allHabits.length;

    const completionCounts = new Map();

    allHabits.forEach((item) => {
      const dates = new Set(item.completions || []);

      dates.forEach((date) => {
        completionCounts.set(
          date,
          (completionCounts.get(date) || 0) + 1
        );
      });
    });

    const today = new Date();
    const currentWeekStart = weekStart(today);

    const firstDate = new Date(currentWeekStart);
    firstDate.setDate(firstDate.getDate() - 42);

    const heat = grid.closest(".heat");
    const heatTitle = heat?.querySelector(".heat-title");
    const heatFoot = heat?.querySelector(".heat-foot");

    if (heatTitle) {
      heatTitle.textContent = "LAST 7 WEEKS";
    }

    if (heatFoot) {
      heatFoot.hidden = false;

      const completedDays = new Set(
        allHabits.flatMap((item) => item.completions || [])
      ).size;

      heatFoot.textContent = `${completedDays} active days`;
    }

    for (let i = 0; i < 49; i++) {
      const date = new Date(firstDate);
      date.setDate(date.getDate() + i);

      const dateString = fmt(date);
      const isFuture = dateString > todayStr();
      const completedHabits = completionCounts.get(dateString) || 0;

      const level =
        isFuture || totalHabits === 0
          ? 0
          : Math.round((completedHabits / totalHabits) * 4);

      const cell = document.createElement("div");

      cell.className = "consistency-cell";
      cell.dataset.level = level;

      cell.title =
        `${dateString}: ${completedHabits}/${totalHabits} habits completed`;

      if (dateString === todayStr()) {
        cell.classList.add("today");
      }

      grid.appendChild(cell);
    }
  }

  let analyticsHabit = null;
  let analyticsMode = "month";
  let analyticsAnchor = new Date();

  const analyticsDialog = $("#habitAnalyticsDialog");

  function openHabitAnalytics(habit) {
    if (!analyticsDialog) {
      console.error("Analytics dialog is missing from index.html");
      return;
    }

    analyticsHabit = habit;
    analyticsMode = "month";
    analyticsAnchor = new Date();

    $("#analyticsTitle").textContent = `${habit.name}`;

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

      label = `${start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric"
      })} – ${end.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      })}`;
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

      label = `${MONTHS[analyticsAnchor.getMonth()]} ${analyticsAnchor.getFullYear()}`;
    }

    const title = $("#analyticsPeriod");
    if (title) title.textContent = label;

    const prev = $("#analyticsPrev");
    const next = $("#analyticsNext");

    if (prev) prev.disabled = false;

    if (next) {
      next.disabled =
        analyticsAnchor.getFullYear() === new Date().getFullYear() &&
        analyticsAnchor.getMonth() === new Date().getMonth() &&
        analyticsMode === "month";
    }

    const totalDays = end.getDate
      ? dayDiff(start, end) + 1
      : 0;

    const completed = [...done].filter((date) => {
      return date >= fmt(start) && date <= fmt(end) && date <= today;
    }).length;

    const availableDays = [...Array(totalDays)].filter((_, index) => {
      const date = new Date(start);
      date.setDate(date.getDate() + index);
      return fmt(date) <= today;
    }).length;

    const percentage = availableDays
      ? Math.round((completed / availableDays) * 100)
      : 0;

    const completedEl = $("#analyticsCompleted");
    const availableEl = $("#analyticsAvailable");
    const percentEl = $("#analyticsPercentage");

    if (completedEl) completedEl.textContent = completed;
    if (availableEl) availableEl.textContent = availableDays;
    if (percentEl) percentEl.textContent = `${percentage}%`;

    renderAnalyticsHeatmap(start, end, done);
    renderWeeklyChart(start, end, done);
    renderMonthlyChart(done);
  }

  function renderAnalyticsHeatmap(start, end, done) {
    const grid = $("#analyticsHeatmap");
    if (!grid) return;

    grid.replaceChildren();

    const firstWeekday = (start.getDay() + 6) % 7;

    for (let i = 0; i < firstWeekday; i++) {
      const empty = document.createElement("div");
      empty.className = "analytics-day empty";
      grid.appendChild(empty);
    }

    for (let day = 1; day <= end.getDate(); day++) {
      const date = new Date(start.getFullYear(), start.getMonth(), day);
      const dateString = fmt(date);
      const cell = document.createElement("button");

      cell.type = "button";
      cell.className = "analytics-day";
      cell.textContent = day;
      cell.dataset.done = done.has(dateString) ? "true" : "false";

      if (dateString === todayStr()) {
        cell.classList.add("today");
      }

      if (dateString > todayStr()) {
        cell.disabled = true;
        cell.classList.add("future");
      }

      if (done.has(dateString)) {
        cell.classList.add("completed");
      }

      cell.title = done.has(dateString)
        ? `${dateString}: completed`
        : `${dateString}: not completed`;

      cell.addEventListener("click", async () => {
        await toggleDay(analyticsHabit.id, dateString);
      });

      grid.appendChild(cell);
    }
  }

  function renderWeeklyChart(start, end, done) {
    const chart = $("#analyticsWeeklyChart");
    if (!chart) return;

    chart.replaceChildren();

    const numberOfWeeks = Math.ceil(
      (dayDiff(start, end) + 1) / 7
    );

    const counts = Array(numberOfWeeks).fill(0);
    const available = Array(numberOfWeeks).fill(0);

    const offset = (start.getDay() + 6) % 7;

    for (let day = 1; day <= end.getDate(); day++) {
      const date = new Date(start.getFullYear(), start.getMonth(), day);
      const dateString = fmt(date);
      const weekIndex = Math.floor((offset + day - 1) / 7);

      if (dateString <= todayStr()) {
        available[weekIndex]++;

        if (done.has(dateString)) {
          counts[weekIndex]++;
        }
      }
    }

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

  function renderMonthlyChart(done) {
    const chart = $("#analyticsMonthlyChart");
    if (!chart) return;

    chart.replaceChildren();

    const year = analyticsAnchor.getFullYear();
    const currentMonth = analyticsAnchor.getMonth();

    for (let month = 0; month < 12; month++) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);

      let available = 0;
      let completed = 0;

      for (let day = 1; day <= end.getDate(); day++) {
        const date = new Date(year, month, day);
        const dateString = fmt(date);

        if (dateString <= todayStr()) {
          available++;

          if (done.has(dateString)) {
            completed++;
          }
        }
      }

      const group = document.createElement("div");
      group.className = "analytics-bar-group";

      const value = document.createElement("span");
      value.className = "analytics-bar-value";
      value.textContent = `${completed}/${available}`;

      const bar = document.createElement("div");
      bar.className = "analytics-bar";

      const height = available > 0
        ? (completed / available) * 90
        : 0;

      bar.style.height = `${Math.max(height, 3)}px`;

      if (available === 0) {
        bar.style.opacity = "0.2";
      }

      if (month === currentMonth && year === new Date().getFullYear()) {
        group.classList.add("current");
      }

      const label = document.createElement("span");
      label.className = "analytics-bar-label";
      label.textContent = MONTHS[month].slice(0, 3);

      group.append(value, bar, label);
      chart.appendChild(group);
    }
  }

  if (analyticsDialog) {
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

    $("#analyticsClose").addEventListener("click", () => {
      analyticsDialog.close();
    });
  }

  async function toggleDay(id, day) {
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

  const addHabitButton = $("#addHabitBtn") || $("#btnAdd");

  if (addHabitButton) {
    addHabitButton.addEventListener("click", () => {
      openHabitDialog(null);
    });
  }

  const emptyAddButton = $("#btnAddEmpty");

  if (emptyAddButton) {
    emptyAddButton.addEventListener("click", () => {
      openHabitDialog(null);
    });
  }

  buildSwatches();
  load();
})();