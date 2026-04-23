from dotenv import load_dotenv

load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import sets, cards, generate, upload, sessions, results, image, explore, profile


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload PaddleOCR models at startup to avoid cold-start latency on first request.
    # Model files are cached in ~/.paddlex after the first download (~15 MB total).
    from routers.generate import get_ocr
    get_ocr()
    yield


app = FastAPI(title="Obscura API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sets.router)
app.include_router(cards.router)
app.include_router(generate.router)
app.include_router(upload.router)
app.include_router(sessions.router)
app.include_router(results.router)
app.include_router(image.router)
app.include_router(explore.router)
app.include_router(profile.router)


@app.get("/health")
def health():
    return {"status": "ok"}
