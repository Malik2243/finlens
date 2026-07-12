"""
main.py  –  FinLens FastAPI backend
Serves all data from competitor_margin_analysis.xlsx via REST endpoints.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from data_loader import (
    get_price_delta,
    get_margin_trend,
    get_revenue_at_risk,
    get_assumptions,
    get_summary,
)

app = FastAPI(title="FinLens API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

_price_delta: list = []
_margin_trend: list = []
_revenue_at_risk: list = []
_assumptions: list = []
_summary: dict = {}


@app.on_event("startup")
def load_data():
    global _price_delta, _margin_trend, _revenue_at_risk, _assumptions, _summary
    _price_delta = get_price_delta()
    _margin_trend = get_margin_trend()
    _revenue_at_risk = get_revenue_at_risk()
    _assumptions = get_assumptions()
    _summary = get_summary(_price_delta, _margin_trend, _revenue_at_risk)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "FinLens API"}


@app.get("/api/summary")
def summary():
    return _summary


@app.get("/api/price-delta")
def price_delta():
    return _price_delta


@app.get("/api/margin-trend")
def margin_trend():
    return _margin_trend


@app.get("/api/revenue-at-risk")
def revenue_at_risk():
    return _revenue_at_risk


@app.get("/api/assumptions")
def assumptions():
    return {"notes": _assumptions}
