#!/usr/bin/env node

import { assess } from "../src/assessment/assess.mjs";
import { compareAssessmentResults } from "../src/results/compare-results.mjs";

const EXAMPLES = [
  {
    name: "openclaw-like",
    target: "./examples/openclaw-like",
    profile: "openclaw-like",
    expectedProfile: "openclaw-like",
    minFindings: 8
  },
  {
    name: "hermes-like",
    target: "./examples/hermes-like",
    profile: "hermes-like",
    expectedProfile: "hermes-like",
    minFindings: 8
  },
  {
    name: "dot-openclaw autodetect",
    target: "./examples/dot-openclaw",
    expectedProfile: "openclaw-like",
    minFindings: 3
  },
  {
    name: "dot-hermes autodetect",
    target: "./examples/dot-hermes",
    expectedProfile: "hermes-like",
    minFindings: 3
  }
];

let failed = false;
const results = new Map();

for (const example of EXAMPLES) {
  const result = await assess({
    targetPath: example.target,
    requestedProfile: example.profile
  });
  results.set(example.name, result);

  const findingCount = result.findings.length;
  const profileIds = result.profiles.map((profile) => profile.id);
  const hasRecommendations = result.findings.every((finding) => {
    return finding.recommended_actions.length && finding.recommended_alternatives.length;
  });
  const hasLineage =
    result.assessment.id &&
    result.lineage.profile_selection.selected_profile &&
    result.lineage.algorithms.length &&
    result.rule_packs.length &&
    result.recommendation_packs.length &&
    result.trust_signal_taxonomies.length;
  const hasStructuredRecommendations = result.findings.every((finding) => {
    return finding.recommendations?.length && finding.recommendations[0].one_step_commands?.length;
  });
  const hasTrustSignals =
    result.trust_signals.length &&
    result.summary.trust_signal_summary?.total === result.trust_signals.length;

  console.log(
    `${example.name}: ${findingCount} findings, trust score ${result.summary.trust_score}, profiles ${profileIds.join(", ")}`
  );

  if (!profileIds.includes(example.expectedProfile)) {
    console.error(`Expected ${example.name} to include profile ${example.expectedProfile}.`);
    failed = true;
  }

  if (findingCount < example.minFindings) {
    console.error(`Expected at least ${example.minFindings} findings for ${example.name}.`);
    failed = true;
  }

  if (!hasRecommendations) {
    console.error(`Expected every finding to include actions and alternatives for ${example.name}.`);
    failed = true;
  }

  if (!hasLineage) {
    console.error(`Expected assessment lineage and rule pack metadata for ${example.name}.`);
    failed = true;
  }

  if (!hasStructuredRecommendations) {
    console.error(`Expected every finding to include structured recommendations for ${example.name}.`);
    failed = true;
  }

  if (!hasTrustSignals) {
    console.error(`Expected trust signals and trust signal summary for ${example.name}.`);
    failed = true;
  }
}

const comparison = compareAssessmentResults(
  results.get("openclaw-like"),
  results.get("dot-openclaw autodetect")
);

if (!Number.isInteger(comparison.score.delta)) {
  console.error("Expected comparison score delta to be an integer.");
  failed = true;
}

if (
  comparison.finding_counts.added +
    comparison.finding_counts.resolved +
    comparison.finding_counts.persistent ===
  0
) {
  console.error("Expected comparison to include finding delta data.");
  failed = true;
}

if (failed) {
  process.exitCode = 1;
}
