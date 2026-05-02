# Architecture Overview

## Layers
- **UI Components**: renders screens and dispatches interactions.
- **Contexts**: owns cross-feature state and exposes providers.
- **Hooks**: orchestrates side effects and domain use-cases.
- **Services**: handles API/database/3rd-party integrations.

## Data Flow: contexts ↔ hooks ↔ services

```mermaid
flowchart TD
  UI[UI Components] --> Ctx[React Contexts]
  Ctx --> Hook[Custom Hooks]
  Hook --> Svc[Services]
  Svc --> Ext[External APIs / DB]
  Ext --> Svc
  Svc --> Hook
  Hook --> Ctx
  Ctx --> UI
```

## Request Lifecycle (read)

```mermaid
sequenceDiagram
  participant UI as UI Component
  participant C as Context
  participant H as Hook
  participant S as Service
  participant API as API/DB

  UI->>C: trigger load action
  C->>H: call useXxx().load()
  H->>S: fetchXxx(params)
  S->>API: HTTP/SQL request
  API-->>S: response
  S-->>H: normalized payload
  H-->>C: next state (data/loading/error)
  C-->>UI: rerender with new state
```

## Request Lifecycle (write)

```mermaid
sequenceDiagram
  participant UI as UI Component
  participant C as Context
  participant H as Hook
  participant S as Service
  participant API as API/DB

  UI->>C: dispatch mutate action
  C->>H: execute mutation
  H->>S: create/update/delete
  S->>API: write request
  API-->>S: ack + latest entity
  S-->>H: canonical entity
  H-->>C: optimistic reconcile / invalidate
  C-->>UI: rerender synced state
```
