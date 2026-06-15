const severityWeights = {
  critical: 22,
  high: 12,
  medium: 5,
  low: 1,
  info: 0
};

function categoryMultiplier(category) {
  if (category === "execution-risk") return 1.15;
  if (category === "data-exposure-risk") return 1.1;
  if (category === "supply-chain-risk") return 1.05;
  return 1;
}

export function summarize(findings, profiles = []) {
  const bySeverity = {};
  const byCategory = {};

  for (const finding of findings) {
    bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
    byCategory[finding.category] = (byCategory[finding.category] || 0) + 1;
  }

  const rawPenalty = findings.reduce((total, finding) => {
    const base = severityWeights[finding.severity] || 0;
    const confidence = typeof finding.confidence === "number" ? finding.confidence : 0.7;
    return total + base * confidence * categoryMultiplier(finding.category);
  }, 0);

  const profileCoverageAverage = profiles.length
    ? profiles.reduce((total, profile) => total + (profile.coverage || 0), 0) / profiles.length
    : 0.5;
  const lowCoveragePenalty = profileCoverageAverage < 0.5 ? 6 : 0;
  const penalty = Math.round(rawPenalty + lowCoveragePenalty);

  const topFindings = findings
    .slice()
    .sort((a, b) => (severityWeights[b.severity] || 0) - (severityWeights[a.severity] || 0))
    .slice(0, 5)
    .map((finding) => ({
      title: finding.title,
      severity: finding.severity,
      category: finding.category,
      evidence: finding.evidence
    }));

  return {
    total_findings: findings.length,
    by_severity: bySeverity,
    by_category: byCategory,
    trust_score: Math.max(0, 100 - penalty),
    scoring_model: "simple-penalty@0.1.0",
    profile_coverage_average: Number(profileCoverageAverage.toFixed(2)),
    top_findings: topFindings
  };
}
