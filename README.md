# Anilak

Voice-first, multilingual urban air quality assistant. Ask out loud, in English, Hindi, Marathi, Bengali or Tamil, whether it's safe to run, commute or let the kids play outside. Anilak checks the live AQI and answers in your language with three concrete actions.

**Live:** https://anilak.vercel.app

## Features

- **Live air data:** current US AQI, PM2.5 and PM10 plus a 24-hour hourly forecast from [Open-Meteo](https://open-meteo.com/en/docs/air-quality-api). Use your location, a city preset, or the AQI simulator.
- **Voice in and out:** Sarvam AI (`saaras:v4` speech-to-text with language auto-detect, `bulbul:v3` text-to-speech), falling back to the browser's Web Speech API.
- **Intent engine:** classifies questions as outdoor activity, health symptom or commute, flags vulnerable groups, and returns a low-emission routine, an indoor air hack and a quantified exposure estimate. Works offline; optionally uses Gemini.
- **Safety guardrail:** acute symptoms (chest tightness, can't breathe…) skip everything else and show 112 / 108 emergency guidance.
- **Learn & act:** health impact explorer, healthy-home checklist with a purifier sizing calculator, India NAAQS vs WHO limits, CPCB AQI and GRAP stages, myth-vs-fact cards.
- **Vayu:** a Three.js mascot whose state and smog cloud react to the air and the conversation.

## Project structure

```
index.html              markup only
css/styles.css          theme, paper grain, motion
js/
  main.js               entry point: wiring + first air reading
  air.js                geolocation, Open-Meteo fetch, presets, simulator
  assistant.js          question pipeline: guardrail -> Gemini/offline -> cards + speech
  speech.js             speech in/out (Sarvam or Web Speech API)
  sarvam.js             where the Sarvam key comes from (settings, local .env, /api proxy)
  mascot.js             Three.js mascot
  dom.js, icons.js      DOM/storage helpers, inline SVG icons
  lib/                  pure logic, no DOM (unit-tested)
    aqi.js              US EPA + India CPCB AQI maths, forecast windows
    intent.js           keyword classifier, guardrail, language detection, exposure maths
    gemini.js           optional Gemini call
    util.js             small pure helpers
  data/                 cities, localised advice templates, hub content
  ui/                   controls, settings modal, Learn & act hub
api/sarvam.js           Vercel function that keeps the Sarvam key server-side
tests/                  node:test unit tests
```

## Run locally

```bash
npm install        # dev tools only (ESLint); the app itself has no build step
npm run dev        # serves on http://localhost:8433
```

ES modules need a web server, so opening `index.html` from disk won't work. The mic and location also need `localhost` or HTTPS.

### API keys (all optional)

| Key | Where | Used for |
| --- | --- | --- |
| `SARVAM_API_KEY` | `.env` (local, git-ignored) or Vercel env var | Sarvam voice in/out |
| Sarvam key | ⚙︎ settings in the app (stored in your browser) | Same, per browser |
| Gemini key | ⚙︎ settings | Gemini answers instead of the offline engine |

On `localhost` the page reads `SARVAM_API_KEY` from `.env` directly. On Vercel the key lives in the project's environment variables and the browser talks to `/api/sarvam`. Set a spending limit in the Sarvam dashboard: the proxy has a best-effort per-IP limit of about 15 questions per 10 minutes per function instance, not a global cap.

## Quality checks

```bash
npm run lint       # ESLint (flat config)
npm test           # node:test: AQI maths, intent engine, guardrail, API proxy
npm run check      # both
```

CI runs both on every push and pull request (`.github/workflows/ci.yml`).

## Deploy

The repo is linked to the Vercel project `anilak`; pushing to `main` deploys. Static files are served as-is and `api/sarvam.js` runs as a Node function.

## Notes

General guidance, not medical advice. Exposure figures are estimates from current PM2.5, typical breathing rates and published mask and filter efficiencies. Policy summaries (GRAP, NCAP) are simplified, so check [CAQM](https://caqm.nic.in) and [CPCB](https://cpcb.nic.in) for current orders.
