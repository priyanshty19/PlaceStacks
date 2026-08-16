import { useEffect, useState } from "react";
import Stars from "./Stars";
import { fetchPlaceReviews, resolvePlace, submitReview } from "../utils/places";

// Itinerary types map onto the review taxonomy; anything unrecognised is a place.
const categoryFor = (type) =>
  ({ restaurant: "food", cafe: "food", hotel: "stay", experience: "experience", market: "thing" })[type] || "place";

const ASPECTS = ["Worth it", "Overpriced", "Crowded", "Quiet", "Clean", "Hard to find", "Go early", "Skip it"];

function timeAgo(value) {
  const seconds = Math.floor((Date.now() - new Date(value)) / 1000);

  // Rounding up put "1 min ago" under a review posted three seconds earlier,
  // which reads as someone else's, not yours.
  if (seconds < 60) {
    return "just now";
  }

  const [amount, unit] =
    seconds < 3600 ? [seconds / 60, "min"] : seconds < 86_400 ? [seconds / 3600, "hr"] : [seconds / 86_400, "day"];
  const rounded = Math.floor(amount);

  return `${rounded} ${unit}${rounded > 1 ? "s" : ""} ago`;
}

export default function ReviewPanel({ place, onClose, onRatingChange }) {
  const [resolved, setResolved] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [aspects, setAspects] = useState([]);
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState({ loading: true, saving: false, error: "", saved: false });

  const placeInput = {
    name: place.name,
    category: categoryFor(place.type),
    lat: place.coordinates?.lat ?? null,
    lng: place.coordinates?.lng ?? null,
  };

  useEffect(() => {
    let cancelled = false;
    setStatus((current) => ({ ...current, loading: true, error: "", saved: false }));

    resolvePlace(placeInput)
      .then(async (found) => {
        const existing = await fetchPlaceReviews(found.id);
        if (cancelled) return;
        setResolved(found);
        setReviews(existing);
        setStatus((current) => ({ ...current, loading: false }));
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus((current) => ({ ...current, loading: false, error: error.message }));
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place.clientId]);

  const toggleAspect = (aspect) =>
    setAspects((current) =>
      current.includes(aspect) ? current.filter((item) => item !== aspect) : [...current, aspect].slice(0, 8),
    );

  const handleSubmit = async () => {
    if (!rating) {
      setStatus((current) => ({ ...current, error: "Pick a rating first." }));
      return;
    }

    setStatus((current) => ({ ...current, saving: true, error: "" }));

    try {
      const result = await submitReview({ place: placeInput, rating, body, aspects, handle });
      setResolved(result.place);
      setReviews(await fetchPlaceReviews(result.place.id));
      setRating(0);
      setBody("");
      setAspects([]);
      setStatus({ loading: false, saving: false, error: "", saved: true });
      onRatingChange?.(place.clientId, result.place);
    } catch (error) {
      setStatus((current) => ({ ...current, saving: false, error: error.message }));
    }
  };

  return (
    <aside className="review-panel">
      <header className="review-panel-head">
        <div>
          <span className="review-eyebrow">Reviews</span>
          <h3>{place.name}</h3>
          {resolved?.reviewCount ? (
            <div className="review-aggregate">
              <Stars rating={resolved.rating} size={14} />
              <strong>{resolved.rating.toFixed(1)}</strong>
              <span className="inline-muted">
                {resolved.reviewCount} review{resolved.reviewCount === 1 ? "" : "s"}
              </span>
            </div>
          ) : (
            <p className="inline-muted review-empty-note">No reviews yet — be the first.</p>
          )}
        </div>
        <button type="button" className="ghost-button close-button" onClick={onClose} aria-label="Close reviews">
          ✕
        </button>
      </header>

      <div className="review-form">
        <div className="rating-picker" role="group" aria-label="Your rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              className={`rating-star ${rating >= value ? "is-set" : ""}`}
              onClick={() => setRating(value)}
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              aria-pressed={rating === value}
            >
              ★
            </button>
          ))}
          {rating ? <span className="rating-readout">{rating}/5</span> : null}
        </div>

        <div className="aspect-row">
          {ASPECTS.map((aspect) => (
            <button
              key={aspect}
              type="button"
              className={`aspect-pill ${aspects.includes(aspect) ? "is-active" : ""}`}
              onClick={() => toggleAspect(aspect)}
            >
              {aspect}
            </button>
          ))}
        </div>

        <textarea
          className="field review-body"
          rows={3}
          maxLength={2000}
          placeholder="Anything worth passing on? (optional)"
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />

        <div className="review-submit-row">
          <input
            className="field review-handle"
            type="text"
            maxLength={40}
            placeholder="Your name (optional)"
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
          />
          <button type="button" className="primary-button" disabled={status.saving} onClick={handleSubmit}>
            {status.saving ? "Posting..." : "Post review"}
          </button>
        </div>

        {status.error ? <p className="inline-error">{status.error}</p> : null}
        {status.saved ? <p className="review-saved">Posted — thanks. You can revise it any time.</p> : null}
      </div>

      <div className="review-list">
        {status.loading ? <p className="inline-muted">Loading reviews...</p> : null}

        {!status.loading && reviews.length === 0 ? (
          <p className="inline-muted">Nothing here yet. Your take would be the first.</p>
        ) : null}

        {reviews.map((review) => (
          <article key={review.id} className="review-item">
            <div className="review-item-head">
              <Stars rating={review.rating} size={12} />
              <strong>{review.author}</strong>
              <span className="inline-muted">{timeAgo(review.createdAt)}</span>
            </div>
            {review.body ? <p className="review-body-text">{review.body}</p> : null}
            {review.aspects?.length ? (
              <div className="review-aspect-row">
                {review.aspects.map((aspect) => (
                  <span key={aspect} className="review-aspect">
                    {aspect}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </aside>
  );
}
