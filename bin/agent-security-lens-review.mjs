#!/usr/bin/env node

import { recordUsageEvent, reviewBeforeInstall, submitUnknownComponent } from "../src/intelligence/component-intelligence.mjs";

function printHelp() {
  console.log(`AgentSecurityLens quick review

Ask ASL for a pre-install decision without configuring an MCP client first.

Usage:
  asl-review <component-name> [--type <mcp|skill|tool|agent-framework|unknown>] [--source-url <url>]
             [--install-command <command>] [--permission <id>] [--planned-use <text>]
             [--submit-if-unknown] [--format console|json]

Examples:
  agent-security-lens doctor

  asl-review filesystem --type mcp --source-url https://github.com/modelcontextprotocol/servers \\
    --install-command "npx -y @modelcontextprotocol/server-filesystem ." \\
    --permission filesystem-read --permission filesystem-write

  asl-review @modelcontextprotocol/server-filesystem --type mcp --format json
`);
}

function readValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function parseArgs(argv) {
  const args = {
    component_name: null,
    component_type: "unknown",
    source_url: null,
    install_command: null,
    planned_use: null,
    requested_permissions: [],
    submit_if_unknown: false,
    format: "console"
  };

  const rest = argv.slice(2);
  if (rest[0] === "review" || rest[0] === "quick-review") rest.shift();
  if (!rest.length || rest.includes("--help") || rest.includes("-h")) return { help: true };

  args.component_name = rest[0];
  for (let i = 1; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--type") {
      args.component_type = readValue(rest, i, arg);
      i += 1;
    } else if (arg === "--source-url") {
      args.source_url = readValue(rest, i, arg);
      i += 1;
    } else if (arg === "--install-command") {
      args.install_command = readValue(rest, i, arg);
      i += 1;
    } else if (arg === "--planned-use") {
      args.planned_use = readValue(rest, i, arg);
      i += 1;
    } else if (arg === "--permission") {
      args.requested_permissions.push(readValue(rest, i, arg));
      i += 1;
    } else if (arg === "--permissions") {
      args.requested_permissions.push(
        ...readValue(rest, i, arg)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      );
      i += 1;
    } else if (arg === "--submit-if-unknown") {
      args.submit_if_unknown = true;
    } else if (arg === "--format") {
      args.format = readValue(rest, i, arg);
      i += 1;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!args.component_name) throw new Error("Missing component name.");
  if (!["console", "json"].includes(args.format)) throw new Error("Unsupported format. Use console or json.");
  return args;
}

function compactList(items, max = 5) {
  if (!Array.isArray(items) || !items.length) return "none";
  const shown = items.slice(0, max);
  const suffix = items.length > max ? `, +${items.length - max} more` : "";
  return `${shown.join(", ")}${suffix}`;
}

function renderConsole({ review, submission, usage }) {
  const component = review.component || {};
  const contract = review.agent_decision_contract || {};
  const oneStep = review.one_step_action || {};
  const lines = [
    "AgentSecurityLens pre-install decision",
    "",
    `Component: ${component.name || component.full_name || "unknown"} (${component.type || "unknown"})`,
    `Coverage: ${review.intelligence_coverage?.state || component.intelligence_state || "unknown"} / ${
      review.intelligence_coverage?.confidence || "unknown"
    } confidence`,
    `Decision: ${review.decision || "unknown"}`,
    `Trust score: ${review.trust_score ?? "unknown"} / 100`,
    `Risk level: ${review.risk_level || "unknown"}`,
    `Risk signals: ${compactList(review.risk_signals)}`,
    "",
    `Automatic install allowed: ${contract.automatic_install_allowed === true ? "yes" : "no"}`,
    `User confirmation required: ${contract.user_confirmation_required === false ? "no" : "yes"}`,
    `One-step action: ${oneStep.action_type || review.next_action || "follow_agent_decision_contract"}`
  ];

  if (Array.isArray(review.safe_install_plan) && review.safe_install_plan.length) {
    lines.push("", "Safe install plan:");
    review.safe_install_plan.slice(0, 5).forEach((step, index) => lines.push(`  ${index + 1}. ${step}`));
  }

  const alternatives = review.recommended_alternatives || review.alternatives || [];
  if (alternatives.length) {
    lines.push("", "Recommended alternatives:");
    alternatives.slice(0, 5).forEach((item, index) => {
      const name = item.name || item.component_name || item.id || "unknown";
      const reason = item.reason || item.rationale || item.summary || "";
      lines.push(`  ${index + 1}. ${name}${reason ? ` - ${reason}` : ""}`);
    });
  }

  if (submission) {
    lines.push("", `Unknown submission: ${submission.status || "queued"} (${submission.id || "no id"})`);
  }

  lines.push("", `Usage telemetry: ${usage?.source || "local"} / ${usage?.status || (usage?.recorded ? "recorded" : "queued")}`);
  lines.push("", review.agent_instruction || "Follow the returned decision before installing this component.");
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const startedAt = Date.now();
  const input = {
    component_name: args.component_name,
    component_type: args.component_type,
    source_url: args.source_url,
    install_command: args.install_command,
    planned_use: args.planned_use,
    requested_permissions: args.requested_permissions.length ? args.requested_permissions : undefined,
    submit_if_unknown: args.submit_if_unknown
  };

  const review = await reviewBeforeInstall(input);
  let submission = null;
  if (
    args.submit_if_unknown &&
    (review.unknown_component?.should_submit || (review.component?.cataloged && !review.component?.reviewed))
  ) {
    submission = await submitUnknownComponent(input);
  }

  const usage = await recordUsageEvent({
    event_type: "review_before_install",
    source: "asl-review-cli",
    recorded_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    component_name: input.component_name,
    component_type: input.component_type,
    source_url: input.source_url,
    install_command: input.install_command,
    decision: review.decision || "unknown",
    trust_score: review.trust_score ?? null,
    risk_level: review.risk_level || null,
    intelligence_state: review.intelligence_coverage?.state || review.component?.intelligence_state || "unknown"
  });

  const output = { review, submission, usage };
  if (args.format === "json") {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log(renderConsole(output));
  }
}

await main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
