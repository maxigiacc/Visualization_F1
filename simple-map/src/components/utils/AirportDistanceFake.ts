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

export function fetchFlightDistance( originCode: string, destinationCode: string ): number {
  // Generate random distance for fake implementation
  const minDistance = 1; // Minimum distance in km
  const maxDistance = 5; // Maximum distance in km
  const distanceKm = Math.floor(Math.random() * (maxDistance - minDistance + 1)) + minDistance;
  //console.log(`Fetched fake distance between ${originCode} and ${destinationCode}: ${distanceKm} km`);
  return (distanceKm);
}

export default fetchFlightDistance;

