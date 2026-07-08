# DaddyBoard

An always-on **TraderDaddy Pro wall display**. Hang a spare monitor or TV on the
wall, point a Raspberry Pi at it, and DaddyBoard shows a glanceable-from-10-feet
dark dashboard of what smart money is doing right now — a live options-flow tape,
market vitals, gamma, sector rotation, sentiment, IV rank, screener setups, and
what's coming on the calendar.

It reads **your own `td_live_` API key** from a local file and talks only to the
public TraderDaddy Pro MCP endpoint (read-only). No login, no website, no account
surface — it's an appliance.

**Live mode** — your own account's data on the wall:

![DaddyBoard live](docs/screenshot-live.png)

**Demo mode** (`npm run mock`) — realistic sample data, no key required:

![DaddyBoard demo](docs/screenshot-mock.png)

---

## Powered by TraderDaddy Pro

DaddyBoard is a companion appliance for **[TraderDaddy Pro](https://traderdaddy.pro)** —
the options-flow and smart-money platform. Every panel here is a live read of the
same institutional data pros pay for: real-time unusual options activity, gamma
exposure, sector rotation, IV rank, and curated screener setups.

- **See the smart money.** The hero tape is a live feed of large, aggressive
  options prints — the trades that move markets, as they hit.
- **Glanceable edge.** Gamma bias, put/call sentiment, and IV rank tell you the
  regime at a glance, from across the room.
- **Setups on rotation.** The main stage cycles TraderDaddy's screeners and
  strategy ideas so there's always something actionable on the wall.

Don't have a key yet? Start with **demo mode** below, then grab an API key at
**[traderdaddy.pro](https://traderdaddy.pro)** (Developer API access on your plan)
to light it up with your own live data.

---

## What it shows

| Region | Panel | Source tool |
|---|---|---|
| Header | Market vitals (put/call, sentiment, largest trade) + live clock/phase | `get_market_stats` |
| Hero | **Unusual-activity flow tape** — the smart-money feed | `get_unusual_activity` |
| Grid | Sentiment gauge · Gamma bias · Sector heatmap · IV-rank watch | `get_put_call_ratios`, `get_gex_overview`, `get_sector_flow`, `get_iv_rank` |
| Main stage (rotates) | Screener setups · Strategy ideas · Edge X-ray · Ticker gamma ladder | `run_screener`, `get_strategy_ideas`, `get_edge_xray`, `get_gex_ticker` |
| Ribbon | What's coming: earnings + econ calendar | `get_earnings_flow`, `get_economic_calendar` |

The heavier deep-dive panels follow the day's **hottest ticker** automatically
(derived from the top flow row).

---

## Quick start

Requires **Node ≥ 20**.

```bash
cd DaddyBoard
npm install
```

### Demo mode (no API key)

Renders realistic sample data — great for a screenshot or a first look:

```bash
npm run mock
```

Open **http://localhost:4321** and press F11 (full screen). A **DEMO** badge
shows so sample data is never mistaken for live.

### Live mode (your data)

1. Get your `td_live_` key from your TraderDaddy Pro account (Developer API — you
   need API access on your plan).
2. Copy the config and add your key:
   ```bash
   cp config.example.json config.json
   # edit config.json, set "apiKey": "td_live_..."
   ```
   `config.json` is gitignored and never leaves the device.
3. Start it:
   ```bash
   npm start
   ```

---

## Configuration (`config.json`)

| Key | Default | What it does |
|---|---|---|
| `apiKey` | — | Your `td_live_` key (required in live mode). |
| `baseUrl` | `https://api.traderdaddy.pro` | TraderDaddy Pro API origin. |
| `port` | `4321` | Local port the display is served on. |
| `mockMode` | `false` | Force demo fixtures (or set env `MOCK_MODE=true`). |
| `featuredTickers` | `["SPY","QQQ","NVDA"]` | Fallback symbols for the deep-dive when flow is quiet. |
| `screenerRotation` | `["daily-cuts","momentum","csp-wheel","volatility-squeeze"]` | Screeners the feature card cycles through. |
| `rotationSeconds` | `20` | How long each rotating stage panel is shown. |
| `timezone` | `America/New_York` | Market-hours clock. |

Env overrides: `MOCK_MODE`, `PORT`, `TD_API_KEY`, `TD_BASE_URL`.

The rotation interval can also be tuned live via the `data-rotation` attribute on
`<html>` in `public/index.html`.

It's **market-hours aware**: fast pollers only run while the market is open; when
closed it calms the layout, keeps the last session's values, and refreshes the
calendar occasionally. It respects the per-key rate limit and backs off on 429.

---

## Putting it on the wall

DaddyBoard is just a small Node daemon that serves one full-screen page, so any
device that can run Node **or** point a browser at another device on your LAN can
be the display. Pick the path that matches your hardware.

| You have… | Use | Effort |
|---|---|---|
| A Raspberry Pi you want dedicated to *only* this | **A. FullPageOS** | Lowest — flash & go |
| A Raspberry Pi running normal Raspberry Pi OS | **B. Raspberry Pi OS + Chromium kiosk** | Medium — a service + autostart |
| An old Android phone/tablet | **C. Termux** | Medium — no PC needed |
| Any spare laptop / mini-PC / smart TV browser | **D. Just a browser** | Trivial |

The daemon and the display don't have to be the same box. A common setup: run the
daemon **once** on any always-on machine (a Pi, a NAS, a mini-PC), then point as
many wall screens as you like at `http://<that-box-ip>:4321`.

---

### A. FullPageOS (the "OS that's just a browser")

[**FullPageOS**](https://github.com/guysoft/FullPageOS) is a Raspberry Pi image
that boots straight into a full-screen Chromium showing **one URL** — no desktop,
no login, nothing to configure on-screen. It's the least-fuss wall display. It's
built on Raspberry Pi OS, so you can run the DaddyBoard daemon on the same Pi.

**1. Flash it.** Download the latest FullPageOS image (or use the *Raspberry Pi
Imager* → "Other specific-purpose OS"), flash to an SD card, and before ejecting,
edit two files on the `boot` partition:

- `fullpageos.txt` → set the single line to `http://localhost:4321`
- (Wi-Fi/SSH) enable SSH and set your network via *Imager*'s settings, or the
  usual `wpa_supplicant.conf` / `ssh` files.

**2. First boot, then SSH in and install the daemon:**
```bash
sudo apt update && sudo apt install -y nodejs npm git
git clone https://github.com/mphinance/DaddyBoard.git ~/DaddyBoard
cd ~/DaddyBoard && npm install
cp config.example.json config.json     # add your td_live_ key
```

**3. Keep the daemon running on boot** (same service as method B below):
```bash
mkdir -p ~/.config/systemd/user
# paste the daddyboard.service unit from method B, then:
systemctl --user enable --now daddyboard.service
loginctl enable-linger "$USER"
```

Reboot. FullPageOS brings up Chromium full-screen on `localhost:4321` and the
daemon feeds it. Done.

> Prefer not to install Node on the FullPageOS Pi? Run the daemon on **any other
> box** on your LAN and set `fullpageos.txt` to `http://<that-box-ip>:4321`
> instead. FullPageOS becomes a pure dumb screen.

---

### B. Raspberry Pi OS + Chromium kiosk

If your Pi already runs the normal Raspberry Pi OS desktop, turn it into a kiosk.

**1. Install Node 20+ and the app**
```bash
sudo apt update && sudo apt install -y nodejs npm chromium-browser unclutter
cd ~/DaddyBoard && npm install
cp config.example.json config.json   # add your td_live_ key
```

**2. Run the daemon on boot** — `~/.config/systemd/user/daddyboard.service`:
```ini
[Unit]
Description=DaddyBoard daemon
After=network-online.target

[Service]
WorkingDirectory=%h/DaddyBoard
ExecStart=/usr/bin/node src/server.js
Restart=always

[Install]
WantedBy=default.target
```
```bash
systemctl --user enable --now daddyboard.service
loginctl enable-linger "$USER"   # so it runs without an interactive login
```

**3. Launch Chromium in kiosk mode on the desktop autostart** —
`~/.config/lxsession/LXDE-pi/autostart` (or your DE's autostart):
```
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 0
@chromium-browser --kiosk --incognito --noerrdialogs --disable-infobars --check-for-update-interval=31536000 http://localhost:4321
```

`--kiosk` = full screen no chrome; `unclutter` hides the mouse; the `xset` lines
stop the screen blanking. Reboot and the wall lights up on its own.

> Tip: to auto-sleep the panel outside market hours, add a cron job that runs
> `xset dpms force off` in the evening and `xset dpms force on` at ~9:00 ET.

---

### C. Termux (turn an old Android phone/tablet into the wall)

No Pi required — an old Android device makes a fine small wall display, and it
runs the whole thing itself. Install [Termux](https://f-droid.org/packages/com.termux/)
(from **F-Droid**, not the outdated Play Store build):

```bash
pkg update && pkg install nodejs git
git clone https://github.com/mphinance/DaddyBoard.git
cd DaddyBoard && npm install
cp config.example.json config.json     # add your td_live_ key with e.g. `nano`
npm start
```

Then open **http://localhost:4321** in the device's browser. Express and Node run
fine on Android/ARM — DaddyBoard's only dependency is Express, all plain JS.

For a true always-on kiosk:
- **Full-screen browser:** use a kiosk browser app like *Fully Kiosk Browser*, or
  Chrome's "Add to Home screen" → open the PWA-style full-screen shortcut.
- **Autostart the daemon:** install the *Termux:Boot* addon (F-Droid) and drop a
  script in `~/.termux/boot/` that `cd`s into the repo and runs `npm start`.
- **Keep the screen on:** in Android Developer Options, enable *Stay awake while
  charging*, and leave it on the charger.

> Same trick as everywhere else: you can instead run the daemon on a PC/Pi and
> just point the tablet's browser at `http://<that-box-ip>:4321`.

---

### D. Just a browser

Any spare laptop, mini-PC, Mac mini, or a smart TV with a decent browser works.
Run `npm start` on any always-on machine, then browse to `http://<ip>:4321` from
the display and press **F11** for full screen. That's the entire setup.

---

## How it works

```
config.json (your td_live_ key)
        │
   ┌────▼─────────────────────────────┐
   │ Node daemon (src/)               │
   │  • mcpClient  JSON-RPC → /api/v1/mcp
   │  • poller     market-hours schedule, cache, 429 backoff
   │  • server     serves /api/state + static client
   └────┬─────────────────────────────┘
        │  GET /api/state  (polled every 5s)
   ┌────▼─────────────────────────────┐
   │ Vanilla client (public/)         │
   │  • app.js  registry + rotation + chrome
   │  • panels/*.js  one self-registering module each
   │  • styles/tokens.css  design system
   └──────────────────────────────────┘
```

No build step, no framework, no bundler — plain ES modules the browser loads
directly, so it runs comfortably on a Pi.

---

## Notes

- **Read-only.** DaddyBoard never places trades or writes anything. It only reads
  the public MCP tools your key already has access to.
- **Your key stays local.** It lives in `config.json` on the device and is sent
  only to `baseUrl`.
- Signal/accuracy data shown is for your own glanceable use — keep the wall
  somewhere you trust.
