# Debug Report Template

Use this template to submit actionable bug reports and speed up investigation.

## Debug Workflow

### Step 1: Reproduce
- Understand expected versus actual behavior.
- Identify exact reproduction steps.
- Determine scope: when it started and who is affected.

### Step 2: Isolate
- Narrow down the component, service, or code path.
- Check recent deploys, config changes, and dependency updates.
- Review logs and exact error messages.

### Step 3: Diagnose
- Form hypotheses and test them.
- Trace the code path.
- Identify the root cause, not just the symptom.

### Step 4: Fix
- Propose a fix and explain why it works.
- Consider side effects and edge cases.
- Add tests or guards to prevent regression.

## What To Include

Share as many of these as possible:
- Exact error message or stack trace.
- Precise reproduction steps.
- What changed recently.
- Logs or screenshots.
- Expected behavior versus actual behavior.
- Raw command output when relevant.

Tips:
- Share error text exactly; do not paraphrase.
- Call out recent deploys, dependency bumps, or config changes.
- Add environment context, for example: staging works but production fails.

## Debug Report: [Issue Summary]

### Reproduction
- **Expected**: [What should happen]
- **Actual**: [What happens instead]
- **Steps**: [How to reproduce]

### Root Cause
[Explanation of why the bug occurs]

### Fix
[Code changes or configuration fixes needed]

### Prevention
- [Test to add]
- [Guard to put in place]

## If Connectors Are Available

### Monitoring
- Pull logs, error rates, and metrics around the issue time window.
- Check recent deploys and config changes that correlate.

### Source Control
- Identify recent commits and PRs touching affected code paths.
- Validate whether the issue correlates with a specific change.

### Project Tracker
- Search for related bug reports or known issues.
- Create a ticket for the fix once root cause is confirmed.
