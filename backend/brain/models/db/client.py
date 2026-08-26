"""
GlobeXAI Trade OS — Database connection pool.

Fail-closed by design (matches src/compliance/current_facts.py's norms): if
no DSN is configured, or the DB is unreachable, callers get a clear
"not configured" / "unavailable" signal — they never silently proceed as if
persistence worked. The 7 pre-existing ML routers do not depend on this
module at all and must keep working with zero DB present.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

import asyncpg

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


class DatabaseUnavailable(RuntimeError):
    """Raised when a DB-backed operation is attempted without a working pool."""


def _dsn() -> Optional[str]:
    return os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")


def is_configured() -> bool:
    return bool(_dsn())


async def init_pool() -> None:
    """Called once from the FastAPI lifespan. Never raises — logs and leaves
    the pool unset if the DB can't be reached, so ML routers stay unaffected."""
    global _pool
    dsn = _dsn()
    if not dsn:
        logger.warning("No SUPABASE_DB_URL/DATABASE_URL set — trade/blockchain endpoints will report 503.")
        return
    try:
        _pool = await asyncpg.create_pool(
            dsn, min_size=1, max_size=5, command_timeout=10, timeout=5
        )
        logger.info("Database pool initialized.")
    except Exception as exc:  # noqa: BLE001 - deliberately broad: startup must not crash the app
        logger.warning("Database pool init failed (%s) — trade/blockchain endpoints will report 503.", exc)
        _pool = None


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise DatabaseUnavailable("Database pool is not initialized (not configured or unreachable).")
    return _pool


@asynccontextmanager
async def acquire() -> AsyncIterator[asyncpg.Connection]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn


@asynccontextmanager
async def transaction() -> AsyncIterator[asyncpg.Connection]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            yield conn
