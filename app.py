from pathlib import Path
from functools import lru_cache
import json
import math
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, model_validator

ROOT = Path(__file__).resolve().parent
ARTIFACTS = ROOT / 'website_artifacts'
MODEL_FILE = ARTIFACTS / 'electricity_kmeans_pipeline.joblib'
META_FILE = ARTIFACTS / 'model_metadata.json'
CSV_FILE = ARTIFACTS / 'hourly_dashboard_data.csv'

app = FastAPI(title='Electricity Insights API', version='1.0.0')
app.mount('/static', StaticFiles(directory=ROOT / 'static'), name='static')

class HourReading(BaseModel):
    Avg_Power: float = Field(ge=0, le=100)
    Max_Power: float = Field(ge=0, le=100)
    Meter_1: float = Field(ge=0, le=100)
    Meter_2: float = Field(ge=0, le=100)
    Meter_3: float = Field(ge=0, le=100)

    @model_validator(mode='after')
    def check_values(self):
        if self.Max_Power < self.Avg_Power:
            raise ValueError('Max_Power must be at least Avg_Power')
        return self

@lru_cache(maxsize=1)
def metadata():
    if not META_FILE.exists():
        raise HTTPException(503, 'Missing model_metadata.json. Copy website_artifacts from the notebook.')
    return json.loads(META_FILE.read_text(encoding='utf-8'))

@lru_cache(maxsize=1)
def pipeline():
    if not MODEL_FILE.exists():
        raise HTTPException(503, 'Missing trained pipeline .joblib. Run the notebook export step first.')
    # Load only artifacts created locally by your own notebook. joblib files are executable when unpickled.
    return joblib.load(MODEL_FILE)

@lru_cache(maxsize=1)
def readings():
    if not CSV_FILE.exists():
        raise HTTPException(503, 'Missing hourly_dashboard_data.csv. Run the notebook export step first.')
    df = pd.read_csv(CSV_FILE, parse_dates=['Datetime'])
    needed = {'Datetime', 'Avg_Power','Max_Power','Total_Energy','Meter_1','Meter_2','Meter_3','Pattern'}
    missing = needed - set(df.columns)
    if missing:
        raise HTTPException(503, f'Missing columns in CSV: {sorted(missing)}')
    df = df.dropna(subset=list(needed)).sort_values('Datetime')
    if df.empty:
        raise HTTPException(503, 'Dashboard CSV has no usable rows')
    return df

@app.get('/')
def index():
    return FileResponse(ROOT / 'static' / 'index.html')

@app.get('/api/status')
def status():
    return {'ready': all(p.exists() for p in (MODEL_FILE, META_FILE, CSV_FILE)),
            'files': {p.name: p.exists() for p in (MODEL_FILE, META_FILE, CSV_FILE)}}

@app.get('/api/overview')
def overview():
    df = readings()
    meter_cols = ['Meter_1', 'Meter_2', 'Meter_3']
    hourly = df.groupby(df['Datetime'].dt.hour)['Avg_Power'].mean().reindex(range(24)).fillna(0)
    pattern_counts = df['Pattern'].value_counts()
    meter_totals = df[meter_cols].sum()
    by_pattern = df.groupby('Pattern').agg(hours=('Avg_Power','size'),average_kw=('Avg_Power','mean'),energy_kwh=('Total_Energy','sum'))
    return {
        'count': int(len(df)),
        'date_start': df['Datetime'].min().date().isoformat(),
        'date_end': df['Datetime'].max().date().isoformat(),
        'total_energy_kwh': round(float(df['Total_Energy'].sum()), 2),
        'average_power_kw': round(float(df['Avg_Power'].mean()), 3),
        'peak_hour': int(hourly.idxmax()),
        'hours': [{'hour': int(h), 'avg_kw': round(float(v), 3)} for h, v in hourly.items()],
        'meters': [{'name': k, 'energy_kwh': round(float(meter_totals[k]), 2)} for k in meter_cols],
        'patterns': [{'name': k, 'hours': int(pattern_counts.get(k, 0)),
                      'average_kw': round(float(by_pattern.loc[k,'average_kw']), 3) if k in by_pattern.index else 0,
                      'energy_kwh': round(float(by_pattern.loc[k,'energy_kwh']), 2) if k in by_pattern.index else 0}
                     for k in ('Low','Medium','High')],
        'quality_note': 'Historical recorded energy, not a real-time meter. Hours with fewer than 54 readings were excluded; partly observed hours can underestimate energy.'
    }

@app.post('/api/predict')
def predict(reading: HourReading):
    meta = metadata()
    features = meta['features']
    values = reading.model_dump()
    if set(features) != set(values):
        raise HTTPException(503, 'Saved model features differ from API schema')
    frame = pd.DataFrame([{f: values[f] for f in features}], columns=features)
    cluster = int(pipeline().predict(frame)[0])
    name = meta.get('cluster_names', {}).get(str(cluster), f'Cluster {cluster}')
    # Device group ranking is arithmetic, not an ML prediction.
    ranking = sorted(({'name': k, 'kwh': round(float(values[k]), 3)} for k in ['Meter_1','Meter_2','Meter_3']), key=lambda x: -x['kwh'])
    return {'cluster':cluster, 'pattern':name, 'meter_ranking':ranking,
            'message': 'This is a descriptive cluster assignment, not a forecast or an electrical fault diagnosis.'}
