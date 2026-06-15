function evidenceOverlaps(a, b) {
  const pathsA = new Set((a.evidence_items || [a.evidence]).map((item) => item.path));
  const pathsB = new Set((b.evidence_items || [b.evidence]).map((item) => item.path));
  for (const path of pathsA) {
    if (pathsB.has(path)) return true;
  }
  return false;
}

function dedupeByRulePath(findings) {
  const byKey = new Map();
  for (const finding of findings) {
    const key = `${finding.rule_id}:${finding.evidence.path}`;
    if (!byKey.has(key)) {
      byKey.set(key, finding);
      continue;
    }
    const existing = byKey.get(key);
    const seen = new Set((existing.evidence_items || [existing.evidence]).map((item) => `${item.path}:${item.preview}`));
    for (const item of finding.evidence_items || [finding.evidence]) {
      const itemKey = `${item.path}:${item.preview}`;
      if (seen.has(itemKey)) continue;
      existing.evidence_items.push(item);
      seen.add(itemKey);
    }
  }
  return Array.from(byKey.values());
}

export function applySupersedes(findings) {
  const filtered = findings.filter((candidate) => {
    return !findings.some((other) => {
      if (other === candidate) return false;
      if (!other.supersedes?.includes(candidate.rule_id)) return false;
      return evidenceOverlaps(other, candidate);
    });
  });
  return dedupeByRulePath(filtered);
}
