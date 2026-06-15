#!/usr/bin/env node

import { assess } from "../src/assessment/assess.mjs";
import { renderComparisonConsole } from "../src/report/comparison-console.mjs";
import { renderConsole } from "../src/report/console.mjs";
import { renderMarkdown } from "../src/report/markdown.mjs";
import { compareAssessmentFiles } from "../src/results/compare-results.mjs";
import { saveAssessmentResult } from "../src/results/save-result.mjs";

function parseArgs(argv) {
  const args = {
    command: argv[2],
    target: argv[3],
    current: argv[4],
    profile: null,
    format: "console",
    save: false,
    outDir: null
  };

  const firstOptionIndex = args.command === "compare" ? 5 : 4;
  for (let i = firstOptionIndex; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--profile") {
      args.profile = argv[i + 1];
      i += 1;
    } else if (arg === "--format") {
      args.format = argv[i + 1];
      i += 1;
    } else if (arg === "--save") {
      args.save = true;
    } else if (arg === "--out-dir") {
      args.outDir = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function printHelp() {
  console.log(`AgentSecurityLens

Usage:
  agent-security-lens assess <target> [--profile <id>] [--format console|json|markdown] [--save] [--out-dir <dir>]
  agent-security-lens compare <previous-result.json> <current-result.json> [--format console|json]

Examples:
  agent-security-lens assess .
  agent-security-lens assess ~/.openclaw --profile openclaw-like
  agent-security-lens assess . --format markdown
  agent-security-lens assess . --save --out-dir ./assessment-runs
  agent-security-lens compare ./old.json ./new.json
`);
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.command || args.command === "--help" || args.command === "-h") {
    printHelp();
    return;
  }

  if (args.command === "compare") {
    if (!args.target || !args.current) {
      console.error("Missing comparison result paths.");
      printHelp();
      process.exitCode = 1;
      return;
    }
    const comparison = await compareAssessmentFiles(args.target, args.current);
    if (args.format === "json") {
      console.log(JSON.stringify(comparison, null, 2));
    } else {
      console.log(renderComparisonConsole(comparison));
    }
    return;
  }

  if (args.command !== "assess") {
    console.error(`Unknown command: ${args.command}`);
    printHelp();
    process.exitCode = 1;
    return;
  }

  if (!args.target) {
    console.error("Missing target path.");
    printHelp();
    process.exitCode = 1;
    return;
  }

  const result = await assess({
    targetPath: args.target,
    requestedProfile: args.profile
  });
  const saved = args.save
    ? await saveAssessmentResult({ result, outDir: args.outDir })
    : null;

  if (args.format === "json") {
    console.log(JSON.stringify(saved ? { ...result, saved } : result, null, 2));
  } else if (args.format === "markdown") {
    console.log(renderMarkdown(result));
    if (saved) console.log(`\nSaved result: ${saved.path}`);
  } else {
    console.log(renderConsole(result));
    if (saved) console.log(`\nSaved result: ${saved.path}`);
  }
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
