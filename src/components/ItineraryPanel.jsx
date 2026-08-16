import DaySection from "./DaySection";

export default function ItineraryPanel({
  itinerary,
  activeDay,
  onSelectDay,
  dayRefs,
  onHoverPlace,
  onLeavePlace,
  onMapPlace,
  onNearbyPlace,
  onReviewPlace,
  ratings,
  pipeline,
}) {
  if (!itinerary) {
    return (
      <section className="panel-card itinerary-empty">
        <h3>Your itinerary will appear here</h3>
        <p className="inline-muted">
          Enter your route, dates, and interests, then PlaceStack will draft with Gemini and tighten it with Llama.
        </p>
        {pipeline.error ? <div className="inline-error">{pipeline.error}</div> : null}
      </section>
    );
  }

  return (
    <section className="itinerary-panel">
      <article className="panel-card trip-summary-card">
        <div className="trip-summary-header">
          <h2>{itinerary.destination}</h2>
          <span className="badge-pill">{itinerary.totalDays} days</span>
        </div>
        <p>{itinerary.tripSummary}</p>
      </article>

      <div className="day-pill-row">
        {itinerary.days.map((day) => (
          <button
            key={day.day}
            type="button"
            className={`day-pill ${activeDay === day.day ? "is-active" : ""}`}
            onClick={() => onSelectDay(day)}
          >
            Day {day.day}
          </button>
        ))}
      </div>

      <div className="day-section-stack">
        {itinerary.days.map((day) => (
          <DaySection
            key={day.day}
            day={day}
            refCallback={(node) => {
              dayRefs.current[day.day] = node;
            }}
            onHoverPlace={onHoverPlace}
            onLeavePlace={onLeavePlace}
            onMapPlace={onMapPlace}
            onNearbyPlace={onNearbyPlace}
            onReviewPlace={onReviewPlace}
            ratings={ratings}
          />
        ))}
      </div>
    </section>
  );
}
