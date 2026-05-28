"""Database connection management for back-api service."""

import os
import time

import asyncpg
from cassandra.cluster import Cluster, NoHostAvailable
from typing import Any
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine


class DatabaseManager:
    """Manages database connections for PostgreSQL and Cassandra."""

    def __init__(self):
        self.pg_pool: asyncpg.Pool | None = None
        self.cassandra_session: Any | None = None
        self.cassandra_cluster: Cluster | None = None
        self.sqlalchemy_engine: AsyncEngine | None = None

    async def connect_postgresql(self) -> None:
        """Initialize PostgreSQL connection pool."""
        database_url = os.getenv("DATABASE_URL", "postgresql://user:pass@postgresql:5432/main_db")

        # Convert URL format for asyncpg
        # From: postgresql://user:pass@host:port/dbname
        # To: asyncpg connection parameters

        self.pg_pool = await asyncpg.create_pool(
            database_url,
            min_size=2,
            max_size=10,
            command_timeout=60,
        )
        print(f"✅ PostgreSQL pool created: {database_url}")

        # Also create SQLAlchemy engine for auto-auth feature
        # Convert postgresql:// to postgresql+asyncpg://
        sqlalchemy_url = database_url.replace("postgresql://", "postgresql+asyncpg://")
        self.sqlalchemy_engine = create_async_engine(
            sqlalchemy_url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
        )
        print(f"✅ SQLAlchemy engine created: {sqlalchemy_url}")

    def connect_cassandra(self, max_retries: int = 10, retry_delay: float = 2.0) -> None:
        """Initialize Cassandra connection with retry (Cassandra may lag compose healthchecks)."""
        contact_points = [
            point.strip()
            for point in os.getenv("CASSANDRA_CONTACT_POINTS", "cassandra").split(",")
            if point.strip()
        ]
        keyspace = os.getenv("CASSANDRA_KEYSPACE", "tools_dashboard")
        port = int(os.getenv("CASSANDRA_PORT", "9042"))

        current_delay = retry_delay
        for attempt in range(1, max_retries + 1):
            cluster = Cluster(contact_points=contact_points, port=port)
            try:
                self.cassandra_cluster = cluster
                self.cassandra_session = cluster.connect(keyspace)
                print(f"✅ Cassandra session created: {contact_points} / {keyspace}")
                return
            except NoHostAvailable as exc:
                try:
                    cluster.shutdown()
                except Exception:
                    pass
                if attempt >= max_retries:
                    raise
                print(
                    f"⚠️  Cassandra connection failed (attempt {attempt}/{max_retries}): {exc}"
                    f"\n   Retrying in {current_delay:.1f} seconds..."
                )
                time.sleep(current_delay)
                current_delay *= 2

    async def disconnect(self) -> None:
        """Close all database connections."""
        if self.pg_pool:
            await self.pg_pool.close()
            print("🔌 PostgreSQL pool closed")

        if self.sqlalchemy_engine:
            await self.sqlalchemy_engine.dispose()
            print("🔌 SQLAlchemy engine disposed")

        if self.cassandra_cluster:
            self.cassandra_cluster.shutdown()
            print("🔌 Cassandra cluster shutdown")


# Global database manager instance
db_manager = DatabaseManager()
