import { Router } from "express";
import { ensureSchema, query } from "../db/index.js";
import { fail, sendError } from "../http.js";

const CATEGORIES = new Set(["place", "food", "stay", "transit", "experience", "thing"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The database already enforces every one of these. Checking here too is not
// duplication for its own sake: it turns a 500 from a constraint violation into
// a 400 that tells the caller which field is wrong.
function readPlaceInput(input) {
  const name = String(input?.name ?? "").trim();
  const category = String(input?.category ?? "place").trim();

  if (!name || name.length > 200) {
    fail("A place name of 1–200 characters is required.", 400);
  }

  if (!CATEGORIES.has(category)) {
    fail(`category must be one of: ${[...CATEGORIES].join(", ")}.`, 400);
  }

  const coordinate = (value, limit) => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || Math.abs(parsed) > limit) {
      fail(`Invalid coordinate: ${value}`, 400);
    }
    return parsed;
  };

  return {
    googlePlaceId: input?.googlePlaceId ? String(input.googlePlaceId) : null,
    name,
    category,
    lat: coordinate(input?.lat, 90),
    lng: coordinate(input?.lng, 180),
    address: input?.address ? String(input.address).slice(0, 500) : null,
  };
}

function readReviewInput(input) {
  const rating = Number(input?.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    fail("rating must be a whole number from 1 to 5.", 400);
  }

  const body = String(input?.body ?? "").trim();
  if (body.length > 2000) {
    fail("A review body cannot exceed 2000 characters.", 400);
  }

  const aspects = Array.isArray(input?.aspects)
    ? [...new Set(input.aspects.map((value) => String(value).trim().slice(0, 40)).filter(Boolean))].slice(0, 8)
    : [];

  const visitedOn = input?.visitedOn ? String(input.visitedOn).slice(0, 10) : null;
  if (visitedOn && Number.isNaN(Date.parse(visitedOn))) {
    fail("visitedOn must be an ISO date.", 400);
  }

  return { rating, body: body || null, aspects, visitedOn };
}

// A place is identified by its Google id when it has one, and by name plus
// rough position when it does not — which is the whole point, since the things
// worth reviewing here often have no listing anywhere.
async function resolvePlace(input) {
  if (input.googlePlaceId) {
    const { rows } = await query(
      `INSERT INTO places (google_place_id, name, category, lat, lng, address)
            VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (google_place_id) DO UPDATE SET name = EXCLUDED.name
         RETURNING *`,
      [input.googlePlaceId, input.name, input.category, input.lat, input.lng, input.address],
    );

    return rows[0];
  }

  const { rows: existing } = await query(
    `SELECT * FROM places
      WHERE google_place_id IS NULL
        AND lower(name) = lower($1)
        AND category = $2
        AND (($3::float8 IS NULL AND lat IS NULL) OR (abs(lat - $3) < 0.002 AND abs(lng - $4) < 0.002))
      LIMIT 1`,
    [input.name, input.category, input.lat, input.lng],
  );

  if (existing[0]) {
    return existing[0];
  }

  const { rows } = await query(
    `INSERT INTO places (name, category, lat, lng, address) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [input.name, input.category, input.lat, input.lng, input.address],
  );

  return rows[0];
}

async function resolveAuthor(authorId, handle) {
  const trimmed = handle ? String(handle).trim().slice(0, 40) : null;

  if (authorId && UUID.test(authorId)) {
    const { rows } = await query(
      `UPDATE authors SET handle = COALESCE($2, handle) WHERE id = $1 RETURNING *`,
      [authorId, trimmed],
    );

    if (rows[0]) return rows[0];
  }

  const { rows } = await query(`INSERT INTO authors (handle) VALUES ($1) RETURNING *`, [trimmed]);

  return rows[0];
}

const publicPlace = (place) => ({
  id: place.id,
  googlePlaceId: place.google_place_id,
  name: place.name,
  category: place.category,
  lat: place.lat,
  lng: place.lng,
  address: place.address,
  reviewCount: place.review_count,
  // Exact integers in the column, the division only at the edge.
  rating: place.review_count ? Number((place.rating_sum / place.review_count).toFixed(2)) : null,
});

const publicReview = (row) => ({
  id: row.id,
  rating: row.rating,
  body: row.body,
  aspects: row.aspects,
  visitedOn: row.visited_on,
  createdAt: row.created_at,
  author: row.handle || "Anonymous",
  place: row.place_name ? { id: row.place_id, name: row.place_name, category: row.category } : undefined,
});

const router = Router();

router.use(async (_req, _res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (error) {
    next(error);
  }
});

// Create-or-get. A write, so POST: opening the review panel for an AI-suggested
// place is the moment that place first becomes a row.
router.post("/places/resolve", async (req, res) => {
  try {
    const place = await resolvePlace(readPlaceInput(req.body));
    res.json({ error: false, place: publicPlace(place) });
  } catch (error) {
    sendError(res, error, "Could not resolve that place.");
  }
});

router.get("/places/:placeId/reviews", async (req, res) => {
  try {
    if (!UUID.test(req.params.placeId)) {
      fail("placeId must be a uuid.", 400);
    }

    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const { rows } = await query(
      `SELECT r.*, a.handle
         FROM reviews r
         JOIN authors a ON a.id = r.author_id
        WHERE r.place_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2`,
      [req.params.placeId, limit],
    );

    res.json({ error: false, reviews: rows.map(publicReview) });
  } catch (error) {
    sendError(res, error, "Could not load reviews.");
  }
});

router.get("/reviews/recent", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const { rows } = await query(
      `SELECT r.*, a.handle, p.name AS place_name, p.category
         FROM reviews r
         JOIN authors a ON a.id = r.author_id
         JOIN places  p ON p.id = r.place_id
        ORDER BY r.created_at DESC
        LIMIT $1`,
      [limit],
    );

    res.json({ error: false, reviews: rows.map(publicReview) });
  } catch (error) {
    sendError(res, error, "Could not load recent reviews.");
  }
});

// Upsert rather than insert: the unique index means a second submission from
// the same person is a revision, not an error to hand back to them.
router.post("/reviews", async (req, res) => {
  try {
    const placeInput = readPlaceInput(req.body?.place);
    const reviewInput = readReviewInput(req.body);

    const place = await resolvePlace(placeInput);
    const author = await resolveAuthor(req.body?.authorId, req.body?.handle);

    const { rows } = await query(
      `INSERT INTO reviews (place_id, author_id, rating, body, aspects, visited_on)
            VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (place_id, author_id) DO UPDATE
               SET rating = EXCLUDED.rating,
                   body = EXCLUDED.body,
                   aspects = EXCLUDED.aspects,
                   visited_on = EXCLUDED.visited_on,
                   created_at = now()
         RETURNING *`,
      [place.id, author.id, reviewInput.rating, reviewInput.body, reviewInput.aspects, reviewInput.visitedOn],
    );

    // Re-read: the trigger updated the aggregate after the row we resolved.
    const { rows: refreshed } = await query(`SELECT * FROM places WHERE id = $1`, [place.id]);

    res.status(201).json({
      error: false,
      review: publicReview({ ...rows[0], handle: author.handle }),
      place: publicPlace(refreshed[0]),
      authorId: author.id,
    });
  } catch (error) {
    sendError(res, error, "Could not save that review.");
  }
});

export default router;
