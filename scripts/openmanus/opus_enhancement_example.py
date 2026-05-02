"""
Example: Using Claude Opus 4.5 with OpenManus Tools for Rentrix Enhancement

This example demonstrates how to leverage Claude Opus 4.5 (High Effort) 
with OpenManus Planning and StrReplaceEditor tools to intelligently enhance
the Rentrix application's business logic and AI integration.
"""

from anthropic import Anthropic
from scripts.openmanus.planning import PlanningTool
from scripts.openmanus.str_replace_editor import StrReplaceEditor

def create_enhancement_plan():
    """Create a structured plan for enhancing Rentrix with Opus 4.5."""
    tool = PlanningTool()
    
    plan_id = tool.create_plan(
        title="Enhance Rentrix Finance Module with Claude Opus 4.5",
        steps=[
            "Analyze current Finance module architecture and AI integration points",
            "Identify opportunities for improved business logic using Opus 4.5's reasoning",
            "Design new features leveraging High Effort reasoning capabilities",
            "Implement changes using StrReplaceEditor for safe code modifications",
            "Test all financial calculations and AI-driven features",
            "Deploy to production and monitor performance metrics",
            "Collect user feedback and iterate on improvements"
        ]
    )
    
    return tool, plan_id

def analyze_with_opus(client: Anthropic, context: str) -> str:
    """Use Claude Opus 4.5 with High Effort to analyze and improve code."""
    response = client.beta.messages.create(
        model="claude-opus-4-5-20251101",
        max_tokens=4096,
        extra_body={"effort": "high"},
        messages=[
            {
                "role": "user",
                "content": f"""أنت متخصص في تحسين تطبيقات إدارة العقارات.
                
قم بتحليل السياق التالي من تطبيق Rentrix واقترح تحسينات ذكية:

{context}

ركز على:
1. تحسين منطق العمل المحاسبي
2. تحسين دقة الحسابات المالية
3. تحسين تجربة المستخدم
4. تحسين الأداء والكفاءة

قدم توصياتك بشكل مفصل وعملي."""
            }
        ]
    )
    
    return response.content[0].text

def main():
    """Main execution function."""
    # Initialize clients
    client = Anthropic()
    planning_tool, plan_id = create_enhancement_plan()
    editor = StrReplaceEditor()
    
    # Mark first step as in progress
    planning_tool.mark_step(
        plan_id, 0, "in_progress", 
        "Starting comprehensive analysis of Finance module"
    )
    
    # Example context for analysis
    finance_context = """
    Current Finance Module Features:
    - Invoice management (create, track, payment status)
    - Receipt and expense tracking
    - General ledger management
    - Accounting integration
    - Financial reporting
    
    Current AI Integration:
    - Using Gemini 2.0 Flash for basic queries
    - Limited reasoning capability
    - Basic financial calculations
    
    Desired Improvements:
    - More accurate financial forecasting
    - Intelligent anomaly detection
    - Better reconciliation suggestions
    - Advanced financial analysis
    """
    
    # Analyze with Opus 4.5
    print("🤖 Analyzing with Claude Opus 4.5 (High Effort)...")
    analysis = analyze_with_opus(client, finance_context)
    print("\n📊 Analysis Results:")
    print(analysis)
    
    # Mark analysis as completed
    planning_tool.mark_step(
        plan_id, 0, "completed",
        "Analysis completed with comprehensive recommendations"
    )
    
    # Display plan progress
    print("\n📋 Plan Progress:")
    print(planning_tool.get_plan(plan_id).output)
    
    return planning_tool, plan_id

if __name__ == "__main__":
    planning_tool, plan_id = main()
    print("\n✅ Enhancement planning completed successfully!")
