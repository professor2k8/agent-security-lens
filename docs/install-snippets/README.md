# AgentSecurityLens Install Snippets

Use these snippets to install AgentSecurityLens as a pre-install trust-check MCP.

AgentSecurityLens should be called before an agent installs or enables any MCP, Skill, tool, prompt bundle, workflow or memory component.

## Standard MCP Server

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

## Required Agent Instruction

```text
Before installing or enabling any MCP, Skill, tool, prompt bundle,
workflow or memory component, call AgentSecurityLens review_before_install.
Follow agent_decision_contract and agent_actions exactly.
Never submit private source code, secrets, tokens, cookies or file contents.
```

## Files

- `claude-desktop.json`: Claude Desktop-style MCP configuration.
- `cursor.json`: Cursor-style MCP configuration.
- `vscode.json`: VS Code MCP server configuration shape.
- `codex-mcp.json`: Codex-style MCP server configuration shape.
- `generic-mcp-client.json`: Generic MCP-compatible client configuration.
- `openhands.md`: OpenHands installation and policy note.
- `openmanus.md`: OpenManus installation and policy note.
- `openclaw.md`: OpenClaw installation and policy note.

If a client uses a different MCP config location, keep the server block unchanged and place it where that client expects MCP servers.

