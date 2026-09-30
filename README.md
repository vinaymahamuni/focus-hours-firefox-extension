# Focus Hours – Website Blocker for Firefox

Blocks the websites you choose, but only during your working hours.

## Features
- Block any number of websites. Subdomains are included, so `youtube.com` also blocks `m.youtube.com`.
- Set working-time windows (for example 10:00–13:00 and 14:00–18:00) and pick which days they apply to (Mon–Fri by default). A window like 22:00–02:00 runs past midnight.
- Blocked sites show a full-page screen with the current time, when the site will be available again, and a focus quote.
- Remove a site from the list at any time. If you remove one during working hours, you're asked to confirm first.
- Already-open tabs get blocked when a work window starts. The blocked page goes back to the site on its own once the window ends or you remove the site.
- The toolbar popup shows a status badge, a "Block this site" button, and quick add/remove.
- A main switch pauses all blocking without losing your settings.

## Run it locally
1. Open `about:debugging#/runtime/this-firefox` in Firefox 140 or later.
2. Click **Load Temporary Add-on…** and select `manifest.json`.

Or use [web-ext](https://github.com/mozilla/web-ext):

```sh
npx web-ext run     # starts Firefox with the extension loaded
npx web-ext lint    # validates the extension
npx web-ext build   # creates a .zip for signing / AMO
```

A temporary add-on is removed when Firefox restarts. To install it permanently, sign it through [addons.mozilla.org](https://addons.mozilla.org/developers/) (you can choose "unlisted" for personal use).

## Project layout
| Path | Purpose |
| --- | --- |
| `manifest.json` | Extension manifest (MV2) |
| `background.js` | Blocks requests, re-checks open tabs every minute, updates the badge |
| `shared/schedule.js` | Domain matching and working-hours logic |
| `shared/ui.js`, `shared/common.css` | Shared UI: site list, confirm dialog, theme |
| `options/` | Settings page (sites, days, time windows) |
| `popup/` | Toolbar popup |
| `blocked/` | The "this website is blocked" page |

Settings are saved in `browser.storage.local` and never leave the browser.
