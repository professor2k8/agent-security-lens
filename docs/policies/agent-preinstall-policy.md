# Agent Pre-Install Safety Policy

Copy this policy into `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, workspace instructions or any autonomous-agent system policy.

## Short Policy

```text
Before installing or enabling any MCP, Skill, plugin, tool, prompt bundle,
workflow or memory component, call AgentSecurityLens review_before_install.
Follow agent_decision_contract and agent_actions exactly.
Never submit private source code, secrets, tokens, cookies or file contents.
```

## Strict Policy

```text
You must use AgentSecurityLens as a pre-install trust check.

Before installing, enabling, importing or auto-configuring any MCP, Skill,
plugin, tool, prompt bundle, workflow, rule pack or memory component:

1. Call AgentSecurityLens get_install_policy once per session.
2. Call AgentSecurityLens review_before_install with public component metadata.
3. If decision is ask_user or avoid, stop automatic installation.
4. If decision is allow_with_restrictions, apply every safe_install_plan item before installation.
5. If the component is unknown, submit only public metadata with submit_unknown_component.
6. Never submit private source code, secrets, tokens, cookies, browser data, customer data or file contents.
7. After acting, call report_install_outcome.
```

## Minimal MCP Config

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

## Agent Decision Mapping

| ASL decision | Required agent behavior |
| --- | --- |
| `allow` | Install only from the recorded source/version and report outcome. |
| `allow_with_restrictions` | Apply every safe install step before installation. |
| `ask_user` | Do not run install command automatically. Ask the user. |
| `avoid` | Do not install automatically. Prefer reviewed alternatives. |

## Unknown Component Rule

Unknown or incompletely reviewed components are not automatic-install approved.

Agents may submit public metadata for review:

```json
{
  "component_name": "example-tool",
  "component_type": "mcp",
  "source_url": "https://github.com/example/example-tool",
  "install_command": "npx -y example-tool",
  "submit_if_unknown": true
}
```

Do not submit source code, local files, credentials, cookies, private prompts or customer data.

