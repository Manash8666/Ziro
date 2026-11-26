from fastapi import FastAPI
from app.config import Settings
from app.db import InMemoryPulseRepository, PgVectorPulseRepository, PulseRepository
from app.routers.health import router as health_router
from app.routers.rto import router as rto_router
from app.routers.search import router as search_router
from app.services.embeddings import EmbeddingProvider, build_embedding_provider


def create_app(
    settings: Settings | None = None,
    repository: PulseRepository | None = None,
    embedding_provider: EmbeddingProvider | None = None,
) -> FastAPI:
    cfg = settings or Settings()
    app = FastAPI(title="Ziro Pulse AI", version="0.1.0")

    app.state.settings = cfg
    if repository is not None:
        app.state.repository = repository
    elif cfg.database_url.startswith("postgres"):
        app.state.repository = PgVectorPulseRepository(cfg.database_url)
    else:
        app.state.repository = InMemoryPulseRepository()

    app.state.embedding_provider = embedding_provider or build_embedding_provider(cfg)

    app.include_router(health_router)
    app.include_router(search_router)
    app.include_router(rto_router)
    return app


app = create_app()
