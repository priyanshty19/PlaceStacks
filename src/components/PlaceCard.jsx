const typeLabels = {
  attraction: "See",
  restaurant: "Eat",
  cafe: "Coffee",
  hotel: "Stay",
  experience: "See",
  market: "See",
};

export default function PlaceCard({ place, onHover, onLeave, onMap, onNearby }) {
  const typeClass = `type-${typeLabels[place.type]?.toLowerCase() || "see"}`;

  return (
    <article className={`place-card ${typeClass}`} onMouseEnter={onHover} onMouseLeave={onLeave}>
      <div className="place-card-accent" />
      <div className="place-card-content">
        <div className="place-card-top">
          <div className="place-chip-row">
            <span className={`type-badge ${typeClass}`}>{place.type}</span>
            {place.mustVisit ? <span className="must-visit-badge">Must Visit</span> : null}
            <span className="duration-pill">{place.estimatedDuration}</span>
          </div>
        </div>
        <h4>{place.name}</h4>
        <p className="place-description">{place.description}</p>
        <p className="place-why">{place.whyVisit}</p>
        <div className="budget-pill">{place.budgetNote}</div>
        <div className="place-actions">
          <button type="button" className="ghost-button" onClick={onMap}>
            📍 Map
          </button>
          <button type="button" className="ghost-button" onClick={onNearby}>
            🔍 Nearby
          </button>
        </div>
      </div>
    </article>
  );
}
