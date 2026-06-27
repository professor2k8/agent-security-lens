import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cloudIntelligenceEnabled,
  queryCloudReview,
  queryResearchStatus,
  submitFeedbackToCloud,
  submitUnknownToCloud,
  submitUsageEventToCloud
} from "./cloud-client.mjs";
import {
  buildInstallDecision,
  findKnownComponent as findKnownComponentRecord,
  riskLevel,
  nextActionFor
} from "./decision-engine.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const COMPONENT_DB_PATH = join(ROOT, "data", "intelligence", "components.json");
const CANDIDATE_CATALOG_PATH = join(ROOT, "data", "intelligence", "candidates", "2026-06-07-component-catalog.json");
const OPS_SNAPSHOT_PATH = join(ROOT, "data", "operations", "ops-snapshot.json");
const LOCAL_QUEUE_ROOT = process.env.ASL_LOCAL_QUEUE_DIR || join(process.cwd(), ".agentsecuritylens");
const UNKNOWN_QUEUE_DIR = join(LOCAL_QUEUE_ROOT, "unknown-components");
const USAGE_QUEUE_DIR = join(LOCAL_QUEUE_ROOT, "usage-events");
const FEEDBACK_QUEUE_DIR = join(LOCAL_QUEUE_ROOT, "decision-feedback");

export async function loadComponentDatabase() {
  const content = await readFile(COMPONENT_DB_PATH, "utf8");
  return JSON.parse(content);
}

export async function loadCandidateCatalog() {
  try {
    const content = await readFile(CANDIDATE_CATALOG_PATH, "utf8");
    const catalog = JSON.parse(content);
    return Array.isArray(catalog.candidates) ? catalog.candidates : [];
  } catch {
    return [];
  }
}

export async function findKnownComponent(input) {
  const database = await loadComponentDatabase();
  return findKnownComponentRecord(input, database.components);
}

function withResolution(review, resolution) {
  return {
    ...review,
    resolution
  };
}

function normalizeCloudReview(cloudData, input, cloudResult) {
  const review = cloudData?.result || (typeof cloudData?.decision === "object" ? cloudData.decision : null) || cloudData;
  if (!review || typeof review !== "object") return null;
  if (!review.decision || !review.trust_score || !Array.isArray(review.risk_signals)) return null;
  return withResolution(
    {
      schema_version: review.schema_version || "0.1.0",
      schema_id: review.schema_id || "https://agentsecuritylens.dev/schemas/agent-install-decision.schema.json",
      service: "AgentSecurityLens",
      result_type: "agent_install_decision",
      component: review.component || {
        known: Boolean(review.component_id),
        id: review.component_id || null,
        name: input.component_name || null,
        type: input.component_type || "unknown",
        source_url: input.source_url || null
      },
      decision: review.decision,
      trust_score: review.trust_score,
      score_breakdown: review.score_breakdown || null,
      risk_level: review.risk_level || riskLevel(review.trust_score),
      risk_signals: review.risk_signals,
      required_user_confirmation:
        typeof review.required_user_confirmation === "boolean"
          ? review.required_user_confirmation
          : ["ask_user", "avoid"].includes(review.decision),
      safe_install_plan: review.safe_install_plan || [],
      alternatives: review.alternatives || [],
      recommended_alternatives: review.recommended_alternatives || [],
      next_action: review.next_action || nextActionFor(review.decision),
      one_step_action: review.one_step_action || null,
      agent_decision_contract: review.agent_decision_contract || null,
      agent_actions: review.agent_actions || [],
      agent_instruction: review.agent_instruction || "Follow the returned decision before installing this component.",
      intelligence_coverage: review.intelligence_coverage || {
        state: review.component?.intelligence_state || (review.component?.known ? "reviewed" : "unknown"),
        reviewed: Boolean(review.component?.reviewed || review.component?.known),
        cataloged: Boolean(review.component?.cataloged),
        source: review.component?.known ? "reviewed_intelligence_database" : "submitted_metadata_inference",
        confidence: review.component?.known ? "high" : "low",
        catalog: null
      },
      unknown_component: review.unknown_component || null
    },
    {
      source: "asl_cloud",
      api_url: cloudResult.api_url,
      checked_at: new Date().toISOString(),
      local_fallback_used: false
    }
  );
}

async function canonicalizeCloudReview(review, input = {}) {
  try {
    const database = await loadComponentDatabase();
    const localKnown =
      database.components.find((component) => component.id && component.id === review.component?.id) ||
      findKnownComponentRecord(input, database.components);
    const currentName = review.component?.name || "";
    const genericOrUrlName = /^https?:\/\//i.test(currentName) || /^(planned-install|install|component|unknown|tool|mcp|skill)$/i.test(currentName);
    if (localKnown?.name && genericOrUrlName) {
      return {
        ...review,
        component: {
          ...review.component,
          name: localKnown.name,
          source_url: review.component?.source_url || localKnown.source_url || null,
          full_name: review.component?.full_name || localKnown.aliases?.[1] || null
        }
      };
    }
  } catch {
    // Cloud decisions remain usable even if local canonicalization is unavailable.
  }
  return review;
}

