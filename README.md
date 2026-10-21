# EnergyScope — Home Energy Insights

The frontend is in `static/` and the FastAPI server is `app.py`.

## Setup on macOS

1. Copy your locally generated model files (`electricity_kmeans_pipeline.joblib`, `hourly_dashboard_data.csv`, `model_metadata.json`) to `website_artifacts/`.
2. In the project terminal run:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app:app --reload
```

3. Open http://127.0.0.1:8000

## Changes in v2

- English user interface with no sidebar.
- Light/Dark mode and 12/24-hour preferences saved in the browser.
- Larger interactive hourly demand chart, with hover and keyboard focus details.
- Clear appliance-group labels (Kitchen, Laundry, Water heating & cooling).
- Removed the two lower analytics cards; the sample-hour classification form remains.

The dashboard uses historical household readings and cannot identify individual appliances or report live energy usage. Never load untrusted `.joblib` files.


## Version 3 interface
- The hourly chart spans the page width.
- Below it, appliance-group totals are shown as bars and a share donut.
- One-click theme and 12/24-hour format toggles are in the upper-right.
- The input/prediction interface has been removed; the saved ML artifacts and API remain unchanged.
- Files in website_artifacts should be copied from your previously exported notebook.
