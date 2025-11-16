"""Entry point for Cassandra data service."""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path

from cassandra.cluster import Cluster, ExecutionProfile, EXEC_PROFILE_DEFAULT
from cassandra.auth import PlainTextAuthProvider
from cassandra.policies import RoundRobinPolicy, DowngradingConsistencyRetryPolicy
from cassandra import ConsistencyLevel

logger = logging.getLogger(__name__)

# Global session
cassandra_session = None
cassandra_cluster = None


def get_cassandra_config() -> dict:
    """Get Cassandra configuration from environment variables."""
    # Try CASSANDRA_CONTACT_POINTS first (used by docker-compose)
    contact_points = os.getenv("CASSANDRA_CONTACT_POINTS")
    if contact_points:
        hosts = contact_points.split(",")
    else:
        # Fall back to CASSANDRA_HOSTS
        hosts = os.getenv("CASSANDRA_HOSTS", "cassandra").split(",")

    return {
        "hosts": [host.strip() for host in hosts],
        "port": int(os.getenv("CASSANDRA_PORT", "9042")),
        "keyspace": os.getenv("CASSANDRA_KEYSPACE", "tools_dashboard"),
        "user": os.getenv("CASSANDRA_USER", "cassandra"),
        "password": os.getenv("CASSANDRA_PASSWORD", "cassandra"),
    }


def create_cassandra_session():
    """Create and return a Cassandra session with retry logic."""
    global cassandra_cluster, cassandra_session

    config = get_cassandra_config()
    hosts = config["hosts"]
    port = config["port"]
    user = config["user"]
    password = config["password"]

    logger.info(f"Connecting to Cassandra at {hosts}:{port}")

    max_retries = 5
    retry_delay = 2

    for attempt in range(1, max_retries + 1):
        try:
            # Create authentication provider only if credentials are provided
            # Default Cassandra runs with AllowAllAuthenticator (no auth)
            auth_provider = None
            if user != "cassandra" or password != "cassandra":
                auth_provider = PlainTextAuthProvider(username=user, password=password)
                logger.info("Using authentication with provided credentials")
            else:
                logger.info("No authentication (using Cassandra defaults)")

            # Create execution profile (recommended for Cassandra driver 4.0+)
            profile = ExecutionProfile(
                load_balancing_policy=RoundRobinPolicy(),
                retry_policy=DowngradingConsistencyRetryPolicy(),
                consistency_level=ConsistencyLevel.LOCAL_QUORUM,
                serial_consistency_level=ConsistencyLevel.LOCAL_SERIAL,
                request_timeout=15,
                row_factory=lambda column_names, rows: rows,
            )

            # Create cluster connection with execution profile
            cassandra_cluster = Cluster(
                contact_points=hosts,
                port=port,
                auth_provider=auth_provider,
                protocol_version=4,  # Explicitly set protocol version to avoid downgrades
                execution_profiles={EXEC_PROFILE_DEFAULT: profile},
            )

            # Create session without keyspace first
            cassandra_session = cassandra_cluster.connect()
            logger.info("Cassandra session created successfully")
            return cassandra_session

        except Exception as e:
            if attempt < max_retries:
                logger.warning(
                    f"Failed to connect to Cassandra (attempt {attempt}/{max_retries}): {e}"
                )
                logger.info(f"Retrying in {retry_delay} seconds...")
                import time
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error(f"Failed to connect to Cassandra after {max_retries} attempts")
                raise


