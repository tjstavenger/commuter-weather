# Commuter Weather

A fast, responsive, zero-build web application for evaluating NOAA National Weather Service forecasts against your bicycle commute schedule to determine whether forecasted conditions favor a **Ride**, advise **Caution**, or recommend you **Drive**.

Live App: [https://tjstavenger.github.io/commuter-weather/](https://tjstavenger.github.io/commuter-weather/)

---

## Features

* **Direct NOAA NWS Web Service Integration**: Communicates directly with the official [api.weather.gov](https://www.weather.gov/documentation/services-web-api) REST API using native CORS support—no third-party CORS proxies required. Hourly wind gusts are sourced from the NWS gridpoint forecast.
* **Expandable NWS Weather Alerts**: Click an active warning or advisory to view its description, instructions, severity, and timing.
* **Bicycle Commute Decision Engine**:
  * Evaluates each hour of the forecast and summarizes each day against your commute windows and thresholds.
  * Default Work-Week Commute Windows: **05:30 – 06:30** (Morning) and **15:00 – 16:00** (Afternoon).
  * Default Decision Thresholds:
    * **Min Temperature**: Warn (Caution) at **40°F**, Drive at **38°F**
    * **Max Temperature**: Warn at **95°F**, Drive at **100°F**
    * **Precipitation Chance**: Warn at **20%**, Drive at **50%**
    * **Wind Speed**: Warn at **20 mph**, Drive at **25 mph**
    * **Wind Gust Speed**: Warn at **20 mph**, Drive at **25 mph**
    * **Pre-Sunrise Darkness**: Warn at **75 min**, Drive at **90 min**
    * **Post-Sunset Darkness**: Warn at **75 min**, Drive at **90 min**
* **Uncluttered Diagnostic Chips**: When a warning or drive condition is triggered, the UI displays compact, minimal chips (e.g. `[Cold 37°]`, `[Gusts 28mph]`, `[Rain 60%]`) right beside the status badges without walls of text.
* **Hourly Relative Humidity**: The hourly forecast breakdown displays NWS humidity when available and uses a dash when unavailable.
* **Astronomical Solar Calculations**: Built-in NOAA solar positioning equations dynamically calculate local sunrise and sunset for your coordinates.
* **Flexible Location Search**:
  * Enter any 5-digit US ZIP code (resolved via open geocoding).
  * Search US city names with autocomplete suggestions from the [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api), backed by GeoNames. The [NWS API](https://www.weather.gov/documentation/services-web-api) itself accepts coordinates, not city names.
  * Or click **Detect GPS** to use your device's browser Geolocation.
* **Responsive Mobile & Desktop Design**:
  * Mobile-first cards with smooth accordion drawers.
  * Desktop split dashboard (7-day periods on the left, sticky commute analysis and full hourly timeline on the right).
  * Automatic dark mode support (`prefers-color-scheme: dark`).
* **Progressive Web App (PWA) & Offline Caching**: Installable to your phone's home screen. The service worker caches static assets and the latest fetched forecast for offline inspection during your commute.
* **Zero-Build Architecture**: Powered by Preact 10 and HTM 3 via native browser ES modules. **Requires zero npm dependencies, no compilation steps, and 0 MB of local toolchain overhead.**

---

## Project Structure

```
commuter-weather/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions test & Pages deployment workflow
├── index.html                  # Main application shell with ES module import maps
├── manifest.json               # Progressive Web App manifest
├── sw.js                       # Service worker for offline asset & forecast caching
├── favicon.ico                 # Application favicon
├── css/
│   └── app.css                 # Responsive design tokens, grid/flexbox layouts, dark mode
├── js/
│   ├── app.js                  # Preact application root & state management
│   ├── noaaClient.js           # Unified NOAA NWS REST API client & GeoJSON parser
│   ├── decisionEngine.js       # Commute evaluation rules, thresholds & reason chips
│   ├── solar.js                # Astronomical sunrise/sunset calculator
│   ├── locationService.js      # ZIP/city geocoding & device browser GPS
│   ├── settingsService.js      # User preferences persistence in localStorage
│   └── components/
│       ├── Header.js           # Navigation bar, location pill, refresh & settings trigger
│       ├── CommuteHero.js      # Prominent card displaying your upcoming commute window
│       ├── AlertBanner.js      # Active NWS weather warnings & advisories
│       ├── PeriodCard.js       # Collapsible 7-day period forecast cards
│       ├── HourlyView.js       # Hour-by-hour timeline highlighting commute windows
│       └── OptionsModal.js     # Settings modal for commute times & threshold sliders
├── images/                     # Weather condition icons, favicons, ride/caution/drive badges
└── tests/
    ├── noaaClient.test.js      # Automated tests for NOAA data population and parsing
    ├── locationService.test.js # Automated tests for ZIP and city geocoding
    ├── decisionEngine.test.js  # Automated tests for commute rules and thresholds
    ├── solar.test.js           # Automated tests for sunrise/sunset accuracy
    └── test_runner.py          # Standalone local test runner (Python 3)
```

---

## Local Development

Because Commuter Weather uses native browser ES modules, there is **nothing to install**:

1. Clone the repository:
   ```bash
   git clone https://github.com/tjstavenger/commuter-weather.git
   cd commuter-weather
   ```

2. Start any local static web server. For example, using Python's built-in server:
   ```bash
   python -m http.server 8000
   ```

3. Open your browser to [http://localhost:8000](http://localhost:8000).

---

## Running Automated Tests

### Local Verification Runner (Python 3)
Run the local test suite using Python:
```bash
python tests/test_runner.py
```

### Node.js Test Runner (CI)
If Node.js is installed (and in GitHub Actions CI):
```bash
node --test tests/*.test.js
```

---

## GitHub Pages Deployment

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically runs the test suite and publishes to GitHub Pages on every push.

### One-Time Setup in GitHub:
1. Open your repository on GitHub: `https://github.com/tjstavenger/commuter-weather`
2. Click **Settings** (top navigation tab) > **Pages** (left sidebar under *Code and automation*).
3. Under **Build and deployment** > **Source**, select **GitHub Actions** (switch away from "Deploy from a branch").
4. Under **Settings** > **Actions** > **General** > **Workflow permissions**, ensure **Read and write permissions** is selected.

Once configured, pushing to `master` or `modernize-noaa-zerobuild` triggers the workflow, runs unit tests, and automatically publishes the site live.
