import io
import unittest
from contextlib import redirect_stdout

from scripts.auto_repair_runner import SimplePlanner


class TestSimplePlannerDisplay(unittest.TestCase):
    def test_display_renders_status_symbols_for_each_step(self):
        planner = SimplePlanner()
        planner.plan["statuses"] = ["completed", "skipped", "not_started", "not_started", "not_started"]

        buffer = io.StringIO()
        with redirect_stdout(buffer):
            planner.display()

        output_lines = buffer.getvalue().splitlines()

        # Remove blank lines and title to keep only numbered step lines.
        step_lines = [line for line in output_lines if line.strip() and line.lstrip()[0].isdigit()]

        self.assertIn("1. [✓] Optimize React Performance", step_lines)
        self.assertIn("2. [-] Enhance Security", step_lines)
        self.assertIn("3. [ ] Improve UX", step_lines)


if __name__ == "__main__":
    unittest.main()
