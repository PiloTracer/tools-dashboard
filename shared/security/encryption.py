"""Encryption helpers."""

from secrets import token_bytes


def generate_key() -> str:
    return token_bytes(32).hex()
