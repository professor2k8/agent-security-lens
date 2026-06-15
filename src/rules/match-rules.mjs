import { readFile } from "node:fs/promises";

function fileMatches(rule, relativePath) {
  const targets = rule.target_paths || ["**/*"];
  return targets.some((target) => {
    if (target === "**/*") return true;
    if (target.endsWith("/**")) return relativePath.startsWith(target.slice(0, -3));
    if (target.startsWith("**/")) return relativePath.endsWith(target.slice(3));
    if (target.includes("*")) {
      const regex = new RegExp(`^${target.replaceAll(".", "\\.").replaceAll("**", ".*").replaceAll("*", "[^/]*")}$`);
      return regex.test(relativePath);
    }
    return relativePath === target || relativePath.endsWith(`/${target}`);
  });
}

function createFinding({ rule, file, line, lineNumber, profileIds }) {
  return {
    id: `${rule.id}:${file.relative_path}`,
    rule_id: rule.id,
    title: rule.title,
    category: rule.category,
    severity: rule.severity,
    confidence: rule.confidence,
    permissions: rule.permissions || [],
    profile_ids: profileIds,
    why_it_matters: rule.why_it_matters,
    recommended_actions: rule.recommended_actions || [],
    recommended_alternatives: rule.recommended_alternatives || [],
    migration_instruction: rule.migration_instruction || "",
    supersedes: rule.supersedes || [],
    evidence: {
      path: file.relative_path,
      line: lineNumber,
      preview: line.trim().slice(0, 240)
    },
    evidence_items: [
      {
        path: file.relative_path,
        line: lineNumber,
        preview: line.trim().slice(0, 240)
      }
    ]
  };
}

function mergeFinding(existing, incoming) {
  const seen = new Set(existing.evidence_items.map((item) => `${item.path}:${item.line}`));
  for (const item of incoming.evidence_items) {
    const key = `${item.path}:${item.line}`;
    if (seen.has(key)) continue;
    existing.evidence_items.push(item);
    seen.add(key);
  }
  existing.evidence = existing.evidence_items[0];
  return existing;
}

export async function matchRules({ files, profiles, rulePacks }) {
  const findingsByKey = new Map();
  const profileIds = profiles.map((profile) => profile.id);

  for (const file of files) {
    const content = await readFile(file.path, "utf8");
    const lines = content.split(/\r?\n/);

    for (const pack of rulePacks) {
      for (const rule of pack.rules) {
        if (!fileMatches(rule, file.relative_path)) continue;

        const patterns = rule.patterns || [];
        let matchedForFile = false;
        for (let index = 0; index < lines.length; index += 1) {
          const line = lines[index];
          const matched = patterns.some((pattern) => new RegExp(pattern, "i").test(line));
          if (!matched) continue;
          const finding = createFinding({
            rule,
            file,
            line,
            lineNumber: index + 1,
            profileIds
          });
          const key = `${finding.rule_id}:${finding.evidence.path}`;
          if (findingsByKey.has(key)) {
            mergeFinding(findingsByKey.get(key), finding);
          } else {
            findingsByKey.set(key, finding);
          }
          matchedForFile = true;
          if (rule.match_scope === "file") break;
        }
        if (matchedForFile && rule.match_scope === "file") continue;
      }
    }
  }

  return Array.from(findingsByKey.values());
}
