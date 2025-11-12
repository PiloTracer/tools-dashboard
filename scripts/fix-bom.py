#!/usr/bin/env python3
"""
Script to remove BOM (Byte Order Mark) from SQL and CQL files.

BOM characters can cause syntax errors in PostgreSQL and Cassandra.
This script finds all .sql and .cql files and removes the BOM if present.
"""

import os
from pathlib import Path


def remove_bom(file_path: Path) -> bool:
    """
    Remove BOM from a file if present.

    Returns True if BOM was found and removed, False otherwise.
    """
    try:
        # Read file content
        with open(file_path, 'rb') as f:
            content = f.read()

        # Check for UTF-8 BOM (EF BB BF)
        if content.startswith(b'\xef\xbb\xbf'):
            # Remove BOM and write back
            with open(file_path, 'wb') as f:
                f.write(content[3:])
            print(f"✓ Removed BOM from: {file_path}")
            return True
        else:
            print(f"  No BOM in: {file_path}")
            return False
    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")
        return False


def find_and_fix_files(root_dir: Path, extensions: list[str]) -> None:
    """
    Find all files with given extensions and remove BOM if present.
    """
    total_files = 0
    fixed_files = 0

    for ext in extensions:
        pattern = f"**/*{ext}"
        for file_path in root_dir.rglob(pattern):
            if file_path.is_file():
                total_files += 1
                if remove_bom(file_path):
                    fixed_files += 1

    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Total files checked: {total_files}")
    print(f"  Files with BOM removed: {fixed_files}")
    print(f"  Files without BOM: {total_files - fixed_files}")
    print(f"{'='*60}")


if __name__ == "__main__":
    # Get project root (parent of scripts directory)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    print("BOM Removal Tool")
    print(f"{'='*60}")
    print(f"Project root: {project_root}")
    print(f"{'='*60}\n")

    # Check back-postgres schema files
    print("Checking PostgreSQL schema files...")
    postgres_schema = project_root / "back-postgres" / "schema"
    if postgres_schema.exists():
        find_and_fix_files(postgres_schema, [".sql"])
    else:
        print(f"  Directory not found: {postgres_schema}")

    print()

    # Check back-cassandra schema files
    print("Checking Cassandra schema files...")
    cassandra_schema = project_root / "back-cassandra" / "schema"
    if cassandra_schema.exists():
        find_and_fix_files(cassandra_schema, [".cql"])
    else:
        print(f"  Directory not found: {cassandra_schema}")

    print("\nDone! You can now restart your services.")
