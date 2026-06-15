const EXPOSURE_POINTS = {
  "remote-code-install": 24,
  "shell-execution": 20,
  "subprocess-spawn": 20,
  "dynamic-code-execution": 20,
  "credential-access": 18,
  "filesystem-write": 15,
  "filesystem-read": 10,
  "browser-access": 15,
  "database-access": 15,
  "data-retention": 12,
  "network-access": 12,
  "external-api": 12,
  webhook: 12,
  "remote-mcp-endpoint": 12,
  "background-execution": 10,
  "scheduled-trigger": 10,
  "workflow-automation": 10,
  "multi-agent-delegation": 10,
  "tool-chaining": 8,
  "third-party-integration": 8,
  "hidden-instruction": 18,
  "override-rules": 18,
  "ignore-safety": 18,
  "prompt-injection-pattern": 14,
  "repository-write": 14,
  "message-write": 10,
  "unknown-source": 12,
  "catalog-unreviewed": 8
};

const CONTROL_POINTS = {
  "sandbox-or-container": 18,
  "workspace-scope": 14,
  "read-only-mode": 14,
  "command-confirmation": 14,
  "scoped-credentials": 14,
  "network-allowlist": 10,
  "isolated-browser-profile": 10,
  "audit-logging": 8,
  "pinned-version": 8,
  "automatic-update-disabled": 6,
  "destructive-action-confirmation": 8
};

const CRITICAL_INCIDENT_TYPES = new Set([
  "credential_theft",
  "hidden_data_exfiltration",
  "confirmed_malicious_code",
  "unauthorized_remote_execution",
  "backdoor"
]);

const HARD_FAILURE_SIGNALS = new Set([
  "credential-theft-confirmed",
  "hidden-data-exfiltration",
  "malicious-code-confirmed",
  "token-passthrough",
  "known-critical-vulnerability-unmitigated",
  "version-mismatch",
  "destructive-action-without-confirmation"
]);

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function evidenceGroups(known = {}) {
  const evidence = Array.isArray(known?.evidence) ? known.evidence : [];
  return new Map(evidence.map((item) => [item.kind, item]));
}

function sourceRecords(known = {}) {
  return evidenceGroups(known).get("source")?.records || [];
}

function technicalScan(known = {}) {
  return evidenceGroups(known).get("technical_scan")?.scan || null;
}

function qualityReview(known = {}) {
  return evidenceGroups(known).get("independent_quality_review")?.review || null;
}

function hasCommunityEvidence(records = []) {
  return records.some((item) => [
    "github_issues_api",
    "github_issues_page",
    "hacker_news_search_api",
    "community_report",
    "community_signal",
    "security_advisory"
  ].includes(item.source_type));
}

function controlsFrom(input = {}, known = null) {
  const explicit = [
    ...(input.applied_controls || []),
    ...(input.security_controls || []),
    ...(known?.verified_controls || [])
  ];
  if (input.exact_version || input.commit_sha || input.package_digest) explicit.push("pinned-version");
  if (input.sandboxed === true || input.containerized === true) explicit.push("sandbox-or-container");
  if (input.read_only === true) explicit.push("read-only-mode");
  if (input.user_confirmation_for_commands === true) explicit.push("command-confirmation");
  if (input.scoped_credentials === true) explicit.push("scoped-credentials");
  if (input.network_allowlist === true) explicit.push("network-allowlist");
  if (input.isolated_browser_profile === true) explicit.push("isolated-browser-profile");
  return unique(explicit);
}

function contextWeightForSignal(signal, known = null) {
  const contexts = known?.signal_contexts?.[signal] || [];
  if (!contexts.length) return 1;
  const weights = {
    runtime_exposure: 1,
    install_exposure: 0.85,
    supply_chain_exposure: 0.35,
    documented_optional_capability: 0.45,
    repository_maintenance_activity: 0
  };
  return Math.max(...contexts.map((context) => weights[context] ?? 1));
}

