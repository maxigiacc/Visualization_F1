#!/usr/bin/env python3
"""
Add hard-coded nearest airport identifiers to `simple-map/public/circuits.csv`.

If a circuit is missing from the lookup table we fall back to placeholder codes
(`XXX` / `XXXX`) to keep the data shape consistent.
"""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict, Tuple

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_PATH = ROOT / "simple-map" / "public" / "circuits.csv"

CIRCUIT_AIRPORTS: Dict[str, Tuple[str, str]] = {
    "albert_park": ("MEL", "YMML"),
    "sepang": ("KUL", "WMKK"),
    "bahrain": ("BAH", "OBBI"),
    "catalunya": ("BCN", "LEBL"),
    "istanbul": ("SAW", "LTFJ"),
    "monaco": ("NCE", "LFMN"),
    "villeneuve": ("YUL", "CYUL"),
    "magny_cours": ("NVS", "LFOZ"),
    "silverstone": ("LTN", "EGGW"),
    "hockenheimring": ("FRA", "EDDF"),
    "hungaroring": ("BUD", "LHBP"),
    "valencia": ("VLC", "LEVC"),
    "spa": ("LGG", "EBLG"),
    "monza": ("LIN", "LIML"),
    "marina_bay": ("SIN", "WSSS"),
    "fuji": ("FSZ", "RJNS"),
    "shanghai": ("PVG", "ZSPD"),
    "interlagos": ("CGH", "SBSP"),
    "indianapolis": ("IND", "KIND"),
    "nurburgring": ("CGN", "EDDK"),
    "imola": ("BLQ", "LIPE"),
    "suzuka": ("NGO", "RJGG"),
    "yas_marina": ("AUH", "OMAA"),
    "galvez": ("AEP", "SABE"),
    "jerez": ("XRY", "LEJR"),
    "estoril": ("LIS", "LPPT"),
    "okayama": ("OKJ", "RJOB"),
    "adelaide": ("ADL", "YPAD"),
    "kyalami": ("JNB", "FAOR"),
    "donington": ("EMA", "EGNX"),
    "rodriguez": ("MEX", "MMMX"),
    "phoenix": ("PHX", "KPHX"),
    "ricard": ("MRS", "LFML"),
    "yeongam": ("MWX", "RKJB"),
    "jacarepagua": ("GIG", "SBGL"),
    "detroit": ("DTW", "KDTW"),
    "brands_hatch": ("LGW", "EGKK"),
    "zandvoort": ("AMS", "EHAM"),
    "zolder": ("BRU", "EBBR"),
    "dijon": ("DIJ", "LFSD"),
    "dallas": ("DFW", "KDFW"),
    "long_beach": ("LGB", "KLGB"),
    "las_vegas": ("LAS", "KLAS"),
    "jarama": ("MAD", "LEMD"),
    "watkins_glen": ("ELM", "KELM"),
    "anderstorp": ("JKG", "ESGJ"),
    "mosport": ("YYZ", "CYYZ"),
    "montjuic": ("BCN", "LEBL"),
    "nivelles": ("CRL", "EBCI"),
    "charade": ("CFE", "LFLC"),
    "tremblant": ("YTM", "CYFJ"),
    "essarts": ("URO", "LFOP"),
    "lemans": ("LME", "LFRM"),
    "reims": ("RHE", "LFSR"),
    "george": ("PLZ", "FAPE"),
    "zeltweg": ("GRZ", "LOWG"),
    "aintree": ("LPL", "EGGP"),
    "boavista": ("OPO", "LPPR"),
    "riverside": ("ONT", "KONT"),
    "avus": ("BER", "EDDB"),
    "monsanto": ("LIS", "LPPT"),
    "sebring": ("SEF", "KSEF"),
    "ain-diab": ("CMN", "GMMN"),
    "pescara": ("PSR", "LIBP"),
    "bremgarten": ("BRN", "LSZB"),
    "pedralbes": ("BCN", "LEBL"),
    "buddh": ("DEL", "VIDP"),
    "americas": ("AUS", "KAUS"),
    "red_bull_ring": ("GRZ", "LOWG"),
    "sochi": ("AER", "URSS"),
    "baku": ("GYD", "UBBB"),
    "portimao": ("FAO", "LPFR"),
    "mugello": ("FLR", "LIRQ"),
    "jeddah": ("JED", "OEJN"),
    "losail": ("DOH", "OTHH"),
    "miami": ("MIA", "KMIA"),
    "vegas": ("LAS", "KLAS"),
}

DEFAULT_IATA = "XXX"
DEFAULT_ICAO = "XXXX"


def apply_airports() -> None:
    with PUBLIC_PATH.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)

    if not rows:
        return

    fieldnames = list(rows[0].keys())
    for field in ("nearest_airport_iata", "nearest_airport_icao"):
        if field not in fieldnames:
            fieldnames.append(field)

    with PUBLIC_PATH.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            iata, icao = CIRCUIT_AIRPORTS.get(
                row["circuitRef"], (DEFAULT_IATA, DEFAULT_ICAO)
            )
            row = row.copy()
            row["nearest_airport_iata"] = iata
            row["nearest_airport_icao"] = icao
            writer.writerow(row)

    print(f"Updated file:\n  - {PUBLIC_PATH}")


if __name__ == "__main__":
    apply_airports()

