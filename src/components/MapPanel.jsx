import Spinner from "./Spinner";

export default function MapPanel({ mapNodeRef, mapsReady, mapsError }) {
  return (
    <div className="map-shell">
      <div ref={mapNodeRef} className="map-canvas" />
      {!mapsReady && !mapsError ? (
        <div className="map-overlay-status">
          <Spinner />
          <span>Loading Google Maps...</span>
        </div>
      ) : null}
      {mapsError ? <div className="map-overlay-status error">{mapsError}</div> : null}
    </div>
  );
}
