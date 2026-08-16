import PlaceCard from "./PlaceCard";

export default function DaySection({
  day,
  refCallback,
  onHoverPlace,
  onLeavePlace,
  onMapPlace,
  onNearbyPlace,
  onReviewPlace,
  ratings,
}) {
  return (
    <article className="panel-card day-section" ref={refCallback}>
      <div className="day-heading">
        <div className="day-circle">{day.day}</div>
        <div>
          <h3>{day.theme}</h3>
          <div className="inline-muted">{day.date}</div>
        </div>
      </div>

      {day.blocks.map((block) => (
        <section key={`${day.day}-${block.time}`} className="time-block">
          <div className="time-label">{block.time}</div>
          <div className="place-card-stack">
            {block.places.map((place) => (
              <PlaceCard
                key={place.clientId}
                place={place}
                onHover={() => onHoverPlace(place.clientId)}
                onLeave={onLeavePlace}
                onMap={() => onMapPlace(place)}
                onNearby={() => onNearbyPlace(place)}
                onReview={() => onReviewPlace(place)}
                rating={ratings?.[place.clientId]}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="day-tip-strip">{day.dayTip}</div>
    </article>
  );
}
