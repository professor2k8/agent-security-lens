# OpenHands Install Snippet

Add AgentSecurityLens as an MCP server using the standard MCP server block:

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

Then add this workspace instruction:

```text
Before installing or enabling any MCP, Skill, plugin, tool, workflow or memory component, call AgentSecurityLens review_before_install. If the result is ask_user or avoid, do not run the install command automatically.
```

