// ============================================================
// DR1FT — Shared Types
// Wird von apps/mobile, apps/admin und packages/engine-core genutzt
// ============================================================

export type ContentStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "live"
  | "archived"
  | "rejected";

export type ContentType =
  | "post"
  | "comment"
  | "dm_message"
  | "mission"
  | "minigame"
  | "reflection_prompt";

export type AgeRating = "all_ages" | "12_plus" | "16_plus";

export interface SourceRef {
  label: string;
  url: string;
}

export interface Scenario {
  id: string;
  slug: string;
  title: string;
  description?: string;
  ageRating: AgeRating;
  isActive: boolean;
}

export interface Competency {
  id: string;
  slug: string;
  title: string;
  description?: string;
}

export interface CreatorPersona {
  styleNotes?: string;
  rhetoricPatterns?: string[];
  credibilityScore?: number; // 0-1, wie glaubwürdig der Account wirkt
  bio?: string; // Profiltext, öffentlich sichtbar
  followerCount?: number; // Fake-Anzeigewert, rein kosmetisch
}

export interface Creator {
  id: string;
  kind: "npc" | "system";
  displayName: string;
  handle: string;
  avatarUrl?: string;
  persona: CreatorPersona;
  scenarioId?: string;
}

export interface ContentItem {
  id: string;
  type: ContentType;
  scenarioId?: string;
  creatorId?: string;
  parentId?: string;

  title?: string;
  body?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | null;

  manipulationTechniques: string[];
  targetCompetencies: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  ageRating: AgeRating;

  sourceRefs: SourceRef[];

  status: ContentStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;

  extra: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
}

export interface Mission {
  id: string;
  scenarioId: string;
  slug: string;
  title: string;
  description?: string;
  triggerCondition: Record<string, unknown>;
  targetCompetencies: string[];
  reflectionContentId?: string;
  status: ContentStatus;
}

export type InteractionType =
  | "view"
  | "like"
  | "share"
  | "report"
  | "ignore"
  | "comment"
  | "follow"
  | "block";

export interface UserInteraction {
  id: string;
  userId: string;
  contentItemId: string;
  interactionType: InteractionType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface UserCompetencyProgress {
  userId: string;
  competencyId: string;
  evidence: unknown[];
  level: 1 | 2 | 3 | 4 | 5;
  updatedAt: string;
}

// ---- Schule / Klasse (Schulplattform-Modell) ----

export type UserRole = "student" | "teacher" | "school_admin";

export interface School {
  id: string;
  name: string;
  region?: string;
}

export interface SchoolClass {
  id: string;
  schoolId: string;
  name: string;
  accessCode: string;
  isActive: boolean;
}

export interface ClassMembership {
  id: string;
  classId: string;
  userId: string;
  role: UserRole;
}

export interface ClassScenarioAssignment {
  id: string;
  classId: string;
  scenarioId: string;
}

// ---- NPC Dialog (verzweigtes System, siehe NPC Engine) ----

export interface ReplyOption {
  label: string;
  nextContentItemId: string;
  /** optional: welche Argumentationstechnik diese Antwort demonstriert (für Reflexion) */
  techniqueTag?: string;
}

export interface NpcMessageExtra {
  replyOptions?: ReplyOption[];
}

// ---- Domain Events (Event-Driven Architecture, siehe 09_ARCHITECTURE) ----

export type DomainEvent =
  | { type: "PostViewed"; userId: string; contentItemId: string }
  | { type: "CommentCreated"; userId: string; contentItemId: string; body: string }
  | { type: "NpcReplySelected"; userId: string; creatorId: string; contentItemId: string; techniqueTag?: string }
  | { type: "MissionStarted"; userId: string; missionId: string }
  | { type: "MissionCompleted"; userId: string; missionId: string }
  | { type: "CompetencyUpdated"; userId: string; competencyId: string; level: number }
  | { type: "FeedRefreshed"; userId: string };
