// DR1FT — Canonical Learning Design Types v1.0
// Shared between Editorial, Learning Engine, Assessment and Reports.

export type LearningDesignStatus = "draft" | "in_review" | "approved" | "archived";

export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

export type LearningObjectiveType =
  | "knowledge"
  | "skill"
  | "attitude"
  | "behavior"
  | "creation"
  | "transfer";

export type ExperientialPhase =
  | "concrete_experience"
  | "reflective_observation"
  | "abstract_conceptualization"
  | "active_experimentation";

export type LearningStepStatus = "draft" | "in_review" | "approved" | "archived";

export type LearningActivityType =
  | "experience"
  | "compare"
  | "investigate"
  | "decide"
  | "reflect"
  | "discuss"
  | "create"
  | "transfer"
  | "source_check"
  | "context_check"
  | "social_proof"
  | "simulation";

export type LearningContentRole =
  | "experience"
  | "context"
  | "evidence"
  | "reflection"
  | "social_proof"
  | "source"
  | "creation"
  | "transfer"
  | "setup"
  | "ambient";

export type LearningFramework =
  | "baacke"
  | "kmk"
  | "digcomp"
  | "bloom"
  | "backward_design"
  | "kolb"
  | "constructive_alignment"
  | "dr1ft";

export interface LearningDesignConfig {
  durationMinutes: number;
  learningStepCount: number;
  primaryLearningModel:
    | "backward_design"
    | "constructive_alignment"
    | "kolb";
  bloomTarget: BloomLevel;
  learningPattern?: string;
}

export interface GeneratedLearningObjective {
  code: string;
  title: string;
  description: string;
  bloomLevel: BloomLevel;
  objectiveType: LearningObjectiveType;
  priority: number;
  competencySlugs: string[];
}

export interface GeneratedFrameworkMapping {
  objectiveCode?: string;
  framework: LearningFramework;
  frameworkVersion?: string;
  dimensionKey: string;
  dimensionLabel: string;
  rationale: string;
  sourceTitle?: string;
  sourceUrl?: string;
  sourceNote?: string;
}

export interface GeneratedContentPlanItem {
  role: LearningContentRole;
  format:
    | "image_post"
    | "text_post"
    | "video_placeholder"
    | "comment"
    | "dm"
    | "group_dialog"
    | "source"
    | "comparison"
    | "profile"
    | "recommendation_signal"
    | "reflection_prompt"
    | "creation_task";
  purpose: string;
  orderIndex: number;
  required: boolean;
  imageRequired: boolean;
  imagePrompt?: string;
  imageAspectRatio?: string;
  textPrompt?: string;
  sourceRequirement?: string;
}

export interface GeneratedEvidenceIndicator {
  code: string;
  title: string;
  description: string;
  dimension: "behavior" | "reasoning" | "reflection" | "creation" | "transfer";
  evidenceType: string;
  positiveSignal: Record<string, unknown>;
  negativeSignal: Record<string, unknown>;
  confidenceWeight: number;
  required: boolean;
}

export interface GeneratedLearningStep {
  stepIndex: number;
  title: string;
  description: string;
  pedagogicalFunction: string;
  experientialPhase: ExperientialPhase;
  bloomLevel: BloomLevel;
  learningPattern: string;
  activityType: LearningActivityType;
  activityConfig: Record<string, unknown>;
  objectiveCodes: string[];
  competencySlugs: string[];
  narrativeRole: string;
  socialPressureLevel: number;
  expectedEvidence: Record<string, unknown>;
  reflectionPrompt?: string;
  reflectionConfig?: Record<string, unknown>;
  creationTask?: Record<string, unknown>;
  transferTask?: Record<string, unknown>;
  estimatedMinutes: number;
  missionTitle: string;
  missionDescription: string;
  triggerEvent: "PostViewed" | "CommentCreated" | "NpcReplySelected";
  contentPlan: GeneratedContentPlanItem[];
  evidenceIndicators: GeneratedEvidenceIndicator[];
}

export interface GeneratedLearningDesign {
  title: string;
  description: string;
  primaryLearningModel: LearningDesignConfig["primaryLearningModel"];
  bloomTarget: BloomLevel;
  desiredResults: {
    knowledge: string[];
    skills: string[];
    attitudes: string[];
    behaviors: string[];
    transfer: string[];
  };
  acceptableEvidence: Record<string, unknown>;
  learningExperiences: Record<string, unknown>;
  objectives: GeneratedLearningObjective[];
  frameworkMappings: GeneratedFrameworkMapping[];
  steps: GeneratedLearningStep[];
  ambientRecipe: Record<string, unknown>;
  pedagogicalWarnings: string[];
  sourceNotes: string[];
}
