"""Cassandra utilities for storing auth events."""

from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any, Dict

from cassandra.cluster import Cluster, NoHostAvailable, Session
from cassandra.policies import RoundRobinPolicy
from cassandra.query import PreparedStatement

from .config import get_settings

logger = logging.getLogger(__name__)

cluster: Cluster | None = None
session: Session | None = None
insert_event_statement: PreparedStatement | None = None


def init_cassandra(max_retries: int = 10, retry_delay: float = 2.0) -> None:
    """
    Initialize Cassandra connection with retry logic.

    Args:
        max_retries: Maximum number of connection attempts
        retry_delay: Initial delay between retries (seconds), doubles each retry
    """
    global cluster, session, insert_event_statement
    settings = get_settings()

    if not settings.cassandra_contact_points:
        logger.info("Cassandra contact points not configured, skipping initialization")
        return

    contact_points = [point.strip() for point in settings.cassandra_contact_points.split(",") if point.strip()]
    if not contact_points:
        logger.warning("No valid Cassandra contact points found")
        return

    logger.info(f"Initializing Cassandra connection to {contact_points}:{settings.cassandra_port}")

    # Create cluster with retry logic
    cluster = Cluster(
        contact_points=contact_points,
        port=settings.cassandra_port,
        load_balancing_policy=RoundRobinPolicy()
    )

    # Retry connection with exponential backoff
    current_delay = retry_delay
    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Cassandra connection attempt {attempt}/{max_retries}")
            session = cluster.connect()
            logger.info("✅ Successfully connected to Cassandra cluster")
            break
        except NoHostAvailable as e:
            if attempt < max_retries:
                logger.warning(
                    f"⚠️  Cassandra connection failed (attempt {attempt}/{max_retries}): {e}"
                    f"\n   Retrying in {current_delay:.1f} seconds..."
                )
                time.sleep(current_delay)
                current_delay *= 2  # Exponential backoff
            else:
                logger.error(
                    f"❌ Failed to connect to Cassandra after {max_retries} attempts\n"
                    f"   Contact points: {contact_points}\n"
                    f"   Port: {settings.cassandra_port}\n"
                    f"   Last error: {e}\n"
                    f"   CASSANDRA WILL BE DISABLED - auth events will not be recorded"
                )
                cluster = None
                session = None
                return

    if not session:
        logger.error("❌ Cassandra session is None after connection attempts")
        return

    # Create keyspace and table
    try:
        logger.info(f"Creating keyspace '{settings.cassandra_keyspace}' if not exists")
        session.execute(
            f"""
            CREATE KEYSPACE IF NOT EXISTS {settings.cassandra_keyspace}
            WITH REPLICATION = {{ 'class': 'SimpleStrategy', 'replication_factor': 1 }}
            """
        )

        session.set_keyspace(settings.cassandra_keyspace)
        logger.info(f"Using keyspace: {settings.cassandra_keyspace}")

        logger.info("Creating auth_events_by_user table if not exists")
        session.execute(
            """
            CREATE TABLE IF NOT EXISTS auth_events_by_user (
                user_id int,
                occurred_at timestamp,
                event_type text,
                metadata map<text, text>,
                PRIMARY KEY (user_id, occurred_at)
            ) WITH CLUSTERING ORDER BY (occurred_at DESC)
            """
        )

        insert_event_statement = session.prepare(
            "INSERT INTO auth_events_by_user (user_id, occurred_at, event_type, metadata) VALUES (?, ?, ?, ?)"
        )

        logger.info("✅ Cassandra initialization complete")

    except Exception as e:
        logger.error(f"❌ Failed to create Cassandra keyspace/table: {e}")
        shutdown_cassandra()
        raise


def record_event(user_id: int, event_type: str, metadata: Dict[str, Any] | None = None) -> None:
    if not session or not insert_event_statement:
        return
    safe_metadata = {str(k): str(v) for k, v in (metadata or {}).items()}
    session.execute(insert_event_statement, (user_id, datetime.utcnow(), event_type, safe_metadata))


def get_cassandra_session() -> Session | None:
    """Get the global Cassandra session.

    Returns:
        Cassandra session or None if not initialized
    """
    return session


def shutdown_cassandra() -> None:
    global session, cluster
    if session:
        session.shutdown()
    if cluster:
        cluster.shutdown()
    session = None
    cluster = None
