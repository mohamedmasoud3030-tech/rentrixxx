from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


def _load_auto_repair_runner_module():
    script_path = Path(__file__).resolve().parents[1] / "auto_repair_runner.py"
    spec = spec_from_file_location("auto_repair_runner", script_path)
    module = module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_simple_planner_display_numbering(capsys):
    module = _load_auto_repair_runner_module()
    planner = module.SimplePlanner()

    planner.display()
    captured = capsys.readouterr().out

    lines = [
        line.strip()
        for line in captured.splitlines()
        if line.strip().startswith(("1.", "2.", "3.", "4.", "5."))
    ]

    assert len(lines) == len(planner.plan["steps"])
    for index, line in enumerate(lines, start=1):
        assert line.startswith(f"{index}."), f"Expected line to start with '{index}.', got: {line}"

    assert "0. [" not in captured
