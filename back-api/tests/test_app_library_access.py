"""Unit tests for app-library access control helpers."""

import importlib

domain = importlib.import_module("features.app-library.domain")


def test_package_slug_to_access_tier_maps_known_slugs() -> None:
    assert domain.package_slug_to_access_tier("free") == "free"
    assert domain.package_slug_to_access_tier("standard") == "pro"
    assert domain.package_slug_to_access_tier("enterprise") == "enterprise"


def test_package_slug_to_access_tier_unknown_defaults_to_custom() -> None:
    assert domain.package_slug_to_access_tier("partner-plan") == "custom"


def test_user_access_tier_set_includes_slug_and_mapped_tier() -> None:
    tiers = domain.user_access_tier_set(
        {"tier": "pro", "package_slug": "standard"}
    )
    assert tiers == {"pro", "standard"}


def test_user_access_tier_set_empty_when_missing_subscription() -> None:
    assert domain.user_access_tier_set(None) == set()
