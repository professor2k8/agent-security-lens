import { readFile } from "node:fs/promises";

function isJsonLike(path) {
  return path.endsWith(".json") || path.endsWith(".jsonc");
}

function makeObservation({ type, file, jsonPath, value, severityHint = "medium" }) {
  return {
    type,
    path: file.relative_path,
    json_path: jsonPath,
    line: file.resolve_json_line ? file.resolve_json_line(jsonPath) : 1,
    value,
    severity_hint: severityHint
  };
}

function pathSegments(jsonPath) {
  if (jsonPath === "$") return [];
  const normalized = jsonPath
    .replace(/^\$\./, "")
    .replace(/\[(\d+)\]/g, ".$1");
  return normalized.split(".").filter(Boolean);
}

function buildJsonLineIndex(content) {
  const index = new Map();
  const stack = [];
  const lines = content.split(/\r?\n/);

  index.set("$", 1);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const arrayItemMatch = line.match(/^\s*\{/);
    if (arrayItemMatch && stack.length) {
      const parentPath = ["$", ...stack.map((item) => item.key)].join(".");
      if (!index.has(`${parentPath}.0`)) {
        index.set(`${parentPath}.0`, i + 1);
      }
    }

    const keyMatch = line.match(/^\s*"([^"]+)"\s*:/);
    if (!keyMatch) continue;

    const indent = line.match(/^\s*/)[0].length;
    while (stack.length && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const key = keyMatch[1];
    const currentPath = ["$", ...stack.map((item) => item.key), key].join(".");
    index.set(currentPath, i + 1);

    const valuePart = line.slice(line.indexOf(":") + 1).trim();
    if (valuePart.startsWith("{") || valuePart.startsWith("[")) {
      stack.push({ key, indent });
    }

  }

  return index;
}

function findNearestLine(jsonLineIndex, jsonPath) {
  const segments = pathSegments(jsonPath);
  for (let end = segments.length; end >= 0; end -= 1) {
    const candidate = end === 0 ? "$" : `$.${segments.slice(0, end).join(".")}`;
    if (jsonLineIndex.has(candidate)) return jsonLineIndex.get(candidate);
  }
  return 1;
}

function walk(value, visitor, path = "$") {
  visitor(value, path);
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visitor, `${path}[${index}]`));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      walk(child, visitor, `${path}.${key}`);
    }
  }
}

function hasAnyKey(value, keys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return keys.some((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function extractMcpServerObservations(file, data, observations) {
  walk(data, (value, path) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;

    const lowerPath = path.toLowerCase();
    const isSpecificServer = lowerPath.includes(".servers.") || lowerPath.includes(".mcpservers.");

    if (hasAnyKey(value, ["command", "args"]) && lowerPath.includes("mcp") && isSpecificServer) {
      observations.push(makeObservation({
        type: "mcp-stdio-process",
        file,
        jsonPath: path,
        value,
        severityHint: "high"
      }));
    }

    const type = typeof value.type === "string" ? value.type.toLowerCase() : "";
    const url = typeof value.url === "string" ? value.url : "";
    if ((type.includes("sse") || type.includes("http") || /^https?:\/\//i.test(url)) && lowerPath.includes("mcp") && isSpecificServer) {
      observations.push(makeObservation({
        type: "mcp-remote-endpoint",
        file,
        jsonPath: path,
        value,
        severityHint: "medium"
      }));
    }

    const serialized = JSON.stringify(value).toLowerCase();
    if (lowerPath.includes("mcp") && isSpecificServer && serialized.includes("filesystem")) {
      observations.push(makeObservation({
        type: "mcp-filesystem-capability",
        file,
        jsonPath: path,
        value,
        severityHint: "high"
      }));
    }
  });
}

function extractRemoteTriggerObservations(file, data, observations) {
  walk(data, (value, path) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const lowerPath = path.toLowerCase();
    const serialized = JSON.stringify(value).toLowerCase();
    const hasChannelKey = ["telegram", "discord", "slack", "feishu", "wechat", "qq", "whatsapp", "signal", "gateway", "webhook"]
      .some((key) => lowerPath.includes(key) || serialized.includes(key));
    const hasPolicyKey = hasAnyKey(value, ["dmPolicy", "allowFrom", "groupPolicy", "allowed_users", "webhookSecret", "botToken"]);

    if (hasChannelKey && hasPolicyKey) {
      observations.push(makeObservation({
        type: "remote-trigger-config",
        file,
        jsonPath: path,
        value,
        severityHint: "medium"
      }));
    }
  });
}

function extractScheduledObservations(file, data, observations) {
  walk(data, (value, path) => {
    if (!value || typeof value !== "object") return;
    const lowerPath = path.toLowerCase();
    const isSpecificTask = path !== "$" && (/\[(\d+)\]$/.test(path) || hasAnyKey(value, ["cron", "schedule", "prompt", "task"]));
    const hasDirectScheduleField = hasAnyKey(value, ["cron", "schedule"]);
    const isSchedulePath = lowerPath.includes("cron") || lowerPath.includes("scheduled") || lowerPath.includes("schedule");
    if (isSpecificTask && (hasDirectScheduleField || (/\[(\d+)\]$/.test(path) && isSchedulePath))) {
      observations.push(makeObservation({
        type: "scheduled-agent-execution",
        file,
        jsonPath: path,
        value,
        severityHint: "medium"
      }));
    }
  });
}

function extractCredentialObservations(file, data, observations) {
  walk(data, (value, path) => {
    if (typeof value !== "string") return;
    const text = `${path} ${value}`;
    if (/(api_key|token|secret|private_key|botToken|webhookSecret|\$\{[A-Z0-9_]*(TOKEN|SECRET|KEY)[A-Z0-9_]*\})/i.test(text)) {
      observations.push(makeObservation({
        type: "credential-reference",
        file,
        jsonPath: path,
        value,
        severityHint: "medium"
      }));
    }
  });
}

export async function extractJsonObservations(files) {
  const observations = [];

  for (const file of files) {
    if (!isJsonLike(file.relative_path)) continue;
    const content = await readFile(file.path, "utf8");
    let data;
    try {
      data = JSON.parse(content);
    } catch {
      continue;
    }

    const lineIndex = buildJsonLineIndex(content);
    file.resolve_json_line = (jsonPath) => findNearestLine(lineIndex, jsonPath);

    extractMcpServerObservations(file, data, observations);
    extractRemoteTriggerObservations(file, data, observations);
    extractScheduledObservations(file, data, observations);
    extractCredentialObservations(file, data, observations);
  }

  return observations;
}
