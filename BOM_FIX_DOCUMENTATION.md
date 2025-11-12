# BOM (Byte Order Mark) Fix Documentation

## Problem

The PostgreSQL service was failing with this error:
```
asyncpg.exceptions.PostgresSyntaxError: syntax error at or near "﻿CREATE"
```

Notice the invisible character before "CREATE" - this is a **BOM (Byte Order Mark)**.

## What is a BOM?

A BOM (Byte Order Mark) is a special Unicode character (U+FEFF) that some text editors add at the beginning of files to indicate:
- The file's encoding (UTF-8, UTF-16, etc.)
- The byte order (endianness) for multi-byte encodings

In UTF-8 files, the BOM appears as three bytes: `EF BB BF`

### The Problem with BOM in SQL/CQL Files

- **PostgreSQL** and **Cassandra** do NOT recognize BOM characters
- They try to parse the BOM as part of the SQL/CQL syntax
- This causes syntax errors because `﻿CREATE` is not the same as `CREATE`

## Files Affected

The BOM fix script found and cleaned these files:

✓ **Removed BOM from:**
- `back-postgres/schema/001_users.sql`
- `back-postgres/schema/002_subscriptions.sql`
- `back-postgres/schema/003_financial.sql`

✓ **No BOM found in:**
- `back-postgres/schema/004_subscription_packages.sql` (newly created)
- `back-cassandra/schema/001_subscription_metadata.cql` (newly created)

## Solutions Implemented

### 1. Code Fix (Automatic BOM Stripping)

Both `back-postgres/main.py` and `back-cassandra/main.py` now automatically strip BOM when reading migration files:

**Before:**
```python
sql_content = sql_file.read_text(encoding="utf-8")
```

**After:**
```python
# Read with utf-8-sig to automatically strip BOM if present
sql_content = sql_file.read_text(encoding="utf-8-sig")
# Strip any remaining whitespace
sql_content = sql_content.strip()
```

The `utf-8-sig` encoding automatically removes the BOM if present.

### 2. File Cleanup Script

A cleanup script was created at `scripts/fix-bom.py` that:
- Scans all `.sql` and `.cql` files in the project
- Detects UTF-8 BOM (bytes `EF BB BF`)
- Removes the BOM from affected files
- Provides a summary report

**Usage:**
```bash
python3 scripts/fix-bom.py
```

## How to Prevent BOM Issues in the Future

### Text Editors Configuration

#### VS Code
Add to your `.vscode/settings.json`:
```json
{
  "files.encoding": "utf8",
  "files.autoGuessEncoding": false
}
```

#### Notepad++ (Windows)
1. Go to: Settings → Preferences → New Document
2. Set: Encoding → UTF-8 (without BOM)

#### Vim
Add to your `.vimrc`:
```vim
set nobomb
set fileencoding=utf-8
```

#### Sublime Text
Add to your settings:
```json
{
  "default_encoding": "UTF-8",
  "show_encoding": true
}
```

### Git Configuration

Add a `.gitattributes` file to normalize line endings and prevent BOM:
```
# Normalize line endings
* text=auto

# SQL files
*.sql text eol=lf
*.cql text eol=lf

# Ensure no BOM
*.sql -text
*.cql -text
```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash

# Check for BOM in SQL/CQL files
FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(sql|cql)$')

if [ -n "$FILES" ]; then
    for FILE in $FILES; do
        # Check if file starts with BOM (EF BB BF)
        if [ -f "$FILE" ] && [ "$(head -c 3 "$FILE" | od -An -tx1 | tr -d ' ')" = "efbbbf" ]; then
            echo "ERROR: BOM detected in $FILE"
            echo "Run: python3 scripts/fix-bom.py"
            exit 1
        fi
    done
fi

exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Testing

### 1. Restart Services
```bash
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build back-postgres-service back-cassandra
docker-compose -f docker-compose.dev.yml up
```

### 2. Check Logs

**PostgreSQL Service:**
```bash
docker-compose -f docker-compose.dev.yml logs back-postgres-service
```

**Expected Success:**
```
INFO - Connecting to PostgreSQL at postgresql:5432/main_db
INFO - PostgreSQL connection pool created successfully
INFO - Running 4 migration files...
INFO - Executing migration: 001_users.sql
INFO - Migration 001_users.sql completed successfully
INFO - Executing migration: 002_subscriptions.sql
INFO - Migration 002_subscriptions.sql completed successfully
INFO - Executing migration: 003_financial.sql
INFO - Migration 003_financial.sql completed successfully
INFO - Executing migration: 004_subscription_packages.sql
INFO - Migration 004_subscription_packages.sql completed successfully
INFO - All migrations completed successfully
INFO - Populating subscription packages...
INFO - Upserted package: free - Free
INFO - Upserted package: standard - Standard
INFO - Upserted package: premium - Premium
INFO - Upserted package: enterprise - Enterprise
INFO - Subscription packages populated successfully
INFO - PostgreSQL service initialized successfully
```

## How to Check for BOM in a File

### Using Command Line

**Linux/Mac:**
```bash
# Check first 3 bytes (BOM is EF BB BF)
hexdump -n 3 -C file.sql

# If BOM exists, you'll see:
# 00000000  ef bb bf
```

**Using od:**
```bash
head -c 3 file.sql | od -An -tx1
# Output with BOM: ef bb bf
# Output without BOM: (first 3 characters of the file)
```

### Using Python
```python
with open('file.sql', 'rb') as f:
    first_bytes = f.read(3)
    if first_bytes == b'\xef\xbb\xbf':
        print("BOM detected!")
    else:
        print("No BOM")
```

### Using VS Code
1. Open the file
2. Look at bottom-right corner for encoding
3. If it says "UTF-8 with BOM", click it
4. Select "Save with Encoding"
5. Choose "UTF-8" (without BOM)

## Files Modified

1. **back-postgres/main.py** - Updated `run_migrations()` to use `utf-8-sig` encoding
2. **back-cassandra/main.py** - Updated `run_cql_migrations()` to use `utf-8-sig` encoding
3. **scripts/fix-bom.py** - Created cleanup script (NEW)
4. **back-postgres/schema/001_users.sql** - Removed BOM
5. **back-postgres/schema/002_subscriptions.sql** - Removed BOM
6. **back-postgres/schema/003_financial.sql** - Removed BOM

## Summary

The BOM issue has been resolved through:
1. ✅ Automatic BOM stripping in migration runners
2. ✅ Cleanup of existing files with BOM
3. ✅ Prevention guidelines for future files
4. ✅ Automated detection script

Your PostgreSQL and Cassandra services should now initialize successfully without syntax errors.

## Additional Resources

- [UTF-8 BOM on Wikipedia](https://en.wikipedia.org/wiki/Byte_order_mark#UTF-8)
- [PostgreSQL Character Sets](https://www.postgresql.org/docs/current/multibyte.html)
- [Cassandra CQL Documentation](https://cassandra.apache.org/doc/latest/cql/)
