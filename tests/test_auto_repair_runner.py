import asyncio
import importlib.util
import io
from contextlib import redirect_stdout
from pathlib import Path
from unittest import TestCase
from unittest.mock import patch


MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "auto_repair_runner.py"


spec = importlib.util.spec_from_file_location("auto_repair_runner", MODULE_PATH)
auto_repair_runner = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(auto_repair_runner)


class TestAutoRepairRunner(TestCase):
    def test_missing_finance_file_marks_step_skipped_and_warns(self):
        buffer = io.StringIO()

        with patch("pathlib.Path.exists", side_effect=lambda self: False if "Finance.tsx" in str(self) else True), redirect_stdout(buffer):
            try:
                asyncio.run(auto_repair_runner.main())
            except Exception as exc:  # pragma: no cover - explicit safety assertion
                self.fail(f"Unexpected exception while Finance.tsx is missing: {exc}")

        output = buffer.getvalue()

        self.assertIn("⚠️ Could not find target file:", output)
        self.assertIn("[-] Optimize React Performance", output)
