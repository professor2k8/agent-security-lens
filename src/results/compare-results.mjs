import { readFile } from "node:fs/promises";

function findingKey(finding) {
  return [
    finding.rule_id,
    finding.evidence?.path || "unknown-path",
    finding.evidence?.preview || finding.title
  ].join("|");
}

function summarizeFinding(finding) {
  return {
    id: finding.id,
    rule_id: finding.rule_id,
    title: finding.title,
    severity: finding.severity,
    category: finding.category,
    evidence: finding.evidence
  };
}

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function diffVersionedItems(previousItems, currentItems) {
  const previous = indexById(previousItems);
  const current = indexById(currentItems);
  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, item] of current.entries()) {
    const oldItem = previous.get(id);
    if (!oldItem) {
      added.push(item);
    } else if (oldItem.version !== item.version) {
      changed.push({ id, previous_version: oldItem.version, current_version: item.version });
    }
  }

  for (const [id, item] of previous.entries()) {
    if (!current.has(id)) removed.push(item);
  }

  return { added, removed, changed };
}

export function compareAssessmentResults(previous, current) {
  const previousFindings = new Map(previous.findings.map((finding) => [findingKey(finding), finding]));
  const currentFindings = new Map(current.findings.map((finding) => [findingKey(finding), finding]));
  const added = [];
  const resolved = [];
  const persistent = [];

  for (const [key, finding] of currentFindings.entries()) {
    if (previousFindings.has(key)) {
      persistent.push(summarizeFinding(finding));
    } else {
      added.push(summarizeFinding(finding));
    }
  }

  for (const [key, finding] of previousFindings.entries()) {
    if (!currentFindings.has(key)) {
      resolved.push(summarizeFinding(finding));
    }
  }

  return {
    schema_version: "0.1.0",
    comparison: {
      previous_assessment_id: previous.assessment.id,
      current_assessment_id: current.assessment.id,
      previous_completed_at: previous.assessment.completed_at,
      current_completed_at: current.assessment.completed_at,
      compared_at: new Date().toISOString()
    },
    score: {
      previous: previous.summary.trust_score,
      current: current.summary.trust_score,
      delta: current.summary.trust_score - previous.summary.trust_score
    },
    finding_counts: {
      previous: previous.findings.length,
      current: current.findings.length,
      added: added.length,
      resolved: resolved.length,
      persistent: persistent.length
    },
    profiles: diffVersionedItems(previous.profiles, current.profiles),
    rule_packs: diffVersionedItems(previous.rule_packs, current.rule_packs),
    recommendation_packs: diffVersionedItems(previous.recommendation_packs || [], current.recommendation_packs || []),
    findings: {
      added,
      resolved,
      persistent
    }
  };
}

export async function compareAssessmentFiles(previousPath, currentPath) {
  const previous = JSON.parse(await readFile(previousPath, "utf8"));
  const current = JSON.parse(await readFile(currentPath, "utf8"));
  return compareAssessmentResults(previous, current);
}
