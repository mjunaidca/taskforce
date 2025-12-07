"""TaskFlow utility functions.

Shared utilities for CLI commands to avoid duplication.
"""

import os
from pathlib import Path

from taskflow.storage import Storage


def get_storage() -> Storage:
    """Get storage instance from environment.

    Returns:
        Storage instance pointing to TASKFLOW_HOME/.taskflow
    """
    home = os.environ.get("TASKFLOW_HOME", str(Path.cwd()))
    return Storage(Path(home) / ".taskflow")
