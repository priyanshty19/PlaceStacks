export function clampPeople(value) {
  return Math.min(20, Math.max(1, value));
}

// toISOString() converts to UTC first, so for anyone east of Greenwich it
// reports yesterday's date through the late evening — which would offer a start
// date already in the past.
function toDateInputValue(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function getDateConstraints(startDate) {
  const minStart = toDateInputValue(new Date());

  if (!startDate) {
    return {
      minStart,
      minEnd: minStart,
      maxEnd: "",
    };
  }

  const start = new Date(startDate);
  const maxEnd = new Date(start);
  maxEnd.setDate(start.getDate() + 13);

  return {
    minStart,
    // A day trip is a trip: the server already plans a single-day itinerary
    // correctly, but the form refused to let anyone ask for one.
    minEnd: startDate,
    maxEnd: toDateInputValue(maxEnd),
  };
}

export function buildTripSummaryBar(form) {
  const start = form.startDate ? new Date(form.startDate) : null;
  const end = form.endDate ? new Date(form.endDate) : null;
  const format = (date) =>
    new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric", timeZone: "Asia/Kolkata" }).format(date);

  return `${form.from.name || "Start"} → ${form.to.name || "Destination"} · ${
    start && end ? `${format(start)}–${format(end)}` : "Pick dates"
  } · ${form.people} people · ${form.budget === "Mid-range" ? "₹₹" : form.budget === "Premium" ? "₹₹₹" : "₹"}`;
}

export function normalizeItinerary(raw) {
  const dayColors = ["#F4A535", "#4ECDC4", "#A855F7", "#FF6B35"];

  return {
    ...raw,
    days: raw.days.map((day, dayIndex) => {
      const allPlaces = [];

      const blocks = day.blocks.map((block, blockIndex) => ({
        ...block,
        places: block.places.map((place, placeIndex) => {
          const normalized = {
            ...place,
            clientId: `day-${day.day}-block-${blockIndex}-place-${placeIndex}`,
            dayNumber: day.day,
            color: dayColors[dayIndex % dayColors.length],
            orderInDay: allPlaces.length + 1,
            timeBlock: block.time,
          };
          allPlaces.push(normalized);
          return normalized;
        }),
      }));

      return {
        ...day,
        blocks,
        allPlaces,
      };
    }),
  };
}

export function distanceBetween(origin, target) {
  if (!origin?.lat || !origin?.lng || !target?.lat || !target?.lng) {
    return "Distance N/A";
  }

  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(target.lat - origin.lat);
  const dLng = toRad(target.lng - origin.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.lat)) * Math.cos(toRad(target.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = earthRadius * c;

  return distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
}

export function formatNearbyMeta(type) {
  return type.replaceAll("_", " ");
}

export function getNearbyPhotoUrl(photoName) {
  return `/api/places/photo?photo_name=${encodeURIComponent(photoName)}`;
}

export function getOpenState(openingHours) {
  const open = openingHours?.openNow;

  // Plenty of places come back without opening hours at all. Reporting those as
  // closed is worse than admitting we do not know — it sends someone elsewhere.
  if (typeof open !== "boolean") {
    return { label: "○ Hours unknown", className: "status-unknown" };
  }

  return open
    ? { label: "● Open", className: "status-open" }
    : { label: "● Closed", className: "status-closed" };
}

export function getPriceSymbols(level) {
  const mapping = {
    PRICE_LEVEL_FREE: "Free",
    PRICE_LEVEL_INEXPENSIVE: "₹",
    PRICE_LEVEL_MODERATE: "₹₹",
    PRICE_LEVEL_EXPENSIVE: "₹₹₹",
    PRICE_LEVEL_VERY_EXPENSIVE: "₹₹₹₹",
  };

  return mapping[level] || "₹?";
}
