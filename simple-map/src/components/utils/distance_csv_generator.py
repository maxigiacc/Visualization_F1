#!/usr/bin/env python3
"""
Generate fake (but plausible) travel distances between circuits for each year.

Input:  races.csv with at least columns: year, circuitId
Output: distance.csv with columns: Year, circuitIdFrom, circuitIdTo, Car, Plane
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
from dataclasses import dataclass
from typing import Iterable, Tuple

import pandas as pd


@dataclass(frozen=True)
class DistanceRanges:
    plane_min_km: float = 250.0
    plane_max_km: float = 12000.0
    car_factor_min: float = 1.05   # driving usually longer than straight line
    car_factor_max: float = 1.40


def _rng_from_key(key: str) -> float:
    """
    Deterministic pseudo-random float in [0,1) derived from a string key.
    """
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    # take 16 hex chars -> 64 bits
    n = int(digest[:16], 16)
    return (n % (10**12)) / float(10**12)


def _uniform(key: str, a: float, b: float) -> float:
    u = _rng_from_key(key)
    return a + (b - a) * u


def generate_pairs(circuits: Iterable[int]) -> Iterable[Tuple[int, int]]:
    circuits_sorted = sorted(set(int(x) for x in circuits))
    return itertools.combinations(circuits_sorted, 2)


def fake_distances_for_pair(year: int, c_from: int, c_to: int, r: DistanceRanges) -> Tuple[int, int]:
    base_key = f"{year}-{c_from}-{c_to}"

    plane = _uniform(base_key + "-plane", r.plane_min_km, r.plane_max_km)
    car_factor = _uniform(base_key + "-carfactor", r.car_factor_min, r.car_factor_max)
    car = plane * car_factor

    # round to nearest km
    return int(round(car)), int(round(plane))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", "-i", default="races.csv", help="Input races CSV (must contain year,circuitId)")
    ap.add_argument("--output", "-o", default="distance.csv", help="Output CSV path")
    ap.add_argument("--plane-min", type=float, default=250.0)
    ap.add_argument("--plane-max", type=float, default=12000.0)
    ap.add_argument("--car-factor-min", type=float, default=1.05)
    ap.add_argument("--car-factor-max", type=float, default=1.40)
    args = ap.parse_args()

    ranges = DistanceRanges(
        plane_min_km=args.plane_min,
        plane_max_km=args.plane_max,
        car_factor_min=args.car_factor_min,
        car_factor_max=args.car_factor_max,
    )

    # Read CSV; treat "\N" as missing like in Ergast exports
    df = pd.read_csv(args.input, na_values=[r"\N"], engine="python")

    if "year" not in df.columns or "circuitId" not in df.columns:
        raise SystemExit("Input file must contain columns: year, circuitId")

    df = df[["year", "circuitId"]].dropna()
    df["year"] = df["year"].astype(int)
    df["circuitId"] = df["circuitId"].astype(int)

    rows = []
    for year, group in df.groupby("year"):
        circuits = group["circuitId"].unique()
        for c_from, c_to in generate_pairs(circuits):
            car_km, plane_km = fake_distances_for_pair(year, c_from, c_to, ranges)
            rows.append(
                {
                    "Year": year,
                    "circuitIdFrom": c_from,
                    "circuitIdTo": c_to,
                    "Car": car_km,
                    "Plane": plane_km,
                }
            )

    out = pd.DataFrame(rows).sort_values(["Year", "circuitIdFrom", "circuitIdTo"])
    out.to_csv(args.output, index=False)
    print(f"Wrote {len(out):,} rows -> {args.output}")


if __name__ == "__main__":
    main()

