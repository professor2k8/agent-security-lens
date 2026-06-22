# OpenManus Install Snippet

Add AgentSecurityLens as a pre-install trust check MCP:

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

Recommended agent instruction:

```text
Before installing any MCP, Skill or tool, call AgentSecurityLens review_before_install. Follow agent_decision_contract exactly. Never submit private source code, secrets, tokens, cookies or file contents.
```

