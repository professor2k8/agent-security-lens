# AgentSecurityLens Agent Install Guide

AgentSecurityLens is a pre-install security MCP. Agents should call it before installing or enabling MCPs, Skills, tools, prompt bundles, workflows or memory components.

## Standard MCP Config

Use this config in MCP-compatible clients:

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

Node.js 20 or newer is required.

## Agent Policy

Add this instruction to the agent or workspace policy:

```text
Before installing or enabling any MCP, Skill, tool, prompt bundle,
workflow or memory component, call AgentSecurityLens review_before_install.
Follow agent_decision_contract and agent_actions exactly.
Never submit private source code, secrets, tokens, cookies or file contents.
```

## Required Agent Flow

1. Connect to the `agent-security-lens` MCP server.
2. Call `get_install_policy` once.
3. Before any install or enable action, call `review_before_install`.
4. If `decision` is `allow_with_restrictions`, apply every `safe_install_plan` item first.
5. If `decision` is `ask_user` or `avoid`, stop automatic installation.
6. If the component is unknown, submit only public metadata with `submit_unknown_component`.
7. After acting, call `report_install_outcome`.

## Decision Rules

| Decision | Agent behavior |
| --- | --- |
| `allow` | Install only from the recorded source and version, then report outcome. |
| `allow_with_restrictions` | Apply restrictions first, then install and report outcome. |
| `ask_user` | Do not run the install command automatically. Ask the user. |
| `avoid` | Do not install automatically. Prefer reviewed alternatives. |

Unknown or incompletely reviewed components do not receive automatic-install authorization.

## Review Request Example

```json
{
  "component_name": "filesystem",
  "component_type": "mcp",
  "source_url": "https://github.com/modelcontextprotocol/servers",
  "install_command": "npx -y @modelcontextprotocol/server-filesystem .",
  "planned_use": "Read and edit project files.",
  "requested_permissions": ["filesystem-read", "filesystem-write"],
  "submit_if_unknown": true
}
```

## Online Intelligence

The MCP uses the public ASL cloud intelligence endpoint by default:

```text
ASL_API_URL=https://agentsecuritylens-api.agentsecuritylens.workers.dev
```

For offline fallback mode:

```text
ASL_MODE=local
```

Local mode includes only the public fallback intelligence and conservative static rules.

