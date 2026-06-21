# Top Skill Security Signals v0.1

A public ASL decision view for agent Skills and plugin-like bundles.

This public index is designed for autonomous agents. It exposes install decisions and evidence summaries, not ASL internal research operations.

## Coverage

- Published components in this report: 11
- strict_reviewed: 10
- curated_baseline: 1
- allow_with_restrictions: 8
- ask_user: 3
- avoid: 0

Unknown or automatic-only components should not receive automatic-install authorization.

### azure-containerregistry-py

- Type: `skill`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `74`
- Agent action: Install only after applying every safe-install control.
- Risk signals: credential-access
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Grant only the permissions required for the current task and remove unused capabilities.

### skill-creator

- Type: `skill`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `68`
- Agent action: Install only after applying every safe-install control.
- Risk signals: license-undisclosed
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Confirm usage rights and provenance before redistribution or enterprise deployment.
  - Grant only the permissions required for the current task and remove unused capabilities.

### imagegen

- Type: `skill`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `68`
- Agent action: Install only after applying every safe-install control.
- Risk signals: license-undisclosed
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Confirm usage rights and provenance before redistribution or enterprise deployment.
  - Grant only the permissions required for the current task and remove unused capabilities.

### claude-api

- Type: `skill`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `64`
- Agent action: Install only after applying every safe-install control.
- Risk signals: license-undisclosed, background-execution
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Confirm usage rights and provenance before redistribution or enterprise deployment.
  - Disable unattended triggers until audit logging and an explicit stop control are configured.
  - Grant only the permissions required for the current task and remove unused capabilities.

### cli-creator

- Type: `skill`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `64`
- Agent action: Install only after applying every safe-install control.
- Risk signals: license-undisclosed, network-access
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Confirm usage rights and provenance before redistribution or enterprise deployment.
  - Allowlist required remote endpoints and deny undeclared destinations.
  - Grant only the permissions required for the current task and remove unused capabilities.

### cloudflare-deploy

- Type: `skill`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `64`
- Agent action: Install only after applying every safe-install control.
- Risk signals: license-undisclosed, background-execution
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Confirm usage rights and provenance before redistribution or enterprise deployment.
  - Disable unattended triggers until audit logging and an explicit stop control are configured.
  - Grant only the permissions required for the current task and remove unused capabilities.

### netlify-deploy

- Type: `skill`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `62`
- Agent action: Install only after applying every safe-install control.
- Risk signals: license-undisclosed, credential-access
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Confirm usage rights and provenance before redistribution or enterprise deployment.
  - Use a dedicated least-privilege credential with explicit scope and rotation.
  - Grant only the permissions required for the current task and remove unused capabilities.

### openai-docs

- Type: `skill`
- State: `strict_reviewed`
- Decision: `allow_with_restrictions`
- Trust score: `61`
- Agent action: Install only after applying every safe-install control.
- Risk signals: license-undisclosed, shell-execution
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Confirm usage rights and provenance before redistribution or enterprise deployment.
  - Require confirmation for every command and run inside an isolated environment.
  - Grant only the permissions required for the current task and remove unused capabilities.

### playwright-interactive

- Type: `skill`
- State: `strict_reviewed`
- Decision: `ask_user`
- Trust score: `51`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: license-undisclosed, browser-access, dynamic-code-execution
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Confirm usage rights and provenance before redistribution or enterprise deployment.
  - Use an isolated browser profile without personal cookies or sessions.
  - Disable dynamic code paths when possible and isolate execution from host credentials.

### render-deploy

- Type: `skill`
- State: `strict_reviewed`
- Decision: `ask_user`
- Trust score: `48`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: license-undisclosed, background-execution, remote-code-install
- Evidence: source, technical_scan, permission_and_risk_analysis, independent_quality_review, recommendation_review (4 records)
- Safe-install controls:
  - Confirm usage rights and provenance before redistribution or enterprise deployment.
  - Disable unattended triggers until audit logging and an explicit stop control are configured.
  - Pin the exact package version, release or commit and install only inside an isolated environment.

### browser-control

- Type: `skill`
- State: `curated_baseline`
- Decision: `ask_user`
- Trust score: `61`
- Agent action: Pause automatic installation and ask the user before enabling this component.
- Risk signals: browser-access, network-access, credential-exposure
- Evidence: baseline
- Safe-install controls:
  - Use a dedicated browser profile for autonomous agents.
  - Do not expose personal cookies or logged-in sessions by default.
  - Require user confirmation before submitting forms or transferring data.
