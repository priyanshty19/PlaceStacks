-- Idempotent: safe to run on every boot. There is no production data yet, so
-- IF NOT EXISTS is enough and a migration framework would be premature. The day
-- a column has to change under live rows, add a real migration tool.

CREATE TABLE IF NOT EXISTS places (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id text UNIQUE,
  name            text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
  category        text NOT NULL CHECK (category IN ('place', 'food', 'stay', 'transit', 'experience', 'thing')),
  lat             double precision CHECK (lat BETWEEN -90 AND 90),
  lng             double precision CHECK (lng BETWEEN -180 AND 180),
  address         text,
  -- Maintained by the trigger below, never written by application code.
  review_count    integer NOT NULL DEFAULT 0,
  rating_sum      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS authors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle     text CHECK (handle IS NULL OR length(trim(handle)) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id   uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  rating     smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       text CHECK (body IS NULL OR length(body) <= 2000),
  aspects    text[] NOT NULL DEFAULT '{}' CHECK (cardinality(aspects) <= 8),
  visited_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- One verdict per person per place. Revising means updating, not stacking.
  UNIQUE (place_id, author_id)
);

CREATE INDEX IF NOT EXISTS reviews_place_recent_idx ON reviews (place_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_recent_idx ON reviews (created_at DESC);

-- Aggregates live in the database so the invariant holds regardless of which
-- code path writes, and so a place card never triggers an AVG() over reviews.
CREATE OR REPLACE FUNCTION sync_place_rating() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE places
       SET review_count = review_count + 1,
           rating_sum   = rating_sum + NEW.rating
     WHERE id = NEW.place_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE places
       SET review_count = review_count - 1,
           rating_sum   = rating_sum - OLD.rating
     WHERE id = OLD.place_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.rating <> OLD.rating THEN
    UPDATE places
       SET rating_sum = rating_sum - OLD.rating + NEW.rating
     WHERE id = NEW.place_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reviews_sync_place_rating ON reviews;
CREATE TRIGGER reviews_sync_place_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION sync_place_rating();
