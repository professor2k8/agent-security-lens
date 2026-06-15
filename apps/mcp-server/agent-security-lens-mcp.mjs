#!/usr/bin/env node

import { assess } from "../../src/assessment/assess.mjs";
import { discoverTargets } from "../../src/assessment/discover-targets.mjs";
import { apiEndpoints, cloudIntelligenceEnabled, queryCloudStatus } from "../../src/intelligence/cloud-client.mjs";
import {
  getResearchStatus,
  recommendAlternatives,
  recordUsageEvent,
  reviewBeforeInstall,
  submitDecisionFeedback,
  submitUnknownComponent
} from "../../src/intelligence/component-intelligence.mjs";

const serverInfo = {
  name: "agent-security-lens-mcp",
  version: "0.1.0"
};

const tools = [
  {
    name: "get_install_policy",
    description:
      "Return the ASL machine-readable policy an autonomous agent should follow before installing MCPs, Skills, tools, prompt bundles, workflows or memory components.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "get_intelligence_status",
    description:
      "Return whether ASL MCP is using online cloud intelligence or local fallback, and whether the cloud API is reachable.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: "review_before_install",
    description:
      "Query ASL intelligence before an autonomous agent installs or enables an MCP, Skill, tool, prompt bundle, workflow, memory component or install command.",
    inputSchema: {
      type: "object",
      properties: {
        component_name: { type: "string", description: "Component name, package name or display name." },
        component_type: {
          type: "string",
          enum: ["agent", "agent-framework", "mcp", "skill", "tool", "prompt", "prompt-bundle", "workflow", "memory", "unknown"]
        },
        source_url: { type: "string", description: "GitHub, registry, npm, Docker or documentation URL." },
        install_command: { type: "string", description: "Command the agent plans to run, such as npx/uvx/docker." },
        manifest: { type: ["object", "string"], description: "MCP/Skill manifest or config snippet." },
        planned_use: { type: "string", description: "What the agent wants to use this component for." },
        requested_permissions: {
          type: "array",
          items: { type: "string" },
          description: "Permissions the agent expects this component to need, such as shell, filesystem, network or browser."
        },
        submit_if_unknown: { type: "boolean", description: "Queue unknown components for ASL research." }
      },
      additionalProperties: true
    }
  },
  {
    name: "check_component",
    description: "Check ASL online intelligence for a component and return an agent-readable install decision.",
    inputSchema: {
      type: "object",
      properties: {
        component_name: { type: "string" },
        component_type: { type: "string" },
        source_url: { type: "string" },
        install_command: { type: "string" },
        manifest: { type: ["object", "string"] }
      },
      additionalProperties: true
    }
  },
  {
    name: "recommend_alternatives",
    description: "Return safer alternatives and a safe install plan for a component.",
    inputSchema: {
      type: "object",
      properties: {
        component_name: { type: "string" },
        component_type: { type: "string" },
        source_url: { type: "string" },
        install_command: { type: "string" },
        manifest: { type: ["object", "string"] }
      },
      additionalProperties: true
    }
  },
  {
    name: "submit_unknown_component",
    description:
      "Submit public metadata for an unknown component to the ASL research queue. Do not submit private file contents or secrets.",
    inputSchema: {
      type: "object",
      properties: {
        component_name: { type: "string" },
        component_type: { type: "string" },
        source_url: { type: "string" },
        install_command: { type: "string" },
        manifest: { type: ["object", "string"] }
      },
      additionalProperties: true
    }
  },
  {
    name: "report_install_outcome",
    description:
      "Report what happened after an agent followed an ASL decision. Use this to improve ASL adoption metrics and recommendation quality.",
    inputSchema: {
      type: "object",
      properties: {
        component_name: { type: "string" },
        component_type: { type: "string" },
        source_url: { type: "string" },
        decision: { type: "string", enum: ["allow", "allow_with_restrictions", "ask_user", "avoid", "unknown"] },
        outcome: {
          type: "string",
          enum: ["installed", "blocked", "user_approved", "user_rejected", "restriction_applied", "failed", "skipped"]
        },
        restriction_applied: { type: "boolean" },
        alternative_used: { type: "string" },
        error_summary: { type: "string" }
      },
      additionalProperties: true
    }
  },
  {
    name: "submit_decision_feedback",
    description:
      "Submit feedback about whether an ASL decision was useful, wrong, missing an alternative, or too strict. Do not include secrets or private code.",
    inputSchema: {
      type: "object",
      properties: {
        component_name: { type: "string" },
        component_type: { type: "string" },
        decision: { type: "string" },
        feedback_type: {
          type: "string",
          enum: ["helpful", "too_strict", "too_permissive", "missing_component", "missing_alternative", "incorrect_risk", "other"]
        },
        rating: { type: "number", minimum: 1, maximum: 5 },
        comment: { type: "string" }
      },
      additionalProperties: true
    }
  },
  {
    name: "get_research_status",
    description:
      "Check whether an unknown component submitted to ASL has been collected, scanned, reviewed, published, archived or is still pending.",
    inputSchema: {
      type: "object",
      properties: {
        submission_id: { type: "string" }
      },
      required: ["submission_id"],
      additionalProperties: false
    }
  },
  {
    name: "discover_workspace",
    description: "Discover Agent, MCP and Skill environments under a workspace path.",
    inputSchema: {
      type: "object",
      properties: {
        workspace_path: { type: "string" },
        max_depth: { type: "number" }
      },
      required: ["workspace_path"],
      additionalProperties: false
    }
  },
  {
    name: "scan_workspace",
    description:
      "Discover and assess every Agent, MCP and Skill environment under a workspace path. Use this for local context only.",
    inputSchema: {
      type: "object",
      properties: {
        workspace_path: { type: "string" },
        max_depth: { type: "number" }
      },
      required: ["workspace_path"],
      additionalProperties: false
    }
  }
];

