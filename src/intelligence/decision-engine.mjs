import { evaluateComponentSafety } from "./safety-score-v0.2.mjs";
import {
  alternativeCoverageFor,
  findComponentAlternatives
} from "../recommendations/component-alternative-graph.mjs";

export function normalizeText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.toLowerCase();
  return JSON.stringify(value).toLowerCase();
}

export function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function aliasMatchesInput(alias, input = {}) {
  const normalizedAlias = normalizeText(alias).trim();
  if (!normalizedAlias) return false;
  const exactFields = [
    input.component_name,
    input.name,
    input.package_name,
    input.registry
  ].map((item) => normalizeText(item).trim());
  if (exactFields.includes(normalizedAlias)) return true;
  if (normalizedAlias.length < 5) return false;

  const looseMatchAllowed = /[\/@._-]/.test(normalizedAlias) || normalizedAlias.length >= 8;
  if (!looseMatchAllowed) return false;

  const searchableText = normalizeText([
    input.component_name,
    input.component_type,
    input.source_url,
    input.install_command,
    input.manifest,
    input.name,
    input.type,
    input.package_name,
    input.registry
  ]);
  return searchableText.includes(normalizedAlias);
}

const EVALUATION_MODEL_VERSION = "asl-safety-standard@0.2.0";

const RISK_SIGNAL_WEIGHTS = {
  "remote-code-install": 30,
  "shell-execution": 25,
  "subprocess-spawn": 25,
  "docker-runtime": 25,
  "credential-access": 22,
  "filesystem-read": 18,
  "filesystem-write": 22,
  "browser-access": 22,
  "database-access": 22,
  "data-retention": 18,
  "network-access": 16,
  "external-api": 16,
  webhook: 16,
  "remote-mcp-endpoint": 16,
  "multi-agent-delegation": 14,
  "tool-chaining": 14,
  "third-party-integration": 14,
  "workflow-automation": 18,
  "background-execution": 18,
  "scheduled-trigger": 18,
  "hidden-instruction": 20,
  "override-rules": 20,
  "ignore-safety": 20,
  "prompt-injection-pattern": 20,
  "repository-write": 18,
  "message-write": 14,
  "unknown-source": 16
};

const TRUST_SIGNAL_WEIGHTS = {
  "source-official-or-known-org": 12,
  "active-maintenance": 8,
  "transparent-permissions": 10,
  "signed-release-or-pinned-version": 8,
  "high-community-adoption": 6,
  "negative-community-reports": -18,
  "unresolved-security-issues": -16,
  "unknown-maintainer": -10
};

const DECISION_THRESHOLDS = {
  allow: { min_score: 80 },
  allow_with_restrictions: { min_score: 60, max_score: 79 },
  ask_user: { min_score: 40, max_score: 59 },
  avoid: { max_score: 39 }
};

const MONITORED_POPULARITY_SCORE = 100;

function catalogCoverageState(candidate = {}) {
  const source = normalizeText(candidate.source_url || candidate.full_name || "");
  const popularity = Number(candidate.popularity_score || 0);
  if (candidate.review_state === "monitored" || candidate.catalog_state === "monitored") return "monitored";
  if (popularity >= MONITORED_POPULARITY_SCORE) return "monitored";
  if (source.includes("github.com/modelcontextprotocol") || source.includes("github.com/microsoft")) return "monitored";
  return "candidate";
}

export function findKnownComponent(input, components = []) {
  return (
    components.find((component) => {
      const aliases = [component.id, component.name, ...(component.aliases || []), ...(component.source_patterns || [])];
      return aliases.some((alias) => aliasMatchesInput(alias, input));
    }) || null
  );
}

export function findCandidateComponent(input, candidates = []) {
  return (
    candidates.find((candidate) => {
      const aliases = unique([
        candidate.id,
        candidate.name,
        candidate.full_name,
        candidate.source_url,
        ...(candidate.aliases || []),
        ...(candidate.source_patterns || [])
      ]);
      return aliases.some((alias) => aliasMatchesInput(alias, input));
    }) || null
  );
}

