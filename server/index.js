import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8787;

// Google rejects HTTP-referrer-restricted keys on the Geocoding and Places web
// services — a server sends no Referer — so the browser key cannot be reused
// here. GOOGLE_MAPS_SERVER_KEY is a second key restricted by IP (or left
// unrestricted); VITE_GOOGLE_MAPS_API_KEY stays the browser-only Maps JS key.
const MAPS_KEY = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;

// These never reach the browser, so they carry no VITE_ prefix — that prefix is
// what marks a variable as safe to inline into the client bundle. Old names are
// still accepted so existing .env files keep working.
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

const GOOGLE_PLACES_BASE = "https://places.googleapis.com/v1";
const GEOCODE_BASE = "https://maps.googleapis.com/maps/api/geocode/json";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const nearbyFieldMask = [
  "places.id",
  "places.displayName",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.currentOpeningHours",
  "places.photos",
  "places.formattedAddress",
  "places.types",
  "places.location",
].join(",");

const ITINERARY_PATH = "/api/generate-itinerary";
const PHOTO_PATH = "/api/places/photo";

function buildLimiter(limit, options = {}) {
  return rateLimit({
    windowMs: 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: true,
      message: "Rate limit exceeded. Please wait a minute and try again.",
    },
    ...options,
  });
}

// A single nearby search renders up to six cards, each pulling an image through
// the photo proxy, so browsing two categories used to exhaust a budget shared
// with every other route and leave the rest of the app rate-limited.
const photoLimiter = buildLimiter(120);

// Generating an itinerary costs two model calls plus a geocode per place, so it
// stays on a tight budget of its own.
const itineraryLimiter = buildLimiter(10);

