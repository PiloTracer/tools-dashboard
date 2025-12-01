"""Entry point for PostgreSQL data service."""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
from decimal import Decimal
from urllib.parse import urlparse

import asyncpg

logger = logging.getLogger(__name__)

# Global connection pool
db_pool: asyncpg.Pool | None = None


def parse_database_url(database_url: str) -> dict[str, str | int]:
    """Parse DATABASE_URL into connection parameters."""
    parsed = urlparse(database_url)
    return {
        "host": parsed.hostname or "localhost",
        "port": parsed.port or 5432,
        "database": parsed.path.lstrip("/") if parsed.path else "tools_dashboard",
        "user": parsed.username or "postgres",
        "password": parsed.password or "postgres",
    }


def get_db_config() -> dict[str, str | int]:
    """Get database configuration from environment variables."""
    # Try DATABASE_URL first (used by docker-compose)
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return parse_database_url(database_url)

    # Fall back to individual environment variables
    return {
        "host": os.getenv("POSTGRES_HOST", "postgresql"),
        "port": int(os.getenv("POSTGRES_PORT", "5432")),
        "database": os.getenv("POSTGRES_DB", "main_db"),
        "user": os.getenv("POSTGRES_USER", "user"),
        "password": os.getenv("POSTGRES_PASSWORD", "pass"),
    }


async def create_db_pool() -> asyncpg.Pool:
    """Create and return a database connection pool with retry logic."""
    db_config = get_db_config()
    host = db_config["host"]
    port = db_config["port"]
    database = db_config["database"]
    user = db_config["user"]
    password = db_config["password"]

    logger.info(f"Connecting to PostgreSQL at {host}:{port}/{database}")

    max_retries = 5
    retry_delay = 2

    for attempt in range(1, max_retries + 1):
        try:
            pool = await asyncpg.create_pool(
                host=host,
                port=port,
                database=database,
                user=user,
                password=password,
                min_size=2,
                max_size=10,
                command_timeout=60,
            )
            logger.info("PostgreSQL connection pool created successfully")
            return pool
        except Exception as e:
            if attempt < max_retries:
                logger.warning(
                    f"Failed to connect to PostgreSQL (attempt {attempt}/{max_retries}): {e}"
                )
                logger.info(f"Retrying in {retry_delay} seconds...")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error(f"Failed to connect to PostgreSQL after {max_retries} attempts")
                raise


async def wait_for_users_table(pool: asyncpg.Pool, max_wait: int = 120) -> None:
    """Wait for the users table to be created by back-auth service."""
    logger.info("Waiting for users table to be created by back-auth service...")

    # Give back-auth service extra time to start up and run migrations
    logger.info("Sleeping 10 seconds to allow back-auth to initialize...")
    await asyncio.sleep(10)

    for attempt in range(1, max_wait + 1):
        try:
            async with pool.acquire() as conn:
                # Check if users table exists
                result = await conn.fetchval(
                    """
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_schema = 'public'
                        AND table_name = 'users'
                    )
                    """
                )
                if result:
                    logger.info("Users table found, proceeding with migrations")
                    return
        except Exception as e:
            logger.debug(f"Error checking for users table: {e}")

        if attempt < max_wait:
            logger.info(f"Users table not found yet (attempt {attempt}/{max_wait}), waiting 1 second...")
            await asyncio.sleep(1)
        else:
            logger.warning(
                f"Users table not found after {max_wait} seconds. "
                "Proceeding with migrations anyway (may fail if tables reference users)."
            )


