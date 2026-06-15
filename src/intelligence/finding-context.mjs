export const EXPOSURE_CONTEXT_WEIGHTS = {
  runtime_exposure: 1,
  install_exposure: 0.85,
  supply_chain_exposure: 0.35,
  documented_optional_capability: 0.45,
  repository_maintenance_activity: 0
};

const MANIFEST_NAMES = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "pyproject.toml",
  "requirements.txt",
  "poetry.lock",
  "uv.lock",
  "server.json",
  "mcp.json",
  "mcp.yaml",
  "mcp.yml",
  "manifest.json"
]);

function normalizedPath(path = "") {
  return String(path).replaceAll("\\", "/").toLowerCase();
}

function fileName(path = "") {
  return normalizedPath(path).split("/").at(-1) || "";
}

function isDocumentation(path) {
  return /\.(?:md|mdx|rst|txt)$/i.test(path);
}

function isInstallPath(path) {
  return /(?:^|\/)(?:install|setup|bootstrap|entrypoint)(?:[._-]|\/|$)/i.test(path)
    || /(?:install|setup|bootstrap)\.(?:sh|ps1|py|js|mjs|cjs|ts)$/i.test(path);
}

function isMaintenancePath(path) {
  return /(?:^|\/)\.github\/(?:workflows|actions)\//i.test(path)
    || /(?:^|\/)(?:release|publish)(?:[._-]|\/)/i.test(path);
}

function actionableInstallLine(line = "") {
  return /\b(?:curl|wget|invoke-webrequest)\b[^\r\n|;]*(?:\||;).*\b(?:sh|bash|zsh|powershell|python|node)\b/i.test(line)
    || /\b(?:npx\s+-y|uvx|pipx\s+run|pip\s+install|npm\s+install|pnpm\s+add|yarn\s+add)\b/i.test(line);
}

export function classifyFindingContext({ path = "", line = "", ruleId = "", signal = "" } = {}) {
  const normalized = normalizedPath(path);
  const name = fileName(path);

  if (isMaintenancePath(normalized)) {
    return {
      context: "repository_maintenance_activity",
      weight: EXPOSURE_CONTEXT_WEIGHTS.repository_maintenance_activity,
      rationale: "The finding is in repository CI, release or publishing automation rather than installed component runtime."
    };
  }

  if (isInstallPath(normalized)) {
    return {
      context: "install_exposure",
      weight: EXPOSURE_CONTEXT_WEIGHTS.install_exposure,
      rationale: "The finding is in an installation, setup or bootstrap entrypoint."
    };
  }

  if (/(?:^|\/)(?:examples?|tests?|test|fixtures?|docs?\/scripts)\//i.test(normalized)
    || /(?:^|\/)\.github\/skills?\//i.test(normalized)) {
    return {
      context: "documented_optional_capability",
      weight: EXPOSURE_CONTEXT_WEIGHTS.documented_optional_capability,
      rationale: "The finding is in an example, test, fixture or optional bundled Skill rather than the default runtime path."
    };
  }

  if (MANIFEST_NAMES.has(name)) {
    const installSurface =
      signal === "remote-code-install"
      || /\b(?:runtimehint|bin|postinstall|preinstall|install)\b/i.test(line);
    return {
      context: installSurface ? "install_exposure" : "supply_chain_exposure",
      weight: installSurface
        ? EXPOSURE_CONTEXT_WEIGHTS.install_exposure
        : EXPOSURE_CONTEXT_WEIGHTS.supply_chain_exposure,
      rationale: installSurface
        ? "The manifest declares an installation or executable entrypoint."
        : "The finding is dependency or package metadata and does not by itself prove runtime access."
    };
  }

  if (isDocumentation(normalized)) {
    if (ruleId === "repo-instruction-override" || signal === "prompt-injection-pattern") {
      return {
        context: "runtime_exposure",
        weight: EXPOSURE_CONTEXT_WEIGHTS.runtime_exposure,
        rationale: "Instruction override text is consumed by an Agent at runtime."
      };
    }
    if (actionableInstallLine(line) || signal === "remote-code-install") {
      return {
        context: "install_exposure",
        weight: EXPOSURE_CONTEXT_WEIGHTS.install_exposure,
        rationale: "The documentation contains an actionable install command."
      };
    }
    return {
      context: "documented_optional_capability",
      weight: EXPOSURE_CONTEXT_WEIGHTS.documented_optional_capability,
      rationale: "The documentation declares a capability or example that may not be enabled in every run."
    };
  }

  if (/^(?:dockerfile|docker-compose\.ya?ml)$/i.test(name)) {
    return {
      context: "install_exposure",
      weight: EXPOSURE_CONTEXT_WEIGHTS.install_exposure,
      rationale: "The finding is part of the component build or deployment surface."
    };
  }

  return {
    context: "runtime_exposure",
    weight: EXPOSURE_CONTEXT_WEIGHTS.runtime_exposure,
    rationale: "The finding is in executable component source or runtime configuration."
  };
}

export function contextualizeFindings(findings = []) {
  return findings.map((finding) => {
    const classification = classifyFindingContext({
      path: finding.evidence?.path,
      line: finding.evidence?.preview,
      ruleId: finding.rule_id,
      signal: finding.risk_signal
    });
    return {
      ...finding,
      exposure_context: classification.context,
      context_weight: classification.weight,
      context_rationale: classification.rationale,
      effective_confidence: Number((Number(finding.confidence || 0) * classification.weight).toFixed(3))
    };
  });
}

export function summarizeFindingContexts(findings = []) {
  const contexts = {};
  const signalContexts = {};
  for (const finding of findings) {
    const context = finding.exposure_context || "runtime_exposure";
    contexts[context] ||= { finding_count: 0, signals: [] };
    contexts[context].finding_count += 1;
    contexts[context].signals.push(finding.risk_signal);
    signalContexts[finding.risk_signal] ||= [];
    signalContexts[finding.risk_signal].push(context);
  }
  for (const item of Object.values(contexts)) item.signals = [...new Set(item.signals)];
  for (const [signal, values] of Object.entries(signalContexts)) {
    signalContexts[signal] = [...new Set(values)];
  }
  const effectiveFindings = findings.filter((finding) =>
    !["repository_maintenance_activity", "supply_chain_exposure"].includes(finding.exposure_context)
  );
  return {
    contexts,
    signal_contexts: signalContexts,
    observed_signals: [...new Set(findings.map((item) => item.risk_signal))],
    effective_risk_signals: [...new Set(effectiveFindings.map((item) => item.risk_signal))],
    non_runtime_observations: [...new Set(
      findings
        .filter((finding) => ["repository_maintenance_activity", "supply_chain_exposure"].includes(finding.exposure_context))
        .map((item) => item.risk_signal)
    )]
  };
}