function exposureDimension(risks = [], known = null) {
  const applied = unique(risks).map((signal) => ({
    signal,
    context_weight: contextWeightForSignal(signal, known),
    points: Math.round((EXPOSURE_POINTS[signal] || 6) * contextWeightForSignal(signal, known))
  }));
  return {
    score: clamp(applied.reduce((sum, item) => sum + item.points, 0)),
    applied
  };
}

function controlDimension(input = {}, known = null) {
  const controls = controlsFrom(input, known);
  const applied = controls.map((control) => ({
    control,
    points: CONTROL_POINTS[control] || 4
  }));
  return {
    score: clamp(applied.reduce((sum, item) => sum + item.points, 0)),
    applied,
    verified_only: true
  };
}

function supplyChainDimension(input = {}, known = null) {
  const records = sourceRecords(known);
  const repository = records.find((item) => item.source_type === "github_repository_api")?.facts || {};
  const release = records.find((item) => item.source_type === "github_release_api")?.facts || {};
  const checks = [];
  const sourceUrl = input.source_url || known?.source_url || "";
  if (String(sourceUrl).startsWith("https://")) checks.push({ id: "canonical-https-source", points: 10 });
  if (repository.license) checks.push({ id: "license-disclosed", points: 10 });
  if (repository.pushed_at && Date.now() - Date.parse(repository.pushed_at) <= 90 * 86_400_000) {
    checks.push({ id: "recent-maintenance", points: 15 });
  }
  if (release.latest_release) checks.push({ id: "published-release", points: 15 });
  if (input.exact_version || input.commit_sha || input.package_digest) checks.push({ id: "install-artifact-pinned", points: 15 });
  if (Number(repository.stars || known?.stars || 0) >= 100) checks.push({ id: "community-adoption-auxiliary", points: 5 });
  if (known?.trust_signals?.includes("transparent-permissions")) checks.push({ id: "permissions-documented", points: 10 });
  if (known?.trust_signals?.includes("signed-release-or-pinned-version")) checks.push({ id: "signed-or-pinned-release", points: 10 });
  if (known?.intelligence_state === "strict_reviewed") checks.push({ id: "asl-source-review-complete", points: 10 });
  if (repository.archived) checks.push({ id: "repository-archived", points: -20 });
  return { score: clamp(checks.reduce((sum, item) => sum + item.points, 0)), applied: checks };
}

function evidenceDimension(known = null) {
  if (!known) return { score: 0, checks: [], review_level: "L0_discovered" };
  const groups = evidenceGroups(known);
  const records = sourceRecords(known);
  const scan = technicalScan(known);
  const quality = qualityReview(known);
  const checks = [];
  if (known.source_url) checks.push({ id: "canonical-source", points: 15 });
  if (records.some((item) => item.source_type === "github_release_api" && item.facts?.latest_release)) {
    checks.push({ id: "version-or-release-evidence", points: 10 });
  }
  if (records.length >= 2) checks.push({ id: "multiple-structured-sources", points: 15 });
  if (Number(scan?.files_scanned || 0) >= 1) checks.push({ id: "file-level-static-scan", points: 20 });
  if (hasCommunityEvidence(records)) checks.push({ id: "community-source-check", points: 10 });
  if (quality?.passed === true) checks.push({ id: "independent-recalculation", points: 15 });
  if ((scan?.findings || []).some((item) => item.evidence?.sha)) checks.push({ id: "reproducible-source-reference", points: 5 });
  if (known.runtime_validation?.passed === true) checks.push({ id: "runtime-sandbox-validation", points: 10 });
  const score = clamp(checks.reduce((sum, item) => sum + item.points, 0));
  const reviewLevel =
    known.continuous_monitoring?.active === true && score >= 90
      ? "L4_continuously_monitored"
      : known.runtime_validation?.passed === true && score >= 85
        ? "L3_runtime_validated"
        : known.intelligence_state === "strict_reviewed" && score >= 80
          ? "L2_evidence_reviewed"
          : score >= 30
            ? "L1_auto_assessed"
            : "L0_discovered";
  return { score, checks, review_level: reviewLevel };
}

