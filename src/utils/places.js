async function request(url, options = {}) {
  let response;

  try {
    response = await fetch(url, options);
  } catch {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }

  // Not every failure comes from our own handlers: a proxy, a platform gateway
  // or a cold-start timeout replies with HTML or nothing at all, and parsing
  // that as JSON reported "Unexpected end of JSON input" to the user.
  const body = await response.text();
  let data;

  try {
    data = body ? JSON.parse(body) : {};
  } catch {
    throw new Error(
      response.ok
        ? "The server sent a response we could not read."
        : `The server returned an error (HTTP ${response.status}).`,
    );
  }

  if (!response.ok || data.error) {
    throw new Error(data.message || `Request failed (HTTP ${response.status}).`);
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
