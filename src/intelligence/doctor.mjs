import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { apiEndpoints, cloudIntelligenceEnabled, queryCloudStatus } from "./cloud-client.mjs";
import { loadCandidateCatalog, loadComponentDatabase } from "./component-intelligence.mjs";

const LOCAL_QUEUE_ROOT = process.env.ASL_LOCAL_QUEUE_DIR || join(process.cwd(), ".agentsecuritylens");

async function countFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).length;
  } catch {
    return 0;
  }
}

function countBy(items, field) {
  return items.reduce((acc, item) => {
    const value = item[field] || "unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function cloudInstruction(cloud, onlineMode) {
  if (!onlineMode) return "ASL is in local mode. Online intelligence and telemetry are disabled.";
  if (cloud?.ok || cloud?.reachable) return "Cloud intelligence is reachable. Use review_before_install before installing components.";
  return "Cloud intelligence is not reachable from this environment. Continue with local fallback and retry later.";
}

export async function runDoctor() {
  const onlineMode = cloudIntelligenceEnabled();
  const [database, candidates, cloud] = await Promise.all([
    loadComponentDatabase(),
    loadCandidateCatalog(),
    onlineMode ? queryCloudStatus() : Promise.resolve(null)
  ]);

  const components = Array.isArray(database.components) ? database.components : [];
  const queues = {
    unknown_components: await countFiles(join(LOCAL_QUEUE_ROOT, "unknown-components")),
    usage_events: await countFiles(join(LOCAL_QUEUE_ROOT, "usage-events")),
    decision_feedback: await countFiles(join(LOCAL_QUEUE_ROOT, "decision-feedback"))
  };

  return {
    schema_version: "0.1.0",
    service: "AgentSecurityLens",
    result_type: "doctor",
    generated_at: new Date().toISOString(),
    mode: onlineMode ? "online" : "local",
    api_endpoints: apiEndpoints(),
    cloud: cloud
      ? {
          reachable: cloud.ok,
          api_url: cloud.api_url,
          attempted_api_urls: cloud.attempted_api_urls || [],
          reason: cloud.reason || null,
          error: cloud.error || null
        }
      : null,
    local_intelligence: {
      components: components.length,
      candidates: candidates.length,
      by_state: countBy(components, "intelligence_state"),
      by_type: countBy(components, "type")
    },
    local_queues: queues,
    health: {
      cloud_reachable: Boolean(cloud?.ok),
      has_local_fallback: components.length > 0,
      has_pending_local_telemetry: Object.values(queues).some((count) => count > 0)
    },
    agent_instruction: cloudInstruction(cloud, onlineMode)
  };
}

export function renderDoctorConsole(report) {
  const cloud = report.cloud;
  const lines = [
    "AgentSecurityLens doctor",
    "",
    `Mode: ${report.mode}`,
    `Cloud reachable: ${cloud?.reachable ? "yes" : "no"}`,
    `API endpoints: ${report.api_endpoints.join(", ") || "none"}`,
    `Local components: ${report.local_intelligence.components}`,
    `Local candidates: ${report.local_intelligence.candidates}`,
    `Local queues: unknown=${report.local_queues.unknown_components}, usage=${report.local_queues.usage_events}, feedback=${report.local_queues.decision_feedback}`
  ];

  if (cloud && !cloud.reachable) {
    lines.push(`Cloud issue: ${cloud.reason || "unknown"}${cloud.error ? ` (${cloud.error})` : ""}`);
  }

  lines.push("", report.agent_instruction);
  return lines.join("\n");
}