function incidentDimension(input = {}, known = null) {
  const incidents = [...(known?.incidents || []), ...(input.incidents || [])];
  const scored = incidents.map((incident) => {
    const reliability = Number(incident.evidence_reliability ?? incident.source_reliability ?? 0.5);
    const severity = Number(incident.severity_score ?? 50);
    const resolutionFactor = incident.resolution === "fixed" ? 0.25 : incident.resolution === "mitigated" ? 0.5 : 1;
    const corroboration = incident.status === "confirmed" ? 1 : incident.status === "corroborated" ? 0.8 : 0.45;
    return {
      id: incident.id || incident.claim_type || "incident",
      claim_type: incident.claim_type || "unknown",
      score: clamp(severity * reliability * resolutionFactor * corroboration),
      confirmed_critical:
        incident.status === "confirmed" &&
        incident.resolution !== "fixed" &&
        CRITICAL_INCIDENT_TYPES.has(incident.claim_type)
    };
  });
  return {
    score: scored.length ? Math.max(...scored.map((item) => item.score)) : 0,
    incidents: scored,
    auxiliary_sentiment_only: true
  };
}

function hardFailures(risks = [], incident = {}) {
  const failures = unique(risks.filter((signal) => HARD_FAILURE_SIGNALS.has(signal)));
  if (incident.incidents?.some((item) => item.confirmed_critical)) failures.push("confirmed-critical-security-incident");
  return unique(failures);
}

function requiredControls(risks = []) {
  const controls = [];
  if (risks.some((risk) => ["shell-execution", "subprocess-spawn", "remote-code-install", "dynamic-code-execution"].includes(risk))) {
    controls.push("sandbox-or-container", "command-confirmation", "pinned-version");
  }
  if (risks.includes("filesystem-write")) controls.push("workspace-scope");
  if (risks.includes("credential-access")) controls.push("scoped-credentials");
  if (risks.includes("network-access")) controls.push("network-allowlist");
  if (risks.includes("browser-access")) controls.push("isolated-browser-profile");
  if (risks.some((risk) => ["background-execution", "scheduled-trigger", "workflow-automation"].includes(risk))) {
    controls.push("audit-logging", "automatic-update-disabled");
  }
  return unique(controls);
}

export function evaluateComponentSafety({ risks = [], known = null, input = {} }) {
  const exposure = exposureDimension(risks, known);
  const controls = controlDimension(input, known);
  const supplyChain = supplyChainDimension(input, known);
  const evidence = evidenceDimension(known);
  const incident = incidentDimension(input, known);
  const failures = hardFailures(risks, incident);
  const required = requiredControls(risks);
  const appliedControlIds = new Set(controls.applied.map((item) => item.control));
  const missingControls = required.filter((control) => !appliedControlIds.has(control));
  const residualRisk = clamp(exposure.score * (1 - controls.score / 125) + incident.score * 0.45);
  const contextSafetyScore = clamp(
    (100 - exposure.score) * 0.25 +
    controls.score * 0.3 +
    supplyChain.score * 0.25 +
    evidence.score * 0.2 -
    incident.score * 0.35
  );

  let decision = "allow_with_restrictions";
  if (failures.length || incident.score >= 80) decision = "avoid";
  else if (known?.intelligence_state !== "strict_reviewed" || evidence.score < 80) decision = "ask_user";
  else if (residualRisk >= 55 || (exposure.score >= 60 && controls.score < 50)) decision = "ask_user";
  else if (residualRisk <= 20 && controls.score >= 60 && supplyChain.score >= 65) decision = "allow";

  return {
    standard: "ASL Agent Component Safety Standard",
    model_version: "asl-safety-standard@0.2.0",
    context_safety_score: contextSafetyScore,
    dimensions: {
      exposure_risk: exposure,
      control_strength: controls,
      supply_chain_trust: supplyChain,
      evidence_confidence: evidence,
      incident_risk: incident
    },
    residual_risk: residualRisk,
    decision,
    hard_failures: failures,
    required_controls: required,
    missing_controls: missingControls,
    scoring_disclosure:
      "The score evaluates this installation context. Powerful capabilities are exposure, not proof of malicious intent."
  };
}
