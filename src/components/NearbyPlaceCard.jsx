import Stars from "./Stars";
import { distanceBetween, formatNearbyMeta, getNearbyPhotoUrl, getOpenState, getPriceSymbols } from "../utils/helpers";

const emojiFallback = {
  restaurant: "🍽",
  cafe: "☕",
  tourist_attraction: "👁",
  lodging: "🏨",
};

export default function NearbyPlaceCard({ place, sourcePlace, onClick }) {
  const type = place.types?.[0] || "restaurant";
  const openState = getOpenState(place.currentOpeningHours);
  const distance = distanceBetween(sourcePlace?.coordinates, {
    lat: place.location?.latitude,
    lng: place.location?.longitude,
  });

  return (
    <button type="button" className="nearby-card" onClick={onClick}>
      {place.photos?.[0]?.name ? (
        <img
          className="nearby-photo"
          src={getNearbyPhotoUrl(place.photos[0].name)}
          alt={place.displayName?.text || "Nearby place"}
        />
      ) : (
        <div className="nearby-photo nearby-placeholder">{emojiFallback[type] || "📍"}</div>
      )}

      <div className="nearby-copy">
        <strong>{place.displayName?.text}</strong>
        <span className="inline-muted">{formatNearbyMeta(type)}</span>
        <div className="nearby-rating-row">
          <Stars rating={place.rating || 0} size={12} />
          <span>{(place.rating || 0).toFixed(1)}</span>
          <span className="inline-muted">({place.userRatingCount || 0})</span>
        </div>
        <div className="nearby-meta-row">
          <span>{getPriceSymbols(place.priceLevel)}</span>
          <span className={openState.className}>{openState.label}</span>
          <span>{distance}</span>
        </div>
      </div>
    </button>
  );
}
