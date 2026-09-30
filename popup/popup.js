"use strict";

const $ = (id) => document.getElementById(id);
let currentDomain = null;

async function render() {
  const settings = await WB.loadSettings();
  WB.renderStatus($("status"), settings);
  WB.renderSiteList($("site-list"), settings.sites, WB.removeSite);

  if (currentDomain) {
    const blocked = WB.isHostBlocked(currentDomain, settings.sites);
    $("current").hidden = false;
    $("current-host").textContent = currentDomain;
    $("block-current").disabled = blocked;
    $("block-current").textContent = blocked ? "Blocked" : "Block this site";
  }
}

async function init() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && /^https?:/.test(tab.url)) currentDomain = WB.normalizeDomain(tab.url);
  render();
}

$("block-current").addEventListener("click", () => WB.addSite(currentDomain));

$("add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const result = await WB.addSite($("site-input").value);
  $("site-error").textContent = result.error || "";
  if (result.domain) $("site-input").value = "";
});

$("site-input").addEventListener("input", () => ($("site-error").textContent = ""));

$("open-options").addEventListener("click", () => {
  browser.runtime.openOptionsPage();
  window.close();
});

browser.storage.onChanged.addListener((_c, area) => area === "local" && render());

init();
