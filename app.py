from __future__ import annotations

import importlib.util
from pathlib import Path


def _load_ml_app():
    ml_app_path = Path(__file__).parent / "ml-service" / "app.py"
    spec = importlib.util.spec_from_file_location("ml_service_app", ml_app_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load ML app from {ml_app_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.app


app = _load_ml_app()


if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)