import os
import subprocess
import sys
import tempfile
from pathlib import Path


def test_auto_repair_runner_works_from_different_cwd():
    repo_root = Path(__file__).resolve().parents[1]
    script_path = repo_root / "scripts/auto_repair_runner.py"
    finance_path = repo_root / "src/ui/Finance.tsx"

    assert script_path.exists(), f"Script not found: {script_path}"
    assert finance_path.exists(), f"Finance.tsx not found: {finance_path}"

    env = os.environ.copy()
    env["AUTO_REPAIR_DIAG"] = "1"

    with tempfile.TemporaryDirectory() as temp_dir:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=temp_dir,
            capture_output=True,
            text=True,
            env=env,
            check=False,
        )

    assert result.returncode == 0, result.stderr
    assert f"DIAG repo_root={repo_root}" in result.stdout
    assert "Finance.tsx" in result.stdout
    assert "Could not find target file" not in result.stdout
