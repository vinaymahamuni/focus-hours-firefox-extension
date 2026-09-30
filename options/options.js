"use strict";

const $ = (id) => document.getElementById(id);
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first
let settings;
let toastTimer;

function toast(text = "Saved") {
  const t = $("toast");
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1400);
}

async function saveSchedule(schedule) {
  await browser.storage.local.set({ schedule });
  toast();
}

function renderDays() {
  const container = $("days");
  container.replaceChildren();
  for (const day of DAY_ORDER) {
    const on = settings.schedule.days.includes(day);
    const btn = WB.el("button", { type: "button", textContent: WB.DAY_NAMES[day] });
    btn.setAttribute("aria-pressed", String(on));
    btn.addEventListener("click", () => {
      const days = on
        ? settings.schedule.days.filter((d) => d !== day)
        : [...settings.schedule.days, day].sort();
      saveSchedule({ ...settings.schedule, days });
    });
    container.append(btn);
  }
}

function windowError(windows) {
  if (windows.some((w) => !w.start || !w.end)) return "Each window needs a start and end time.";
  if (windows.some((w) => w.start === w.end)) return "A window's start and end can't be the same.";
  return "";
}

function renderWindows() {
  const container = $("windows");
  container.replaceChildren();
  const { windows } = settings.schedule;

  if (!windows.length) {
    container.append(WB.el("p", { className: "hint", textContent: "No time windows — nothing will be blocked." }));
  }

  windows.forEach((win, i) => {
    const start = WB.el("input", { type: "time", value: win.start, required: true });
    const end = WB.el("input", { type: "time", value: win.end, required: true });
    const remove = WB.el("button", { type: "button", className: "icon", textContent: "✕", title: "Remove window" });
    const row = WB.el("div", { className: "window" }, [start, WB.el("span", { className: "to", textContent: "to" }), end, remove]);
    if (win.start && win.end && win.end < win.start) {
      row.append(WB.el("span", { className: "note", textContent: "ends next day" }));
    }
    if (!win.start || !win.end || win.start === win.end) row.classList.add("invalid");

    const onChange = () => {
      const next = windows.map((w, j) => (j === i ? { start: start.value, end: end.value } : w));
      const error = windowError(next);
      $("window-error").textContent = error;
      if (error) {
        row.classList.add("invalid");
        return;
      }
      saveSchedule({ ...settings.schedule, windows: next });
    };
    start.addEventListener("change", onChange);
    end.addEventListener("change", onChange);
    remove.addEventListener("click", () => {
      saveSchedule({ ...settings.schedule, windows: windows.filter((_, j) => j !== i) });
    });
    container.append(row);
  });
}

function render() {
  $("enabled").checked = settings.enabled;
  WB.renderStatus($("status"), settings);
  WB.renderSiteList($("site-list"), settings.sites, async (site) => {
    if (await WB.removeSite(site)) toast(`Removed ${site}`);
  });
  renderDays();
  renderWindows();
}

async function reload() {
  settings = await WB.loadSettings();
  render();
}

$("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("site-input");
  const result = await WB.addSite(input.value);
  $("site-error").textContent = result.error || "";
  if (result.domain) {
    input.value = "";
    toast(`Blocked ${result.domain}`);
  }
});

$("site-input").addEventListener("input", () => ($("site-error").textContent = ""));

$("enabled").addEventListener("change", async (e) => {
  await browser.storage.local.set({ enabled: e.target.checked });
  toast(e.target.checked ? "Blocking on" : "Blocking paused");
});

$("add-window").addEventListener("click", () => {
  const last = settings.schedule.windows.at(-1);
  const win = last ? { start: last.end, end: last.end < "23:00" ? addHour(last.end) : "23:59" } : { start: "09:00", end: "17:00" };
  saveSchedule({ ...settings.schedule, windows: [...settings.schedule.windows, win] });
});

function addHour(hhmm) {
  const m = Math.min(WB.toMinutes(hhmm) + 60, 23 * 60 + 59);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

browser.storage.onChanged.addListener((_c, area) => area === "local" && reload());
setInterval(() => settings && WB.renderStatus($("status"), settings), 30000);

reload();
