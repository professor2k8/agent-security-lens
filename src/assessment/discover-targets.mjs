import { readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const IGNORED_DIRS = new Set([
  ".git",
  ".agentsecuritylens",
  ".agentsecuritylens-test",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".cache",
  "__pycache__"
]);

const MARKERS = [
  { profile: "openclaw-like", file: "openclaw.json", reason: "OpenClaw config" },
  { profile: "openclaw-like", file: ".openclaw/openclaw.json", reason: "OpenClaw local config" },
  { profile: "openclaw-like", file: "SOUL.md", reason: "OpenClaw instruction file" },
  { profile: "openclaw-like", file: "TOOLS.md", reason: "OpenClaw tool manifest" },
  { profile: "openclaw-like", file: "workspace/skills", reason: "OpenClaw skills workspace" },
  { profile: "hermes-like", file: ".hermes", reason: "Hermes config directory" },
  { profile: "hermes-like", file: ".hermes/config.json", reason: "Hermes JSON config" },
  { profile: "hermes-like", file: ".hermes/config.yaml", reason: "Hermes YAML config" },
  { profile: "hermes-like", file: "optional-mcps", reason: "Hermes optional MCPs" },
  { profile: "hermes-like", file: "optional-skills", reason: "Hermes optional skills" },
  { profile: "hermes-like", file: "gateway", reason: "Hermes gateway" },
  { profile: "hermes-like", file: "cron", reason: "Hermes scheduled runs" },
  { profile: "skill-runtime", file: "SKILL.md", reason: "Agent skill definition" },
  { profile: "mcp-server", file: "mcp.json", reason: "MCP manifest" }
];

async function listEntries(dir) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function hasPath(root, path) {
  const parts = path.split("/");
  let entries = await listEntries(root);
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const entry = entries.find((item) => item.name.toLowerCase() === part.toLowerCase());
    if (!entry) return false;
    if (index === parts.length - 1) return true;
    if (!entry.isDirectory()) return false;
    entries = await listEntries(join(root, entry.name));
  }
  return false;
}

function parentTargetForMarker(dir, markerFile) {
  if (markerFile === "SKILL.md") return dir;
  return dir;
}

function confidenceFor(signals) {
  if (signals.length >= 3) return 0.9;
  if (signals.length === 2) return 0.78;
  return 0.62;
}

function labelFor(path, workspaceRoot) {
  const rel = relative(workspaceRoot, path).replaceAll("\\", "/");
  return rel || ".";
}

export async function discoverTargets({ workspacePath, maxDepth = 4 }) {
  const workspaceRoot = resolve(workspacePath);
  const candidates = new Map();

  async function inspectDir(dir, depth) {
    const matched = [];
    for (const marker of MARKERS) {
      if (await hasPath(dir, marker.file)) {
        matched.push(marker);
      }
    }

    if (matched.length) {
      const targetPath = parentTargetForMarker(dir, matched[0].file);
      const existing = candidates.get(targetPath) || {
        path: targetPath,
        label: labelFor(targetPath, workspaceRoot),
        profile: matched[0].profile,
        signals: []
      };
      for (const marker of matched) {
        existing.signals.push({
          profile: marker.profile,
          marker: marker.file,
          reason: marker.reason
        });
      }
      const byProfile = new Map();
      for (const signal of existing.signals) {
        byProfile.set(signal.profile, (byProfile.get(signal.profile) || 0) + 1);
      }
      existing.profile = [...byProfile.entries()].sort((a, b) => b[1] - a[1])[0][0];
      existing.confidence = confidenceFor(existing.signals);
      candidates.set(targetPath, existing);
    }

    if (depth >= maxDepth) return;
    for (const entry of await listEntries(dir)) {
      if (!entry.isDirectory() || IGNORED_DIRS.has(entry.name)) continue;
      await inspectDir(join(dir, entry.name), depth + 1);
    }
  }

  await inspectDir(workspaceRoot, 0);
  const targets = [...candidates.values()].sort((a, b) => a.label.localeCompare(b.label));
  const deduped = targets.filter((target) => {
    return !targets.some((other) => {
      if (other === target || other.profile !== target.profile) return false;
      const rel = relative(other.path, target.path);
      return rel && !rel.startsWith("..") && rel !== "." && !rel.includes(":");
    });
  });
  return {
    workspace_path: workspaceRoot,
    targets: deduped
  };
}
