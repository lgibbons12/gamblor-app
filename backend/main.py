
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from routers.users import router as users_router
from routers.oauth import router as oauth_router
from routers.games import router as games_router





app = FastAPI(
    title="Gamblor API",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.get("/health")
def health_check():
    return {"status": "ok"}




app.include_router(users_router)
app.include_router(oauth_router)
app.include_router(games_router)


# Broad CORS for local dev; narrow in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

