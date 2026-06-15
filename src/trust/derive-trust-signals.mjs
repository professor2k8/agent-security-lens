function requiredPermissions(signal) {
  return (signal.evidence_required || [])
    .filter((item) => item.startsWith("permission:"))
    .map((item) => item.slice("permission:".length));
}

function signalApplies(signal, finding) {
  if (signal.source_type !== "static-analysis") return false;

  const permissions = requiredPermissions(signal);
  if (permissions.length && !permissions.some((permission) => finding.permissions.includes(permission))) return false;

  return permissions.length > 0;
}

function signalEvidence(finding) {
  return {
    finding_id: finding.id,
    rule_id: finding.rule_id,
    path: finding.evidence.path,
    line: finding.evidence.line,
    preview: finding.evidence.preview
  };
}

export function deriveTrustSignals({ findings, taxonomies }) {
  const signals = taxonomies.flatMap((taxonomy) => taxonomy.signals || []);
  const emitted = [];
  const seen = new Set();

  for (const finding of findings) {
    for (const signal of signals) {
      if (!signalApplies(signal, finding)) continue;

      const key = `${signal.id}:${finding.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      emitted.push({
        id: `${signal.id}:${finding.id}`,
        signal_id: signal.id,
        title: signal.title,
        direction: signal.direction,
        weight: signal.weight,
        source_type: signal.source_type,
        applies_to: signal.applies_to,
        description: signal.description,
        evidence: signalEvidence(finding)
      });
    }
  }

  return emitted;
}

export function summarizeTrustSignals(signals) {
  const byDirection = {};
  const bySource = {};
  let netWeight = 0;

  for (const signal of signals) {
    byDirection[signal.direction] = (byDirection[signal.direction] || 0) + 1;
    bySource[signal.source_type] = (bySource[signal.source_type] || 0) + 1;
    netWeight += signal.weight;
  }

  return {
    total: signals.length,
    by_direction: byDirection,
    by_source: bySource,
    net_weight: netWeight
  };
}