def run_cql_migrations(session) -> None:
    """Run CQL migration files in order."""
    schema_dir = Path(__file__).parent / "schema"
    if not schema_dir.exists():
        logger.warning(f"Schema directory not found: {schema_dir}")
        return

    cql_files = sorted(schema_dir.glob("*.cql"))
    if not cql_files:
        logger.warning("No CQL migration files found")
        return

    logger.info(f"Running {len(cql_files)} CQL migration files...")
    for cql_file in cql_files:
        logger.info(f"Executing migration: {cql_file.name}")
        try:
            # Read with utf-8-sig to automatically strip BOM if present
            cql_content = cql_file.read_text(encoding="utf-8-sig")
            # Strip any remaining whitespace
            cql_content = cql_content.strip()
            # Split by semicolon and execute each statement
            statements = [stmt.strip() for stmt in cql_content.split(";") if stmt.strip()]
            for idx, statement in enumerate(statements, 1):
                # Skip comment-only statements (lines starting with -- or empty after removing comments)
                statement_without_comments = '\n'.join(
                    line for line in statement.split('\n')
                    if not line.strip().startswith('--')
                ).strip()
                if not statement_without_comments:
                    logger.info(f"  Statement {idx}/{len(statements)}: [SKIPPED - comment only]")
                    continue
                logger.info(f"  Statement {idx}/{len(statements)}: {statement[:80]}...")
                session.execute(statement)
            logger.info(f"Migration {cql_file.name} completed successfully")
        except Exception as e:
            logger.error(f"Error running migration {cql_file.name}: {e}")
            raise

    # Set the keyspace for subsequent operations
    config = get_cassandra_config()
    keyspace = config["keyspace"]
    session.set_keyspace(keyspace)
    logger.info(f"Set default keyspace to: {keyspace}")

    logger.info("All CQL migrations completed successfully")


