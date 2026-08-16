import { useEffect, useState } from "react";
import Stars from "../Stars";
import { fetchRecentReviews } from "../../utils/places";

const categoryIcon = {
  food: "🍽",
  stay: "🏨",
  transit: "🚕",
  experience: "🎟",
  thing: "🛍",
  place: "🛕",
};

export default function LiveReviews() {
  const [reviews, setReviews] = useState([]);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    fetchRecentReviews(6)
      .then((rows) => {
        if (cancelled) return;
        setReviews(rows);
        setState(rows.length ? "ready" : "empty");
      })
      .catch(() => !cancelled && setState("empty"));

    return () => {
      cancelled = true;
    };
  }, []);

  // An empty or unreachable feed is not worth a section of its own — the page
  // reads fine without it, so it simply does not render.
  if (state !== "ready") {
    return null;
  }

  return (
    <section className="landing-section" id="live-reviews">
      <div className="section-head">
        <span className="landing-eyebrow">
          <span className="live-dot" /> Coming in now
        </span>
        <h3>Live from people who were actually there.</h3>
      </div>

      <div className="live-review-grid">
        {reviews.map((review) => (
          <article key={review.id} className="live-review-card panel-card">
            <div className="live-review-head">
              <span aria-hidden="true">{categoryIcon[review.place?.category] || "📍"}</span>
              <strong>{review.place?.name}</strong>
            </div>

            <div className="live-review-rating">
              <Stars rating={review.rating} size={13} />
              <span className="inline-muted">{review.author}</span>
            </div>

            {review.body ? <p>{review.body}</p> : null}

            {review.aspects?.length ? (
              <div className="review-aspect-row">
                {review.aspects.slice(0, 3).map((aspect) => (
                  <span key={aspect} className="review-aspect">
                    {aspect}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
