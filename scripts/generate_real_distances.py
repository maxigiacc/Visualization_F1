#!/usr/bin/env python3
"""
Generate a real distances.csv using the Apiverve Airport Distance API.
Adds caching + throttling to avoid excessive requests.
"""

import argparse
import csv
import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Dict, Iterable, List, Tuple


class RateLimitError(RuntimeError):
    pass


class AuthError(RuntimeError):
    pass


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    to_rad = math.radians
    d_lat = to_rad(lat2 - lat1)
    d_lon = to_rad(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def api_distance_km(iata1: str, iata2: str, api_key: str) -> float:
    params = urllib.parse.urlencode({"iata1": iata1, "iata2": iata2})
    endpoint = f"https://api.apiverve.com/v1/airportdistance?{params}"
    req = urllib.request.Request(endpoint, headers={"X-API-KEY": api_key})
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = resp.read()
    data = json.loads(body)
    if data.get("status") != "ok" or data.get("error"):
        raise RuntimeError(f"API error: {data.get('error')}")
    distance_km = data.get("data", {}).get("distanceKm")
    if not isinstance(distance_km, (int, float)):
        raise RuntimeError("No distanceKm in API response")
    return float(distance_km)


def load_csv(path: Path) -> List[Dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def circuit_pairs(items: Iterable[int]) -> Iterable[Tuple[int, int]]:
    sorted_ids = sorted(set(items))
    for i in range(len(sorted_ids)):
        for j in range(i + 1, len(sorted_ids)):
            yield sorted_ids[i], sorted_ids[j]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--circuits", default="simple-map/public/circuits.csv")
    parser.add_argument("--races", default="simple-map/public/races.csv")
    parser.add_argument("--out", default="simple-map/public/distances.csv")
    parser.add_argument("--append", action="store_true", help="append rows instead of overwriting")
    parser.add_argument("--cache", default=".distance_cache.json")
    parser.add_argument("--api-key", default="")
    parser.add_argument("--rate-limit", type=float, default=1.0, help="seconds between API calls")
    parser.add_argument("--max-requests", type=int, default=0, help="0 means no limit")
    parser.add_argument("--max-retries", type=int, default=5, help="retry count for 429 errors")
    parser.add_argument("--backoff-base", type=float, default=2.0, help="base seconds for backoff")
    parser.add_argument(
        "--stop-on-429",
        action="store_true",
        help="stop generation on rate-limit errors instead of fallback",
    )
    parser.add_argument(
        "--stop-on-auth",
        action="store_true",
        help="stop generation on 401/403 instead of fallback",
    )
    parser.add_argument("--start-year", type=int, default=2000)
    parser.add_argument("--end-year", type=int, default=2025)
    parser.add_argument("--road-factor", type=float, default=1.15)
    args = parser.parse_args()

    circuits_path = Path(args.circuits)
    races_path = Path(args.races)
    out_path = Path(args.out)
    cache_path = Path(args.cache)

    api_key = args.api_key or os.environ.get("APIVERVE_API_KEY", "")
    if not api_key:
        env_path = Path(".env")
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if line.strip().startswith("APIVERVE_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                    break
    if not api_key:
        key_path = Path.home() / ".apiverve_key"
        if key_path.exists():
            api_key = key_path.read_text(encoding="utf-8").strip()
    api_key = api_key.strip()

    circuits_rows = load_csv(circuits_path)
    races_rows = load_csv(races_path)

    circuits: Dict[int, Dict[str, str]] = {}
    for row in circuits_rows:
        circuit_id = int(row["circuitId"])
        circuits[circuit_id] = row

    circuits_by_year: Dict[int, List[int]] = {}
    for row in races_rows:
        year = int(row["year"])
        if year < args.start_year or year > args.end_year:
            continue
        circuit_id = int(row["circuitId"])
        circuits_by_year.setdefault(year, []).append(circuit_id)

    cache: Dict[str, float] = {}
    if cache_path.exists():
        try:
            cache = json.loads(cache_path.read_text())
        except json.JSONDecodeError:
            cache = {}

    rows: List[Dict[str, str]] = []
    request_count = 0
    last_call = 0.0

    def throttled_call(iata1: str, iata2: str) -> float:
        nonlocal request_count, last_call
        attempt = 0
        while True:
            now = time.time()
            elapsed = now - last_call
            if elapsed < args.rate_limit:
                time.sleep(args.rate_limit - elapsed)
            last_call = time.time()
            request_count += 1
            try:
                return api_distance_km(iata1, iata2, api_key)
            except urllib.error.HTTPError as exc:
                if exc.code == 429:
                    if attempt >= args.max_retries:
                        raise RateLimitError("HTTP 429 rate limited")
                    sleep_for = args.backoff_base * (2 ** attempt)
                    time.sleep(sleep_for)
                    attempt += 1
                    continue
                if exc.code in (401, 403):
                    raise AuthError(f"HTTP {exc.code} auth error")
                raise

    stop_early = False

    for year in sorted(circuits_by_year.keys()):
        circuit_ids = circuits_by_year[year]
        for c_from, c_to in circuit_pairs(circuit_ids):
            info_from = circuits[c_from]
            info_to = circuits[c_to]

            lat1 = float(info_from["lat"])
            lon1 = float(info_from["lng"])
            lat2 = float(info_to["lat"])
            lon2 = float(info_to["lng"])
            cluster1 = info_from.get("cluster_id")
            cluster2 = info_to.get("cluster_id")

            same_cluster = cluster1 and cluster2 and cluster1 == cluster2

            if same_cluster:
                car_km = haversine(lat1, lon1, lat2, lon2) * args.road_factor
                plane_km = 0.0
            else:
                car_km = 0.0
                iata1 = (info_from.get("nearest_airport_iata") or "").upper()
                iata2 = (info_to.get("nearest_airport_iata") or "").upper()
                if iata1 and iata2:
                    if not api_key:
                        plane_km = haversine(lat1, lon1, lat2, lon2)
                        rows.append(
                            {
                                "Year": str(year),
                                "circuitIdFrom": str(c_from),
                                "circuitIdTo": str(c_to),
                                "Car": f"{car_km:.3f}",
                                "Plane": f"{plane_km:.3f}",
                            }
                        )
                        continue
                    cache_key = "|".join(sorted([iata1, iata2]))
                    if cache_key in cache:
                        plane_km = cache[cache_key]
                    else:
                        if args.max_requests and request_count >= args.max_requests:
                            print("Max requests reached, stopping early.")
                            stop_early = True
                            break
                        try:
                            plane_km = throttled_call(iata1, iata2)
                        except RateLimitError as exc:
                            print(f"API rate limit {iata1}-{iata2}: {exc}")
                            if args.stop_on_429:
                                stop_early = True
                                break
                            plane_km = haversine(lat1, lon1, lat2, lon2)
                        except AuthError as exc:
                            print(f"API auth error {iata1}-{iata2}: {exc}")
                            if args.stop_on_auth:
                                stop_early = True
                                break
                            plane_km = haversine(lat1, lon1, lat2, lon2)
                        except (urllib.error.HTTPError, urllib.error.URLError, RuntimeError) as exc:
                            print(f"API error {iata1}-{iata2}: {exc}")
                            plane_km = haversine(lat1, lon1, lat2, lon2)
                        cache[cache_key] = plane_km
                        cache_path.write_text(json.dumps(cache, indent=2))
                else:
                    plane_km = haversine(lat1, lon1, lat2, lon2)

            rows.append(
                {
                    "Year": str(year),
                    "circuitIdFrom": str(c_from),
                    "circuitIdTo": str(c_to),
                    "Car": f"{car_km:.3f}",
                    "Plane": f"{plane_km:.3f}",
                }
            )
            if stop_early:
                break
        if stop_early:
            break

    write_header = True
    if args.append and out_path.exists():
        write_header = False

    with out_path.open("a" if args.append else "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["Year", "circuitIdFrom", "circuitIdTo", "Car", "Plane"]
        )
        if write_header:
            writer.writeheader()
        writer.writerows(rows)

    if stop_early:
        print("Stopped early due to max request limit or API error.")
    print(f"Wrote {len(rows)} rows to {out_path}")
    return 0 if not stop_early else 1


if __name__ == "__main__":
    sys.exit(main())
