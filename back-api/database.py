"""Database connection management for back-api service."""

import os
import asyncpg
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from typing import Any


class DatabaseManager:
    """Manages database connections for PostgreSQL and Cassandra."""

    def __init__(self):
        self.pg_pool: asyncpg.Pool | None = None
        self.cassandra_session: Any | None = None
        self.cassandra_cluster: Cluster | None = None

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

    def connect_cassandra(self) -> None:
        """Initialize Cassandra connection."""
        contact_points = os.getenv("CASSANDRA_CONTACT_POINTS", "cassandra").split(",")
        keyspace = os.getenv("CASSANDRA_KEYSPACE", "tools_dashboard")

        # Create cluster connection
        self.cassandra_cluster = Cluster(
            contact_points=contact_points,
            port=9042,
        )

        self.cassandra_session = self.cassandra_cluster.connect(keyspace)
        print(f"✅ Cassandra session created: {contact_points} / {keyspace}")

    async def disconnect(self) -> None:
        """Close all database connections."""
        if self.pg_pool:
            await self.pg_pool.close()
            print("🔌 PostgreSQL pool closed")

        if self.cassandra_cluster:
            self.cassandra_cluster.shutdown()
            print("🔌 Cassandra cluster shutdown")


# Global database manager instance
db_manager = DatabaseManager()
