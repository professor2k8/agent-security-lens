export function renderMarkdown(result) {
  const lines = [];
  lines.push("# AgentSecurityLens Security Assessment");
  lines.push("");
  lines.push(`- Assessment ID: \`${result.assessment.id}\``);
  lines.push(`- Target: \`${result.assessment.target_path}\``);
  lines.push(`- Trust Score: **${result.summary.trust_score}/100**`);
  lines.push(`- Findings: **${result.summary.total_findings}**`);
  lines.push(`- Categories: ${Object.entries(result.summary.by_category).map(([key, value]) => `\`${key}\`: ${value}`).join(", ") || "none"}`);
  lines.push(`- Profile Coverage Avg: **${result.summary.profile_coverage_average}**`);
  lines.push("");
  lines.push("## Profiles");
  lines.push("");
  for (const profile of result.profiles) {
    lines.push(`- \`${profile.id}@${profile.version}\` (${profile.status}, confidence ${profile.confidence})`);
  }
  lines.push("");
  lines.push("## Rule Packs");
  lines.push("");
  for (const pack of result.rule_packs) {
    lines.push(`- \`${pack.id}@${pack.version}\` (${pack.rule_count} rules)`);
  }
  lines.push("");
  if (result.recommendation_packs?.length) {
    lines.push("## Recommendation Packs");
    lines.push("");
    for (const pack of result.recommendation_packs) {
      lines.push(`- \`${pack.id}@${pack.version}\` (${pack.status}, ${pack.recommendation_count} recommendations)`);
    }
    lines.push("");
  }
  if (result.trust_signal_taxonomies?.length) {
    lines.push("## Trust Signal Taxonomies");
    lines.push("");
    for (const taxonomy of result.trust_signal_taxonomies) {
      lines.push(`- \`${taxonomy.id}@${taxonomy.version}\` (${taxonomy.status}, ${taxonomy.signal_count} signals)`);
    }
    lines.push("");
  }
  lines.push("## Profile Selection");
  lines.push("");
  lines.push(`- Mode: \`${result.lineage.profile_selection.mode}\``);
  lines.push(`- Selected: \`${result.lineage.profile_selection.selected_profile}\``);
  if (result.lineage.profile_selection.detection_signals.length) {
    const signals = result.lineage.profile_selection.detection_signals
      .map((signal) => `\`${signal.type}:${signal.value}\``)
      .join(", ");
    lines.push(`- Signals: ${signals}`);
  }
  lines.push("");

  if (result.risk_domains?.length) {
    lines.push("## Risk Domains");
    lines.push("");
    for (const domain of result.risk_domains) {
      lines.push(`- **${domain.title}**: ${domain.count} finding(s), highest \`${domain.highest_severity}\``);
    }
    lines.push("");
  }

  if (result.trust_signals?.length) {
    const summary = result.summary.trust_signal_summary;
    lines.push("## Trust Signals");
    lines.push("");
    lines.push(`- Total: **${summary.total}**`);
    lines.push(`- Net weight: **${summary.net_weight}**`);
    lines.push(
      `- Direction: ${Object.entries(summary.by_direction).map(([key, value]) => `\`${key}\`: ${value}`).join(", ")}`
    );
    lines.push("");
    for (const signal of result.trust_signals.slice(0, 5)) {
      lines.push(`- \`${signal.signal_id}\` ${signal.title} (${signal.weight}) at \`${signal.evidence.path}:${signal.evidence.line}\``);
    }
    lines.push("");
  }

  lines.push("## Detailed Findings");
  lines.push("");

  if (result.findings.length === 0) {
    lines.push("No risk findings detected by the current rule packs.");
    lines.push("");
    lines.push("> Known limitation: this does not prove the agent environment is safe.");
    return lines.join("\n");
  }

  for (const finding of result.findings) {
    lines.push(`### ${finding.title}`);
    lines.push("");
    lines.push(`- Severity: \`${finding.severity}\``);
    lines.push(`- Category: \`${finding.category}\``);
    lines.push(`- Permissions: ${finding.permissions.map((item) => `\`${item}\``).join(", ") || "none"}`);
    lines.push(`- Evidence: \`${finding.evidence.path}:${finding.evidence.line}\``);
    if (finding.evidence_items.length > 1) {
      lines.push(`- Additional evidence: ${finding.evidence_items.length - 1} more match(es) in this file`);
    }
    lines.push("");
    lines.push("**Why it matters**");
    lines.push("");
    lines.push(finding.why_it_matters);
    lines.push("");
    if (finding.recommended_actions.length) {
      lines.push("**Recommended actions**");
      lines.push("");
      for (const action of finding.recommended_actions) lines.push(`- ${action}`);
      lines.push("");
    }
    if (finding.recommended_alternatives.length) {
      lines.push("**Recommended alternatives**");
      lines.push("");
      for (const alternative of finding.recommended_alternatives) lines.push(`- ${alternative}`);
      lines.push("");
    }
    if (finding.migration_instruction) {
      lines.push("**Copyable migration instruction**");
      lines.push("");
      lines.push("```txt");
      lines.push(finding.migration_instruction);
      lines.push("```");
      lines.push("");
    }
    if (finding.recommendations?.length) {
      const top = finding.recommendations[0];
      lines.push("**Top recommendation**");
      lines.push("");
      lines.push(`- \`${top.id}\`: ${top.title}`);
      lines.push(`- Type: \`${top.type}\`, confidence: \`${top.confidence}\``);
      if (top.one_step_commands?.length) {
        lines.push("");
        lines.push("**One-step instruction**");
        lines.push("");
        lines.push("```txt");
        lines.push(top.one_step_commands[0].command);
        lines.push("```");
      }
      if (top.rollback_note) {
        lines.push("");
        lines.push(`Rollback note: ${top.rollback_note}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}