async def run_migrations(pool: asyncpg.Pool) -> None:
    """Run SQL migration files in order."""
    schema_dir = Path(__file__).parent / "schema"
    if not schema_dir.exists():
        logger.warning(f"Schema directory not found: {schema_dir}")
        return

    sql_files = sorted(schema_dir.glob("*.sql"))
    if not sql_files:
        logger.warning("No SQL migration files found")
        return

    # Wait for users table to exist (created by back-auth)
    await wait_for_users_table(pool)

    logger.info(f"Running {len(sql_files)} migration files...")
    async with pool.acquire() as conn:
        for sql_file in sql_files:
            logger.info(f"Executing migration: {sql_file.name}")
            try:
                # Read with utf-8-sig to automatically strip BOM if present
                sql_content = sql_file.read_text(encoding="utf-8-sig")
                # Strip any remaining whitespace and comments
                sql_content = sql_content.strip()

                # Remove SQL comments and check if there's actual SQL to execute
                lines = [
                    line.strip()
                    for line in sql_content.split('\n')
                    if line.strip() and not line.strip().startswith('--')
                ]
                actual_sql = '\n'.join(lines).strip()

                if actual_sql:
                    await conn.execute(actual_sql)
                    logger.info(f"Migration {sql_file.name} completed successfully")
                else:
                    logger.info(f"Migration {sql_file.name} contains only comments, skipping")
            except Exception as e:
                logger.error(f"Error running migration {sql_file.name}: {e}")
                raise

    logger.info("All migrations completed successfully")


async def populate_subscription_packages(pool: asyncpg.Pool) -> None:
    """Populate default subscription packages if they don't exist."""
    from repositories.subscription_repository import SubscriptionPackageRepository

    logger.info("Checking subscription packages...")
    repo = SubscriptionPackageRepository(pool)

    # Check if packages already exist
    try:
        existing_packages = await repo.find_all_active()
        if existing_packages:
            logger.info(f"Found {len(existing_packages)} existing subscription packages, skipping population")
            return
    except Exception as e:
        logger.warning(f"Could not check existing packages: {e}, proceeding with population")

    logger.info("Populating subscription packages...")

    # Define the 4 subscription packages
    packages = [
        {
            "slug": "free",
            "name": "Free",
            "description": "Perfect for trying out our platform",
            "price_monthly": Decimal("0.00"),
            "price_yearly": Decimal("0.00"),
            "currency": "USD",
            "rate_limit_per_hour": 10,
            "rate_limit_per_day": 100,
            "display_order": 1,
            "is_active": True,
        },
        {
            "slug": "standard",
            "name": "Standard",
            "description": "Great for individuals and small teams",
            "price_monthly": Decimal("29.99"),
            "price_yearly": Decimal("299.00"),
            "currency": "USD",
            "rate_limit_per_hour": 100,
            "rate_limit_per_day": 2000,
            "display_order": 2,
            "is_active": True,
        },
        {
            "slug": "premium",
            "name": "Premium",
            "description": "Advanced features for growing businesses",
            "price_monthly": Decimal("79.99"),
            "price_yearly": Decimal("799.00"),
            "currency": "USD",
            "rate_limit_per_hour": 500,
            "rate_limit_per_day": 10000,
            "display_order": 3,
            "is_active": True,
        },
        {
            "slug": "enterprise",
            "name": "Enterprise",
            "description": "Unlimited access with premium support",
            "price_monthly": Decimal("299.99"),
            "price_yearly": Decimal("2999.00"),
            "currency": "USD",
            "rate_limit_per_hour": 5000,
            "rate_limit_per_day": 100000,
            "display_order": 4,
            "is_active": True,
        },
    ]

    for package in packages:
        try:
            result = await repo.upsert_package(**package)
            logger.info(f"Upserted package: {result['slug']} - {result['name']}")
        except Exception as e:
            logger.error(f"Error upserting package {package['slug']}: {e}")

    logger.info("Subscription packages populated successfully")


async def init_service() -> None:
    """Initialize database pools and run migrations."""
    global db_pool

    logger.info("Starting PostgreSQL service initialization...")

    try:
        # Create connection pool
        db_pool = await create_db_pool()

        # Run migrations
        await run_migrations(db_pool)

        # Populate subscription packages
        await populate_subscription_packages(db_pool)

        logger.info("PostgreSQL service initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL service: {e}")
        raise


async def shutdown_service() -> None:
    """Clean shutdown of database connections."""
    global db_pool
    if db_pool:
        logger.info("Closing database connection pool...")
        await db_pool.close()
        logger.info("Database connection pool closed")


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
