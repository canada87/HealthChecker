from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import create_tables
from routers import users, medications, illnesses, logs

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield

app = FastAPI(title="HealthTracker", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api")
app.include_router(medications.router, prefix="/api")
app.include_router(illnesses.router, prefix="/api")
app.include_router(logs.router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok"}
