# Developer Guide

## Local Development Setup

### Prerequisites
- Node.js (v22 or higher)
- pnpm (recommended) or npm
- Supabase CLI (for database migrations and edge functions)

### Getting Started
1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd rentrixxx
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Environment Configuration**:
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**:
   ```bash
   pnpm dev
   ```
   The app will be available at `http://localhost:5000`.

## Project Structure
```
src/
├── app/                # Page components and routing
├── components/         # Shared UI components (Atomic Design)
├── domain/             # Business logic (Facades, Entities)
├── services/           # Infrastructure (API, Logging, Auth)
├── hooks/              # Global and local React hooks
├── types/              # TypeScript definitions
└── utils/              # Helper functions and formatters
```

## Development Standards

### 1. TypeScript
- Use strict typing. Avoid `any`.
- Define interfaces for all API responses and domain entities.
- Prefer `type` for simple definitions and `interface` for classes/objects.

### 2. State Management
- Use the **Facade Pattern**. UI components should call methods on a facade (e.g., `useApp().finance.postReceipt()`) rather than calling services directly.
- Global state is managed via `AppContext` and initialized in `useAppCoreImpl.tsx`.

### 3. Database Interactions
- **CRUD**: Use `supabaseData` service for standard operations. It handles snake_case (DB) to camelCase (JS) conversion automatically.
- **Complex Logic**: Always implement complex or multi-table mutations as **PostgreSQL RPC functions** to ensure atomicity.

### 4. Styling
- Use **Tailwind CSS** for all styling.
- Follow the design system defined in `src/design-system/`.
- Use the `ui/` component library for consistent buttons, inputs, and modals.

## Testing
- **Unit Testing**: Use Vitest for business logic and utils.
- **Command**: `pnpm test`
- **UI Testing**: Use Vitest with React Testing Library.

## Common Tasks

### Adding a New Database Table
1. Create a new migration in `supabase/migrations/`.
2. Define the table with `organization_id` and RLS policies.
3. Update `src/types/database.ts` with the new schema.
4. Add the table mapping to `src/services/supabaseDataService.ts`.

### Creating a New Edge Function
1. Use Supabase CLI: `supabase functions new my-function`.
2. Implement logic in TypeScript.
3. Deploy: `supabase functions deploy my-function`.
4. Add a wrapper in `src/services/edgeFunctions.ts`.
