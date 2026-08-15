# PlaceStack

**AI-powered trip itinerary planner for India.** Describe your trip — route, dates, budget, interests — and PlaceStack drafts a day-by-day itinerary with Gemini, refines it with Llama, geocodes every stop, and plots the whole thing on an interactive map.

![Status](https://img.shields.io/badge/status-beta-f5a623) ![React](https://img.shields.io/badge/React-18-61dafb) ![Vite](https://img.shields.io/badge/Vite-5-646cff) ![Express](https://img.shields.io/badge/Express-4-000000)

---

## How it works

```
Trip form  ──▶  Gemini 2.5 Flash   ──▶  Groq Llama 3.3 70B  ──▶  Google Geocoding  ──▶  Map + itinerary
               drafts the itinerary     tightens & fact-checks     resolves lat/lng
                                        (optional — falls back)
```

1. **Draft** — Gemini 2.5 Flash generates a structured JSON itinerary (3 time blocks per day, 1–3 places per block).
2. **Refine** — Groq's Llama 3.3 70B acts as a travel editor: fixes illogical ordering, sharpens descriptions, flags generic tourist traps. If the Groq key is absent or the call fails, the Gemini draft is used as-is.
3. **Geocode** — every place name is resolved to coordinates via the Google Geocoding API, in parallel.
4. **Render** — places are plotted as markers; clicking one opens a nearby-places sidebar (eat / coffee / see / stay) powered by the Places API.

---

## Quick start

```bash
git clone https://github.com/priyanshty19/PlaceStacks.git
cd PlaceStacks
npm install
cp .env.example .env   # then fill in your keys — see below
npm run dev
```

- Frontend → http://localhost:5173
- API proxy → http://localhost:8787

Vite proxies `/api/*` to the Express server, so you only ever open port 5173 in the browser.

---

## Environment variables

Create a `.env` in the project root:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
VITE_GEMINI_API_KEY=your_gemini_key
VITE_GROQ_API_KEY=your_groq_key   # optional
```

| Variable | Required | What it powers | Where to get it |
|---|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | **Yes** | Map rendering, geocoding, nearby places, place photos | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `VITE_GEMINI_API_KEY` | **Yes** | Itinerary generation | [Google AI Studio](https://aistudio.google.com/apikey) |
| `VITE_GROQ_API_KEY` | No | Itinerary refinement — skipped gracefully if missing | [Groq Console](https://console.groq.com/keys) |

### Enabling the right Google APIs

The Maps key needs **three** APIs enabled in the same Google Cloud project:

- **Maps JavaScript API** — renders the map
- **Places API (New)** — nearby search and photos
- **Geocoding API** — city and place names → coordinates

Enable them under **APIs & Services → Library**. If you restrict the key by HTTP referrer, add `http://localhost:5173/*` so local development keeps working.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run client and server together |
| `npm run dev:client` | Vite dev server only (port 5173) |
| `npm run dev:server` | Express API only (port 8787) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |

---

## API reference

All routes are rate-limited to **20 requests per minute** per IP.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/generate-itinerary` | Full pipeline: draft → refine → geocode |
| `GET` | `/api/geocode?address=` | Resolve an address to `{ lat, lng }` |
| `POST` | `/api/places/nearby` | Nearby places by `{ lat, lng, type, radius }` |
| `GET` | `/api/places/photo?photo_name=` | Proxy a Places photo (keeps the key server-side) |
| `GET` | `/api/health` | Liveness check |

<details>
<summary><code>POST /api/generate-itinerary</code> — request &amp; response</summary>

**Request**

```json
{
  "from": { "name": "Delhi" },
  "to": { "name": "Goa" },
  "startDate": "2026-06-06",
  "endDate": "2026-06-08",
  "people": 2,
  "budget": "Mid-range",
  "interests": ["Culture", "Food"]
}
```

**Response**

```json
{
  "error": false,
  "itinerary": {
    "destination": "Goa",
    "tripSummary": "...",
    "totalDays": 3,
    "days": [
      {
        "day": 1,
        "date": "Sat, 06 Jun",
        "theme": "...",
        "blocks": [
          {
            "time": "Morning",
            "places": [
              {
                "name": "...",
                "type": "attraction",
                "description": "...",
                "whyVisit": "...",
                "estimatedDuration": "2 hours",
                "budgetNote": "...",
                "mustVisit": true,
                "coordinates": { "lat": 15.5, "lng": 73.8 }
              }
            ]
          }
        ],
        "dayTip": "..."
      }
    ]
  },
  "meta": { "groqFallback": false }
}
```

`meta.groqFallback` is `true` when the Groq refinement step was skipped and the raw Gemini draft was returned.

</details>

---

## Project structure

```
├── server/
│   └── index.js            Express proxy — all API routes, key handling, rate limiting
├── src/
│   ├── App.jsx             State orchestration, map wiring
│   ├── components/         Header, InputForm, ItineraryPanel, MapPanel, NearbySidebar, …
│   ├── utils/
│   │   ├── maps.js         Google Maps controller (markers, tooltips, fit-bounds)
│   │   ├── places.js       Typed fetch wrappers for the API
│   │   └── helpers.js      Itinerary normalization, date constraints
│   └── styles/
│       ├── global.css      Design tokens, buttons, animations
│       └── layout.css      Desktop two-column + mobile bottom-sheet layouts
├── vite.config.js          Dev server + /api proxy
└── vercel.json             Serverless function + static build
```

**Why the Express proxy?** API keys never reach the browser. The client calls same-origin `/api/*` routes; the server holds the keys and talks to Google and Groq.

---

## Design

Dark-first UI built on a small token set in `src/styles/global.css`:

- **Typography** — Playfair Display (headings), Manrope (body), Space Mono (labels and data)
- **Palette** — `#0f141b` surface, `#ffb955` gold accent, glassmorphism cards with `backdrop-filter`
- **Desktop** — fluid two-column grid: `clamp(300px, 28vw, 440px)` control panel beside a full-height map
- **Mobile** — map hero with a frosted bottom sheet that scrolls over it

---

## Deployment

Configured for Vercel out of the box (`vercel.json`): the Express app builds as a serverless function and the Vite output is served statically.

```bash
vercel
```

Set `VITE_GOOGLE_MAPS_API_KEY`, `VITE_GEMINI_API_KEY`, and `VITE_GROQ_API_KEY` in the Vercel project's environment variables, and add your production domain to the Maps key's referrer restrictions.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Missing VITE_GOOGLE_MAPS_API_KEY in .env` | Key not set | Add it to `.env` and restart the dev server |
| "This page can't load Google Maps correctly" | Referrer restriction blocks localhost | Add `http://localhost:5173/*` to the key's website restrictions |
| `429` from `/api/generate-itinerary` | Gemini free-tier quota exhausted | Enable billing, or create a key in a fresh AI Studio project |
| `404` mentioning a model name | Gemini model retired | Update `GEMINI_URL` in `server/index.js` to a current model |
| Legacy API warning in console | Places API (New) not enabled | Enable **Places API (New)** in the Cloud Console Library |

Environment variables are read at server start — restart `npm run dev` after editing `.env`.

---

## License

MIT
