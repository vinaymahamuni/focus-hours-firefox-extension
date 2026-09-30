// Shared helpers used by the background script and every extension page.
// Exposed on a single global `WB` so plain <script> tags can share it.
(function (global) {
  "use strict";

  const DEFAULTS = {
    enabled: true,
    sites: [],
    schedule: {
      days: [1, 2, 3, 4, 5], // 0 = Sunday … 6 = Saturday
      windows: [
        { start: "10:00", end: "13:00" },
        { start: "14:00", end: "18:00" },
      ],
    },
  };

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9-]{2,}$/;

  async function loadSettings() {
    const stored = await browser.storage.local.get(DEFAULTS);
    return {
      enabled: stored.enabled !== false,
      sites: Array.isArray(stored.sites) ? stored.sites : [],
      schedule: {
        days: stored.schedule?.days ?? DEFAULTS.schedule.days,
        windows: stored.schedule?.windows ?? DEFAULTS.schedule.windows,
      },
    };
  }

  // Turns "https://www.YouTube.com/watch?v=1" into "youtube.com".
  // Returns null when the input is not a plausible domain.
  function normalizeDomain(input) {
    let text = String(input || "").trim().toLowerCase();
    if (!text) return null;
    if (!/^[a-z][a-z0-9+.-]*:\/\//.test(text)) text = "http://" + text;
    let host;
    try {
      host = new URL(text).hostname;
    } catch {
      return null;
    }
    host = host.replace(/^www\./, "").replace(/\.$/, "");
    if (host === "localhost") return host;
    return DOMAIN_RE.test(host) ? host : null;
  }

  function isHostBlocked(host, sites) {
    if (!host) return false;
    host = host.toLowerCase();
    return sites.some((site) => host === site || host.endsWith("." + site));
  }

  function toMinutes(hhmm) {
    const [h, m] = String(hhmm).split(":").map(Number);
    return h * 60 + m;
  }

  // A window whose end is earlier than its start wraps past midnight
  // (e.g. 22:00–02:00) and belongs to the day it starts on.
  function isWithinWorkingHours(date, schedule) {
    const now = date.getHours() * 60 + date.getMinutes();
    const today = date.getDay();
    const yesterday = (today + 6) % 7;
    const days = schedule.days || [];

    return (schedule.windows || []).some(({ start, end }) => {
      const s = toMinutes(start);
      const e = toMinutes(end);
      if (Number.isNaN(s) || Number.isNaN(e) || s === e) return false;
      if (s < e) return days.includes(today) && now >= s && now < e;
      return (days.includes(today) && now >= s) || (days.includes(yesterday) && now < e);
    });
  }

  function isBlockingActive(settings, date = new Date()) {
    return settings.enabled && isWithinWorkingHours(date, settings.schedule);
  }

  function shouldBlockUrl(url, settings, date = new Date()) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return isBlockingActive(settings, date) && isHostBlocked(parsed.hostname, settings.sites);
  }

  // The next moment (to the minute) when blocking switches on or off, or null
  // if it never changes within a week.
  function nextChange(settings, date = new Date()) {
    const current = isBlockingActive(settings, date);
    const probe = new Date(date);
    probe.setSeconds(0, 0);
    for (let i = 0; i < 7 * 24 * 60; i++) {
      probe.setMinutes(probe.getMinutes() + 1);
      if (isBlockingActive(settings, probe) !== current) return new Date(probe);
    }
    return null;
  }

  function formatTime(date, from = new Date()) {
    const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (date.toDateString() === from.toDateString()) return time;
    const tomorrow = new Date(from);
    tomorrow.setDate(from.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) return `tomorrow ${time}`;
    return `${date.toLocaleDateString([], { weekday: "long" })} ${time}`;
  }

  function formatDuration(ms) {
    const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h && m) return `${h}h ${m}m`;
    return h ? `${h}h` : `${m}m`;
  }

  global.WB = {
    DEFAULTS,
    DAY_NAMES,
    loadSettings,
    normalizeDomain,
    isHostBlocked,
    toMinutes,
    isWithinWorkingHours,
    isBlockingActive,
    shouldBlockUrl,
    nextChange,
    formatTime,
    formatDuration,
  };
})(globalThis);
