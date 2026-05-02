# SWE-agent & Mini-SWE-agent Integration
This directory contains concepts and workflows integrated from the SWE-agent and mini-swe-agent projects to enhance the autonomous software engineering capabilities of Rentrix.

## Core Concepts Integrated:
1. **Reproducible Issue Scripts**: Workflows for creating minimal reproduction scripts before applying fixes.
2. **Step-by-Step Verification**: Systematic approach to verify fixes and check for edge cases.
3. **Optimized Bash Interaction**: Efficient use of bash commands for codebase analysis and modification.

## Recommended Workflow (inspired by mini-swe-agent):
1. **Analyze**: Find and read relevant files using `ls`, `grep`, and `cat`.
2. **Reproduce**: Create a script to reproduce the bug or demonstrate the need for a feature.
3. **Fix**: Edit source code (using OpenManus StrReplaceEditor or sed).
4. **Verify**: Run the reproduction script to ensure the fix works.
5. **Robustness Check**: Test edge cases to ensure the fix doesn't break other parts of the system.
6. **Finalize**: Commit and push changes.

## Integration with Opus 4.5:
Leverage Opus 4.5's High Effort reasoning to perform deep architectural analysis and high-quality code generation following the SWE-agent methodology.