async function buildLocalReview(input = {}, fallbackReason = null) {
  const database = await loadComponentDatabase();
  const candidates = await loadCandidateCatalog();
  return buildInstallDecision({
    input,
    components: database.components,
    candidates,
    resolution: {
      source: cloudIntelligenceEnabled() ? "local_fallback" : "local_only",
      checked_at: new Date().toISOString(),
      local_fallback_used: cloudIntelligenceEnabled(),
      fallback_reason: fallbackReason
    }
  });
}

export async function reviewBeforeInstall(input = {}) {
  if (cloudIntelligenceEnabled()) {
    const cloudResult = await queryCloudReview(input);
    if (cloudResult.ok) {
      const normalized = normalizeCloudReview(cloudResult.data, input, cloudResult);
      if (normalized) return canonicalizeCloudReview(normalized, input);
    }
    return buildLocalReview(input, cloudResult.reason || "cloud_result_unusable");
  }
  return buildLocalReview(input);
}

export async function submitUnknownComponent(input = {}) {
  const localReview = await buildLocalReview(input);
  const cloudResult = await submitUnknownToCloud(input, localReview);
  if (cloudResult.ok) {
    return {
      queued: true,
      source: "asl_cloud",
      api_url: cloudResult.api_url,
      id: cloudResult.data?.id || cloudResult.data?.submission_id || null,
      status: cloudResult.data?.status || "queued",
      intelligence_state: cloudResult.data?.intelligence_state || null,
      decision_at_submission: cloudResult.data?.decision_at_submission || null,
      research_task: cloudResult.data?.research_task || null
    };
  }

  await mkdir(UNKNOWN_QUEUE_DIR, { recursive: true });
  const submittedAt = new Date().toISOString();
  const id = createHash("sha256")
    .update(JSON.stringify({ input, submittedAt }))
    .digest("hex")
    .slice(0, 16);
  const record = {
    schema_version: "0.1.0",
    id,
    status: "queued",
    submitted_at: submittedAt,
    source: "agent-security-mcp",
    intelligence_state: localReview.component?.intelligence_state || localReview.intelligence_coverage?.state || "unknown",
    component: {
      name: input.component_name || null,
      type: input.component_type || "unknown",
      source_url: input.source_url || null,
      install_command: input.install_command || null,
      manifest: input.manifest || null,
      planned_use: input.planned_use || null,
      requested_permissions: input.requested_permissions || null
    },
    review_summary: {
      component: localReview.component || null,
      decision: localReview.decision || null,
      trust_score: localReview.trust_score ?? null,
      risk_level: localReview.risk_level || null,
      risk_signals: localReview.risk_signals || [],
      recommended_alternatives: localReview.recommended_alternatives || localReview.alternatives || [],
      intelligence_coverage: localReview.intelligence_coverage || null
    },
    research_task: {
      submission_id: id,
      status: "queued",
      owner_team:
        input.component_type === "mcp"
          ? "mcp-research-team"
          : input.component_type === "skill"
            ? "skills-research-team"
            : input.component_type === "agent-framework"
              ? "agent-framework-team"
              : "chief-security-agent",
      next_agent_action: {
        action_type: "wait_for_research_or_ask_user",
        automatic_install_retry_allowed: false,
        user_confirmation_required: true,
        recommended_behavior:
          "Do not install automatically. Use a reviewed alternative or ask the user for explicit restricted-install approval.",
        allowed_next_calls: ["get_research_status", "recommend_alternatives"]
      }
    },
    privacy_note: "Do not include private file contents, secrets, tokens or personal data in unknown component submissions."
  };
  const path = join(UNKNOWN_QUEUE_DIR, `${submittedAt.replaceAll(":", "-")}__${id}.json`);
  await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return {
    queued: true,
    source: "local_fallback",
    id,
    path,
    intelligence_state: record.intelligence_state,
    decision_at_submission: localReview.decision,
    research_task: record.research_task,
    cloud_submission: {
      attempted: cloudIntelligenceEnabled(),
      reason: cloudResult.reason
    }
  };
}

export async function recommendAlternatives(input = {}) {
  const review = await reviewBeforeInstall(input);
  return {
    component: review.component,
    alternatives: review.alternatives,
    recommended_alternatives: review.recommended_alternatives,
    safe_install_plan: review.safe_install_plan,
    one_step_action: review.one_step_action,
    agent_actions: review.agent_actions?.filter((action) => action.id === "prefer-reviewed-alternative" || action.id === "apply-safe-install-plan"),
    agent_instruction: review.agent_instruction
  };
}

