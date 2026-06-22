# OpenClaw Install Snippet

Add AgentSecurityLens as a safety check before OpenClaw enables Skills, MCPs or tools:

```json
{
  "mcpServers": {
    "agent-security-lens": {
      "command": "npx",
      "args": ["-y", "agent-security-lens"]
    }
  }
}
```

Recommended OpenClaw rule:

```text
Before enabling or importing any Skill, MCP, rule, tool, prompt bundle or memory component, call AgentSecurityLens review_before_install. Unknown components require user confirmation.
```

