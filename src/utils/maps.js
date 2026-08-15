const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#0d0d0d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#666666" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d0d0d" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#333333" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a0a0a" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0f1a0f" }] },
];

let mapsPromise;

// Overlay content is written with innerHTML and every field in it — place
// names, durations, budget notes — comes back from a language model, so it is
// untrusted text rather than markup.
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildMarkerIcon(color, scale = 1) {
  const size = 18 * scale;
  return {
    path: window.google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#0d0d0d",
    strokeWeight: 2,
    scale: size / 4,
  };
}

export function loadGoogleMapsScript(apiKey) {
  if (!apiKey) {
    return Promise.reject(new Error("Missing VITE_GOOGLE_MAPS_API_KEY in .env."));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (!mapsPromise) {
    mapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error("Google Maps failed to load."));
      document.head.appendChild(script);
    });
  }

  return mapsPromise;
}

export function createMapController(container, callbacks) {
  class HtmlOverlay extends window.google.maps.OverlayView {
    constructor({ className = "" } = {}) {
      super();
      this.div = null;
      this.position = null;
      this.className = className;
    }

    onAdd() {
      this.div = document.createElement("div");
      this.div.className = this.className;
      this.getPanes().floatPane.appendChild(this.div);
    }

    draw() {
      if (!this.div || !this.position) {
        return;
      }

      const projection = this.getProjection();
      const point = projection.fromLatLngToDivPixel(this.position);

      if (!point) {
        return;
      }

      this.div.style.left = `${point.x}px`;
      this.div.style.top = `${point.y}px`;
    }

    onRemove() {
      if (this.div) {
        this.div.remove();
        this.div = null;
      }
    }

    show(position, html) {
      this.position = position;
      if (this.div) {
        this.div.innerHTML = html;
        this.div.style.display = "block";
      }
      this.draw();
    }

    hide() {
      if (this.div) {
        this.div.style.display = "none";
      }
    }
  }

  const map = new window.google.maps.Map(container, {
    center: { lat: 22.9734, lng: 78.6569 },
    zoom: 5,
    disableDefaultUI: true,
    zoomControl: true,
    styles: darkMapStyles,
  });

  const markerMap = new Map();
  const tooltip = new HtmlOverlay({ className: "map-tooltip-overlay" });
  const info = new HtmlOverlay({ className: "map-info-overlay" });
  tooltip.setMap(map);
  info.setMap(map);

  let polyline = null;
  let nearbyMarker = null;

  const clear = () => {
    markerMap.forEach((entry) => entry.marker.setMap(null));
    markerMap.clear();
    if (polyline) {
      polyline.setMap(null);
      polyline = null;
    }
    if (nearbyMarker) {
      nearbyMarker.setMap(null);
      nearbyMarker = null;
    }
    tooltip.hide();
    info.hide();
  };

  const focusPlace = (clientId, pan = false) => {
    markerMap.forEach((entry, key) => {
      entry.marker.setIcon(buildMarkerIcon(entry.place.color, key === clientId ? 1.4 : 1));
    });

    const entry = markerMap.get(clientId);
    if (!entry) {
      return;
    }

    if (pan) {
      map.panTo(entry.marker.getPosition());
    }

    window.setTimeout(() => {
      entry.marker.setAnimation(window.google.maps.Animation.BOUNCE);
      window.setTimeout(() => entry.marker.setAnimation(null), 700);
    }, 0);
  };

  const fitToPlaces = (places) => {
    const bounds = new window.google.maps.LatLngBounds();
    places.forEach((place) => {
      if (place.coordinates?.lat && place.coordinates?.lng) {
        bounds.extend(place.coordinates);
      }
    });
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 60);
    }
  };

  const plotItinerary = (itinerary) => {
    clear();
    const path = [];

    itinerary.days.forEach((day) => {
      day.allPlaces.forEach((place) => {
        if (!place.coordinates?.lat || !place.coordinates?.lng) {
          return;
        }

        const marker = new window.google.maps.Marker({
          map,
          position: place.coordinates,
          icon: buildMarkerIcon(place.color),
          label: {
            text: String(place.orderInDay),
            color: "#111111",
            fontWeight: "700",
          },
          title: place.name,
        });

        marker.addListener("mouseover", () => {
          tooltip.show(
            marker.getPosition(),
            `<div class="map-tooltip"><strong>${escapeHtml(place.name)}</strong><span>${escapeHtml(place.type)}</span></div>`,
          );
        });

        marker.addListener("mouseout", () => tooltip.hide());

        marker.addListener("click", () => {
          info.show(
            marker.getPosition(),
            `<div class="map-popup">
              <h4>${escapeHtml(place.name)}</h4>
              <p>${escapeHtml(place.timeBlock)} · ${escapeHtml(place.estimatedDuration)}</p>
              <p>${escapeHtml(place.budgetNote)}</p>
              <button class="map-popup-button" data-place-id="${escapeHtml(place.clientId)}">Nearby →</button>
            </div>`,
          );
          const button = info.div?.querySelector("[data-place-id]");
          if (button) {
            button.onclick = () => callbacks.onNearbyRequest(place);
          }
          callbacks.onMarkerClick(place);
        });

        markerMap.set(place.clientId, { marker, place });
        path.push(place.coordinates);
      });
    });

    if (path.length > 1) {
      polyline = new window.google.maps.Polyline({
        path,
        strokeOpacity: 0,
        icons: [
          {
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 1,
              strokeColor: "rgba(244,165,53,0.8)",
              scale: 2,
            },
            offset: "0",
            repeat: "14px",
          },
        ],
        map,
      });
    }

    fitToPlaces(itinerary.days.flatMap((day) => day.allPlaces));
  };

  const showNearbyResult = (place) => {
    const position = {
      lat: place.location?.latitude,
      lng: place.location?.longitude,
    };

    if (!position.lat || !position.lng) {
      return;
    }

    if (nearbyMarker) {
      nearbyMarker.setMap(null);
    }

    nearbyMarker = new window.google.maps.Marker({
      map,
      position,
      icon: buildMarkerIcon("#4ECDC4", 1.2),
      title: place.displayName?.text,
    });
    map.panTo(position);
    map.setZoom(15);
  };

  return {
    plotItinerary,
    fitToPlaces,
    focusPlace,
    setHoveredPlace: (clientId) => {
      if (!clientId) {
        markerMap.forEach((entry) => entry.marker.setIcon(buildMarkerIcon(entry.place.color, 1)));
        return;
      }
      focusPlace(clientId, true);
    },
    showNearbyResult,
  };
}
