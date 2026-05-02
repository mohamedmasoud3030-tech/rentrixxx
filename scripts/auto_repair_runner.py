import asyncio
import sys
import os

# Add the parent directory to sys.path so we can import from scripts
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.openmanus.planning import PlanningTool
from scripts.openmanus.str_replace_editor import StrReplaceEditor

# Mock operator for StrReplaceEditor as it expects an object with read_file/write_file
class FileOperator:
    async def read_file(self, path):
        with open(path, 'r') as f:
            return f.read()
    async def write_file(self, path, content):
        with open(path, 'w') as f:
            f.write(content)

async def main():
    print("🚀 Starting Automated Repair and Enhancement Process for Rentrix...")
    
    planner = PlanningTool()
    editor = StrReplaceEditor()
    operator = FileOperator()
    
    plan_id = planner.create_plan(
        title="Rentrix Auto-Repair and Enhancement Master Plan",
        steps=[
            "Task 1 (Performance): Optimize React re-renders in Finance module",
            "Task 2 (Security): Sanitize user inputs in Edge Functions",
            "Task 3 (UX): Add loading skeletons and error boundaries",
            "Task 4 (Reliability): Implement SWE-agent reproduction scripts",
            "Task 5 (Architecture): Refactor API calls to use unified error handling"
        ]
    )
    
    print("\n📋 Master Plan Created:")
    print(planner.get_plan(plan_id).output)
    
    # --- Task 1 Execution ---
    print("\n▶️ Executing Task 1: Optimizing React re-renders in Finance module...")
    planner.mark_step(plan_id, 0, "in_progress", "Analyzing Finance.tsx")
    
    finance_path = "src/ui/Finance.tsx"
    
    try:
        if os.path.exists(finance_path):
            content = await operator.read_file(finance_path)
            
            if "export function Finance" in content:
                # Wrap component with React.memo
                new_content = content.replace("export function Finance", "const FinanceComponent = function Finance")
                new_content += "\nexport const Finance = React.memo(FinanceComponent);"
                
                # Using a simpler direct write for this demo script to avoid tool-specific complexity
                await operator.write_file(finance_path, new_content)
                
                print("✅ Task 1 applied successfully.")
                planner.mark_step(plan_id, 0, "completed", "Optimized Finance component with React.memo")
            else:
                print("⚠️ Component structure not as expected. Skipping.")
                planner.mark_step(plan_id, 0, "blocked", "Target pattern not found")
        else:
            print(f"⚠️ File not found: {finance_path}")
            planner.mark_step(plan_id, 0, "blocked", "File not found")
            
    except Exception as e:
        print(f"❌ Error in Task 1: {e}")
        planner.mark_step(plan_id, 0, "blocked", f"Error: {e}")
        
    print("\n📋 Current Progress:")
    print(planner.get_plan(plan_id).output)

if __name__ == "__main__":
    asyncio.run(main())
