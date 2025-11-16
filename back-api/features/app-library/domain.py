"""Domain logic for app-library feature.

This module contains business rules for application management, access control,
user preferences, and usage tracking.
"""

from typing import Any
import secrets
import string


def generate_client_id(app_name: str) -> str:
    """Generate a unique client ID for an application.

    Format: {sanitized_app_name}_{random_8chars}

    Args:
        app_name: Application name

    Returns:
        Generated client ID
    """
    # Sanitize app name: lowercase, replace spaces with underscores, remove special chars
    sanitized = "".join(c if c.isalnum() or c == "_" else "_" for c in app_name.lower())
    sanitized = sanitized.strip("_")[:20]  # Limit to 20 chars

    # Generate random suffix
    chars = string.ascii_lowercase + string.digits
    random_suffix = "".join(secrets.choice(chars) for _ in range(8))

    return f"{sanitized}_{random_suffix}"


def generate_client_secret(length: int = 32) -> str:
    """Generate a secure client secret.

    Args:
        length: Length of the secret (default 32)

    Returns:
        Generated client secret
    """
    chars = string.ascii_letters + string.digits + "-_"
    return "".join(secrets.choice(chars) for _ in range(length))


async def check_user_access(
    user_id: int,
    app_id: str,
    app_repo: Any,
    access_rule_repo: Any,
    user_subscription: dict[str, Any] | None = None,
) -> bool:
    """Check if a user has access to an application.

    Access is granted if:
    1. App is active and not deleted
    2. No access rule exists (default: allow all)
    3. Access rule allows the user based on mode

    Args:
        user_id: User ID
        app_id: Application UUID
        app_repo: AppRepository instance
        access_rule_repo: AccessRuleRepository instance
        user_subscription: User subscription data (optional)

    Returns:
        True if user has access, False otherwise
    """
    # Check if app exists and is active
    app = await app_repo.find_by_id(app_id)
    if not app or not app["is_active"] or app["deleted_at"]:
        return False

    # Check access rule
    access_rule = await access_rule_repo.find_by_app_id(app_id)
    if not access_rule:
        # No access rule = allow all users (default)
        return True

    mode = access_rule["mode"]

    if mode == "all_users":
        return True

    elif mode == "all_except":
        # Allow all users except those in user_ids
        return user_id not in access_rule["user_ids"]

    elif mode == "only_specified":
        # Allow only users in user_ids
        return user_id in access_rule["user_ids"]

    elif mode == "subscription_based":
        # Allow based on subscription tier
        if not user_subscription:
            return False

        user_tier = user_subscription.get("tier")
        allowed_tiers = access_rule["subscription_tiers"]

        return user_tier in allowed_tiers

    # Unknown mode, deny access
    return False


async def get_available_apps(
    user_id: int,
    app_repo: Any,
    access_rule_repo: Any,
    user_pref_repo: Any,
    user_subscription: dict[str, Any] | None = None,
    include_inactive: bool = False,
) -> dict[str, Any]:
    """Get all applications available to a user.

    Returns apps with user preferences merged.

    Args:
        user_id: User ID
        app_repo: AppRepository instance
        access_rule_repo: AccessRuleRepository instance
        user_pref_repo: UserPreferenceRepository instance
        user_subscription: User subscription data (optional)
        include_inactive: Include inactive apps (admin only)

    Returns:
        Dictionary with apps, favorites, and recently_used
    """
    # Get all apps
    all_apps = await app_repo.find_all_active(include_deleted=False)

    # Get user preferences
    user_prefs = await user_pref_repo.find_by_user(user_id)
    prefs_by_client_id = {pref["app_client_id"]: pref for pref in user_prefs}

    # Filter apps based on access control
    available_apps = []
    favorites = []
    recently_used = []

    for app in all_apps:
        # Skip inactive apps unless explicitly requested
        if not app["is_active"] and not include_inactive:
            continue

        # Check access
        has_access = await check_user_access(
            user_id=user_id,
            app_id=str(app["id"]),
            app_repo=app_repo,
            access_rule_repo=access_rule_repo,
            user_subscription=user_subscription,
        )

        if not has_access:
            continue

        # Merge with user preferences
        pref = prefs_by_client_id.get(app["client_id"], {})
        app_with_pref = {
            **app,
            "is_favorite": pref.get("is_favorite", False),
            "last_launched_at": pref.get("last_launched_at"),
            "launch_count": pref.get("launch_count", 0),
        }

        available_apps.append(app_with_pref)

        if app_with_pref["is_favorite"]:
            favorites.append(app_with_pref)

        if app_with_pref["last_launched_at"]:
            recently_used.append(app_with_pref)

    # Sort recently used by last_launched_at DESC
    recently_used.sort(key=lambda x: x["last_launched_at"] or "", reverse=True)
    recently_used = recently_used[:5]  # Limit to 5 most recent

    return {
        "apps": available_apps,
        "total": len(available_apps),
        "favorites": favorites,
        "recently_used": recently_used,
    }


