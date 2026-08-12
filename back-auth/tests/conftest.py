"""Pytest bootstrap: make the service root importable for ``core.*``/``features.*`` modules."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
