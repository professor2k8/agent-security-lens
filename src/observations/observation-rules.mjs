const OBSERVATION_RULES = {
  "mcp-stdio-process": {
    id: "obs-mcp-stdio-process",
    title: "MCP stdio process configured",
    category: "execution-risk",
    severity: "high",
    confidence: 0.9,
    permissions: ["subprocess-spawn", "mcp-tool-access"],
    why_it_matters: "This MCP configuration starts a local process. The agent can delegate tool calls to that process.",
    recommended_actions: [
      "Verify the MCP command and package source.",
      "Pin package versions instead of using moving tags."
    ],
    recommended_alternatives: [
      "Use a verified local MCP server with a pinned version."
    ],
    migration_instruction: "Replace moving MCP commands with pinned package versions and disable unused MCP servers.",
    supersedes: ["mcp-stdio-process-server"]
  },
  "mcp-remote-endpoint": {
    id: "obs-mcp-remote-endpoint",
    title: "Remote MCP endpoint configured",
    category: "remote-access-risk",
    severity: "medium",
    confidence: 0.86,
    permissions: ["network-access", "external-endpoint", "mcp-tool-access"],
    why_it_matters: "Remote MCP endpoints can provide tools or receive delegated tool calls from the agent environment.",
    recommended_actions: [
      "Verify the remote MCP owner.",
      "Restrict exposed tools if filtering is supported."
    ],
    recommended_alternatives: [
      "Use a local pinned MCP server for sensitive workspaces."
    ],
    migration_instruction: "Disable remote MCP endpoints for sensitive workspaces or replace them with local pinned MCP servers.",
    supersedes: ["mcp-remote-endpoint"]
  },
  "mcp-filesystem-capability": {
    id: "obs-mcp-filesystem-capability",
    title: "Filesystem MCP capability configured",
    category: "data-exposure-risk",
    severity: "high",
    confidence: 0.88,
    permissions: ["filesystem-read", "filesystem-write", "mcp-tool-access"],
    why_it_matters: "Filesystem MCP tools can allow the agent to read or modify local files through tool calls.",
    recommended_actions: [
      "Limit filesystem access to a dedicated workspace.",
      "Disable write-capable filesystem tools unless required."
    ],
    recommended_alternatives: [
      "Use read-only filesystem tooling for inspection tasks."
    ],
    migration_instruction: "Replace broad filesystem MCP access with workspace-scoped or read-only access.",
    supersedes: ["mcp-filesystem-write"]
  },
  "remote-trigger-config": {
    id: "obs-remote-trigger-config",
    title: "Remote trigger channel configured",
    category: "remote-access-risk",
    severity: "medium",
    confidence: 0.84,
    permissions: ["remote-trigger", "credential-access"],
    why_it_matters: "Remote trigger channels can start or influence agent sessions. Policies and allowlists determine who can reach the agent.",
    recommended_actions: [
      "Set explicit allowlists for remote users or groups.",
      "Disable remote channels for sensitive workspaces."
    ],
    recommended_alternatives: [
      "Use local-only mode for sensitive workflows."
    ],
    migration_instruction: "Set explicit allowFrom values and disable open group triggers.",
    supersedes: ["openclaw-remote-channel-policy", "hermes-gateway-trigger"]
  },
  "scheduled-agent-execution": {
    id: "obs-scheduled-agent-execution",
    title: "Scheduled agent execution configured",
    category: "persistence-automation-risk",
    severity: "medium",
    confidence: 0.84,
    permissions: ["scheduled-execution"],
    why_it_matters: "Scheduled tasks can start agent behavior later, when the user is not actively reviewing each action.",
    recommended_actions: [
      "Review scheduled task prompts and allowed tools.",
      "Disable unused scheduled tasks."
    ],
    recommended_alternatives: [
      "Use manual run mode for sensitive workflows."
    ],
    migration_instruction: "Disable scheduled execution until task prompts and tool permissions are reviewed.",
    supersedes: ["openclaw-scheduled-task"]
  },
  "credential-reference": {
    id: "obs-credential-reference",
    title: "Credential reference in structured config",
    category: "data-exposure-risk",
    severity: "medium",
    confidence: 0.82,
    permissions: ["credential-access", "env-read"],
    why_it_matters: "Structured config references credentials that may be inherited by tools, skills or MCP servers.",
    recommended_actions: [
      "Use scoped credentials for agent environments.",
      "Remove unused secrets before running the agent."
    ],
    recommended_alternatives: [
      "Use a dedicated low-privilege token for this agent."
    ],
    migration_instruction: "Move high-privilege secrets out of the agent environment and use scoped replacement tokens.",
    supersedes: ["core-env-reference"]
  }
};

function previewValue(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value).slice(0, 240);
}

export function findingsFromObservations({ observations, profileIds }) {
  const seen = new Set();
  const findings = [];

  for (const observation of observations) {
    const rule = OBSERVATION_RULES[observation.type];
    const key = `${rule.id}:${observation.path}:${observation.json_path}`;
    if (seen.has(key)) continue;
    seen.add(key);

    findings.push({
      id: `${rule.id}:${observation.path}:${observation.json_path}`,
      rule_id: rule.id,
      title: rule.title,
      category: rule.category,
      severity: rule.severity,
      confidence: rule.confidence,
      permissions: rule.permissions,
      profile_ids: profileIds,
      why_it_matters: rule.why_it_matters,
      recommended_actions: rule.recommended_actions,
      recommended_alternatives: rule.recommended_alternatives,
      migration_instruction: rule.migration_instruction,
      supersedes: rule.supersedes || [],
      evidence: {
        path: observation.path,
        line: observation.line || 1,
        preview: `${observation.json_path}: ${previewValue(observation.value)}`
      },
      evidence_items: [
        {
          path: observation.path,
          line: observation.line || 1,
          preview: `${observation.json_path}: ${previewValue(observation.value)}`
        }
      ]
    });
  }

  return findings;
}
