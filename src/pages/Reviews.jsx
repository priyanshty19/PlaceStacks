import { useEffect, useState } from "react";
import Header from "../components/Header";
import MobileTabBar from "../components/AppNav";
import ReviewPanel from "../components/ReviewPanel";
import Stars from "../components/Stars";
import { fetchRecentReviews, searchPlaces } from "../utils/places";

const CATEGORIES = [
  { value: "place", label: "Place", icon: "🛕" },
  { value: "food", label: "Food", icon: "🍽" },
  { value: "stay", label: "Stay", icon: "🏨" },
  { value: "transit", label: "Transit", icon: "🚕" },
  { value: "experience", label: "Experience", icon: "🎟" },
  { value: "thing", label: "Thing", icon: "🛍" },
];

const iconFor = (category) => CATEGORIES.find((item) => item.value === category)?.icon || "📍";

// ReviewPanel speaks the itinerary's shape, so anything opened from here is
// translated into it rather than growing a second review form.
const asPanelPlace = (name, category, place) => ({
  clientId: place?.id || `new-${category}-${name}`,
  name,
  type: category,
  coordinates: place?.lat != null ? { lat: place.lat, lng: place.lng } : null,
});

export default function Reviews() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [recent, setRecent] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [newCategory, setNewCategory] = useState("place");

  useEffect(() => {
    fetchRecentReviews(12).then(setRecent).catch(() => setRecent([]));
  }, [selected]);

  useEffect(() => {
    const query = term.trim();

    if (query.length < 2) {
      setResults([]);
      return undefined;
    }

    setSearching(true);
    // Typing is faster than the round trip; wait for a pause before asking.
    const timer = setTimeout(() => {
      searchPlaces(query)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [term]);

  const trimmed = term.trim();
  const exactMatch = results.some((place) => place.name.toLowerCase() === trimmed.toLowerCase());

  if (selected) {
    return (
      <div className="reviews-shell">
        <Header />
        <main className="reviews-main">
          <button type="button" className="ghost-button back-button" onClick={() => setSelected(null)}>
            ← Back to search
          </button>
          <ReviewPanel key={selected.clientId} place={selected} variant="inline" />
        </main>
        <MobileTabBar />
      </div>
    );
  }

  return (
    <div className="reviews-shell">
      <Header />

      <main className="reviews-main">
        <div className="reviews-intro">
          <span className="landing-eyebrow">The Reviewer</span>
          <h2>Review anything. Look up anything.</h2>
          <p>
            A fort, a thali, a night bus, a homestay. If it does not exist here yet, put it here —
            that is rather the point.
          </p>
        </div>

        <div className="search-box">
          <span aria-hidden="true">🔍</span>
          <input
            className="field"
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search a place, dish, stay or route"
            aria-label="Search reviews"
          />
        </div>

        {trimmed.length >= 2 ? (
          <section className="search-results">
            {searching && results.length === 0 ? <p className="inline-muted">Searching...</p> : null}

            {results.map((place) => (
              <button
                key={place.id}
                type="button"
                className="result-card"
                onClick={() => setSelected(asPanelPlace(place.name, place.category, place))}
              >
                <span className="result-icon" aria-hidden="true">
                  {iconFor(place.category)}
                </span>
                <span className="result-copy">
                  <strong>{place.name}</strong>
                  <span className="inline-muted">{place.category}</span>
                </span>
                <span className="result-rating">
                  {place.reviewCount ? (
                    <>
                      <Stars rating={place.rating} size={12} />
                      <span>
                        {place.rating.toFixed(1)} ({place.reviewCount})
                      </span>
                    </>
                  ) : (
                    <span className="inline-muted">No reviews</span>
                  )}
                </span>
              </button>
            ))}

            {/* Nothing found is not a dead end here — it is the invitation. */}
            {!searching && !exactMatch ? (
              <div className="add-new-card">
                <p>
                  Nothing reviewed as <strong>“{trimmed}”</strong> yet. Be the first — what kind of
                  thing is it?
                </p>
                <div className="category-row">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      className={`aspect-pill ${newCategory === category.value ? "is-active" : ""}`}
                      onClick={() => setNewCategory(category.value)}
                    >
                      {category.icon} {category.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setSelected(asPanelPlace(trimmed, newCategory, null))}
                >
                  Review “{trimmed}” →
                </button>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="recent-strip">
            <h3>Latest reviews</h3>

            {recent.length === 0 ? (
              <p className="inline-muted">No reviews yet. Search for something and leave the first.</p>
            ) : (
              <div className="recent-grid">
                {recent.map((review) => (
                  <button
                    key={review.id}
                    type="button"
                    className="result-card"
                    onClick={() => setSelected(asPanelPlace(review.place.name, review.place.category, { id: review.place.id }))}
                  >
                    <span className="result-icon" aria-hidden="true">
                      {iconFor(review.place?.category)}
                    </span>
                    <span className="result-copy">
                      <strong>{review.place?.name}</strong>
                      <span className="inline-muted">
                        {review.body ? review.body.slice(0, 58) : `${review.author} rated it`}
                      </span>
                    </span>
                    <span className="result-rating">
                      <Stars rating={review.rating} size={12} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <MobileTabBar />
    </div>
  );
}