const apiLimiter = buildLimiter(30, {
  skip: (req) => req.path === PHOTO_PATH || req.path === ITINERARY_PATH,
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(PHOTO_PATH, photoLimiter);
app.use(ITINERARY_PATH, itineraryLimiter);
app.use(apiLimiter);

function fail(message, status = 500) {
  const error = new Error(message);
  error.statusCode = status;
  throw error;
}

// Providers explain exactly what went wrong (retired model, exhausted quota,
// restricted key) in the response body. Axios only surfaces "Request failed
// with status code 404", so dig the real message out.
function upstreamDetail(error) {
  const data = error?.response?.data;

  if (!data || Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
    return "";
  }

  const message =
    data.error?.message || // Gemini, Places, Groq
    data.error_message || // Geocoding
    (typeof data.error === "string" ? data.error : "") ||
    data.message ||
    "";

  return withKeyHint(message);
}

// The referrer-restriction rejection is the most confusing failure here: the
// same key works in the browser, so it looks like the key is fine.
function withKeyHint(message) {
  if (/referer restriction/i.test(message)) {
    return `${message} Set GOOGLE_MAPS_SERVER_KEY to a separate key that is unrestricted or IP-restricted — referrer restrictions only work for the browser Maps JavaScript API.`;
  }

  return message;
}

function failFromUpstream(error, provider) {
  if (error.statusCode) {
    throw error;
  }

  const status = error?.response?.status;
  const detail = upstreamDetail(error);
  const reason = detail || (status ? `HTTP ${status}` : error.message);

  // A 404 from Gemini is not a 404 of this route — only pass through the
  // rate limit, which the caller can actually act on.
  fail(`${provider}: ${reason}`, status === 429 ? 429 : 502);
}

function assertEnv() {
  if (!MAPS_KEY) {
    fail("Missing GOOGLE_MAPS_SERVER_KEY in environment.");
  }

  if (!GEMINI_KEY) {
    fail("Missing GEMINI_API_KEY in environment.");
  }
}

function getTotalDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

function formatDateLabel(dateValue) {
  const date = new Date(dateValue);
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function buildDateLabels(startDate, totalDays) {
  const labels = [];
  const start = new Date(startDate);

  for (let index = 0; index < totalDays; index += 1) {
    const next = new Date(start);
    next.setDate(start.getDate() + index);
    labels.push(formatDateLabel(next.toISOString()));
  }

  return labels;
}

function extractJson(value) {
  if (!value || typeof value !== "string") {
    fail("AI response was empty.");
  }

  const fenced = value.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : value;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1) {
    fail("AI response did not contain valid JSON.");
  }

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (error) {
    fail(`AI returned malformed JSON: ${error.message}`, 502);
  }
}

function buildItineraryPrompt(input) {
  const totalDays = getTotalDays(input.startDate, input.endDate);
  const dateLabels = buildDateLabels(input.startDate, totalDays);

  return `
Plan an India trip itinerary using this exact JSON schema and no extra text:
{
  "destination": "string",
  "tripSummary": "string",
  "totalDays": number,
  "days": [
    {
      "day": number,
      "date": "string",
      "theme": "string",
      "blocks": [
        {
          "time": "Morning | Afternoon | Evening",
          "places": [
            {
              "name": "string",
              "type": "attraction | restaurant | cafe | hotel | experience | market",
              "description": "string",
              "whyVisit": "string",
              "estimatedDuration": "string",
              "budgetNote": "string",
              "mustVisit": boolean,
              "coordinates": null
            }
          ]
        }
      ],
      "dayTip": "string"
    }
  ]
}

Trip details:
- From: ${input.from?.name}
- To: ${input.to?.name}
- Start date: ${input.startDate}
- End date: ${input.endDate}
- Total days: ${totalDays}
- Date labels to use in order: ${dateLabels.join(", ")}
- People: ${input.people}
- Budget: ${input.budget}
- Interests: ${(input.interests || []).join(", ") || "General"}

Rules:
- Focus on India only.
- Use specific real place names, not generic placeholders.
- Make descriptions vivid, practical, and specific.
- Keep timing realistic.
- Use exactly 3 blocks per day: Morning, Afternoon, Evening.
- Include 1 to 3 places per block.
- Keep tripSummary to 2 vivid sentences.
- Every place.coordinates must be null.
- Return valid JSON only.
  `.trim();
}

async function callGemini(input) {
  assertEnv();

  let response;

  try {
    response = await axios.post(
      `${GEMINI_URL}?key=${GEMINI_KEY}`,
      {
        contents: [
          {
            parts: [{ text: buildItineraryPrompt(input) }],
          },
        ],
        systemInstruction: {
          parts: [
            {
              text: "You are a travel planner for India. Return only valid JSON, no markdown, no explanation.",
            },
          ],
        },
        generationConfig: {
          // Filling in a schema that is spelled out in the prompt does not
          // benefit from extended reasoning, and 2.5 Flash spends more time
          // thinking than answering when it is left on.
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 45000,
      },
    );
  } catch (error) {
    failFromUpstream(error, "Gemini request failed");
  }

  const text =
    response.data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";

  return extractJson(text);
}

async function callGroq(geminiJson) {
  if (!GROQ_KEY) {
    return {
      itinerary: geminiJson,
      fallback: true,
    };
  }

  try {
    const response = await axios.post(
      GROQ_URL,
      {
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: 3000,
        messages: [
          {
            role: "system",
            content:
              "You are a senior travel editor for India. You will receive a JSON travel itinerary. Improve it: fix any illogical ordering of places, add more specific local tips, improve descriptions to be vivid and specific, ensure timing is realistic, flag and fix any place that seems generic or touristy without value. Return only the corrected JSON with identical schema. Do not add or remove fields.",
          },
          {
            role: "user",
            content: JSON.stringify(geminiJson),
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 25000,
      },
    );

    const text = response.data?.choices?.[0]?.message?.content || "";
    return {
      itinerary: extractJson(text),
      fallback: false,
    };
  } catch (error) {
    // Refinement is optional — keep the Gemini draft, but say why it was
    // skipped so a broken key does not look like a silent no-op.
    console.warn(`Groq refinement skipped: ${upstreamDetail(error) || error.message}`);

    return {
      itinerary: geminiJson,
      fallback: true,
    };
  }
}

async function geocodeAddress(address) {
  let response;

  try {
    response = await axios.get(GEOCODE_BASE, {
      params: {
        address,
        key: MAPS_KEY,
      },
      timeout: 15000,
    });
  } catch (error) {
    failFromUpstream(error, "Geocoding request failed");
  }

  // Geocoding reports key and quota problems as HTTP 200 with a status field,
  // so an unchecked read here would look like "no results" instead of an error.
  const status = response.data?.status;

  if (status && status !== "OK" && status !== "ZERO_RESULTS") {
    const detail = response.data?.error_message;
    fail(`Geocoding request failed: ${withKeyHint(detail || status)}`, 502);
  }

  const first = response.data?.results?.[0];
  if (!first?.geometry?.location) {
    return null;
  }

  return {
    lat: first.geometry.location.lat,
    lng: first.geometry.location.lng,
  };
}

// A fortnight-long itinerary can hold well over a hundred places, and firing
// every geocode lookup at once invites Google's per-second quota to reject a
// share of them — which reads as places that simply have no location.
const GEOCODE_CONCURRENCY = 8;

async function mapWithConcurrency(items, limit, task) {
  const results = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index], index);
    }
  });

  await Promise.all(workers);

  return results;
}