async def create_app(
    client_name: str,
    description: str | None,
    logo_url: str | None,
    dev_url: str | None,
    prod_url: str | None,
    redirect_uris: list[str],
    allowed_scopes: list[str],
    is_active: bool,
    created_by: int | None,
    app_repo: Any,
    audit_repo: Any,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[dict[str, Any], str]:
    """Create a new application.

    Args:
        client_name: Application name
        description: Application description
        logo_url: Logo URL
        dev_url: Development URL
        prod_url: Production URL
        redirect_uris: List of redirect URIs
        allowed_scopes: List of allowed scopes
        is_active: Whether app is active
        created_by: User ID who created the app
        app_repo: AppRepository instance
        audit_repo: AuditLogRepository instance
        ip_address: IP address (for audit)
        user_agent: User agent (for audit)

    Returns:
        Tuple of (created app data, plain text client secret)
    """
    # Generate client ID and secret
    client_id = generate_client_id(client_name)
    client_secret = generate_client_secret()

    # Create app
    app = await app_repo.create(
        client_id=client_id,
        client_secret=client_secret,
        client_name=client_name,
        description=description,
        logo_url=logo_url,
        dev_url=dev_url,
        prod_url=prod_url,
        redirect_uris=redirect_uris,
        allowed_scopes=allowed_scopes,
        is_active=is_active,
        created_by=created_by,
    )

    # Create audit log
    await audit_repo.create(
        app_id=str(app["id"]),
        event_type="created",
        performed_by=created_by,
        snapshot=app,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return app, client_secret


async def update_app(
    app_id: str,
    client_name: str | None,
    description: str | None,
    logo_url: str | None,
    dev_url: str | None,
    prod_url: str | None,
    redirect_uris: list[str] | None,
    allowed_scopes: list[str] | None,
    is_active: bool | None,
    performed_by: int | None,
    app_repo: Any,
    audit_repo: Any,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict[str, Any] | None:
    """Update an application.

    Args:
        app_id: Application UUID
        client_name: New client name (optional)
        description: New description (optional)
        logo_url: New logo URL (optional)
        dev_url: New dev URL (optional)
        prod_url: New prod URL (optional)
        redirect_uris: New redirect URIs (optional)
        allowed_scopes: New allowed scopes (optional)
        is_active: New active status (optional)
        performed_by: User ID who updated the app
        app_repo: AppRepository instance
        audit_repo: AuditLogRepository instance
        ip_address: IP address (for audit)
        user_agent: User agent (for audit)

    Returns:
        Updated app data or None
    """
    # Get original app for audit
    original_app = await app_repo.find_by_id(app_id)
    if not original_app:
        return None

    # Update app
    updated_app = await app_repo.update(
        app_id=app_id,
        client_name=client_name,
        description=description,
        logo_url=logo_url,
        dev_url=dev_url,
        prod_url=prod_url,
        redirect_uris=redirect_uris,
        allowed_scopes=allowed_scopes,
        is_active=is_active,
    )

    if not updated_app:
        return None

    # Build changes dict
    changes = {}
    if client_name and client_name != original_app["client_name"]:
        changes["client_name"] = {"old": original_app["client_name"], "new": client_name}
    if description is not None and description != original_app["description"]:
        changes["description"] = {"old": original_app["description"], "new": description}
    if logo_url is not None and logo_url != original_app["logo_url"]:
        changes["logo_url"] = {"old": original_app["logo_url"], "new": logo_url}
    if is_active is not None and is_active != original_app["is_active"]:
        changes["is_active"] = {"old": original_app["is_active"], "new": is_active}

    # Create audit log
    if changes:
        await audit_repo.create(
            app_id=app_id,
            event_type="updated",
            performed_by=performed_by,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    return updated_app


async def delete_app(
    app_id: str,
    performed_by: int | None,
    app_repo: Any,
    audit_repo: Any,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict[str, Any] | None:
    """Soft delete an application.

    Args:
        app_id: Application UUID
        performed_by: User ID who deleted the app
        app_repo: AppRepository instance
        audit_repo: AuditLogRepository instance
        ip_address: IP address (for audit)
        user_agent: User agent (for audit)

    Returns:
        Deleted app data or None
    """
    # Get app for audit
    app = await app_repo.find_by_id(app_id)
    if not app:
        return None

    # Delete app
    deleted_app = await app_repo.delete(app_id)
    if not deleted_app:
        return None

    # Create audit log
    await audit_repo.create(
        app_id=app_id,
        event_type="deleted",
        performed_by=performed_by,
        snapshot=app,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return deleted_app


async def regenerate_secret(
    app_id: str,
    performed_by: int | None,
    app_repo: Any,
    audit_repo: Any,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> tuple[str, str] | None:
    """Regenerate client secret for an application.

    Args:
        app_id: Application UUID
        performed_by: User ID who regenerated the secret
        app_repo: AppRepository instance
        audit_repo: AuditLogRepository instance
        ip_address: IP address (for audit)
        user_agent: User agent (for audit)

    Returns:
        Tuple of (client_id, new secret) or None
    """
    # Get app
    app = await app_repo.find_by_id(app_id)
    if not app:
        return None

    # Generate new secret
    new_secret = generate_client_secret()

    # Update secret
    success = await app_repo.regenerate_secret(app_id, new_secret)
    if not success:
        return None

    # Create audit log
    await audit_repo.create(
        app_id=app_id,
        event_type="secret_regenerated",
        performed_by=performed_by,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return app["client_id"], new_secret


async def update_access_control(
    app_id: str,
    mode: str,
    user_ids: list[int] | None,
    subscription_tiers: list[str] | None,
    performed_by: int | None,
    access_rule_repo: Any,
    audit_repo: Any,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> dict[str, Any]:
    """Update access control rules for an application.

    Args:
        app_id: Application UUID
        mode: Access mode
        user_ids: List of user IDs (for all_except or only_specified modes)
        subscription_tiers: List of subscription tiers (for subscription_based mode)
        performed_by: User ID who updated the rules
        access_rule_repo: AccessRuleRepository instance
        audit_repo: AuditLogRepository instance
        ip_address: IP address (for audit)
        user_agent: User agent (for audit)

    Returns:
        Updated access rule data
    """
    # Get original rule for audit
    original_rule = await access_rule_repo.find_by_app_id(app_id)

    # Create or update access rule
    access_rule = await access_rule_repo.create_or_update(
        app_id=app_id,
        mode=mode,
        user_ids=user_ids,
        subscription_tiers=subscription_tiers,
        created_by=performed_by,
    )

    # Build changes dict
    changes = {"mode": {"old": original_rule["mode"] if original_rule else None, "new": mode}}

    # Create audit log
    await audit_repo.create(
        app_id=app_id,
        event_type="access_modified",
        performed_by=performed_by,
        changes=changes,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return access_rule


async def toggle_favorite(
    user_id: int,
    app_client_id: str,
    user_pref_repo: Any,
) -> dict[str, Any]:
    """Toggle favorite status for an application.

    Args:
        user_id: User ID
        app_client_id: Application client ID
        user_pref_repo: UserPreferenceRepository instance

    Returns:
        Updated user preference data
    """
    return await user_pref_repo.toggle_favorite(user_id, app_client_id)


async def record_launch(
    user_id: int,
    app_client_id: str,
    user_pref_repo: Any,
) -> dict[str, Any]:
    """Record an app launch.

    Args:
        user_id: User ID
        app_client_id: Application client ID
        user_pref_repo: UserPreferenceRepository instance

    Returns:
        Updated user preference data
    """
    return await user_pref_repo.record_launch(user_id, app_client_id)
