"use strict";

const QUOTES = [
  ["The secret of getting ahead is getting started.", "Mark Twain"],
  ["Concentrate all your thoughts upon the work at hand.", "Alexander Graham Bell"],
  ["It's not that I'm so smart, it's just that I stay with problems longer.", "Albert Einstein"],
  ["Focus on being productive instead of busy.", "Tim Ferriss"],
  ["You can do anything, but not everything.", "David Allen"],
  ["Deep work is the superpower of the 21st century.", "Cal Newport"],
  ["Starve your distractions, feed your focus.", "Unknown"],
  ["Small daily improvements are the key to staggering long-term results.", "Unknown"],
];

const $ = (id) => document.getElementById(id);
const originalUrl = new URLSearchParams(location.search).get("url") || "";
let host = "";
try {
  host = new URL(originalUrl).hostname.replace(/^www\./, "");
} catch {}

if (host) {
  $("host").textContent = host;
  document.title = `${host} is blocked – Focus Hours`;
}

const [text, author] = QUOTES[Math.floor(Math.random() * QUOTES.length)];
$("quote").replaceChildren(`“${text}”`, Object.assign(document.createElement("cite"), { textContent: `— ${author}` }));

async function tick() {
  const settings = await WB.loadSettings();
  const now = new Date();

  // Working hours ended or the site was removed: send the user on their way.
  if (originalUrl && !WB.shouldBlockUrl(originalUrl, settings, now)) {
    location.replace(originalUrl);
    return;
  }

  $("now").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const next = WB.nextChange(settings, now);
  $("until").textContent = next ? WB.formatTime(next, now) : "—";
  $("left").textContent = next ? WB.formatDuration(next - now) : "—";
}

$("back").addEventListener("click", async () => {
  if (history.length > 1) {
    history.back();
  } else {
    const tab = await browser.tabs.getCurrent();
    browser.tabs.remove(tab.id);
  }
});

$("settings").addEventListener("click", () => browser.runtime.openOptionsPage());

browser.storage.onChanged.addListener((_c, area) => area === "local" && tick());
setInterval(tick, 15000);
tick();
