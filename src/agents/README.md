# Rentrix Agent Layer

This module adapts OpenAI Agents SDK concepts using Rentrix service boundaries:

- **Agent abstraction** → `core/types.ts` (`AgentDefinition`)
- **Tool pattern** → `core/types.ts` + `core/toolSystem.ts`
- **Runner orchestration** → `core/agentRunner.ts`
- **Handoffs** → `orchestration/contractMonitoringWorkflow.ts`

> Architectural rule: agents orchestrate domain/services only; business rules stay in services.

## Folder Structure

```text
src/agents/
  core/
    agentRunner.ts
    errors.ts
    toolSystem.ts
    types.ts
  definitions/
    contractAgent.ts
    financialAgent.ts
    maintenanceAgent.ts
  orchestration/
    agentScheduler.ts
    contractMonitoringWorkflow.ts
    integrationPoints.ts
  tools/
    contractMonitoringTools.ts
  index.ts
```

## Service Reuse

- Contract monitoring domain logic: `src/services/contractMonitoringService.ts`
- Notification persistence abstraction: `src/services/notificationService.ts`

## Execution Modes

- **Manual trigger**: `triggerContractMonitoringManuallyWithHistory(runtimeSource)`
- **Scheduled trigger**: `createContractMonitoringScheduler(runtimeSource, { intervalMs })`
- **Execution logs/history**: `getAgentJobHistory()`

All executions use the existing `runAgent` pipeline via `runContractMonitoringWorkflow`.

## Example Execution Flow

```ts
import {
  createContractMonitoringScheduler,
  triggerContractMonitoringManuallyWithHistory,
  getAgentJobHistory,
} from './agents';

await triggerContractMonitoringManuallyWithHistory(runtimeSource);

const scheduler = createContractMonitoringScheduler(runtimeSource, {
  intervalMs: 24 * 60 * 60 * 1000,
});
scheduler.start();

const history = getAgentJobHistory();
```
