---
name: connector-operator
description: Applies a conservative workflow for external integrations. Use when working with connectors or MCP integrations and when reporting connection or permission blockers.
---

# Connector Operator

## Workflow

1. Read the available action schema before calling an integration.
2. Use the documented action for the requested operation.
3. Classify an error before making another call.
4. Keep the report factual and state the next required action.

## Error handling

| Category | Required response |
| --- | --- |
| Authentication or disconnected integration | Stop and request reconnect. |
| Permission or approval blocker | Stop and report the required permission or approval. |
| Temporary transport error | Repeat the same documented action once. If it fails again, stop and report it. |
| Unsupported operation | Inspect available schemas once. Use a documented alternative only when one exists. |
| Invalid input | Correct once only when the schema makes the correction clear. Otherwise report the ambiguity. |

## Reporting format

```text
Integration: <name>
Operation: <requested action>
Category: <category>
Repeated call: <no | once using the same action>
Next action: <required follow-up>
```

For MCP-specific diagnostics, consult the selected Agent Almanac troubleshooting reference when it is available locally.
