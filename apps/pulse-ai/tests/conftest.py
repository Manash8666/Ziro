import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

PULSE_ROOT = Path(__file__).resolve().parents[1]
if str(PULSE_ROOT) not in sys.path:
    sys.path.insert(0, str(PULSE_ROOT))

from app.config import Settings
from app.db import InMemoryPulseRepository
from app.main import create_app
from app.services.embeddings import LocalHashEmbeddingProvider


@pytest.fixture()
def pulse_repo() -> InMemoryPulseRepository:
    return InMemoryPulseRepository()


@pytest.fixture()
def embedding_provider() -> LocalHashEmbeddingProvider:
    return LocalHashEmbeddingProvider(dimension=1024)


@pytest.fixture()
def client(
    pulse_repo: InMemoryPulseRepository,
    embedding_provider: LocalHashEmbeddingProvider,
) -> TestClient:
    settings = Settings(
        tenancy_mode="multi",
        default_tenant_id="default",
        embedding_provider="local_hash",
    )
    app = create_app(
        settings=settings,
        repository=pulse_repo,
        embedding_provider=embedding_provider,
    )
    with TestClient(app) as test_client:
        yield test_client
