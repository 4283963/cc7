from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api.routes import container, attribution, anomaly, mock, shelf_life
from .config import settings

app = FastAPI(
    title="Cold Chain Logistics IoT Analytics API",
    description="High-precision container temperature anomaly and trajectory attribution analysis system",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(container.router)
app.include_router(attribution.router)
app.include_router(anomaly.router)
app.include_router(shelf_life.router)
app.include_router(mock.router)


@app.get("/")
async def root():
    return {
        "name": "Cold Chain IoT Analytics API",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
