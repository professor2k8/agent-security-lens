const DOMAIN_DEFINITIONS = [
  {
    id: "mcp",
    title: "MCP",
    match: (finding) => finding.permissions.includes("mcp-tool-access") || finding.rule_id.includes("mcp")
  },
  {
    id: "skills",
    title: "Skills",
    match: (finding) => finding.permissions.includes("skill-installation") || finding.rule_id.includes("skill")
  },
  {
    id: "remote-triggers",
    title: "Remote Triggers",
    match: (finding) => finding.permissions.includes("remote-trigger")
  },
  {
    id: "scheduler",
    title: "Scheduler",
    match: (finding) => finding.permissions.includes("scheduled-execution")
  },
  {
    id: "credentials",
    title: "Credentials",
    match: (finding) => finding.permissions.includes("credential-access") || finding.permissions.includes("env-read")
  },
  {
    id: "execution",
    title: "Execution",
    match: (finding) => finding.category === "execution-risk"
  },
  {
    id: "supply-chain",
    title: "Supply Chain",
    match: (finding) => finding.category === "supply-chain-risk"
  }
];

const severityRank = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1
};

function highestSeverity(findings) {
  return findings.reduce((highest, finding) => {
    if (!highest) return finding.severity;
    return severityRank[finding.severity] > severityRank[highest] ? finding.severity : highest;
  }, null);
}

export function groupByRiskDomain(findings) {
  const domains = [];
  const assigned = new Set();

  for (const definition of DOMAIN_DEFINITIONS) {
    const domainFindings = findings.filter((finding) => definition.match(finding));
    if (!domainFindings.length) continue;
    for (const finding of domainFindings) assigned.add(finding.id);
    domains.push({
      id: definition.id,
      title: definition.title,
      count: domainFindings.length,
      highest_severity: highestSeverity(domainFindings),
      findings: domainFindings.map((finding) => finding.id)
    });
  }

  const otherFindings = findings.filter((finding) => !assigned.has(finding.id));
  if (otherFindings.length) {
    domains.push({
      id: "other",
      title: "Other",
      count: otherFindings.length,
      highest_severity: highestSeverity(otherFindings),
      findings: otherFindings.map((finding) => finding.id)
    });
  }

  return domains;
}
