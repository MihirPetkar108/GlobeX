"""
GlobeXAI Trade OS — FastAPI Unified Application Entry Point
Forwards directly to brain.main:app (MVC Architecture Engine).
"""
import sys
from pathlib import Path

# Add backend and backend/brain to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
BRAIN_DIR = PROJECT_ROOT / "brain"
for p in [str(PROJECT_ROOT), str(BRAIN_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from brain.main import app, lifespan, global_health, root

__all__ = ["app", "lifespan", "global_health", "root"]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("brain.main:app", host="0.0.0.0", port=8000, reload=True)
