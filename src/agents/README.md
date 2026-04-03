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
    contractMonitoringWorkflow.ts
    integrationPoints.ts
  tools/
    contractMonitoringTools.ts
  index.ts
```

## Service Reuse

- Contract monitoring domain logic: `src/services/contractMonitoringService.ts`
- Notification persistence abstraction: `src/services/notificationService.ts`

## Example Execution Flow

```ts
import {
  triggerContractMonitoringManually,
  buildContractMonitoringConsumption,
} from './agents';

const workflow = await triggerContractMonitoringManually({ db, settings });
const consumption = buildContractMonitoringConsumption(workflow);
```
