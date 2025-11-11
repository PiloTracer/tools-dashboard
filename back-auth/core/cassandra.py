"""Cassandra utilities for storing auth events."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from cassandra.cluster import Cluster, Session
from cassandra.policies import RoundRobinPolicy
from cassandra.query import PreparedStatement

from .config import get_settings

cluster: Cluster | None = None
session: Session | None = None
insert_event_statement: PreparedStatement | None = None


def init_cassandra() -> None:
    global cluster, session, insert_event_statement
    settings = get_settings()
    if not settings.cassandra_contact_points:
        return
    contact_points = [point.strip() for point in settings.cassandra_contact_points.split(",") if point.strip()]
    if not contact_points:
        return
    cluster = Cluster(contact_points=contact_points, port=settings.cassandra_port, load_balancing_policy=RoundRobinPolicy())
    session = cluster.connect()
    session.execute(
        f"""
        CREATE KEYSPACE IF NOT EXISTS {settings.cassandra_keyspace}
        WITH REPLICATION = {{ 'class': 'SimpleStrategy', 'replication_factor': 1 }}
        """
    )
    session.set_keyspace(settings.cassandra_keyspace)
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


def record_event(user_id: int, event_type: str, metadata: Dict[str, Any] | None = None) -> None:
    if not session or not insert_event_statement:
        return
    safe_metadata = {str(k): str(v) for k, v in (metadata or {}).items()}
    session.execute(insert_event_statement, (user_id, datetime.utcnow(), event_type, safe_metadata))


def shutdown_cassandra() -> None:
    global session, cluster
    if session:
        session.shutdown()
    if cluster:
        cluster.shutdown()
    session = None
    cluster = None
