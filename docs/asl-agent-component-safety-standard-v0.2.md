# ASL Agent Component Safety Standard v0.2

## Evaluation Subject

ASL does not permanently label an MCP, Skill, or Agent as safe or unsafe. It evaluates whether a specific component, version, and source are acceptable under a specific permission, control, and deployment context.

Capability exposure is not proof of malicious intent. Only evidence-backed hard failures or confirmed unresolved critical incidents directly produce `avoid`.

## Dimensions

| Dimension | Range | Meaning |
|---|---:|---|
| Exposure Risk | 0-100 | Potential impact of shell, file, credential, browser, network, and background capabilities |
| Control Strength | 0-100 | Verified isolation, confirmation, least-privilege, and audit controls |
| Supply Chain Trust | 0-100 | Source identity, version pinning, releases, maintenance, and publication transparency |
| Evidence Confidence | 0-100 | Evidence completeness, reliability, reproducibility, and independent review |
| Incident Risk | 0-100 | Severity of deduplicated, version-scoped, and corroborated security incidents |

Recommended mitigations do not increase Control Strength until they are applied and verifiable.

## Exposure Contexts

| Context | Weight | Meaning |
|---|---:|---|
| `runtime_exposure` | 1.00 | Executable source or runtime configuration on the default path |
| `install_exposure` | 0.85 | Installation, setup, build, or deployment behavior |
| `documented_optional_capability` | 0.45 | Capability shown in documentation, examples, tests, or optional Skills |
| `supply_chain_exposure` | 0.35 | Dependency, manifest, and publication metadata exposure |
| `repository_maintenance_activity` | 0.00 | Repository CI and release activity, not installed-component runtime permission |

Maintenance findings remain archived evidence for review and historical comparison.

## Decisions

- `allow`: reviewed evidence, low residual risk, sufficient supply-chain trust, and required controls verified.
- `allow_with_restrictions`: evidence is sufficient, but returned controls must be applied first.
- `ask_user`: evidence is incomplete, required controls are missing, or the proposed context remains highly exposed.
- `avoid`: a hard failure or confirmed unresolved critical incident blocks installation.

Static L2 review alone never authorizes unrestricted installation.

## Evidence Levels

- `L0 Discovered`
- `L1 Auto Assessed`
- `L2 Evidence Reviewed`
- `L3 Runtime Validated`
- `L4 Continuously Monitored`

## Community and Incident Evidence

Positive sentiment does not prove safety, and ordinary negative comments do not directly reduce the score. ASL checks component identity, affected version, technical support, source independence, and maintainer response. Sentiment is auxiliary; credible incidents enter Incident Risk.

## Reproducibility

Every reviewed record must disclose its component and source, scoring model version, decision, required controls, evidence level, review time, known limitations, and historical versions. Superseded records are archived rather than erased.
