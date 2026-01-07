# Visualization_F1

Visual analytics project on the Formula 1 calendar: we measure travel distances between races, estimate environmental impact (truck + air freight), and compare the official calendar with an optimized route. The application is described in `report/paper.tex` / `report/Final_Report.pdf`.

## What it does
- World map of circuits with the official season route.
- Comparison with an optimized calendar (distance and CO2 reduction).
- CO2 dashboard with truck/flight split and multi-year trends.
- Additional metrics: intercontinental jumps, seasonal distances, top leg emissions.

## Stack
- Frontend: React + TypeScript + Vite (`simple-map`).
- Visualizations: D3 + ApexCharts.
- Pre-processing: Python scripts for clusters, airports, distances.

## Data and sources
- F1 dataset (circuits, races, results): `dataset/*.csv` and copies in `simple-map/public/*.csv`.
- Emission factors (air + truck): `dataset/emission_factors_2000_2025.csv`.
- Research documentation and sources: `paper_and_research/`.

## API (airport distances)
We use the Apiverve Airport Distance API to estimate flight distances between airports near circuits.
- Main script: `scripts/generate_real_distances.py`.
- Frontend utilities (optional): `simple-map/src/components/utils/AirportDistance.ts` and `simple-map/src/components/utils/API_distances.ts`.

API key configuration (one of the following):
- Environment variable: `APIVERVE_API_KEY`
- `.env` file with `APIVERVE_API_KEY=...`

If the key is not available, the script falls back to haversine.

## Quick start
```bash
cd simple-map
npm install
npm run dev
```

## Regenerate data (optional)
Install Python dependencies:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Update circuit metadata:
```bash
python scripts/apply_airport_codes.py
python scripts/apply_region_clusters.py
```

Regenerate `distances.csv` using the API:
```bash
python scripts/generate_real_distances.py --api-key "$APIVERVE_API_KEY"
```

Expected output:
- `simple-map/public/distances.csv`

## Repository structure (essentials)
- `simple-map/`: web app (React + Vite).
- `simple-map/public/`: CSVs loaded by the app.
- `scripts/`: preprocessing and distance generation pipeline.
- `dataset/`: original CSV sources.
- `report/`: final paper and figures.

## Notes
- The app loads CSVs from `simple-map/public/`. If you regenerate data, copy files there.
- CO2 estimates are comparative and based on average factors, not exact measurements.