async function geocodeItinerary(itinerary) {
  const placeTargets = itinerary.days.flatMap((day, dayIndex) =>
    day.blocks.flatMap((block, blockIndex) =>
      block.places.map((place, placeIndex) => ({
        dayIndex,
        blockIndex,
        placeIndex,
        query: `${place.name} ${itinerary.destination} India`,
      })),
    ),
  );

  // One unrecognisable place name must not sink the whole itinerary, but a key
  // or quota problem fails every lookup at once — surface that in the logs.
  const failures = [];
  const coords = await mapWithConcurrency(placeTargets, GEOCODE_CONCURRENCY, (target) =>
    geocodeAddress(target.query).catch((error) => {
      failures.push(error.message);
      return null;
    }),
  );

  if (failures.length === placeTargets.length && failures.length > 0) {
    console.warn(`Geocoding failed for all ${failures.length} places: ${failures[0]}`);
  }

  coords.forEach((coordinate, index) => {
    const target = placeTargets[index];
    itinerary.days[target.dayIndex].blocks[target.blockIndex].places[target.placeIndex].coordinates = coordinate;
  });

  return itinerary;
}

async function googlePlacesNearby({ lat, lng, type, radius }) {
  try {
    const response = await axios.post(
      `${GOOGLE_PLACES_BASE}/places:searchNearby`,
      {
        includedTypes: [type],
        locationRestriction: {
          circle: {
            center: {
              latitude: lat,
              longitude: lng,
            },
            radius,
          },
        },
        maxResultCount: 6,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": MAPS_KEY,
          "X-Goog-FieldMask": nearbyFieldMask,
        },
        timeout: 15000,
      },
    );

    return response.data?.places || [];
  } catch (error) {
    failFromUpstream(error, "Nearby places request failed");
  }
}

app.post("/api/generate-itinerary", async (req, res) => {
  try {
    const input = req.body;

    if (!input?.from?.name || !input?.to?.name || !input?.startDate || !input?.endDate) {
      fail("Missing trip inputs.", 400);
    }

    const geminiDraft = await callGemini(input);
    const groqResult = await callGroq(geminiDraft);
    const itinerary = await geocodeItinerary(groqResult.itinerary);

    res.json({
      error: false,
      itinerary,
      meta: {
        groqFallback: groqResult.fallback,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || "Unable to generate itinerary.",
    });
  }
});

app.get("/api/geocode", async (req, res) => {
  try {
    if (!MAPS_KEY) {
      fail("Missing GOOGLE_MAPS_SERVER_KEY in environment.");
    }

    const address = req.query.address?.toString().trim();
    if (!address) {
      fail("address is required", 400);
    }

    const location = await geocodeAddress(address);

    res.json({
      error: false,
      location,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || "Geocoding failed.",
    });
  }
});

app.post("/api/places/nearby", async (req, res) => {
  try {
    if (!MAPS_KEY) {
      fail("Missing GOOGLE_MAPS_SERVER_KEY in environment.");
    }

    const lat = Number(req.body?.lat);
    const lng = Number(req.body?.lng);
    const type = req.body?.type?.toString();
    const radius = Number(req.body?.radius || 1000);

    if (Number.isNaN(lat) || Number.isNaN(lng) || !type) {
      fail("lat, lng, and type are required", 400);
    }

    const places = await googlePlacesNearby({ lat, lng, type, radius });
    res.json({
      error: false,
      places,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || "Nearby places request failed.",
    });
  }
});

app.get("/api/places/photo", async (req, res) => {
  try {
    if (!MAPS_KEY) {
      fail("Missing GOOGLE_MAPS_SERVER_KEY in environment.");
    }

    const photoName = req.query.photo_name?.toString().trim();
    if (!photoName) {
      fail("photo_name is required", 400);
    }

    let response;

    try {
      response = await axios.get(
        `${GOOGLE_PLACES_BASE}/${photoName}/media`,
        {
          params: {
            maxWidthPx: 400,
            key: MAPS_KEY,
          },
          responseType: "arraybuffer",
          timeout: 15000,
        },
      );
    } catch (error) {
      failFromUpstream(error, "Photo request failed");
    }

    res.setHeader("Content-Type", response.headers["content-type"] || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(Buffer.from(response.data));
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: true,
      message: error.message || "Photo request failed.",
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ error: false, ok: true });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`PlaceStack proxy listening on http://localhost:${PORT}`);
  });
}

export default app;