function candidateAsIntelligenceRecord(candidate = null) {
  if (!candidate) return null;
  const coverageState = catalogCoverageState(candidate);
  return {
    id: candidate.id,
    name: candidate.name,
    type: candidate.type || candidate.category || "unknown",
    aliases: unique([candidate.name, candidate.full_name]),
    source_patterns: unique([candidate.full_name, candidate.source_url]),
    source_url: candidate.source_url || null,
    source_type: candidate.source_type || "candidate_catalog",
    stars: candidate.stars || 0,
    trust_score: Number.isInteger(candidate.trust_score) ? candidate.trust_score : undefined,
    risk_level: candidate.risk_level || undefined,
    risk_signals: candidate.risk_signals || candidate.risk_hints || [],
    safe_install_plan: candidate.safe_install_plan || [],
    alternatives: candidate.alternatives || [],
    decision: candidate.decision || "ask_user",
    assessment_type: candidate.assessment_type || "automatic",
    confidence: candidate.confidence ?? null,
    model_version: candidate.model_version || null,
    community_signals: {
      positive_count: Number(candidate.stars || 0) >= 1000 ? 1 : 0,
      unresolved_security_issues: 0,
      negative_count: 0
    },
    catalog: {
      coverage_state: coverageState,
      state: candidate.catalog_state || "cataloged",
      review_state: candidate.review_state || "unreviewed",
      popularity_score: candidate.popularity_score || 0,
      forks: candidate.forks || 0,
      open_issues: candidate.open_issues || 0,
      language: candidate.language || null,
      topics: candidate.topics || [],
      evidence: candidate.evidence || null,
      next_action: candidate.next_action || "collect_metadata",
      description: candidate.description || ""
    }
  };
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function sourceReliability(input = {}, known = null) {
  const sourceType = normalizeText(input.source_type || input.registry || known?.source_type);
  const sourceUrl = normalizeText(input.source_url || known?.source_url || known?.source_patterns || "");
  if (sourceType.includes("official_registry")) return 0.95;
  if (sourceType.includes("official_github_org")) return 0.9;
  if (sourceType.includes("package_registry") || sourceType.includes("npm") || sourceType.includes("pypi")) return 0.75;
  if (sourceUrl.includes("github.com/modelcontextprotocol") || sourceUrl.includes("github.com/microsoft")) return 0.9;
  if (sourceUrl.includes("github.com") || sourceType.includes("github")) return 0.75;
  if (sourceType.includes("community")) return 0.55;
  if (sourceType.includes("social")) return 0.45;
  return known ? 0.75 : 0.35;
}

function inferTrustSignals(input = {}, known = null) {
  const signals = [...(known?.trust_signals || []), ...(input.trust_signals || [])];
  const sourceUrl = normalizeText(input.source_url || known?.source_url || known?.source_patterns || "");
  const text = normalizeText(input);
  const stars = Number(input.stars || input.github_stars || known?.stars || 0);
  const negativeCount = Number(input.community_signals?.negative_count || known?.community_signals?.negative_count || 0);
  const positiveCount = Number(input.community_signals?.positive_count || known?.community_signals?.positive_count || 0);
  const unresolvedSecurityIssues = Number(
    input.community_signals?.unresolved_security_issues || known?.community_signals?.unresolved_security_issues || 0
  );

  if (sourceUrl.includes("github.com/modelcontextprotocol") || sourceUrl.includes("github.com/microsoft")) {
    signals.push("source-official-or-known-org");
  }
  if (stars >= 1000 || positiveCount >= 5) signals.push("high-community-adoption");
  if (/\b(read-only|scoped token|sandbox|signed release|permission documented)\b/.test(text)) {
    signals.push("transparent-permissions");
  }
  if (/\b(pin|pinned|version|sha|digest|signed)\b/.test(text)) {
    signals.push("signed-release-or-pinned-version");
  }
  if (negativeCount > 0) signals.push("negative-community-reports");
  if (unresolvedSecurityIssues > 0) signals.push("unresolved-security-issues");
  if (!sourceUrl && !known) signals.push("unknown-maintainer");

  return unique(signals);
}

export function inferRisks(input) {
  const text = normalizeText(input);
  const risks = [];
  if (/\b(npx|uvx|pipx|python|node|bash|sh|powershell|pwsh|cmd\.exe|subprocess)\b/.test(text)) {
    risks.push("shell-execution");
  }
  if (/\b(curl|wget)\b/.test(text) || /\|\s*(bash|sh|powershell|pwsh)\b/.test(text)) {
    risks.push("remote-code-install");
  }
  if (/\b(docker|podman)\b/.test(text)) {
    risks.push("docker-runtime");
  }
  if (/\b(file|filesystem|write|workspace|home|\/users|c:\\\\|\.ssh)\b/.test(text)) {
    risks.push("filesystem-write");
  }
  if (/\b(token|secret|api[_-]?key|credential|env|\.env|ssh|cookie)\b/.test(text)) {
    risks.push("credential-access");
  }
  if (/\b(http|https|sse|webhook|remote|api|network)\b/.test(text)) {
    risks.push("network-access");
  }
  if (/\b(browser|chrome|playwright|cookies?|session)\b/.test(text)) {
    risks.push("browser-access");
  }
  return unique(risks);
}

export function scoreAssessment({ risks, known = null, input = {} }) {
  const safetyAssessment = evaluateComponentSafety({ risks, known, input });
  const trustSignals = inferTrustSignals(input, known);
  const appliedRiskWeights = risks.map((signal) => ({
    signal,
    weight: -(RISK_SIGNAL_WEIGHTS[signal] || 8)
  }));
  const appliedTrustSignals = trustSignals.map((signal) => ({
    signal,
    weight: TRUST_SIGNAL_WEIGHTS[signal] || 0
  }));
  const riskPenalty = appliedRiskWeights.reduce((total, item) => total + Math.abs(item.weight), 0);
  const trustAdjustment = appliedTrustSignals.reduce((total, item) => total + item.weight, 0);
  const reliability = sourceReliability(input, known);
  const reliabilityAdjustment = Math.round((reliability - 0.5) * 12);
  const baseScore = safetyAssessment.context_safety_score;
  return {
    score: safetyAssessment.context_safety_score,
    decision: safetyAssessment.decision,
    safety_assessment: safetyAssessment,
    breakdown: {
      model_version: EVALUATION_MODEL_VERSION,
      mode:
        known?.trust_score != null
          ? known?.intelligence_state === "strict_reviewed"
            ? "strict_reviewed_intelligence_record"
            : "curated_baseline_record"
          : known?.catalog?.coverage_state === "monitored"
            ? "monitored_catalog_record"
            : known?.catalog
              ? "candidate_catalog_record"
              : "inferred_from_submitted_metadata",
      base_score: baseScore,
      risk_penalty: -riskPenalty,
      trust_adjustment: trustAdjustment,
      source_reliability: reliability,
      source_reliability_adjustment: reliabilityAdjustment,
      applied_risk_weights: appliedRiskWeights,
      applied_trust_signals: appliedTrustSignals,
      sentiment: {
        auxiliary_only: true,
        negative_count: Number(input.community_signals?.negative_count || known?.community_signals?.negative_count || 0),
        positive_count: Number(input.community_signals?.positive_count || known?.community_signals?.positive_count || 0),
        rule: "Community sentiment can adjust confidence, but it does not alone prove malicious behavior."
      },
      dimensions: safetyAssessment.dimensions,
      residual_risk: safetyAssessment.residual_risk,
      hard_failures: safetyAssessment.hard_failures,
      required_controls: safetyAssessment.required_controls,
      missing_controls: safetyAssessment.missing_controls,
      decision_thresholds: DECISION_THRESHOLDS
    }
  };
}

export function scoreFromRisks(risks, knownScore = null) {
  return scoreAssessment({ risks, known: knownScore == null ? null : { trust_score: knownScore } }).score;
}

export function riskLevel(score) {
  if (score < 40) return "high";
  if (score < 80) return "medium";
  return "low";
}

export function decisionFor({ score, risks, knownDecision }) {
  if (knownDecision) return knownDecision;
  if (risks.includes("catalog-unreviewed")) return "ask_user";
  if (risks.includes("remote-code-install")) return "ask_user";
  if (risks.includes("credential-access") && risks.includes("shell-execution")) return "ask_user";
  if (score < 40) return "avoid";
  if (score < 60) return "ask_user";
  if (score < 80) return "allow_with_restrictions";
  return "allow";
}

function reviewedAlternativeNames(known = null) {
  const recommendation = (known?.evidence || [])
    .find((item) => item.kind === "recommendation_review")
    ?.recommendations;
  return unique(
    (recommendation?.reviewed_alternatives || [])
      .filter((item) => item?.kind === "reviewed_component" && item?.name)
      .map((item) => item.name)
  );
}

export function nextActionFor(decision) {
  if (decision === "allow") return "install";
  if (decision === "allow_with_restrictions") return "apply_restrictions_then_install";
  if (decision === "ask_user") return "ask_user_before_install";
  return "do_not_install";
}

function blocksAutomaticInstall(decision) {
  return ["ask_user", "avoid"].includes(decision);
}

function blockingReasons({ decision, risks, known }) {
  const reasons = [];
  if (!known) reasons.push("component-not-in-asl-intelligence");
  if (known?.catalog?.coverage_state === "monitored") reasons.push("component-monitored-but-not-reviewed");
  else if (known?.catalog) reasons.push("component-cataloged-but-not-reviewed");
  if (decision === "avoid") reasons.push("decision-avoid");
  if (decision === "ask_user") reasons.push("user-confirmation-required");
  if (risks.includes("remote-code-install")) reasons.push("remote-code-install-pattern");
  if (risks.includes("credential-access")) reasons.push("credential-access-risk");
  if (risks.includes("shell-execution")) reasons.push("shell-execution-risk");
  return unique(reasons);
}

function actionStatusFor(decision) {
  if (decision === "allow") return "allowed";
  if (decision === "allow_with_restrictions") return "conditional";
  if (decision === "ask_user") return "requires_user";
  return "blocked";
}

function buildAgentActions({ decision, risks, safeInstallPlan, alternatives, known, input }) {
  const status = actionStatusFor(decision);
  const actions = [
    {
      id: "record-component-source",
      stage: "before_install",
      action_type: "record",
      required: true,
      status: "required",
      instruction: "Record component name, source URL, package/version and install command before any installation attempt.",
      tool: null
    }
  ];

  if (!known) {
    actions.push({
      id: "submit-unknown-component",
      stage: "before_install",
      action_type: "call_asl_tool",
      required: true,
      status: "required",
      tool: "submit_unknown_component",
      arguments: {
        component_name: input.component_name || input.name || null,
        component_type: input.component_type || input.type || "unknown",
        source_url: input.source_url || null,
        install_command: input.install_command || null
      },
      instruction: "Submit public component metadata to ASL. Do not send private source code, secrets, cookies, tokens or personal data."
    });
  }

  if (known?.catalog) {
    actions.push({
      id: "check-catalog-research-status",
      stage: "before_install",
      action_type: "call_asl_tool",
      required: true,
      status: "required",
      tool: "get_research_status",
      arguments: {
        submission_id: known.id
      },
      instruction: "This component is cataloged but not reviewed. Check ASL research status before retrying automatic installation."
    });
  }

  if (decision === "allow_with_restrictions") {
    actions.push({
      id: "apply-safe-install-plan",
      stage: "before_install",
      action_type: "apply_restrictions",
      required: true,
      status,
      instruction: "Apply every safe_install_plan step before installation.",
      checklist: safeInstallPlan
    });
  }

  if (blocksAutomaticInstall(decision)) {
    actions.push({
      id: "request-user-confirmation",
      stage: "before_install",
      action_type: "ask_user",
      required: true,
      status,
      instruction:
        decision === "avoid"
          ? "Do not install automatically. Ask the user only if they explicitly want to override ASL guidance."
          : "Ask the user to approve or reject installation before continuing."
    });
  }

  if (alternatives.length) {
    actions.push({
      id: "prefer-reviewed-alternative",
      stage: "before_install",
      action_type: "recommend_alternative",
      required: decision === "avoid",
      status: decision === "avoid" ? "required" : "recommended",
      instruction: "Prefer a reviewed alternative when it satisfies the same task.",
      alternatives
    });
  }

  actions.push({
    id: "report-install-outcome",
    stage: "after_decision",
    action_type: "call_asl_tool",
    required: true,
    status: "required",
    tool: "report_install_outcome",
    arguments_template: {
      component_name: input.component_name || input.name || null,
      component_type: input.component_type || input.type || "unknown",
      source_url: input.source_url || null,
      decision,
      outcome: "installed|blocked|user_approved|user_rejected|restriction_applied|failed|skipped",
      restriction_applied: risks.some((risk) => ["filesystem-write", "credential-access", "browser-access", "network-access"].includes(risk))
    },
    instruction: "Report the final install outcome to ASL after acting on this decision."
  });

  return actions;
}

function buildRecommendedAlternatives(alternatives = [], { type = "unknown" } = {}) {
  return alternatives.map((alternative, index) => {
    if (typeof alternative === "string") {
      return {
        id: `legacy-alternative-${index + 1}`,
        name: alternative,
        reason: "Legacy reviewed recommendation. Re-check the target with ASL before installation.",
        component_type: type,
        action: "review_before_install_before_use"
      };
    }
    return {
      ...alternative,
      id: alternative.id || `alternative-${index + 1}`,
      component_type: alternative.component_type || type,
      action:
        alternative.relationship_type === "conditional_alternative"
          ? "confirm_conditions_then_review_target"
          : "review_before_install_before_use"
    };
  });
}

function buildOneStepAction({ decision, safeInstallPlan, alternatives, known }) {
  if (decision === "avoid") {
    const replacement = alternatives[0] ? ` Prefer reviewed alternative: ${alternatives[0]}.` : "";
    return {
      action_type: "do_not_install",
      command: null,
      agent_instruction: `Do not install this component automatically. Submit it to ASL research and ask the user before any override.${replacement}`,
      requires_user_confirmation: true,
      blocks_install: true
    };
  }
  if (decision === "ask_user") {
    const replacement = alternatives[0] ? ` Prefer reviewed alternative first: ${alternatives[0]}.` : "";
    return {
      action_type: "ask_user_before_install",
      command: null,
      agent_instruction: `Ask the user to approve this install. Show ASL risk signals and safe_install_plan before running any command.${replacement}`,
      requires_user_confirmation: true,
      blocks_install: true
    };
  }
  if (decision === "allow_with_restrictions") {
    return {
      action_type: "apply_restrictions_then_install",
      command: null,
      agent_instruction: `Apply these restrictions first: ${safeInstallPlan.join(" ")} Then install only from the recorded source and version.`,
      requires_user_confirmation: false,
      blocks_install: false
    };
  }
  return {
    action_type: "install",
    command: null,
    agent_instruction: known
      ? "Install from the reviewed source/version and report the outcome to ASL."
      : "Install only after recording exact source/version and submitting unknown metadata to ASL.",
    requires_user_confirmation: false,
    blocks_install: false
  };
}

function buildAgentDecisionContract({ decision, risks, known, input, safeInstallPlan, alternatives }) {
  const cataloged = Boolean(known?.catalog);
  const reasons = blockingReasons({ decision, risks, known });
  return {
    contract_version: "asl-agent-decision-contract@0.2.0",
    install_allowed: decision !== "avoid",
    automatic_install_allowed: !blocksAutomaticInstall(decision),
    user_confirmation_required: blocksAutomaticInstall(decision),
    restrictions_required: decision === "allow_with_restrictions",
    submit_unknown_required: !known,
    research_status_required_before_retry: !known || cataloged,
    outcome_report_required: true,
    feedback_requested: true,
    blocks_install: blocksAutomaticInstall(decision),
    blocking_reasons: reasons,
    required_tools: unique([
      !known ? "submit_unknown_component" : null,
      !known || cataloged ? "get_research_status" : null,
      "report_install_outcome",
      "submit_decision_feedback"
    ]),
    allowed_outcomes: ["installed", "blocked", "user_approved", "user_rejected", "restriction_applied", "failed", "skipped"],
    retry_policy: {
      unknown_component:
        !known || cataloged
          ? "Do not retry automatic installation until get_research_status returns published or the user explicitly approves a restricted install."
          : "Re-run review_before_install when source, package, version, manifest or install command changes.",
      decision_cache_ttl_hours: known?.trust_score != null ? 24 : 1
    },
    component_fingerprint_fields: {
      component_name: input.component_name || input.name || null,
      component_type: input.component_type || input.type || "unknown",
      source_url: input.source_url || null,
      install_command: input.install_command || null
    },
    safe_install_plan_required: decision === "allow_with_restrictions" ? safeInstallPlan : [],
    recommended_alternative_count: alternatives.length
  };
}

export function defaultSafeInstallPlan(risks) {
  const plan = [];
  if (risks.includes("shell-execution") || risks.includes("remote-code-install")) {
    plan.push("Do not run install commands automatically. Ask the user to approve the command first.");
    plan.push("Pin package versions or commit SHAs before installation.");
  }
  if (risks.includes("filesystem-write")) {
    plan.push("Limit filesystem access to the current workspace or a temporary copy.");
  }
  if (risks.includes("credential-access")) {
    plan.push("Use scoped low-privilege credentials instead of personal tokens.");
  }
  if (risks.includes("browser-access")) {
    plan.push("Use a dedicated browser profile without personal cookies.");
  }
  if (risks.includes("network-access")) {
    plan.push("Allowlist remote endpoints before enabling the component.");
  }
  if (!plan.length) plan.push("Install only from a reviewed source and record the exact version.");
  return plan;
}

export function buildAgentInstruction({ decision, risks, safeInstallPlan, alternatives, known }) {
  if (decision === "avoid") {
    return "Do not install this component automatically. Ask the user and submit it for security review.";
  }
  if (decision === "ask_user") {
    const replacement = alternatives.length ? ` Prefer alternatives first: ${alternatives.join(", ")}.` : "";
    return `Ask the user before installing. Key risks: ${risks.join(", ")}. Apply the safe install plan first.${replacement}`;
  }
  if (decision === "allow_with_restrictions") {
    return `Install only with restrictions: ${safeInstallPlan.join(" ")}`;
  }
  if (known && alternatives.length) {
    return `This component is known. Install with the recorded safe plan. Alternatives: ${alternatives.join(", ")}.`;
  }
  return "Component appears low risk from available signals. Record exact source and version before installing.";
}

export function buildInstallDecision({
  input = {},
  components = [],
  candidates = [],
  recommendationGraph = {},
  resolution
}) {
  const knownRecord = findKnownComponent(input, components);
  const strictReviewed = knownRecord?.intelligence_state === "strict_reviewed";
  const curatedBaseline = knownRecord?.intelligence_state === "curated_baseline";
  const candidate = knownRecord ? null : candidateAsIntelligenceRecord(findCandidateComponent(input, candidates));
  const known = knownRecord || candidate;
  const intelligenceState = strictReviewed
    ? "strict_reviewed"
    : curatedBaseline
      ? "curated_baseline"
      : candidate?.catalog?.coverage_state || "unknown";
  const inferredRisks = inferRisks(input);
  const risks = unique([
    ...(known?.risk_signals || []),
    ...inferredRisks,
    ...(candidate ? ["catalog-unreviewed"] : []),
    ...(known ? [] : ["unknown-source"])
  ]);
  const {
    score: trustScore,
    decision: contextualDecision,
    safety_assessment: safetyAssessment,
    breakdown: scoreBreakdown
  } = scoreAssessment({ risks, known, input });
  const level = safetyAssessment.residual_risk >= 70 ? "high" : safetyAssessment.residual_risk >= 35 ? "medium" : "low";
  const scoredDecision = contextualDecision;
  // Missing intelligence is itself a blocking condition. A favorable metadata-only
  // score may guide restrictions, but it must never authorize autonomous install.
  const decision =
    (!known || curatedBaseline) && scoredDecision !== "avoid"
      ? "ask_user"
      : scoredDecision;
  const safeInstallPlan = known?.safe_install_plan?.length ? known.safe_install_plan : defaultSafeInstallPlan(risks);
  const componentType = input.component_type || input.type || known?.type || "unknown";
  const graphAlternatives = strictReviewed
    ? findComponentAlternatives({
        componentId: known.id,
        graph: recommendationGraph,
        components
      })
    : [];
  const legacyAlternativeNames =
    !["mcp", "skill"].includes(componentType) && !graphAlternatives.length
      ? reviewedAlternativeNames(known)
      : [];
  const recommendedAlternativeRecords = graphAlternatives.length
    ? graphAlternatives
    : legacyAlternativeNames;
  const alternatives = recommendedAlternativeRecords.map((alternative) =>
    typeof alternative === "string" ? alternative : alternative.name
  );
  const alternativeCoverage = strictReviewed
    ? alternativeCoverageFor({
        componentId: known.id,
        graph: recommendationGraph,
        alternatives: graphAlternatives
      })
    : {
        status: "not_applicable",
        reviewed_alternative_count: 0,
        reason: "Alternatives are available only for strictly reviewed intelligence records.",
        graph_version: recommendationGraph.version || null
      };
  const agentDecisionContract = buildAgentDecisionContract({
    decision,
    risks,
    known,
    input,
    safeInstallPlan,
    alternatives
  });
  const agentActions = buildAgentActions({ decision, risks, safeInstallPlan, alternatives, known, input });

  return {
    schema_version: "0.1.0",
    schema_id: "https://agentsecuritylens.dev/schemas/agent-install-decision.schema.json",
    service: "AgentSecurityLens",
    result_type: "agent_install_decision",
    component: {
      known: Boolean(known),
      reviewed: Boolean(strictReviewed),
      strict_reviewed: Boolean(strictReviewed),
      curated_baseline: Boolean(curatedBaseline),
      cataloged: Boolean(candidate),
      intelligence_state: intelligenceState,
      id: known?.id || null,
      name: input.component_name || input.name || known?.name || null,
      type: input.component_type || input.type || known?.type || "unknown",
      source_url: input.source_url || known?.source_url || null,
      full_name: known?.aliases?.[1] || null,
      stars: known?.stars || null
    },
    decision,
    trust_score: trustScore,
    safety_assessment: safetyAssessment,
    score_breakdown: scoreBreakdown,
    risk_level: level,
    risk_signals: risks,
    required_user_confirmation: ["ask_user", "avoid"].includes(decision),
    safe_install_plan: safeInstallPlan,
    alternatives,
    recommended_alternatives: buildRecommendedAlternatives(recommendedAlternativeRecords, {
      type: componentType
    }),
    alternative_coverage: alternativeCoverage,
    next_action: nextActionFor(decision),
    one_step_action: buildOneStepAction({ decision, safeInstallPlan, alternatives, known }),
    agent_decision_contract: agentDecisionContract,
    agent_actions: agentActions,
    agent_instruction: buildAgentInstruction({ decision, risks, safeInstallPlan, alternatives, known }),
    intelligence_coverage: {
      state: intelligenceState,
      reviewed: Boolean(strictReviewed),
      strict_reviewed: Boolean(strictReviewed),
      curated_baseline: Boolean(curatedBaseline),
      cataloged: Boolean(candidate),
      monitored: intelligenceState === "monitored",
      source: strictReviewed
        ? "strict_reviewed_intelligence_database"
        : curatedBaseline
          ? "curated_baseline_database"
        : intelligenceState === "monitored"
          ? "monitored_catalog"
          : candidate
            ? "candidate_catalog"
            : "submitted_metadata_inference",
      confidence: strictReviewed
        ? "high"
        : curatedBaseline
          ? "medium"
          : intelligenceState === "monitored"
            ? "medium_high"
            : candidate
              ? "medium"
              : "low",
      disclosure: curatedBaseline
        ? "This is a curated launch baseline, not a completed independent ASL evidence review."
        : null,
      catalog: candidate?.catalog || null
    },
    unknown_component: known
      ? null
      : {
          should_submit: true,
          submission_required: true,
          reason: "No matching component intelligence record was found.",
          submit_tool: "submit_unknown_component",
          research_status_tool: "get_research_status",
          retry_policy:
            "Do not retry automatic installation until ASL publishes an intelligence record or the user explicitly approves a restricted install."
        },
    resolution
  };
}
