# PRD — Live reviews

Status: in build · Owner: product · Supersedes nothing

## The bet

Google already has reviews. We are not going to win by having more of them.

What nobody has is a review captured **during the visit, about anything** — the ferry that does not run in monsoon, the cart outside the station, the viewpoint with no listing. Those things have no page to review on, and the person best placed to describe them is standing in front of them for about ninety seconds.

So the product is not "reviews for places." It is: **the cost of leaving a useful review drops to under ten seconds, and the thing being reviewed does not have to exist in anyone's database first.**

Everything below follows from that sentence.

## Decisions

### 1. Anonymous first. No signup wall.

A login screen between a traveller and a ten-second review is fatal — we would be trading the entire premise for an email address we do not need yet.

- Server issues an author id on first write; client keeps it in `localStorage`
- Optional display handle, not unique, not verified
- Upgrade path to real accounts stays open: `authors` is already a table, so attaching credentials later is additive

**Cost we are accepting:** weaker trust signal and a wider abuse surface. Mitigated by rate limits and per-author-per-place uniqueness, not by identity. We revisit when review volume makes trust the bottleneck — not before.

### 2. We own the place registry. Google is a link, not the source.

Google Places only covers businesses. Half the vision is things it does not list. So `places` is ours, and `google_place_id` is an optional foreign reference for the cases where a listing does exist.

Dedup: unique on `google_place_id` when present. Without one, a place is identified by name plus coordinates, and near-duplicates are tolerated at this stage — merging is a later problem and a cheaper one than blocking the write.

### 3. Rating plus aspects, prose optional.

"Ten seconds" rules out an essay as the primary input. One tap for stars, a few taps for aspects, text only if they want to.

This also solves cold start: five prose reviews tell you nothing in aggregate, but five reviews that all tapped *overpriced* tell you something immediately.

### 4. Aggregate on write, in the database.

Reviews are read far more often than written, and a place card must never trigger an `AVG()` over a review table.

Counts live denormalized on `places`, maintained by a **Postgres trigger** rather than application bookkeeping — the invariant then holds no matter which code path inserts, and it is less code than doing it by hand.

### 5. Postgres, host-agnostic.

Neon, Supabase and Vercel Postgres are all Postgres. Committing to the engine and not the vendor means production is a single `DATABASE_URL` and no code change.

## Scope

**In**

| | |
|---|---|
| Schema | `places`, `authors`, `reviews` with aggregates and constraints |
| Write | Submit a review against a place, resolving or creating that place |
| Read | Reviews for a place; recent reviews across everything |
| Surface | Capture form and review list in the planner; live feed on the landing page |
| Guard | Validation, per-author-per-place uniqueness, rate limiting |

**Explicitly out, for now**

Photos · helpful votes · moderation queue · real accounts · editing and deletion · replies · review search · geo-radius queries.

Each is defensible later. None is needed to prove that a stranger can leave a useful review in ten seconds and someone else can read it.

## Data model

```
places                              authors
  id            uuid pk              id          uuid pk
  google_place_id text unique?       handle      text?
  name          text                 created_at  timestamptz
  category      text
  lat, lng      float8?             reviews
  address       text?                id          uuid pk
  review_count  int      ← trigger   place_id    uuid → places
  rating_sum    int      ← trigger   author_id   uuid → authors
  created_at    timestamptz          rating      smallint 1–5
                                     body        text?
                                     aspects     text[]
                                     visited_on  date?
                                     created_at  timestamptz
                                     unique (place_id, author_id)
```

`rating_sum` and `review_count` rather than a stored average: integers stay exact, and the average is a division at read time.

## Categories

`place · food · stay · transit · experience · thing`

Deliberately six, deliberately broad. They map to the landing page's promise and they are the smallest set that still says "not just restaurants."

## Success

The loop closes: a reviewer submits, the aggregate moves, and a second person reads it back on a place card without a refresh. Anything beyond that is optimisation.
