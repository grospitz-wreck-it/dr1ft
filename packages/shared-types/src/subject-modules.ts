// DR1FT — Fachmodule und Curriculum-Verknüpfungen
// Gemeinsamer, fachneutraler Vertrag für Editorial, Unterricht und Reports.
// Persistenz und RLS werden separat anhand des Remote-Schemas implementiert.

import type {
  BloomLevel,
  LearningObjectiveType,
} from "./learning-design";

export type LearningModuleStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "published"
  | "archived";

export type CurriculumMappingStatus =
  | "unreviewed"
  | "in_review"
  | "verified"
  | "rejected";

export type ModuleScenarioRole =
  | "core"
  | "practice"
  | "reflection"
  | "transfer"
  | "optional";

export interface SubjectArea {
  id: string;
  key: string;
  label: string;
  description?: string;
  parentId?: string;
  status: "active" | "archived";
}

export interface LearningModule {
  id: string;
  key: string;
  title: string;
  summary?: string;
  description?: string;
  version: number;
  status: LearningModuleStatus;
  language: string;
  subjectAreaIds: string[];
  targetAgeBands?: string[];
  schoolForms?: string[];
  educationalPathways?: string[];
  estimatedMinutes?: number;
  prerequisiteModuleIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LearningObjective {
  id: string;
  key: string;
  title: string;
  description: string;
  objectiveType: LearningObjectiveType;
  bloomLevel: BloomLevel;
  competencyIds: string[];
  version: number;
  status: "draft" | "published" | "archived";
}

export interface CurriculumFramework {
  id: string;
  key: string;
  title: string;
  publisher: string;
  jurisdiction?: string;
  version: string;
  publishedAt?: string;
  sourceUrl?: string;
  checkedAt?: string;
}

export interface CurriculumReference {
  id: string;
  frameworkId: string;
  referenceKey: string;
  title: string;
  description?: string;
  subjectAreaId?: string;
  schoolForms?: string[];
  educationalPathways?: string[];
  sourceUrl?: string;
  mappingStatus: CurriculumMappingStatus;
}

export interface LearningObjectiveCurriculumMapping {
  id: string;
  learningObjectiveId: string;
  curriculumReferenceId: string;
  rationale: string;
  mappingStatus: CurriculumMappingStatus;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface LearningModuleObjective {
  learningModuleId: string;
  learningObjectiveId: string;
  priority: number;
  note?: string;
}

export interface LearningModuleScenario {
  learningModuleId: string;
  scenarioId: string;
  orderIndex: number;
  role: ModuleScenarioRole;
  required: boolean;
}

export interface TeachingGroupModuleAssignment {
  id: string;
  teachingGroupId: string;
  learningModuleId: string;
  moduleVersion: number;
  status: "planned" | "active" | "completed" | "archived";
  assignedBy: string;
  assignedAt: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Snapshot for a module run. Persisting this at assignment/start time keeps
 * historical learning journeys tied to the exact published module version.
 */
export interface LearningModuleRunContext {
  learningModuleId: string;
  moduleVersion: number;
  teachingGroupId: string;
  schoolYearId: string;
  startedAt: string;
}