function writeMessage(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function toolResult(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2)
      }
    ]
  };
}

async function callTool(name, args = {}) {
  if (name === "get_install_policy") {
    return toolResult({
      schema_version: "0.1.0",
      service: "AgentSecurityLens",
      result_type: "agent_install_policy",
      policy: {
        protocol: {
          decision_schema: "https://agentsecuritylens.dev/schemas/agent-install-decision.schema.json",
          decision_contract_version: "asl-agent-decision-contract@0.2.0",
          primary_tool: "review_before_install",
          lifecycle_tools: [
            "review_before_install",
            "submit_unknown_component",
            "get_research_status",
            "report_install_outcome",
            "submit_decision_feedback"
          ]
        },
        before_install: [
          "Call review_before_install before installing or enabling any MCP, Skill, tool, prompt bundle, workflow or memory component.",
          "Read agent_decision_contract. If blocks_install is true, do not run the install command automatically.",
          "Do not install automatically when decision is ask_user or avoid.",
          "Apply every safe_install_plan step before installation when decision is allow_with_restrictions.",
          "Submit unknown public components for ASL review without sending private code, secrets, tokens, cookies or personal data.",
          "Prefer recommended_alternatives when decision is avoid or the user rejects the requested component."
        ],
        after_install: [
          "Call report_install_outcome after the agent installs, blocks, skips or fails to install a component.",
          "Call submit_decision_feedback when the decision was helpful, too strict, too permissive, missing an alternative or incorrect.",
          "Call get_research_status before retrying an unknown component that was previously submitted."
        ],
        expected_component_metadata: [
          "component_name",
          "component_type",
          "source_url",
          "install_command",
          "manifest"
        ],
        decisions: {
          allow: "Install after recording exact source and version.",
          allow_with_restrictions: "Apply restrictions first, then install.",
          ask_user: "Ask the user before installation.",
          avoid: "Do not install automatically."
        },
        machine_contract_fields: {
          agent_decision_contract: "Boolean policy contract for automatic install, user confirmation, unknown submission, retry and reporting.",
          agent_actions: "Ordered action list the agent should execute around installation.",
          one_step_action: "Single highest-priority action for agents that need a compact answer.",
          recommended_alternatives: "Structured alternative choices. Review each alternative with ASL before installing it.",
          unknown_component: "Submission and retry instructions when ASL has no reviewed intelligence record."
        }
      }
    });
  }
  if (name === "get_intelligence_status") {
    const onlineMode = cloudIntelligenceEnabled();
    const cloud = onlineMode ? await queryCloudStatus() : null;
    return toolResult({
      schema_version: "0.1.0",
      service: "AgentSecurityLens",
      result_type: "intelligence_status",
      mode: onlineMode ? "online" : "local",
      configured_api_endpoints: apiEndpoints(),
      cloud: cloud
        ? {
            reachable: cloud.ok,
            api_url: cloud.api_url,
            attempted_api_urls: cloud.attempted_api_urls || [],
            fallback_used: cloud.fallback_used || false,
            reason: cloud.reason || null,
            status: cloud.data || null
          }
        : null,
      agent_instruction: onlineMode
        ? "Use review_before_install before installing components. If cloud is unreachable, treat local fallback decisions as provisional."
        : "ASL is in local mode. Treat decisions as offline fallback and do not assume full ASL intelligence coverage."
    });
  }
  if (name === "review_before_install") {
    const review = await reviewBeforeInstall(args);
    if (
      args.submit_if_unknown &&
      (review.unknown_component?.should_submit || (review.component?.cataloged && !review.component?.reviewed))
    ) {
      const submission = await submitUnknownComponent(args);
      if (review.unknown_component) {
        review.unknown_component.submission = submission;
      } else {
        review.catalog_research_submission = submission;
      }
    }
    return toolResult(review);
  }
  if (name === "check_component") {
    return toolResult(await reviewBeforeInstall(args));
  }
  if (name === "recommend_alternatives") {
    return toolResult(await recommendAlternatives(args));
  }
  if (name === "submit_unknown_component") {
    return toolResult(await submitUnknownComponent(args));
  }
  if (name === "report_install_outcome") {
    return toolResult(
      await recordUsageEvent({
        event_type: "install_outcome",
        recorded_at: new Date().toISOString(),
        ...args
      })
    );
  }
  if (name === "submit_decision_feedback") {
    return toolResult(
      await submitDecisionFeedback({
        feedback_type: args.feedback_type || "other",
        recorded_at: new Date().toISOString(),
        ...args
      })
    );
  }
  if (name === "get_research_status") {
    return toolResult(await getResearchStatus(args.submission_id));
  }
  if (name === "discover_workspace") {
    return toolResult(
      await discoverTargets({
        workspacePath: args.workspace_path,
        maxDepth: Number(args.max_depth || 4)
      })
    );
  }
  if (name === "scan_workspace") {
    const discovery = await discoverTargets({
      workspacePath: args.workspace_path,
      maxDepth: Number(args.max_depth || 4)
    });
    const results = [];
    for (const target of discovery.targets) {
      const result = await assess({ targetPath: target.path, requestedProfile: null });
      results.push({
        target,
        decision_summary: {
          trust_score: result.summary.trust_score,
          total_findings: result.summary.total_findings,
          selected_profile: result.lineage.profile_selection.selected_profile,
          top_risks: result.findings.slice(0, 5).map((finding) => ({
            title: finding.title,
            severity: finding.severity,
            category: finding.category
          }))
        }
      });
    }
    return toolResult({
      workspace_path: discovery.workspace_path,
      targets_found: discovery.targets.length,
      targets_assessed: results.length,
      results
    });
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function handleRequest(message) {
  if (message.method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: message.params?.protocolVersion || "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo
      }
    };
  }
  if (message.method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id: message.id,
      result: { tools }
    };
  }
  if (message.method === "tools/call") {
    const result = await callTool(message.params?.name, message.params?.arguments || {});
    return {
      jsonrpc: "2.0",
      id: message.id,
      result
    };
  }
  if (message.method?.startsWith("notifications/")) return null;
  return {
    jsonrpc: "2.0",
    id: message.id,
    error: {
      code: -32601,
      message: `Method not found: ${message.method}`
    }
  };
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop() || "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    void (async () => {
      try {
        const response = await handleRequest(JSON.parse(trimmed));
        if (response) writeMessage(response);
      } catch (error) {
        writeMessage({
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32000,
            message: error?.message || String(error)
          }
        });
      }
    })();
  }
});
