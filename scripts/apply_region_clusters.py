#!/usr/bin/env python3
"""
Assign a simple region-based `cluster_id` to every circuit row.

The goal is to keep nearby races together without complicated math. We map each
country to a broad region (Europe, Americas, Asia-Pacific, Middle East, Africa).
Re-run this script whenever the circuit list changes.
"""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict

ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = ROOT / "dataset" / "circuits.csv"
PUBLIC_PATH = ROOT / "simple-map" / "public" / "circuits.csv"

REGION_MAP = {
    "cluster_europe": {
        "austria",
        "azerbaijan",
        "belgium",
        "france",
        "germany",
        "hungary",
        "italy",
        "monaco",
        "morocco",
        "netherlands",
        "portugal",
        "russia",
        "spain",
        "sweden",
        "switzerland",
        "turkey",
        "uk",
    },
    "cluster_americas": {
        "argentina",
        "brazil",
        "canada",
        "mexico",
        "usa",
    },
    "cluster_asia_pacific": {
        "australia",
        "china",
        "india",
        "japan",
        "korea",
        "malaysia",
        "singapore",
    },
    "cluster_middle_east": {
        "bahrain",
        "qatar",
        "saudi arabia",
        "uae",
    },
    "cluster_africa": {
        "south africa",
    },
}

DEFAULT_CLUSTER = "cluster_other"


def assign_cluster(country: str) -> str:
    country_lower = country.strip().lower()
    for cluster, countries in REGION_MAP.items():
        if country_lower in countries:
            return cluster
    return DEFAULT_CLUSTER


def apply_clusters(path: Path, cluster_lookup: Dict[int, str]) -> None:
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)

    fieldnames = list(rows[0].keys())
    if "cluster_id" not in fieldnames:
        fieldnames.append("cluster_id")

    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            cid = int(row["circuitId"])
            row = row.copy()
            row["cluster_id"] = cluster_lookup[cid]
            writer.writerow(row)


def main() -> None:
    with DATASET_PATH.open(newline="", encoding="utf-8") as handle:
        dataset_rows = list(csv.DictReader(handle))

    cluster_lookup: Dict[int, str] = {}
    for row in dataset_rows:
        circuit_id = int(row["circuitId"])
        cluster_lookup[circuit_id] = assign_cluster(row["country"])

    apply_clusters(DATASET_PATH, cluster_lookup)
    apply_clusters(PUBLIC_PATH, cluster_lookup)

    counts: Dict[str, int] = {}
    for label in cluster_lookup.values():
        counts[label] = counts.get(label, 0) + 1

    print("Assigned clusters:")
    for label, count in sorted(counts.items()):
        print(f"  {label}: {count} circuits")
    print(f"Updated files:\n  - {DATASET_PATH}\n  - {PUBLIC_PATH}")


if __name__ == "__main__":
    main()

