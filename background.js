"use strict";

const BLOCKED_PAGE = browser.runtime.getURL("blocked/blocked.html");
let settings = structuredClone(WB.DEFAULTS);

function blockedUrlFor(url) {
  return `${BLOCKED_PAGE}?url=${encodeURIComponent(url)}`;
}

// Registered synchronously so it is active from the first request.
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (WB.shouldBlockUrl(details.url, settings)) {
      return { redirectUrl: blockedUrlFor(details.url) };
    }
    return {};
  },
  { urls: ["<all_urls>"], types: ["main_frame"] },
  ["blocking"]
);

// Tabs opened before a work window started won't make a new request,
// so sweep them whenever the schedule or list could have changed.
async function enforceOpenTabs() {
  if (!WB.isBlockingActive(settings)) return;
  const tabs = await browser.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && WB.shouldBlockUrl(tab.url, settings)) {
      browser.tabs.update(tab.id, { url: blockedUrlFor(tab.url) }).catch(() => {});
    }
  }
}

function updateBadge() {
  const active = WB.isBlockingActive(settings);
  browser.browserAction.setBadgeText({ text: active ? "ON" : "" });
  browser.browserAction.setBadgeBackgroundColor({ color: "#6366f1" });
  browser.browserAction.setTitle({
    title: active ? "Focus Hours – blocking is active" : "Focus Hours – off hours",
  });
}

async function refresh() {
  settings = await WB.loadSettings();
  updateBadge();
  await enforceOpenTabs();
}

browser.storage.onChanged.addListener((_changes, area) => {
  if (area === "local") refresh();
});

browser.alarms.create("tick", { periodInMinutes: 1 });
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== "tick") return;
  updateBadge();
  enforceOpenTabs();
});

browser.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "install") {
    await browser.storage.local.set(structuredClone(WB.DEFAULTS));
    browser.runtime.openOptionsPage();
  }
});

refresh();
