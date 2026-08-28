from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import init_db
from app.api.routes import auth, centers, reports, sites, depots, plan, roads, dispatch


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and seed initial records on startup
    init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers with exact contract prefixes
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(centers.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(sites.router, prefix=settings.API_V1_STR)
app.include_router(depots.router, prefix=settings.API_V1_STR)
app.include_router(plan.router, prefix=settings.API_V1_STR)
app.include_router(roads.router, prefix=settings.API_V1_STR)
app.include_router(dispatch.router, prefix=settings.API_V1_STR)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "madad-backend", "version": "1.0.0"}
