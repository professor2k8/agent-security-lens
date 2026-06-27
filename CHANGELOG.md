# Changelog

## 0.1.10

- Return agent-executable mitigation paths when no reviewed component alternative is available, without presenting mitigations as reviewed replacements.
- Improve npm and MCP Registry discovery copy for `mcp security`, `trust check`, and `safe install` searches.
- Keep `alternatives` limited to real component replacements while exposing mitigation counts in the agent decision contract.

## 0.1.9

- Add `agent-security-lens doctor` so agents can check cloud reachability, local fallback coverage and queued telemetry before first use.
- Fix cloud review normalization so valid ASL Cloud install decisions are accepted instead of falling back to local mode.
- Resolve common GitHub monorepo URLs and install commands, including `modelcontextprotocol/servers/.../filesystem`, to canonical known components.
- Canonicalize cloud component display names on the client so agent-facing output uses stable component names.
- Improve operations metrics by tracking explicit npm daily ranges instead of relying only on cached point windows.

## 0.1.8

- Add copy-ready first-call examples for 10 common MCP install decisions.
- Link first-call examples from README and `llms.txt` so agents can discover concrete ASL review commands.

## 0.1.7

- Add root `AGENTS.md` so autonomous coding agents can discover ASL's pre-install policy directly from the repository.
- Strengthen the README and `llms.txt` with a compact machine-action checklist for agent tool installation flows.

## 0.1.6

- Route `agent-security-lens review ...` to the quick pre-install decision CLI while preserving MCP stdio mode for normal agent configuration.
- Prefer the package main command in quick-start docs so agents can call the same package they install as an MCP.

## 0.1.5

- Add `asl-review` and `agent-security-lens-review` quick decision commands for pre-install checks without configuring an MCP client first.
- Add first-screen quick review instructions for agents and developers.
- Record quick-review usage events so npm installs can convert into measurable ASL decision calls.

## 0.1.4

- Add copy-ready MCP install snippets for Claude Desktop, Cursor, VS Code, Codex-style clients and generic MCP clients.
- Add OpenHands, OpenManus and OpenClaw pre-install safety snippets.
- Add reusable Agent pre-install policy for `AGENTS.md`, `CLAUDE.md`, Cursor rules and workspace instructions.
- Link Agent exposure assets from README and `llms.txt`.
- Add private exposure targets and daily exposure brief generation for operations.

## 0.1.3

- Improve agent-first installation copy in the README.
- Add a dedicated Agent install guide with required pre-install review flow.
- Expand npm discovery keywords for safe install, trust check, MCP security and Skill security searches.
- Update the MCP Registry manifest description for safe-install and trust-check discovery.

## 0.1.2

- Add public security intelligence index for agents and package readers.
- Add public MCP, Skill, and Agent Framework decision reports.
- Add machine-readable public install-decision export.
- Add GitHub OIDC workflow for publishing to the MCP Registry.
- Keep internal operations, private sync scripts, queues, and team telemetry out of the public release.

## 0.1.1

- Connect the MCP to the live AgentSecurityLens Cloud Intelligence API by default.
- Fix D1 strict-review selection when superseded assessment history is retained.
- Normalize D1 evidence into the public Evidence Schema.
- Align production release readiness with D1, R2 and operational KV storage.

## 0.1.0

First public release.

### Added

- Agent-facing MCP for pre-install component decisions
- Machine-readable decision contract and ordered Agent actions
- MCP, Skill, tool, workflow, prompt bundle, and memory component review
- Unknown-component submission and research-status workflow
- Install outcome and decision feedback
- Evidence-backed restrictions and alternative recommendations
- Online intelligence lookup with local fallback
- Versioned security evaluation standard
- Strict-reviewed, curated-baseline, and automatic-assessment intelligence states
