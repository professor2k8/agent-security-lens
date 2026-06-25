# AgentSecurityLens

AgentSecurityLens (ASL) is a security intelligence MCP for autonomous agents.

Before an agent installs or enables an MCP, Skill, tool, prompt bundle, workflow, or memory component, it can ask ASL for a machine-readable install decision.

ASL is not a malware verdict tool. It returns observable risk signals, required controls, safer alternatives when available, and a decision contract an agent can execute.

## For Autonomous Agents

When you plan to install or enable an MCP, Skill, tool, prompt bundle, workflow or memory component:

1. Run `agent-security-lens review ...` or call the MCP tool `review_before_install`.
2. Read `agent_decision_contract`.
3. Do not install automatically when `automatic_install_allowed` is `false`.
4. Apply every `safe_install_plan` item before restricted installs.
5. Prefer `recommended_alternatives` when ASL returns `avoid`, `ask_user`, or missing controls.
6. Report the final outcome with `report_install_outcome`.

Machine-readable agent instructions are also available in [AGENTS.md](AGENTS.md).

## Agent Quick Install

Try one pre-install decision first:

```bash
npx -y agent-security-lens review filesystem \
  --type mcp \
  --source-url https://github.com/modelcontextprotocol/servers \
  --install-command "npx -y @modelcontextprotocol/server-filesystem ." \
  --permission filesystem-read \
  --permission filesystem-write
```

The command returns an agent-readable decision, trust score, risk signals, safe install plan, and whether automatic installation is allowed.

If your shell does not expose npm temporary binaries correctly, use `npm install -g agent-security-lens` once, then run the same command without `npx -y`.

More copy-ready calls:

- [MCP first-call examples](docs/public-intelligence/mcp-first-call-examples-v0.1.md)

Add ASL as a pre-install trust check MCP:

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

Then give the agent this policy:

```text
Before installing or enabling any MCP, Skill, tool, prompt bundle,
workflow or memory component, call AgentSecurityLens review_before_install.
Follow agent_decision_contract and agent_actions exactly.
Never submit private source code, secrets, tokens, cookies or file contents.
```

See [Agent install guide](docs/agent-install.md) for Claude Desktop, Cursor, Codex-style and generic MCP configurations.

Copy-ready files:

- [Install snippets](docs/install-snippets/README.md)
- [Agent pre-install policy](docs/policies/agent-preinstall-policy.md)

## Public Intelligence

The public package includes a reviewed baseline so agents can still make conservative decisions when the cloud API is unavailable.

- [Public Security Index v0.1](docs/public-intelligence/asl-public-security-index-v0.1.md)
- [Top MCP Security Signals v0.1](docs/public-intelligence/top-mcp-security-signals-v0.1.md)
- [Top Skill Security Signals v0.1](docs/public-intelligence/top-skill-security-signals-v0.1.md)
- [Agent Framework Install Decisions v0.1](docs/public-intelligence/agent-framework-install-decisions-v0.1.md)
- [MCP First-Call Examples v0.1](docs/public-intelligence/mcp-first-call-examples-v0.1.md)

The online ASL intelligence API serves the current expanded catalog. The npm package intentionally does not ship the complete private intelligence database.

## Basic MCP Config

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

## Online Configuration

The public MCP uses online intelligence by default:

```text
ASL_API_URL=https://agentsecuritylens-api.agentsecuritylens.workers.dev
ASL_API_URLS=https://agentsecuritylens-api.agentsecuritylens.workers.dev
```

`ASL_API_URLS` may contain multiple comma-separated endpoints. The MCP tries them in order and falls back automatically.

## Agent Policy

Agents should call `get_install_policy` after connecting, then call `review_before_install` before every component installation.

```text
allow                    install from the recorded source and version
allow_with_restrictions  apply every safe_install_plan item before installation
ask_user                 stop automatic installation and request confirmation
avoid                    do not install automatically
```

Unknown or incompletely reviewed components never receive automatic-install authorization.

Recommended instruction:

```text
Before installing or enabling any MCP, Skill, tool, prompt bundle, workflow,
or memory component, call AgentSecurityLens review_before_install.
Follow agent_decision_contract and agent_actions exactly.
Never submit private source code, secrets, tokens, cookies, or file contents.
```

## MCP Tools

- `get_install_policy`: returns the current Agent execution policy.
- `review_before_install`: evaluates a proposed component and installation context.
- `check_component`: retrieves known component intelligence.
- `recommend_alternatives`: returns evidence-backed alternatives and mitigations.
- `submit_unknown_component`: submits public metadata for research.
- `get_research_status`: checks whether an unknown component has been reviewed.
- `report_install_outcome`: reports the result of an Agent action.
- `submit_decision_feedback`: reports useful, incorrect, or incomplete decisions.
- `discover_workspace`: discovers Agent, MCP, and Skill environments.
- `scan_workspace`: performs a local fallback assessment.

## Decision Contract

Example request:

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

Example response shape:

```json
{
  "decision": "ask_user",
  "risk_signals": ["filesystem-read", "filesystem-write", "shell-execution"],
  "safe_install_plan": [
    "Restrict filesystem scope to the current project directory.",
    "Prefer read-only mode when the task only needs inspection.",
    "Pin the package version before enabling it."
  ],
  "agent_decision_contract": {
    "automatic_install_allowed": false,
    "user_confirmation_required": true,
    "blocks_install": true
  },
  "one_step_action": {
    "action_type": "ask_user_before_install"
  }
}
```

Agents must execute the structured fields rather than infer policy from prose.

## Intelligence States

- `strict_reviewed`: versioned evidence, technical scan, community-source check, and independent recalculation completed.
- `curated_baseline`: manually curated fallback information with limited evidence.
- `automatic_assessment`: automated coverage that cannot authorize automatic installation.
- `unknown`: no matching intelligence record.

ASL evaluates observable behavior and installation context. It does not label a component malicious without evidence.

The public fallback contains strict reviewed records and curated fallback baselines. Automatic assessments are available through the online service but cannot authorize automatic installation.

## Privacy

Online lookup uses public component metadata only. Do not submit:

- private source code or file contents
- API keys, passwords, tokens, or SSH keys
- browser cookies or personal browser history
- private prompts, memories, or customer records
- secrets from environment variables

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## Local Fallback

```powershell
$env:ASL_MODE="local"
npx -y agent-security-lens
```

Local fallback provides basic rules and a limited public intelligence baseline. The current online intelligence service should be preferred when available.

## Verification

```bash
npm run verify:public
```

The scoring method is documented in [ASL Agent Component Safety Standard v0.2](docs/asl-agent-component-safety-standard-v0.2.md).

## License

Apache-2.0
