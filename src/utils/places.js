async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export async function generateItinerary(payload) {
  return request("/api/generate-itinerary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchNearbyPlaces(payload) {
  const data = await request("/api/places/nearby", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return data.places || [];
}
