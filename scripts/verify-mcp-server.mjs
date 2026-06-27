#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const localQueueDir = await mkdtemp(join(tmpdir(), "asl-mcp-smoke-"));
const child = spawn(process.execPath, ["./apps/mcp-server/agent-security-lens-mcp.mjs"], {
  cwd: process.cwd(),
  env: { ...process.env, ASL_MODE: "local", ASL_LOCAL_QUEUE_DIR: localQueueDir },
  stdio: ["pipe", "pipe", "pipe"]
});

let output = "";
let errorOutput = "";
child.stdout.on("data", (chunk) => {
  output += chunk.toString("utf8");
});
child.stderr.on("data", (chunk) => {
  errorOutput += chunk.toString("utf8");
});

function send(message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "smoke", version: "0.1.0" } }
});
send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
send({
  jsonrpc: "2.0",
  id: 4,
  method: "tools/call",
  params: {
    name: "get_install_policy",
    arguments: {}
  }
});
send({
  jsonrpc: "2.0",
  id: 5,
  method: "tools/call",
  params: {
    name: "get_intelligence_status",
    arguments: {}
  }
});
send({
  jsonrpc: "2.0",
  id: 3,
  method: "tools/call",
  params: {
    name: "review_before_install",
    arguments: {
      component_name: "filesystem",
      component_type: "mcp",
      install_command: "npx -y @modelcontextprotocol/server-filesystem ."
    }
  }
});
send({
  jsonrpc: "2.0",
  id: 6,
  method: "tools/call",
  params: {
    name: "review_before_install",
    arguments: {
      component_name: "mcp-chrome",
      component_type: "mcp",
      source_url: "https://github.com/hangwin/mcp-chrome",
      planned_use: "Browser automation for autonomous web tasks.",
      requested_permissions: ["browser-access", "network-access"],
      submit_if_unknown: true
    }
  }
});
send({
  jsonrpc: "2.0",
  id: 7,
  method: "tools/call",
  params: {
    name: "report_install_outcome",
    arguments: {
      component_name: "filesystem",
      component_type: "mcp",
      decision: "allow_with_restrictions",
      outcome: "restriction_applied",
      restriction_applied: true
    }
  }
});
send({
  jsonrpc: "2.0",
  id: 8,
  method: "tools/call",
  params: {
    name: "submit_decision_feedback",
    arguments: {
      component_name: "filesystem",
      component_type: "mcp",
      decision: "allow_with_restrictions",
      feedback_type: "helpful",
      rating: 5
    }
  }
});
send({
  jsonrpc: "2.0",
  id: 9,
  method: "tools/call",
  params: {
    name: "review_before_install",
    arguments: {
      component_name: "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
      component_type: "mcp"
    }
  }
});

const responseDeadline = Date.now() + 5000;
while (Date.now() < responseDeadline) {
  const responseIds = new Set(
    output
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line).id;
        } catch {
          return null;
        }
      })
  );
  if ([1, 2, 3, 4, 5, 6, 7, 8, 9].every((id) => responseIds.has(id))) break;
  await new Promise((resolve) => setTimeout(resolve, 50));
}
child.kill();

const lines = output
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const toolList = lines.find((line) => line.id === 2);
const review = lines.find((line) => line.id === 3);
if (!toolList?.result?.tools?.some((tool) => tool.name === "review_before_install")) {
  console.error("MCP smoke failed: review_before_install not listed");
  console.error(output || errorOutput);
  process.exit(1);
}
if (!toolList?.result?.tools?.some((tool) => tool.name === "get_install_policy")) {
  console.error("MCP smoke failed: get_install_policy not listed");
  console.error(output || errorOutput);
  process.exit(1);
}
if (!toolList?.result?.tools?.some((tool) => tool.name === "get_intelligence_status")) {
  console.error("MCP smoke failed: get_intelligence_status not listed");
  console.error(output || errorOutput);
  process.exit(1);
}
if (!toolList?.result?.tools?.some((tool) => tool.name === "report_install_outcome")) {
  console.error("MCP smoke failed: report_install_outcome not listed");
  console.error(output || errorOutput);
  process.exit(1);
}
if (!toolList?.result?.tools?.some((tool) => tool.name === "submit_decision_feedback")) {
  console.error("MCP smoke failed: submit_decision_feedback not listed");
  console.error(output || errorOutput);
  process.exit(1);
}
if (!toolList?.result?.tools?.some((tool) => tool.name === "get_research_status")) {
  console.error("MCP smoke failed: get_research_status not listed");
  console.error(output || errorOutput);
  process.exit(1);
}

