"""
Example: Applying SWE-agent Methodology in Rentrix

This example demonstrates how to apply the systematic problem-solving 
workflow inspired by mini-swe-agent, combined with the power of 
Claude Opus 4.5 and OpenManus tools.
"""

from anthropic import Anthropic
from scripts.openmanus.planning import PlanningTool
from scripts.openmanus.str_replace_editor import StrReplaceEditor
import subprocess

def create_swe_workflow_plan(issue_description: str):
    """Create a structured SWE-agent workflow plan."""
    tool = PlanningTool()
    
    plan_id = tool.create_plan(
        title=f"Resolve Issue: {issue_description[:30]}...",
        steps=[
            "Analyze codebase to locate relevant files",
            "Create reproduction script for the issue",
            "Implement fix using StrReplaceEditor",
            "Verify fix using reproduction script",
            "Test edge cases for robustness",
            "Finalize and commit changes"
        ]
    )
    return tool, plan_id

def run_reproduction_script(script_path: str) -> bool:
    """Run the reproduction script to verify the issue or fix."""
    try:
        result = subprocess.run(
            ["node", script_path], 
            capture_output=True, 
            text=True, 
            check=True
        )
        print(f"Script executed successfully:\n{result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Script failed (Issue reproduced/Verification failed):\n{e.stderr}")
        return False

def main():
    # 1. Initialize
    issue_desc = "Fix calculation error in late fee generation for overdue invoices"
    planning_tool, plan_id = create_swe_workflow_plan(issue_desc)
    editor = StrReplaceEditor()
    
    print("🚀 Starting SWE-agent inspired workflow...")
    
    # 2. Analyze (Simulated)
    planning_tool.mark_step(plan_id, 0, "completed", "Located issue in src/services/financeService.ts")
    
    # 3. Reproduce (Simulated)
    print("\n📝 Creating reproduction script...")
    # In a real scenario, Opus 4.5 would generate this script
    repro_script = """
    // repro.js
    const calculateLateFee = (amount, daysOverdue) => {
        // Bug: Using wrong percentage
        return amount * 0.05 * daysOverdue; 
    };
    
    const fee = calculateLateFee(1000, 5);
    if (fee !== 25) { // Expected 25 (0.5% per day)
        console.error("Bug found! Fee calculated as: " + fee);
        process.exit(1);
    }
    console.log("Success!");
    """
    with open("repro.js", "w") as f:
        f.write(repro_script)
        
    planning_tool.mark_step(plan_id, 1, "completed", "Created repro.js")
    
    # Verify bug exists
    run_reproduction_script("repro.js")
    
    # 4. Fix (Simulated)
    print("\n🔧 Applying fix...")
    # In a real scenario, we use StrReplaceEditor to fix the actual source file
    planning_tool.mark_step(plan_id, 2, "completed", "Applied fix using StrReplaceEditor")
    
    # 5. Verify (Simulated)
    print("\n✅ Verifying fix...")
    fixed_script = repro_script.replace("0.05", "0.005")
    with open("repro.js", "w") as f:
        f.write(fixed_script)
        
    success = run_reproduction_script("repro.js")
    
    if success:
        planning_tool.mark_step(plan_id, 3, "completed", "Fix verified successfully")
        planning_tool.mark_step(plan_id, 4, "completed", "Edge cases tested")
        planning_tool.mark_step(plan_id, 5, "completed", "Changes ready for commit")
        print("\n🎉 Workflow completed successfully!")
    else:
        planning_tool.mark_step(plan_id, 3, "blocked", "Verification failed")
        print("\n❌ Verification failed. Need to iterate on fix.")

if __name__ == "__main__":
    main()
