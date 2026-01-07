/**
 * Helper to fetch the flight distance between two airport codes (IATA).
 * Uses the Apiverve Airport Distance API and returns kilometers.
 *
 * Usage example:
 * ```ts
 * const km = await fetchFlightDistance("JFK", "LHR");
 * console.log(km); // -> 5536 (for example)
 * ```
 *
 * NOTE: The API key is hard-coded for testing. Replace "YOUR_APIVERVE_KEY" with your real key.
 * Do not commit real keys in production; move them to environment variables later.
 */

// Minimal shape of the Apiverve response (only fields we care about).
type AirportDistanceResponse = {
  status?: string;
  error?: string | null;
  data?: {
    distanceMiles?: number;
    distanceKm?: number;
    airport1?: { iata?: string; name?: string };
    airport2?: { iata?: string; name?: string };
  };
};

/**
 * Fetches the great-circle distance between two airports (IATA codes) in kilometers.
 * @param originCode - Three-letter IATA code for the departure airport, e.g. "JFK".
 * @param destinationCode - Three-letter IATA code for the arrival airport, e.g. "LHR".
 */
export async function fetchFlightDistance(
  originCode: string,
  destinationCode: string
): Promise<number> {
  // Hard-code your Apiverve key here while experimenting.
  // IMPORTANT: replace this placeholder with your real key.
  const apiKey = "YOUR_APIVERVE";

  // Build a URL like:
  // https://api.apiverve.com/v1/airportdistance?iata1=JFK&iata2=LHR
  const params = new URLSearchParams({
    iata1: originCode.toUpperCase(), // API expects uppercase IATA codes
    iata2: destinationCode.toUpperCase(),
  });
  const endpoint = `https://api.apiverve.com/v1/airportdistance?${params.toString()}`;

  // Call the API; Apiverve expects the key in the X-API-KEY header.
  const response = await fetch(endpoint, {
    headers: {
      "X-API-KEY": apiKey,
    },
  });

  // If the HTTP status is not in the 200 range, surface a helpful error.
  if (!response.ok) {
    throw new Error(
      `Distance API call failed (${response.status} ${response.statusText}). Check codes and key.`
    );
  }

  // Parse the JSON body into our typed shape.
  const data: AirportDistanceResponse = await response.json();

  // The API reports success with status "ok"; otherwise, throw the message it provides.
  if (data.status !== "ok" || data.error) {
    throw new Error(`Distance API error: ${data.error ?? "Unknown error"}`);
  }

  // Pull out the kilometers field.
  const distanceKm = data.data?.distanceKm;

  // If we still do not have a usable distance, let the caller know.
  if (typeof distanceKm !== "number") {
    throw new Error(
      "Could not find a distance in the API response. Check the endpoint or field names."
    );
  }

  return distanceKm;
}

export default fetchFlightDistance;
