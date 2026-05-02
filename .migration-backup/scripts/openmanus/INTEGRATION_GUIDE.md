# OpenManus Integration Guide for Rentrix

## Overview
This guide explains how to use the integrated OpenManus tools with Claude Opus 4.5 (High Effort) to automate complex development tasks, code refactoring, and intelligent problem-solving in the Rentrix project.

## Integrated Tools

### 1. Planning Tool (`planning.py`)
The Planning Tool enables structured step-by-step execution and tracking of complex tasks.

**Key Features:**
- Create detailed plans with multiple steps
- Track progress with status indicators (not_started, in_progress, completed, blocked)
- Add notes and context to each step
- Manage multiple plans simultaneously

**Usage Example:**
```python
from scripts.openmanus.planning import PlanningTool

tool = PlanningTool()

# Create a plan for migrating a feature
plan_id = tool.create_plan(
    title="Migrate Finance Module to Opus 4.5",
    steps=[
        "Analyze current Finance module architecture",
        "Identify all AI integration points",
        "Update API calls to use claude-opus-4-5-20251101",
        "Test all financial calculations",
        "Deploy and monitor performance"
    ]
)

# Mark steps as completed
tool.mark_step(plan_id, 0, "completed", "Architecture analyzed successfully")
```

### 2. String Replace Editor (`str_replace_editor.py`)
The StrReplaceEditor provides robust, error-resistant file editing capabilities.

**Key Features:**
- Atomic string replacements with validation
- Line-by-line insertion with context
- Full edit history with undo capability
- Automatic duplicate detection

**Usage Example:**
```python
from scripts.openmanus.str_replace_editor import StrReplaceEditor

editor = StrReplaceEditor()

# Replace old model with new Opus 4.5
await editor.str_replace(
    path="src/services/geminiService.ts",
    old_str='model="gemini-2.0-flash"',
    new_str='model="claude-opus-4-5-20251101"'
)

# Insert new configuration
await editor.insert(
    path="src/config/ai.ts",
    insert_line=10,
    new_str='export const EFFORT_LEVEL = "high";'
)
```

## Opus 4.5 High Effort Configuration

All tools are designed to work seamlessly with Claude Opus 4.5 using the High Effort setting:

```typescript
const response = await client.messages.create({
    model: "claude-opus-4-5-20251101",
    max_tokens: 4096,
    extra_body: { effort: "high" },
    messages: [{ role: "user", content: prompt }]
});
```

The High Effort setting enables:
- Extended reasoning and analysis
- More accurate code generation
- Better error detection and prevention
- Improved understanding of complex business logic

## Best Practices

1. **Always Use Planning First**: Break down complex tasks into steps before execution.
2. **Validate Replacements**: Ensure old_str is unique before performing replacements.
3. **Test After Changes**: Run `npm run typecheck` and `npm run build` after modifications.
4. **Document Changes**: Add notes to plan steps explaining the rationale.
5. **Monitor Performance**: Track execution time and success rates for optimization.

## Integration with CI/CD

These tools are integrated into the development workflow and can be triggered via:
- GitHub Actions workflows
- Local development scripts
- Vercel deployments

## Future Enhancements

- Automated code review using Opus 4.5
- Intelligent bug detection and fixing
- Performance optimization suggestions
- Documentation generation
