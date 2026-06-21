# Agent Framework Install Decisions v0.1

A public ASL decision view for autonomous agent frameworks and agent runtimes.

This public index is designed for autonomous agents. It exposes install decisions and evidence summaries, not ASL internal research operations.

## Coverage

- Published components in this report: 14
- strict_reviewed: 8
- curated_baseline: 6
- allow_with_restrictions: 7
- ask_user: 4
- avoid: 3

Unknown or automatic-only components should not receive automatic-install authorization.

### astron-agent

- Type: `agent-framework`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `80`
- Agent action: Install only after applying every safe-install control.
- Risk signals: mcp-tool-surface
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Grant only the permissions required for the current task and remove unused capabilities.

### oh-my-agent

- Type: `agent-framework`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `62`
- Agent action: Install only after applying every safe-install control.
- Risk signals: network-access, credential-access
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Allowlist required remote endpoints and deny undeclared destinations.
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Grant only the permissions required for the current task and remove unused capabilities.

### Chorus

- Type: `agent-framework`
- State: `strict_reviewed`
- Decision: `ask_user`
- Trust score: `53`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: license-undisclosed, remote-code-install
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Confirm usage rights and provenance before redistribution or enterprise deployment.
  - Pin the exact package version, release or commit and install only inside an isolated environment.
  - Grant only the permissions required for the current task and remove unused capabilities.

### cua

- Type: `agent-framework`
- State: `strict_reviewed`
- Decision: `ask_user`
- Trust score: `52`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: credential-access, background-execution, network-access
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Disable unattended triggers until audit logging and an explicit stop control are configured.
  - Allowlist required remote endpoints and deny undeclared destinations.

### Agent-S

- Type: `agent-framework`
- State: `strict_reviewed`
- Decision: `ask_user`
- Trust score: `40`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: credential-access, filesystem-write, background-execution, browser-access
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Restrict write access to a dedicated workspace or temporary copy.
  - Disable unattended triggers until audit logging and an explicit stop control are configured.

### OpenAgentsControl

- Type: `agent-framework`
- State: `strict_reviewed`
- Decision: `avoid`
- Trust score: `34`
- Agent action: Do not install automatically; choose an alternative or request explicit human approval.
- Risk signals: credential-access, dynamic-code-execution, filesystem-write, network-access
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Disable dynamic code paths when possible and isolate execution from host credentials.
  - Restrict write access to a dedicated workspace or temporary copy.

### lamda

- Type: `agent-framework`
- State: `strict_reviewed`
- Decision: `avoid`
- Trust score: `14`
- Agent action: Do not install automatically; choose an alternative or request explicit human approval.
- Risk signals: credential-access, filesystem-write, dynamic-code-execution, shell-execution, background-execution
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Restrict write access to a dedicated workspace or temporary copy.
  - Disable dynamic code paths when possible and isolate execution from host credentials.

### CowAgent

- Type: `agent-framework`
- State: `strict_reviewed`
- Decision: `avoid`
- Trust score: `6`
- Agent action: Do not install automatically; choose an alternative or request explicit human approval.
- Risk signals: credential-access, browser-access, shell-execution, background-execution, filesystem-write
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Use an isolated browser profile without personal cookies or sessions.
  - Require confirmation for every command and run inside an isolated environment.

### LangGraph

- Type: `agent-framework`
- State: `curated_baseline`
- Decision: `allow_with_restrictions`
- Trust score: `73`
- Agent action: Install only after applying every safe-install control.
- Risk signals: agent-orchestration, tool-chaining, network-access
- Evidence: baseline
- Safe-install controls:
  - Review graph nodes that can call tools or external APIs.
  - Apply allowlists to write-capable tools.
  - Log state transitions for autonomous workflows.

### AutoGen

- Type: `agent-framework`
- State: `curated_baseline`
- Decision: `allow_with_restrictions`
- Trust score: `72`
- Agent action: Install only after applying every safe-install control.
- Risk signals: network-access, code-execution, multi-agent-delegation
- Evidence: baseline
- Safe-install controls:
  - Restrict code execution tools until the task requires them.
  - Use scoped API keys and avoid sharing personal credentials across agents.
  - Log delegated tool calls for later review.

### CrewAI

- Type: `agent-framework`
- State: `curated_baseline`
- Decision: `allow_with_restrictions`
- Trust score: `70`
- Agent action: Install only after applying every safe-install control.
- Risk signals: network-access, multi-agent-delegation, tool-chaining
- Evidence: baseline
- Safe-install controls:
  - Review tool assignments before running autonomous crews.
  - Use least-privilege API credentials per task.
  - Disable write-capable tools unless needed.

### Dify

- Type: `agent-framework`
- State: `curated_baseline`
- Decision: `allow_with_restrictions`
- Trust score: `67`
- Agent action: Install only after applying every safe-install control.
- Risk signals: workflow-automation, network-access, plugin-access, credential-access
- Evidence: baseline
- Safe-install controls:
  - Review connected tools, plugins and workflow triggers before autonomous execution.
  - Use scoped credentials for each integration.
  - Separate test workflows from production workflows.

### OpenHands

- Type: `agent-framework`
- State: `curated_baseline`
- Decision: `allow_with_restrictions`
- Trust score: `63`
- Agent action: Install only after applying every safe-install control.
- Risk signals: shell-execution, filesystem-write, network-access, credential-access
- Evidence: baseline
- Safe-install controls:
  - Run inside a dedicated workspace or container.
  - Do not mount personal home directories by default.
  - Use scoped credentials and review tool permissions before autonomous execution.

### OpenManus

- Type: `agent-framework`
- State: `curated_baseline`
- Decision: `ask_user`
- Trust score: `56`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: shell-execution, network-access, browser-access, unknown-source
- Evidence: baseline
- Safe-install controls:
  - Require user confirmation before enabling autonomous tool execution.
  - Use a separate browser profile and isolated workspace.
  - Record exact source URL and version before installation.
