import re
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Protocol

TENANT_ID_REGEX = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")


def validate_tenant_id(tenant_id: str) -> str:
    """Validates tenant identifier against strict whitelist pattern."""
    if not tenant_id or not isinstance(tenant_id, str):
        raise ValueError(f"Invalid tenant_id: {tenant_id!r}")
    if not TENANT_ID_REGEX.match(tenant_id):
        raise ValueError(f"Invalid tenant_id format: '{tenant_id}'. Must match ^[a-zA-Z0-9_-]{{1,64}}$")
    return tenant_id


class PgConnectionProtocol(Protocol):
    async def execute(self, query: str, *args: Any) -> Any: ...
    async def fetch(self, query: str, *args: Any) -> list[Any]: ...
    async def fetchrow(self, query: str, *args: Any) -> Any | None: ...
    def transaction(self) -> Any: ...


async def init_pgvector_connection(conn: Any) -> None:
    """Registers pgvector extension encoders/decoders on asyncpg connection."""
    from pgvector.asyncpg import register_vector

    await register_vector(conn)


async def create_pulse_db_pool(
    database_url: str,
    min_size: int = 2,
    max_size: int = 10,
) -> Any:
    """Creates an asyncpg pool preconfigured with pgvector extension."""
    import asyncpg

    return await asyncpg.create_pool(
        database_url,
        min_size=min_size,
        max_size=max_size,
        init=init_pgvector_connection,
    )


@asynccontextmanager
async def tenant_rls_transaction(
    conn_or_pool: Any,
    tenant_id: str,
) -> AsyncGenerator[Any, None]:
    """
    Sets transaction-local app.current_tenant_id inside an explicit transaction block.
    Enforces PostgreSQL 17 FORCE ROW LEVEL SECURITY for all queries executed within the block.
    """
    valid_tenant = validate_tenant_id(tenant_id)

    # Check if conn_or_pool is an asyncpg pool
    if hasattr(conn_or_pool, "acquire") and callable(conn_or_pool.acquire):
        async with conn_or_pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_tenant_id', $1, true);", valid_tenant)
                yield conn
    else:
        conn = conn_or_pool
        # Check if conn supports transaction()
        if hasattr(conn, "transaction") and callable(conn.transaction):
            async with conn.transaction():
                await conn.execute("SELECT set_config('app.current_tenant_id', $1, true);", valid_tenant)
                yield conn
        else:
            await conn.execute("SELECT set_config('app.current_tenant_id', $1, true);", valid_tenant)
            yield conn
