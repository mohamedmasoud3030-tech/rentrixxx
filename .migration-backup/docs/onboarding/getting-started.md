# Getting Started

## 1) Read first
- `docs/architecture/overview.md`
- `docs/conventions/coding-standards.md`

## 2) Local workflow
1. Install dependencies.
2. Start dev server.
3. Run tests before opening PR.

## 3) Understand core flow
Follow this order when exploring the codebase:
1. `services/` (I/O boundaries)
2. `hooks/` (orchestration)
3. `contexts/` (state distribution)
4. UI components (consumers)

## 4) First task checklist
- Pick one module and trace a read + write flow.
- Confirm loading/error behavior in UI.
- Add or adjust tests with any change.
- Use the module template in coding standards when adding new features.
