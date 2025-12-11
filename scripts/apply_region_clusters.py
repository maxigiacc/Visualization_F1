#!/usr/bin/env python3
"""
Assign cluster_id and cluster_sub_id to every circuit in simple-map/public/circuits.csv.
All mappings are hardcoded.
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_PATH = ROOT / "simple-map" / "public" / "circuits.csv"

CIRCUIT_CLUSTERS = {
    # Asia-Pacific
    "albert_park": ("cluster_asia_pacific", "cluster_asia_pacific_australia"),
    "adelaide": ("cluster_asia_pacific", "cluster_asia_pacific_australia"),
    "marina_bay": ("cluster_asia_pacific", "cluster_asia_pacific_mys_sgp"),
    "sepang": ("cluster_asia_pacific", "cluster_asia_pacific_mys_sgp"),
    "fuji": ("cluster_asia_pacific", "cluster_asia_pacific_japan"),
    "suzuka": ("cluster_asia_pacific", "cluster_asia_pacific_japan"),
    "okayama": ("cluster_asia_pacific", "cluster_asia_pacific_japan"),
    "shanghai": ("cluster_asia_pacific", "cluster_asia_pacific_china"),
    "yeongam": ("cluster_asia_pacific", "cluster_asia_pacific_korea"),
    "buddh": ("cluster_asia_pacific", "cluster_asia_pacific_india"),
    # Middle East
    "bahrain": ("cluster_middle_east", "cluster_middle_east_gulf"),
    "yas_marina": ("cluster_middle_east", "cluster_middle_east_gulf"),
    "losail": ("cluster_middle_east", "cluster_middle_east_gulf"),
    "jeddah": ("cluster_middle_east", "cluster_middle_east_red_sea"),
    # Africa
    "kyalami": ("cluster_africa", "cluster_africa_southern_africa"),
    "george": ("cluster_africa", "cluster_africa_southern_africa"),
    # Americas
    "villeneuve": ("cluster_americas", "cluster_americas_canada"),
    "mosport": ("cluster_americas", "cluster_americas_canada"),
    "tremblant": ("cluster_americas", "cluster_americas_canada"),
    "indianapolis": ("cluster_americas", "cluster_americas_usa_midwest"),
    "detroit": ("cluster_americas", "cluster_americas_usa_midwest"),
    "watkins_glen": ("cluster_americas", "cluster_americas_usa_northeast"),
    "sebring": ("cluster_americas", "cluster_americas_usa_florida"),
    "miami": ("cluster_americas", "cluster_americas_usa_florida"),
    "americas": ("cluster_americas", "cluster_americas_usa_texas"),
    "dallas": ("cluster_americas", "cluster_americas_usa_texas"),
    "phoenix": ("cluster_americas", "cluster_americas_usa_west_arizona"),
    "long_beach": ("cluster_americas", "cluster_americas_usa_west_california"),
    "las_vegas": ("cluster_americas", "cluster_americas_usa_west_california"),
    "vegas": ("cluster_americas", "cluster_americas_usa_west_california"),
    "riverside": ("cluster_americas", "cluster_americas_usa_west_california"),
    "rodriguez": ("cluster_americas", "cluster_americas_mexico"),
    "interlagos": ("cluster_americas", "cluster_americas_brazil_southeast"),
    "jacarepagua": ("cluster_americas", "cluster_americas_brazil_southeast"),
    "galvez": ("cluster_americas", "cluster_americas_argentina"),
    # Europe — Spain
    "catalunya": ("cluster_europe", "cluster_europe_spain_catalonia"),
    "montjuic": ("cluster_europe", "cluster_europe_spain_catalonia"),
    "pedralbes": ("cluster_europe", "cluster_europe_spain_catalonia"),
    "valencia": ("cluster_europe", "cluster_europe_spain_valencia"),
    "jarama": ("cluster_europe", "cluster_europe_spain_madrid"),
    "jerez": ("cluster_europe", "cluster_europe_spain_andalusia"),
    # Europe — Portugal
    "estoril": ("cluster_europe", "cluster_europe_portugal_atlantic"),
    "boavista": ("cluster_europe", "cluster_europe_portugal_atlantic"),
    "portimao": ("cluster_europe", "cluster_europe_portugal_atlantic"),
    "monsanto": ("cluster_europe", "cluster_europe_portugal_atlantic"),
    # Europe — France
    "magny_cours": ("cluster_europe", "cluster_europe_france"),
    "dijon": ("cluster_europe", "cluster_europe_france"),
    "ricard": ("cluster_europe", "cluster_europe_france"),
    "charade": ("cluster_europe", "cluster_europe_france"),
    "essarts": ("cluster_europe", "cluster_europe_france"),
    "lemans": ("cluster_europe", "cluster_europe_france"),
    "reims": ("cluster_europe", "cluster_europe_france"),
    # Europe — Benelux
    "spa": ("cluster_europe", "cluster_europe_benelux"),
    "zolder": ("cluster_europe", "cluster_europe_benelux"),
    "zandvoort": ("cluster_europe", "cluster_europe_benelux"),
    "nivelles": ("cluster_europe", "cluster_europe_benelux"),
    # Europe — UK
    "silverstone": ("cluster_europe", "cluster_europe_uk_core"),
    "donington": ("cluster_europe", "cluster_europe_uk_core"),
    "brands_hatch": ("cluster_europe", "cluster_europe_uk_core"),
    "aintree": ("cluster_europe", "cluster_europe_uk_core"),
    # Europe — Scandinavia
    "anderstorp": ("cluster_europe", "cluster_europe_scandinavia"),
    # Europe — Germany
    "hockenheimring": ("cluster_europe", "cluster_europe_germany_rhine"),
    "nurburgring": ("cluster_europe", "cluster_europe_germany_rhine"),
    "avus": ("cluster_europe", "cluster_europe_germany_berlin"),
    # Europe — Central
    "hungaroring": ("cluster_europe", "cluster_europe_central"),
    # Europe — Alps
    "monza": ("cluster_europe", "cluster_europe_alps_north_italy"),
    "imola": ("cluster_europe", "cluster_europe_alps_north_italy"),
    "mugello": ("cluster_europe", "cluster_europe_alps_north_italy"),
    "monaco": ("cluster_europe", "cluster_europe_alps_north_italy"),
    "pescara": ("cluster_europe", "cluster_europe_alps_adriatic"),
    "red_bull_ring": ("cluster_europe", "cluster_europe_alps_austria_swiss"),
    "zeltweg": ("cluster_europe", "cluster_europe_alps_austria_swiss"),
    "bremgarten": ("cluster_europe", "cluster_europe_alps_austria_swiss"),
    # Europe — Eastern
    "istanbul": ("cluster_europe", "cluster_europe_turkey"),
    "sochi": ("cluster_europe", "cluster_europe_russia"),
    "baku": ("cluster_europe", "cluster_europe_azerbaijan"),
    "ain-diab": ("cluster_europe", "cluster_europe_maghreb"),
}


def main():
    with PUBLIC_PATH.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    fieldnames = list(rows[0].keys())
    if "cluster_id" not in fieldnames:
        fieldnames.append("cluster_id")
    if "cluster_sub_id" not in fieldnames:
        fieldnames.append("cluster_sub_id")

    for row in rows:
        cluster = CIRCUIT_CLUSTERS.get(row["circuitRef"])
        row["cluster_id"], row["cluster_sub_id"] = cluster or (
            "cluster_other",
            "cluster_truck_other",
        )

    with PUBLIC_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()

