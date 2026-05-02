import asyncio
from pathlib import Path

from scripts import auto_repair_runner


def test_main_marks_first_step_skipped_when_finance_has_no_react_memo(tmp_path, capsys, monkeypatch):
    repo_root = tmp_path / "repo"
    ui_dir = repo_root / "src" / "ui"
    ui_dir.mkdir(parents=True)
    (ui_dir / "Finance.tsx").write_text(
        "export const Finance = () => <div>Finance</div>;\n",
        encoding="utf-8",
    )

    fake_script_path = repo_root / "scripts" / "auto_repair_runner.py"
    fake_script_path.parent.mkdir(parents=True)
    fake_script_path.write_text("# placeholder\n", encoding="utf-8")

    monkeypatch.setattr(auto_repair_runner, "__file__", str(fake_script_path))

    asyncio.run(auto_repair_runner.main())
    stdout = capsys.readouterr().out

    assert "React.memo was not detected" in stdout

    final_plan_start = stdout.rfind("📋 Rentrix Auto-Repair Master Plan")
    assert final_plan_start != -1
    final_plan_output = stdout[final_plan_start:]

    assert "1. [-] Optimize React Performance" in final_plan_output
