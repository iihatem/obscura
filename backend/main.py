from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import sets, cards, generate, upload, sessions, results, image, explore

app = FastAPI(title="Obscura API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
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


@app.get("/health")
def health():
    return {"status": "ok"}
