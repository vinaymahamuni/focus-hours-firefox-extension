// UI helpers shared by the popup and options page. Requires schedule.js.
(function (WB) {
  "use strict";

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    for (const child of [].concat(children)) {
      node.append(child);
    }
    return node;
  }

  function confirmDialog({ title, message, confirmLabel = "Confirm", danger = false }) {
    return new Promise((resolve) => {
      const cancel = el("button", { type: "button", textContent: "Cancel" });
      const ok = el("button", {
        type: "button",
        textContent: confirmLabel,
        className: danger ? "danger" : "primary",
      });
      const dialog = el("div", { className: "wb-dialog", role: "alertdialog" }, [
        el("h3", { textContent: title }),
        el("p", { textContent: message }),
        el("div", { className: "actions" }, [cancel, ok]),
      ]);
      const backdrop = el("div", { className: "wb-backdrop" }, dialog);

      function close(result) {
        document.removeEventListener("keydown", onKey);
        backdrop.remove();
        resolve(result);
      }
      function onKey(e) {
        if (e.key === "Escape") close(false);
      }
      cancel.addEventListener("click", () => close(false));
      ok.addEventListener("click", () => close(true));
      backdrop.addEventListener("click", (e) => e.target === backdrop && close(false));
      document.addEventListener("keydown", onKey);

      document.body.append(backdrop);
      cancel.focus();
    });
  }

  // Removing a site while blocking is active is a likely impulse, so ask first.
  async function removeSite(site) {
    const settings = await WB.loadSettings();
    if (WB.isBlockingActive(settings)) {
      const ok = await confirmDialog({
        title: `Unblock ${site}?`,
        message: "You're in your working hours right now. Are you sure you want to remove this site from your block list?",
        confirmLabel: "Remove anyway",
        danger: true,
      });
      if (!ok) return false;
    }
    const sites = settings.sites.filter((s) => s !== site);
    await browser.storage.local.set({ sites });
    return true;
  }

  async function addSite(input) {
    const domain = WB.normalizeDomain(input);
    if (!domain) return { error: "Please enter a valid domain, e.g. youtube.com" };
    const { sites } = await WB.loadSettings();
    if (sites.includes(domain)) return { error: `${domain} is already on your list` };
    await browser.storage.local.set({ sites: [...sites, domain].sort() });
    return { domain };
  }

  function renderSiteList(listEl, sites, onRemove) {
    listEl.replaceChildren();
    if (!sites.length) {
      listEl.append(el("li", { className: "empty", textContent: "No sites blocked yet." }));
      return;
    }
    for (const site of sites) {
      const remove = el("button", {
        className: "icon",
        type: "button",
        title: `Remove ${site}`,
        textContent: "✕",
      });
      remove.setAttribute("aria-label", `Remove ${site}`);
      remove.addEventListener("click", () => onRemove(site));
      const avatar = el("span", { className: "avatar", textContent: site[0].toUpperCase() });
      listEl.append(el("li", {}, [avatar, el("span", { className: "name", textContent: site }), remove]));
    }
  }

  function renderStatus(statusEl, settings) {
    const now = new Date();
    const next = WB.nextChange(settings, now);
    if (!settings.enabled) {
      statusEl.className = "status off";
      statusEl.textContent = "Blocking paused";
    } else if (WB.isBlockingActive(settings, now)) {
      statusEl.className = "status active";
      statusEl.textContent = next ? `Focus time until ${WB.formatTime(next, now)}` : "Focus time";
    } else {
      statusEl.className = "status idle";
      statusEl.textContent = next ? `Free until ${WB.formatTime(next, now)}` : "No working hours set";
    }
  }

  Object.assign(WB, { el, confirmDialog, removeSite, addSite, renderSiteList, renderStatus });
})(globalThis.WB);
