import os

from dotenv import load_dotenv
from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.users import router as users_router
from app.api.riot import router as riot_router
from app.api.matches import router as matches_router
from app.api.analytics import router as analytics_router
from app.api.timeline_analytics import (
    router as timeline_analytics_router,
)
from app.api.recommendations import router as recommendations_router
from app.api.coaching import (
    router as coaching_router,
)

from fastapi.middleware.cors import (
    CORSMiddleware,
)

from app.api.beta import (
    router as beta_router,
)

load_dotenv()

app = FastAPI(
    title=os.getenv("APP_NAME", "Innomight GameBetter API"),
    version=os.getenv("APP_VERSION", "1.0.0"),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://difftheory.com",
        "https://www.difftheory.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(users_router)
app.include_router(riot_router)
app.include_router(matches_router)
app.include_router(analytics_router)
app.include_router(timeline_analytics_router)
app.include_router(recommendations_router)
app.include_router(coaching_router)
app.include_router(
    beta_router
)

@app.get("/")
def root():
    return {
        "message": "Welcome to Innomight Gamebetter API"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }