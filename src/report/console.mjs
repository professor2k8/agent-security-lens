export function renderConsole(result) {
  const lines = [];
  lines.push("AgentSecurityLens Security Assessment");
  lines.push("");
  lines.push(`Assessment ID: ${result.assessment.id}`);
  lines.push(`Target: ${result.assessment.target_path}`);
  lines.push(`Trust Score: ${result.summary.trust_score}/100`);
  lines.push(`Findings: ${result.summary.total_findings}`);
  lines.push(`Categories: ${Object.entries(result.summary.by_category).map(([key, value]) => `${key}=${value}`).join(", ") || "none"}`);
  lines.push(`Profile Coverage Avg: ${result.summary.profile_coverage_average}`);
  lines.push("");
  lines.push("Profiles:");
  for (const profile of result.profiles) {
    lines.push(`- ${profile.id}@${profile.version} (${profile.status}, confidence ${profile.confidence})`);
  }
  lines.push("");
  lines.push("Rule Packs:");
  for (const pack of result.rule_packs) {
    lines.push(`- ${pack.id}@${pack.version} (${pack.rule_count} rules)`);
  }
  lines.push("");
  if (result.recommendation_packs?.length) {
    lines.push("Recommendation Packs:");
    for (const pack of result.recommendation_packs) {
      lines.push(`- ${pack.id}@${pack.version} (${pack.status}, ${pack.recommendation_count} recommendations)`);
    }
    lines.push("");
  }
  if (result.trust_signal_taxonomies?.length) {
    lines.push("Trust Signal Taxonomies:");
    for (const taxonomy of result.trust_signal_taxonomies) {
      lines.push(`- ${taxonomy.id}@${taxonomy.version} (${taxonomy.status}, ${taxonomy.signal_count} signals)`);
    }
    lines.push("");
  }
  lines.push("Profile Selection:");
  lines.push(`- Mode: ${result.lineage.profile_selection.mode}`);
  lines.push(`- Selected: ${result.lineage.profile_selection.selected_profile}`);
  if (result.lineage.profile_selection.detection_signals.length) {
    const signals = result.lineage.profile_selection.detection_signals
      .map((signal) => `${signal.type}:${signal.value}`)
      .join(", ");
    lines.push(`- Signals: ${signals}`);
  }
  lines.push("");

  if (result.risk_domains?.length) {
    lines.push("Risk Domains:");
    for (const domain of result.risk_domains) {
      lines.push(`- ${domain.title}: ${domain.count} finding(s), highest=${domain.highest_severity}`);
    }
    lines.push("");
  }

  if (result.trust_signals?.length) {
    const summary = result.summary.trust_signal_summary;
    lines.push("Trust Signals:");
    lines.push(`- Total: ${summary.total}, net weight=${summary.net_weight}`);
    lines.push(
      `- Direction: ${Object.entries(summary.by_direction).map(([key, value]) => `${key}=${value}`).join(", ")}`
    );
    for (const signal of result.trust_signals.slice(0, 5)) {
      lines.push(`- ${signal.title} (${signal.signal_id}, ${signal.weight}) at ${signal.evidence.path}:${signal.evidence.line}`);
    }
    lines.push("");
  }

  if (result.findings.length === 0) {
    lines.push("No risk findings detected by the current rule packs.");
    lines.push("Known limitation: this does not prove the agent environment is safe.");
    return lines.join("\n");
  }

  lines.push("Detailed Findings:");
  for (const finding of result.findings) {
    lines.push("");
    lines.push(`[${finding.severity.toUpperCase()}] ${finding.title}`);
    lines.push(`Category: ${finding.category}`);
    lines.push(`Evidence: ${finding.evidence.path}:${finding.evidence.line}`);
    if (finding.evidence_items.length > 1) {
      lines.push(`Additional evidence: ${finding.evidence_items.length - 1} more match(es) in this file`);
    }
    lines.push(`Why it matters: ${finding.why_it_matters}`);
    if (finding.recommended_actions.length) {
      lines.push(`Actions: ${finding.recommended_actions.join("; ")}`);
    }
    if (finding.recommended_alternatives.length) {
      lines.push(`Alternatives: ${finding.recommended_alternatives.join("; ")}`);
    }
    if (finding.migration_instruction) {
      lines.push(`Migration: ${finding.migration_instruction}`);
    }
    if (finding.recommendations?.length) {
      const top = finding.recommendations[0];
      lines.push(`Top recommendation: ${top.title} (${top.id}, confidence ${top.confidence})`);
      if (top.one_step_commands?.length) {
        lines.push(`One-step instruction: ${top.one_step_commands[0].command}`);
      }
    }
  }

  return lines.join("\n");
}
