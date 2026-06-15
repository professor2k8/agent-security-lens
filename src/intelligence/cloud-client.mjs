const DEFAULT_API_URL = "https://api.agentsecuritylens.com";
const DEFAULT_TIMEOUT_MS = 3500;

const SECRET_PATTERNS = [
  /\b([A-Za-z_]*API[A-Za-z_]*KEY|TOKEN|SECRET|PASSWORD|PRIVATE_KEY|ACCESS_KEY)\s*[:=]\s*["']?[^"',\s]+/gi,
  /\b(sk-[A-Za-z0-9_-]{12,})\b/g,
  /\b(ghp_[A-Za-z0-9_]{20,})\b/g,
  /\b(xox[baprs]-[A-Za-z0-9-]{20,})\b/g
];

function env(name) {
  return process.env[name];
}

function normalizeApiUrl(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  return text.replace(/\/+$/, "");
}

function splitApiUrls(value) {
  return String(value || "")
    .split(/[\s,]+/)
    .map((item) => normalizeApiUrl(item))
    .filter(Boolean);
}

export function apiEndpoints() {
  const primary = normalizeApiUrl(env("ASL_API_URL"));
  const explicitList = splitApiUrls(env("ASL_API_URLS"));

  const ordered = [];
  ordered.push(...explicitList);
  if (primary) ordered.push(primary);
  ordered.push(DEFAULT_API_URL);

  return [...new Set(ordered)];
}

function apiUrl() {
  return apiEndpoints()[0] || DEFAULT_API_URL;
}

export function cloudIntelligenceEnabled() {
  const mode = (env("ASL_MODE") || "online").toLowerCase();
  return mode !== "local" && env("ASL_DISABLE_CLOUD") !== "1";
}

function limitString(value, max = 4000) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}... [truncated by AgentSecurityLens MCP]`;
}

function redactString(value) {
  let redacted = value;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }
  return limitString(redacted);
}

function sanitize(value) {
  if (value == null) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item));
  if (typeof value === "object") {
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (/secret|token|password|private[_-]?key|credential|cookie/i.test(key)) {
        output[key] = "[REDACTED]";
      } else {
        output[key] = sanitize(item);
      }
    }
    return output;
  }
  return String(value);
}

function clientProfile() {
  return {
    name: "agent-security-lens-mcp",
    agent_id: env("ASL_AGENT_ID") || "agent-security-lens-mcp",
    agent_name: env("ASL_AGENT_NAME") || "AgentSecurityLens MCP",
    client_type: "agent",
    mode: env("ASL_MODE") || "online",
    protocol: "mcp",
    tier: env("ASL_CLIENT_TIER") || "free"
  };
}

function cloudHeaders(includeJson = false) {
  return {
    ...(includeJson ? { "content-type": "application/json" } : {}),
    "user-agent": "AgentSecurityLens-MCP/0.1",
    ...(env("ASL_API_KEY") ? { authorization: `Bearer ${env("ASL_API_KEY")}` } : {})
  };
}

function parseResponseText(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export function buildCloudPayload(input = {}) {
  return {
    schema_version: "0.1.0",
    client: clientProfile(),
    component: sanitize({
      name: input.component_name || null,
      type: input.component_type || "unknown",
      source_url: input.source_url || null,
      install_command: input.install_command || null,
      manifest: input.manifest || null,
      package_name: input.package_name || null,
      version: input.version || null,
      registry: input.registry || null,
      source_type: input.source_type || null,
      stars: input.stars || input.github_stars || null,
      community_signals: input.community_signals || null,
      trust_signals: input.trust_signals || null,
      planned_use: input.planned_use || null,
      requested_permissions: input.requested_permissions || null,
      agent_context: input.agent_context || null
    }),
    privacy_policy: {
      send_private_file_contents: false,
      send_secrets: false,
      redaction: "client-side-best-effort"
    }
  };
}

async function requestJson({ method, path, payload = null }) {
  const endpoints = apiEndpoints();
  if (!cloudIntelligenceEnabled()) {
    return {
      ok: false,
      reason: "cloud_disabled",
      api_url: apiUrl(),
      attempted_api_urls: endpoints
    };
  }

  const attempts = [];
  const timeoutMs = Number(env("ASL_API_TIMEOUT_MS") || DEFAULT_TIMEOUT_MS);

  for (const [index, endpoint] of endpoints.entries()) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${endpoint}${path}`, {
        method,
        headers: cloudHeaders(method !== "GET"),
        ...(method === "GET" ? {} : { body: JSON.stringify(payload) }),
        signal: controller.signal
      });
      const text = await response.text();
      const data = parseResponseText(text);
      if (!response.ok) {
        attempts.push({
          api_url: endpoint,
          reason: `http_${response.status}`,
          error: data?.error || data?.message || data?.raw || text
        });
        continue;
      }
      return {
        ok: true,
        api_url: endpoint,
        attempted_api_urls: endpoints.slice(0, index + 1),
        fallback_used: index > 0,
        data
      };
    } catch (error) {
      attempts.push({
        api_url: endpoint,
        reason: error?.name === "AbortError" ? "timeout" : "request_failed",
        error: error?.message || String(error)
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  const last = attempts.at(-1);
  return {
    ok: false,
    reason: last?.reason || "all_endpoints_failed",
    api_url: endpoints[0] || DEFAULT_API_URL,
    attempted_api_urls: attempts.map((attempt) => attempt.api_url),
    attempts,
    error: last?.error || "No ASL API endpoint responded successfully."
  };
}

async function postJson(path, payload) {
  return requestJson({ method: "POST", path, payload });
}

async function getJson(path) {
  return requestJson({ method: "GET", path });
}

export async function queryCloudReview(input = {}) {
  return postJson("/v1/review-before-install", buildCloudPayload(input));
}

export async function queryCloudStatus() {
  return getJson("/v1/status");
}

export async function submitUnknownToCloud(input = {}, localReview = null) {
  return postJson("/v1/unknown-components", {
    ...buildCloudPayload(input),
    local_review: localReview
      ? {
          decision: localReview.decision,
          risk_level: localReview.risk_level,
          risk_signals: localReview.risk_signals,
          trust_score: localReview.trust_score
        }
      : null
  });
}

export async function submitUsageEventToCloud(event = {}) {
  return postJson("/v1/usage-events", {
    schema_version: "0.1.0",
    client: clientProfile(),
    event: sanitize(event),
    privacy_policy: {
      send_private_file_contents: false,
      send_secrets: false,
      redaction: "client-side-best-effort"
    }
  });
}

export async function submitFeedbackToCloud(feedback = {}) {
  return postJson("/v1/decision-feedback", {
    schema_version: "0.1.0",
    client: clientProfile(),
    feedback: sanitize(feedback),
    privacy_policy: {
      send_private_file_contents: false,
      send_secrets: false,
      redaction: "client-side-best-effort"
    }
  });
}

export async function queryResearchStatus(submissionId) {
  return getJson(`/v1/research-status?id=${encodeURIComponent(submissionId || "")}`);
}