const reviewText = review?.result?.content?.[0]?.text || "";
if (!reviewText.includes("ask_user") || !reviewText.includes("filesystem-write")) {
  console.error("MCP smoke failed: review result did not include expected decision and risk");
  console.error(output || errorOutput);
  process.exit(1);
}
const reviewJson = JSON.parse(reviewText);
if (
  reviewJson.agent_decision_contract?.contract_version !== "asl-agent-decision-contract@0.2.0" ||
  reviewJson.agent_decision_contract?.automatic_install_allowed !== false ||
  reviewJson.component?.curated_baseline !== true ||
  reviewJson.component?.reviewed !== false
) {
  console.error("MCP smoke failed: review result did not include expected agent decision contract");
  console.error(output || errorOutput);
  process.exit(1);
}
if (!reviewJson.one_step_action || reviewJson.one_step_action.action_type !== "ask_user_before_install") {
  console.error("MCP smoke failed: one_step_action was not machine executable");
  console.error(output || errorOutput);
  process.exit(1);
}
if (!reviewJson.agent_actions?.some((action) => action.id === "report-install-outcome" && action.tool === "report_install_outcome")) {
  console.error("MCP smoke failed: agent action lifecycle did not require outcome reporting");
  console.error(output || errorOutput);
  process.exit(1);
}

const urlReview = lines.find((line) => line.id === 9);
const urlReviewJson = JSON.parse(urlReview?.result?.content?.[0]?.text || "{}");
if (
  urlReviewJson.component?.id !== "mcp-filesystem" ||
  urlReviewJson.component?.name !== "filesystem" ||
  urlReviewJson.component?.known !== true
) {
  console.error("MCP smoke failed: GitHub monorepo URL did not resolve to canonical filesystem component");
  console.error(output || errorOutput);
  process.exit(1);
}

const policy = lines.find((line) => line.id === 4);
const policyText = policy?.result?.content?.[0]?.text || "";
if (!policyText.includes("review_before_install") || !policyText.includes("agent_decision_contract")) {
  console.error("MCP smoke failed: install policy did not include expected agent behavior");
  console.error(output || errorOutput);
  process.exit(1);
}

const status = lines.find((line) => line.id === 5);
const statusText = status?.result?.content?.[0]?.text || "";
if (!statusText.includes('"mode": "local"') || !statusText.includes("offline fallback")) {
  console.error("MCP smoke failed: intelligence status did not include expected local mode");
  console.error(output || errorOutput);
  process.exit(1);
}

const candidateReview = lines.find((line) => line.id === 6);
const candidateText = candidateReview?.result?.content?.[0]?.text || "";
const candidateJson = JSON.parse(candidateText);
const candidateCatalogAvailable = existsSync(
  join(process.cwd(), "data", "intelligence", "candidates", "2026-06-07-component-catalog.json")
);
if (candidateCatalogAvailable) {
  if (
    candidateJson.component?.intelligence_state !== "monitored" ||
    candidateJson.intelligence_coverage?.source !== "monitored_catalog" ||
    candidateJson.decision !== "ask_user" ||
    candidateJson.agent_decision_contract?.research_status_required_before_retry !== true ||
    candidateJson.recommended_alternatives?.length !== 0 ||
    candidateJson.alternative_coverage?.status !== "not_applicable"
  ) {
    console.error("MCP smoke failed: candidate intelligence path did not return expected contract");
    console.error(output || errorOutput);
    process.exit(1);
  }
  if (
    !candidateJson.catalog_research_submission?.queued ||
    candidateJson.catalog_research_submission?.research_task?.next_agent_action?.automatic_install_retry_allowed !== false
  ) {
    console.error("MCP smoke failed: cataloged candidate was not queued for ASL research");
    console.error(output || errorOutput);
    process.exit(1);
  }
} else {
  if (
    candidateJson.component?.intelligence_state !== "unknown" ||
    candidateJson.intelligence_coverage?.source !== "submitted_metadata_inference" ||
    candidateJson.agent_decision_contract?.blocks_install !== true ||
    candidateJson.agent_decision_contract?.research_status_required_before_retry !== true ||
    candidateJson.recommended_alternatives?.length !== 0 ||
    candidateJson.alternative_coverage?.status !== "not_applicable"
  ) {
    console.error("MCP smoke failed: public fallback unknown-component path did not return expected contract");
    console.error(output || errorOutput);
    process.exit(1);
  }
  if (
    !candidateJson.unknown_component?.submission?.queued ||
    candidateJson.unknown_component?.submission?.research_task?.next_agent_action?.automatic_install_retry_allowed !== false
  ) {
    console.error("MCP smoke failed: unknown public component was not queued for ASL research");
    console.error(output || errorOutput);
    process.exit(1);
  }
}

const outcome = lines.find((line) => line.id === 7);
const outcomeText = outcome?.result?.content?.[0]?.text || "";
if (!outcomeText.includes('"source": "local_fallback"') && !outcomeText.includes('"source": "asl_cloud"')) {
  console.error("MCP smoke failed: install outcome was not recorded");
  console.error(output || errorOutput);
  process.exit(1);
}

const feedback = lines.find((line) => line.id === 8);
const feedbackText = feedback?.result?.content?.[0]?.text || "";
if (!feedbackText.includes('"source": "local_fallback"') && !feedbackText.includes('"source": "asl_cloud"')) {
  console.error("MCP smoke failed: decision feedback was not recorded");
  console.error(output || errorOutput);
  process.exit(1);
}

console.log("mcp server: tools/list and review_before_install checked");
await rm(localQueueDir, { recursive: true, force: true });
