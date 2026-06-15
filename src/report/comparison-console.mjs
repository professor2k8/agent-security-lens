export function renderComparisonConsole(result) {
  const lines = [];
  const delta = result.score.delta >= 0 ? `+${result.score.delta}` : String(result.score.delta);

  lines.push("AgentSecurityLens Assessment Comparison");
  lines.push("");
  lines.push(`Previous: ${result.comparison.previous_assessment_id}`);
  lines.push(`Current: ${result.comparison.current_assessment_id}`);
  lines.push(`Trust Score: ${result.score.previous} -> ${result.score.current} (${delta})`);
  lines.push(
    `Findings: ${result.finding_counts.previous} -> ${result.finding_counts.current} ` +
      `(added ${result.finding_counts.added}, resolved ${result.finding_counts.resolved}, persistent ${result.finding_counts.persistent})`
  );
  lines.push("");

  if (result.profiles.added.length || result.profiles.removed.length || result.profiles.changed.length) {
    lines.push("Profile Changes:");
    for (const item of result.profiles.added) lines.push(`- Added ${item.id}@${item.version}`);
    for (const item of result.profiles.removed) lines.push(`- Removed ${item.id}@${item.version}`);
    for (const item of result.profiles.changed) {
      lines.push(`- Changed ${item.id}: ${item.previous_version} -> ${item.current_version}`);
    }
    lines.push("");
  }

  if (result.rule_packs.added.length || result.rule_packs.removed.length || result.rule_packs.changed.length) {
    lines.push("Rule Pack Changes:");
    for (const item of result.rule_packs.added) lines.push(`- Added ${item.id}@${item.version}`);
    for (const item of result.rule_packs.removed) lines.push(`- Removed ${item.id}@${item.version}`);
    for (const item of result.rule_packs.changed) {
      lines.push(`- Changed ${item.id}: ${item.previous_version} -> ${item.current_version}`);
    }
    lines.push("");
  }

  if (
    result.recommendation_packs.added.length ||
    result.recommendation_packs.removed.length ||
    result.recommendation_packs.changed.length
  ) {
    lines.push("Recommendation Pack Changes:");
    for (const item of result.recommendation_packs.added) lines.push(`- Added ${item.id}@${item.version}`);
    for (const item of result.recommendation_packs.removed) lines.push(`- Removed ${item.id}@${item.version}`);
    for (const item of result.recommendation_packs.changed) {
      lines.push(`- Changed ${item.id}: ${item.previous_version} -> ${item.current_version}`);
    }
    lines.push("");
  }

  if (result.findings.added.length) {
    lines.push("Added Findings:");
    for (const finding of result.findings.added) {
      lines.push(`- [${finding.severity}] ${finding.title} (${finding.evidence.path}:${finding.evidence.line})`);
    }
    lines.push("");
  }

  if (result.findings.resolved.length) {
    lines.push("Resolved Findings:");
    for (const finding of result.findings.resolved) {
      lines.push(`- [${finding.severity}] ${finding.title} (${finding.evidence.path}:${finding.evidence.line})`);
    }
    lines.push("");
  }

  if (!result.findings.added.length && !result.findings.resolved.length) {
    lines.push("No finding delta detected.");
  }

  return lines.join("\n");
}