def populate_subscription_metadata(session) -> None:
    """Populate default subscription metadata if it doesn't exist."""
    from repositories.subscription_metadata_repository import (
        SubscriptionMetadataRepository,
        SubscriptionFeaturesRepository,
    )

    logger.info("Checking subscription metadata...")

    metadata_repo = SubscriptionMetadataRepository(session)
    features_repo = SubscriptionFeaturesRepository(session)

    # Check if metadata already exists
    try:
        existing_metadata = metadata_repo.find_by_package("free")
        if existing_metadata:
            logger.info(f"Found {len(existing_metadata)} existing metadata entries for 'free' package, skipping population")
            return
    except Exception as e:
        logger.warning(f"Could not check existing metadata: {e}, proceeding with population")

    logger.info("Populating subscription metadata...")

    # Define metadata for each package
    packages_metadata = {
        "free": {
            "tagline": "Get started with essential tools",
            "highlight": "Perfect for individuals and hobbyists",
            "cta_text": "Start Free",
        },
        "standard": {
            "tagline": "Everything you need to grow",
            "highlight": "Most popular for small teams",
            "cta_text": "Get Started",
        },
        "premium": {
            "tagline": "Advanced capabilities for professionals",
            "highlight": "Best value for growing businesses",
            "cta_text": "Go Premium",
        },
        "enterprise": {
            "tagline": "Maximum power and support",
            "highlight": "Custom solutions for large organizations",
            "cta_text": "Contact Sales",
        },
    }

    # Define features for each package
    packages_features = {
        "free": [
            ("basic_tools", "Basic Tools", "Access to core functionality", True, 1, "🔧", "tools"),
            ("community_support", "Community Support", "Help from our community", True, 2, "👥", "support"),
            ("1_workspace", "1 Workspace", "Single workspace for your projects", True, 3, "📁", "workspaces"),
            ("api_access", "API Access", "Limited API access", False, 4, "🔌", "api"),
            ("advanced_analytics", "Advanced Analytics", "Detailed insights", False, 5, "📊", "analytics"),
        ],
        "standard": [
            ("basic_tools", "Basic Tools", "Access to core functionality", True, 1, "🔧", "tools"),
            ("community_support", "Community Support", "Help from our community", True, 2, "👥", "support"),
            ("5_workspaces", "5 Workspaces", "Organize with multiple workspaces", True, 3, "📁", "workspaces"),
            ("api_access", "API Access", "Full API access", True, 4, "🔌", "api"),
            ("email_support", "Email Support", "Priority email support", True, 5, "📧", "support"),
            ("advanced_analytics", "Advanced Analytics", "Detailed insights", False, 6, "📊", "analytics"),
        ],
        "premium": [
            ("basic_tools", "Basic Tools", "Access to core functionality", True, 1, "🔧", "tools"),
            ("advanced_tools", "Advanced Tools", "Professional-grade tools", True, 2, "⚡", "tools"),
            ("unlimited_workspaces", "Unlimited Workspaces", "Create as many workspaces as you need", True, 3, "📁", "workspaces"),
            ("api_access", "API Access", "Full API access with higher limits", True, 4, "🔌", "api"),
            ("priority_support", "Priority Support", "24/7 priority support", True, 5, "🚀", "support"),
            ("advanced_analytics", "Advanced Analytics", "Detailed insights and reports", True, 6, "📊", "analytics"),
            ("custom_integrations", "Custom Integrations", "Build custom integrations", True, 7, "🔗", "integrations"),
        ],
        "enterprise": [
            ("everything_premium", "Everything in Premium", "All premium features included", True, 1, "✨", "all"),
            ("dedicated_support", "Dedicated Support", "Dedicated account manager", True, 2, "👔", "support"),
            ("sla_guarantee", "SLA Guarantee", "99.9% uptime guarantee", True, 3, "⚖️", "reliability"),
            ("sso_saml", "SSO/SAML", "Single sign-on integration", True, 4, "🔐", "security"),
            ("custom_contracts", "Custom Contracts", "Flexible contract terms", True, 5, "📄", "legal"),
            ("onboarding", "Dedicated Onboarding", "Personalized onboarding experience", True, 6, "🎓", "support"),
            ("white_label", "White Label", "Customize with your branding", True, 7, "🎨", "customization"),
        ],
    }

    # Populate metadata
    for package_slug, metadata in packages_metadata.items():
        for idx, (key, value) in enumerate(metadata.items(), start=1):
            try:
                metadata_repo.upsert_metadata(
                    package_slug=package_slug,
                    metadata_key=key,
                    metadata_value=value,
                    metadata_type="description",
                    display_order=idx,
                )
                logger.info(f"Upserted metadata: {package_slug}.{key}")
            except Exception as e:
                logger.error(f"Error upserting metadata {package_slug}.{key}: {e}")

    # Populate features
    for package_slug, features in packages_features.items():
        for feature_id, name, description, is_included, order, icon, category in features:
            try:
                features_repo.upsert_feature(
                    package_slug=package_slug,
                    feature_id=feature_id,
                    feature_name=name,
                    feature_description=description,
                    is_included=is_included,
                    display_order=order,
                    icon=icon,
                    category=category,
                )
                logger.info(f"Upserted feature: {package_slug}.{feature_id}")
            except Exception as e:
                logger.error(f"Error upserting feature {package_slug}.{feature_id}: {e}")

    logger.info("Subscription metadata populated successfully")


async def init_service() -> None:
    """Initialize Cassandra client resources."""
    global cassandra_session

    logger.info("Starting Cassandra service initialization...")

    try:
        # Create Cassandra session
        cassandra_session = create_cassandra_session()

        # Run CQL migrations
        run_cql_migrations(cassandra_session)

        # Populate subscription metadata
        populate_subscription_metadata(cassandra_session)

        logger.info("Cassandra service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Cassandra service: {e}")
        raise


async def shutdown_service() -> None:
    """Clean shutdown of Cassandra connections."""
    global cassandra_session, cassandra_cluster
    if cassandra_session:
        logger.info("Shutting down Cassandra session...")
        cassandra_session.shutdown()
    if cassandra_cluster:
        logger.info("Shutting down Cassandra cluster connection...")
        cassandra_cluster.shutdown()
    logger.info("Cassandra connections closed")


async def lifespan() -> None:
    """Keep container alive for docker-compose dev workflows."""
    try:
        await init_service()
        logger.info("Service is running. Waiting for shutdown signal...")
        while True:
            await asyncio.sleep(60)
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    finally:
        await shutdown_service()


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    asyncio.run(lifespan())


if __name__ == "__main__":
    main()
