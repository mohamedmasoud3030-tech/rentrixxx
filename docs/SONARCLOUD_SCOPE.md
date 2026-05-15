# SonarCloud Analysis Scope

This repository contains the current Rentrix production app plus legacy prototypes, mockups, and backup migration material. SonarCloud should focus on the actively maintained production code first.

## Included

- artifacts/rentrix/src: current production Rentrix TypeScript source.
- supabase: database migrations, policies, and functions.

## Excluded

- migration backup folders: archived SQL and transition material.
- mockup sandbox: visual prototypes and experimental UI.
- legacy source: retained for reference and recovery work, but not part of the current production quality gate.
- test files: kept separate from source issue counts and used for coverage when coverage reports are available.

This scope does not suppress real issues in the production application. It prevents historical and prototype code from inflating the main quality gate. Legacy code can be cleaned in separate migration PRs if it becomes production code again.