async function writeLocalQueue(dir, prefix, payload) {
  await mkdir(dir, { recursive: true });
  const submittedAt = new Date().toISOString();
  const id = createHash("sha256")
    .update(JSON.stringify({ payload, submittedAt }))
    .digest("hex")
    .slice(0, 16);
  const record = {
    schema_version: "0.1.0",
    id,
    status: "queued",
    submitted_at: submittedAt,
    source: "agent-security-mcp",
    ...payload
  };
  const path = join(dir, `${submittedAt.replaceAll(":", "-")}__${prefix}__${id}.json`);
  await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  return { queued: true, source: "local_fallback", id, path };
}

export async function recordUsageEvent(event = {}) {
  const cloudResult = await submitUsageEventToCloud(event);
  if (cloudResult.ok) {
    return {
      recorded: true,
      source: "asl_cloud",
      api_url: cloudResult.api_url,
      id: cloudResult.data?.id || null,
      status: cloudResult.data?.status || "recorded"
    };
  }
  return writeLocalQueue(USAGE_QUEUE_DIR, "usage", {
    event,
    cloud_submission: {
      attempted: cloudIntelligenceEnabled(),
      reason: cloudResult.reason
    },
    privacy_note: "Usage events must not include private code, secrets, tokens, cookies or personal data."
  });
}

export async function submitDecisionFeedback(feedback = {}) {
  const cloudResult = await submitFeedbackToCloud(feedback);
  if (cloudResult.ok) {
    return {
      recorded: true,
      source: "asl_cloud",
      api_url: cloudResult.api_url,
      id: cloudResult.data?.id || null,
      status: cloudResult.data?.status || "recorded"
    };
  }
  return writeLocalQueue(FEEDBACK_QUEUE_DIR, "feedback", {
    feedback,
    cloud_submission: {
      attempted: cloudIntelligenceEnabled(),
      reason: cloudResult.reason
    },
    privacy_note: "Decision feedback must not include private code, secrets, tokens, cookies or personal data."
  });
}

export async function getResearchStatus(submissionId) {
  const cloudResult = await queryResearchStatus(submissionId);
  if (cloudResult.ok) return cloudResult.data;
  try {
    const snapshot = JSON.parse(await readFile(OPS_SNAPSHOT_PATH, "utf8"));
    const item = (snapshot.pipeline || []).find((entry) => entry.id === submissionId);
    if (item) {
      return {
        schema_version: "0.1.0",
        service: "AgentSecurityLens",
        result_type: "research_status",
        source: cloudIntelligenceEnabled() ? "local_fallback" : "local_only",
        submission_id: submissionId,
        status: item.status,
        owner_team: item.owner_team,
        submitted_at: item.submitted_at,
        sla_due_at: item.sla_due_at,
        risk_hint: item.risk_hint,
        evidence_count: item.evidence_count,
        install_retry_allowed: item.status === "published",
        next_agent_action: {
          action_type: item.status === "published" ? "rerun_review_before_install" : "wait_for_research_or_ask_user",
          automatic_install_retry_allowed: item.status === "published",
          user_confirmation_required: item.status !== "published",
          recommended_behavior:
            item.status === "published"
              ? "Re-run ASL review_before_install and follow the returned decision before installing."
              : "Do not install automatically. Use a reviewed alternative or ask the user for explicit restricted-install approval.",
          allowed_next_calls:
            item.status === "published" ? ["review_before_install", "check_component"] : ["get_research_status", "recommend_alternatives"]
        },
        agent_instruction:
          item.status === "published"
            ? "Re-run ASL review_before_install and follow the returned decision before installing."
            : "Do not install automatically. Use a reviewed alternative or ask the user for explicit restricted-install approval."
      };
    }
  } catch {
    // Fall through to generic status when no local operations snapshot is available.
  }
  return {
    schema_version: "0.1.0",
    service: "AgentSecurityLens",
    result_type: "research_status",
    source: cloudIntelligenceEnabled() ? "local_fallback" : "local_only",
    submission_id: submissionId || null,
    status: "unknown",
    reason: cloudResult.reason || "cloud_unavailable",
    install_retry_allowed: false,
    next_agent_action: {
      action_type: "wait_for_research_or_ask_user",
      automatic_install_retry_allowed: false,
      user_confirmation_required: true,
      recommended_behavior: "If this component is still unknown, do not install automatically. Ask the user or use a reviewed alternative.",
      allowed_next_calls: ["get_research_status", "recommend_alternatives"]
    },
    agent_instruction:
      "If this component is still unknown, do not install automatically. Ask the user or use a reviewed alternative."
  };
}
