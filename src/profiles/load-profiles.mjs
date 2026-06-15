import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

const PROFILE_FILES = [
  "profiles/generic-agent/profile.json",
  "profiles/openclaw-like/profile.json",
  "profiles/hermes-like/profile.json",
  "profiles/mcp-server/profile.json",
  "profiles/skill-runtime/profile.json"
];

export async function loadProfiles() {
  const profiles = [];
  for (const file of PROFILE_FILES) {
    const content = await readFile(join(ROOT, file), "utf8");
    profiles.push(JSON.parse(content));
  }
  return profiles;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function detectProfile(root) {
  const lowerRoot = root.toLowerCase();
  if (lowerRoot.includes(".openclaw")) {
    return {
      profileId: "openclaw-like",
      signals: [{ type: "path-name", value: ".openclaw" }]
    };
  }
  if (lowerRoot.includes(".hermes")) {
    return {
      profileId: "hermes-like",
      signals: [{ type: "path-name", value: ".hermes" }]
    };
  }

  const hermesHints = [
    ".hermes",
    ".hermes/config.json",
    ".hermes/config.yaml",
    "optional-mcps",
    "optional-skills",
    "gateway",
    "cron",
    "memory",
    "skills/openclaw-imports"
  ];
  for (const hint of hermesHints) {
    if (await exists(join(root, hint))) {
      return {
        profileId: "hermes-like",
        signals: [{ type: "path-exists", value: hint }]
      };
    }
  }

  const openclawHints = [
    "openclaw.json",
    ".openclaw/openclaw.json",
    "SOUL.md",
    "TOOLS.md",
    "workspace/skills"
  ];
  for (const hint of openclawHints) {
    if (await exists(join(root, hint))) {
      return {
        profileId: "openclaw-like",
        signals: [{ type: "path-exists", value: hint }]
      };
    }
  }

  return {
    profileId: "generic-agent",
    signals: []
  };
}

function expandProfile(profiles, profileId) {
  const profile = profiles.find((item) => item.id === profileId);
  if (!profile) {
    throw new Error(`Unknown profile: ${profileId}`);
  }
  const expanded = [profile];
  for (const parentId of profile.extends || []) {
    const parent = profiles.find((item) => item.id === parentId);
    if (parent && !expanded.some((item) => item.id === parent.id)) {
      expanded.push(parent);
    }
  }
  return expanded;
}

export async function resolveProfileSelection({ profiles, requestedProfile, root }) {
  if (requestedProfile) {
    return {
      mode: "requested",
      requested_profile: requestedProfile,
      selected_profile: requestedProfile,
      detection_signals: [{ type: "cli-profile", value: requestedProfile }],
      profiles: expandProfile(profiles, requestedProfile)
    };
  }

  const detected = await detectProfile(root);
  return {
    mode: "autodetected",
    requested_profile: null,
    selected_profile: detected.profileId,
    detection_signals: detected.signals,
    profiles: expandProfile(profiles, detected.profileId)
  };
}

export async function selectProfiles({ profiles, requestedProfile, root }) {
  const selection = await resolveProfileSelection({ profiles, requestedProfile, root });
  return selection.profiles;
}
