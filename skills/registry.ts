/**
 * Development-time skills registry.
 *
 * NOTE: This file is intentionally outside `src/` and is not part of production runtime.
 */

export type SkillCategory =
  | 'analysis'
  | 'refactor'
  | 'dependency-graph'
  | 'quality'
  | 'developer-utility';

export interface SkillDefinition {
  id: string;
  title: string;
  category: SkillCategory;
  purpose: string;
  entrypoint: string;
  optional: true;
  runtimeImpact: 'none';
}

export const skillsRegistry: SkillDefinition[] = [
  {
    id: 'architecture-analysis',
    title: 'Architecture Analysis',
    category: 'analysis',
    purpose: 'Repository-wide architecture mapping, boundary checks, and risk surfacing.',
    entrypoint: 'skills/architecture-analysis/SKILL.md',
    optional: true,
    runtimeImpact: 'none',
  },
  {
    id: 'refactor-assistant',
    title: 'Refactor Assistant',
    category: 'refactor',
    purpose: 'Safe, incremental refactor workflow with impact analysis and rollback posture.',
    entrypoint: 'skills/refactor-assistant/SKILL.md',
    optional: true,
    runtimeImpact: 'none',
  },
  {
    id: 'dependency-graph-inspector',
    title: 'Dependency Graph Inspector',
    category: 'dependency-graph',
    purpose: 'Import-edge inspection and enforcement of dependency direction rules.',
    entrypoint: 'skills/dependency-graph-inspector/SKILL.md',
    optional: true,
    runtimeImpact: 'none',
  },
  {
    id: 'code-quality-checker',
    title: 'Code Quality Checker',
    category: 'quality',
    purpose: 'Typecheck/lint/build validation and regression safety checklist.',
    entrypoint: 'skills/code-quality-checker/SKILL.md',
    optional: true,
    runtimeImpact: 'none',
  },
  {
    id: 'developer-utilities',
    title: 'Developer Utilities',
    category: 'developer-utility',
    purpose: 'Reusable command snippets and review checklists for local audits.',
    entrypoint: 'skills/developer-utilities/SKILL.md',
    optional: true,
    runtimeImpact: 'none',
  },
];

export const getSkillById = (id: string): SkillDefinition | undefined =>
  skillsRegistry.find((skill) => skill.id === id);
