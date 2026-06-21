# Top MCP Security Signals v0.1

A public ASL decision view for MCP servers and MCP-like tools that autonomous agents may install.

This public index is designed for autonomous agents. It exposes install decisions and evidence summaries, not ASL internal research operations.

## Coverage

- Published components in this report: 19
- strict_reviewed: 12
- curated_baseline: 7
- allow_with_restrictions: 8
- ask_user: 8
- avoid: 3

Unknown or automatic-only components should not receive automatic-install authorization.

### GitLab MCP Server

- Type: `mcp`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `69`
- Agent action: Install only after applying every safe-install control.
- Risk signals: background-execution, credential-access
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Disable unattended triggers until audit logging and an explicit stop control are configured.
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Grant only the permissions required for the current task and remove unused capabilities.

### mcp-suno

- Type: `mcp`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `60`
- Agent action: Install only after applying every safe-install control.
- Risk signals: remote-code-install
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Pin the exact package version, release or commit and install only inside an isolated environment.
  - Grant only the permissions required for the current task and remove unused capabilities.

### Midjourney

- Type: `mcp`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `60`
- Agent action: Install only after applying every safe-install control.
- Risk signals: remote-code-install
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Pin the exact package version, release or commit and install only inside an isolated environment.
  - Grant only the permissions required for the current task and remove unused capabilities.

### mcp-nanobanana-pro

- Type: `mcp`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `60`
- Agent action: Install only after applying every safe-install control.
- Risk signals: remote-code-install
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Pin the exact package version, release or commit and install only inside an isolated environment.
  - Grant only the permissions required for the current task and remove unused capabilities.

### mcp-seedance

- Type: `mcp`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `60`
- Agent action: Install only after applying every safe-install control.
- Risk signals: remote-code-install
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Pin the exact package version, release or commit and install only inside an isolated environment.
  - Grant only the permissions required for the current task and remove unused capabilities.

### Arcadia Finance

- Type: `mcp`
- State: `strict_reviewed`
- Decision: `ask_user`
- Trust score: `56`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: credential-access, network-access
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Allowlist required remote endpoints and deny undeclared destinations.
  - Grant only the permissions required for the current task and remove unused capabilities.

### Synapse Layer Continuous Consciousness Infrastructure

- Type: `mcp`
- State: `strict_reviewed`
- Decision: `ask_user`
- Trust score: `47`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: credential-access, network-access, background-execution, mcp-tool-surface, remote-code-install
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Allowlist required remote endpoints and deny undeclared destinations.
  - Disable unattended triggers until audit logging and an explicit stop control are configured.

### Lune Research

- Type: `mcp`
- State: `strict_reviewed`
- Decision: `ask_user`
- Trust score: `44`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: credential-access, mcp-tool-surface, background-execution
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Disable unattended triggers until audit logging and an explicit stop control are configured.
  - Grant only the permissions required for the current task and remove unused capabilities.

### docspace

- Type: `mcp`
- State: `strict_reviewed`
- Decision: `ask_user`
- Trust score: `40`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: credential-access, network-access, mcp-tool-surface, background-execution
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Allowlist required remote endpoints and deny undeclared destinations.
  - Disable unattended triggers until audit logging and an explicit stop control are configured.

### QuantRisk

- Type: `mcp`
- State: `strict_reviewed`
- Decision: `avoid`
- Trust score: `34`
- Agent action: Do not install automatically; choose an alternative or request explicit human approval.
- Risk signals: network-access, dynamic-code-execution, credential-access
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Allowlist required remote endpoints and deny undeclared destinations.
  - Disable dynamic code paths when possible and isolate execution from host credentials.
  - Use a dedicated least-privilege credential with explicit scope and rotation.

### mcp

- Type: `mcp`
- State: `strict_reviewed`
- Decision: `avoid`
- Trust score: `18`
- Agent action: Do not install automatically; choose an alternative or request explicit human approval.
- Risk signals: credential-access, network-access, shell-execution, mcp-tool-surface, dynamic-code-execution
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Allowlist required remote endpoints and deny undeclared destinations.
  - Require confirmation for every command and run inside an isolated environment.

### Cathedral Persistent Memory for AI Agents

- Type: `mcp`
- State: `strict_reviewed`
- Decision: `avoid`
- Trust score: `16`
- Agent action: Do not install automatically; choose an alternative or request explicit human approval.
- Risk signals: remote-code-install, credential-access, prompt-injection-pattern, network-access
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Pin the exact package version, release or commit and install only inside an isolated environment.
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Review instruction precedence and require confirmation before tool actions caused by external content.

### filesystem

- Type: `mcp`
- State: `curated_baseline`
- Decision: `allow_with_restrictions`
- Trust score: `74`
- Agent action: Install only after applying every safe-install control.
- Risk signals: filesystem-read, filesystem-write, subprocess-spawn
- Evidence: baseline
- Safe-install controls:
  - Restrict filesystem scope to the current project directory.
  - Prefer read-only mode when the task only needs inspection.
  - Pin the package or executable version before enabling it.

### brave-search

- Type: `mcp`
- State: `curated_baseline`
- Decision: `allow_with_restrictions`
- Trust score: `69`
- Agent action: Install only after applying every safe-install control.
- Risk signals: network-access, external-api, credential-access
- Evidence: baseline
- Safe-install controls:
  - Use a scoped search API key.
  - Do not send private workspace content as search queries by default.
  - Log outbound query categories for later review.

### sqlite

- Type: `mcp`
- State: `curated_baseline`
- Decision: `allow_with_restrictions`
- Trust score: `66`
- Agent action: Install only after applying every safe-install control.
- Risk signals: filesystem-write, database-access, local-file-access
- Evidence: baseline
- Safe-install controls:
  - Use a copied database file for autonomous analysis.
  - Avoid write mode unless the task requires mutation.
  - Back up the database before enabling agent access.

### github

- Type: `mcp`
- State: `curated_baseline`
- Decision: `ask_user`
- Trust score: `68`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: network-access, credential-access, repository-write
- Evidence: baseline
- Safe-install controls:
  - Use a scoped token with the minimum repository permissions.
  - Prefer read-only repository permissions unless write access is required.
  - Do not pass personal high-privilege tokens to autonomous agents.

### slack

- Type: `mcp`
- State: `curated_baseline`
- Decision: `ask_user`
- Trust score: `59`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: network-access, credential-access, message-read, message-write
- Evidence: baseline
- Safe-install controls:
  - Use a workspace-scoped bot token with minimum channels.
  - Disable write actions until the user explicitly approves them.
  - Do not expose private channels by default.

### postgres

- Type: `mcp`
- State: `curated_baseline`
- Decision: `ask_user`
- Trust score: `57`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: database-access, credential-access, data-exposure-risk
- Evidence: baseline
- Safe-install controls:
  - Use a read-only database role unless write access is explicitly required.
  - Connect only to a task-specific database or replica.
  - Do not expose production credentials to autonomous agents.

### puppeteer-browser

- Type: `mcp`
- State: `curated_baseline`
- Decision: `ask_user`
- Trust score: `54`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: browser-access, network-access, credential-access, form-submission
- Evidence: baseline
- Safe-install controls:
  - Use a dedicated browser profile without personal cookies.
  - Require confirmation before form submission, checkout, transfer or login actions.
  - Block access to password managers and personal sessions.
