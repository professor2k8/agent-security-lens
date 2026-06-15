#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const VALID_SEVERITIES = new Set(["critical", "high", "medium", "low", "info"]);
const VALID_CATEGORIES = new Set([
  "execution-risk",
  "remote-access-risk",
  "data-exposure-risk",
  "supply-chain-risk",
  "persistence-automation-risk"
]);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function listJsonFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(path)));
    } else if (entry.name.endsWith(".json")) {
      files.push(path);
    }
  }
  return files;
}

function requireString(item, field, label, failures) {
  if (!item[field] || typeof item[field] !== "string") {
    failures.push(`${label} missing string field: ${field}`);
  }
}

function requireArray(item, field, label, failures) {
  if (!Array.isArray(item[field])) {
    failures.push(`${label} missing array field: ${field}`);
  }
}

const profileFiles = await listJsonFiles(join(ROOT, "profiles"));
const rulePackFiles = await listJsonFiles(join(ROOT, "rule-packs"));
const recommendationPackFiles = await listJsonFiles(join(ROOT, "data", "recommendations"));
const ecosystemFiles = await listJsonFiles(join(ROOT, "data", "ecosystems"));
const trustFiles = await listJsonFiles(join(ROOT, "data", "trust"));
const profiles = [];
const rulePacks = [];
const recommendationPacks = [];
const ecosystemRegistries = [];
const trustRegistries = [];
const failures = [];

for (const file of profileFiles) {
  profiles.push({ file, data: await readJson(file) });
}

for (const file of rulePackFiles) {
  rulePacks.push({ file, data: await readJson(file) });
}

for (const file of recommendationPackFiles) {
  recommendationPacks.push({ file, data: await readJson(file) });
}

for (const file of ecosystemFiles) {
  ecosystemRegistries.push({ file, data: await readJson(file) });
}

for (const file of trustFiles) {
  trustRegistries.push({ file, data: await readJson(file) });
}

const profileIds = new Map();
const rulePackIds = new Map();

for (const { file, data } of profiles) {
  const label = `profile ${data.id || file}`;
  requireString(data, "id", label, failures);
  requireString(data, "version", label, failures);
  requireString(data, "status", label, failures);
  requireArray(data, "rule_packs", label, failures);
  requireArray(data, "known_limitations", label, failures);

  if (profileIds.has(data.id)) failures.push(`duplicate profile id: ${data.id}`);
  profileIds.set(data.id, data);
}

for (const { file, data } of rulePacks) {
  const label = `rule pack ${data.id || file}`;
  requireString(data, "id", label, failures);
  requireString(data, "version", label, failures);
  requireArray(data, "rules", label, failures);

  if (rulePackIds.has(data.id)) failures.push(`duplicate rule pack id: ${data.id}`);
  rulePackIds.set(data.id, data);
}

for (const { data } of profiles) {
  for (const parentId of data.extends || []) {
    if (!profileIds.has(parentId)) failures.push(`profile ${data.id} extends unknown profile ${parentId}`);
  }

  for (const packId of data.rule_packs || []) {
    if (!rulePackIds.has(packId)) failures.push(`profile ${data.id} references unknown rule pack ${packId}`);
  }
}

const ruleIds = new Set();
for (const { data: pack } of rulePacks) {
  for (const rule of pack.rules || []) {
    const label = `rule ${pack.id}/${rule.id || "unknown"}`;
    requireString(rule, "id", label, failures);
    requireString(rule, "title", label, failures);
    requireString(rule, "category", label, failures);
    requireString(rule, "severity", label, failures);
    requireArray(rule, "permissions", label, failures);
    requireArray(rule, "patterns", label, failures);
    requireArray(rule, "recommended_actions", label, failures);
    requireArray(rule, "recommended_alternatives", label, failures);
    requireString(rule, "migration_instruction", label, failures);

    if (ruleIds.has(rule.id)) failures.push(`duplicate rule id: ${rule.id}`);
    ruleIds.add(rule.id);
    if (!VALID_SEVERITIES.has(rule.severity)) failures.push(`${label} has invalid severity: ${rule.severity}`);
    if (!VALID_CATEGORIES.has(rule.category)) failures.push(`${label} has invalid category: ${rule.category}`);
    if (typeof rule.confidence !== "number" || rule.confidence < 0 || rule.confidence > 1) {
      failures.push(`${label} confidence must be between 0 and 1`);
    }
    if (!rule.recommended_actions?.length) failures.push(`${label} must include recommended actions`);
    if (!rule.recommended_alternatives?.length) failures.push(`${label} must include recommended alternatives`);
  }
}

const recommendationIds = new Set();
for (const { data: pack } of recommendationPacks) {
  const label = `recommendation pack ${pack.id}`;
  requireString(pack, "id", label, failures);
  requireString(pack, "version", label, failures);
  requireString(pack, "status", label, failures);
  requireArray(pack, "recommendations", label, failures);

  for (const recommendation of pack.recommendations || []) {
    const itemLabel = `recommendation ${pack.id}/${recommendation.id || "unknown"}`;
    requireString(recommendation, "id", itemLabel, failures);
    requireString(recommendation, "title", itemLabel, failures);
    requireString(recommendation, "type", itemLabel, failures);
    requireString(recommendation, "status", itemLabel, failures);
    requireString(recommendation, "source", itemLabel, failures);
    requireArray(recommendation, "recommended_actions", itemLabel, failures);
    requireArray(recommendation, "recommended_alternatives", itemLabel, failures);
    requireString(recommendation, "agent_instruction", itemLabel, failures);
    requireString(recommendation, "rollback_note", itemLabel, failures);

    if (recommendationIds.has(recommendation.id)) {
      failures.push(`duplicate recommendation id: ${recommendation.id}`);
    }
    recommendationIds.add(recommendation.id);

    if (typeof recommendation.confidence !== "number" || recommendation.confidence < 0 || recommendation.confidence > 1) {
      failures.push(`${itemLabel} confidence must be between 0 and 1`);
    }
    if (!Number.isInteger(recommendation.rank)) {
      failures.push(`${itemLabel} rank must be an integer`);
    }
    if (!recommendation.applies_to || typeof recommendation.applies_to !== "object") {
      failures.push(`${itemLabel} missing applies_to object`);
    }
    if (!recommendation.recommended_actions?.length) {
      failures.push(`${itemLabel} must include recommended actions`);
    }
    if (!recommendation.recommended_alternatives?.length) {
      failures.push(`${itemLabel} must include recommended alternatives`);
    }
    if (!recommendation.one_step_commands?.length) {
      failures.push(`${itemLabel} must include at least one one-step command or instruction`);
    }
  }
}

const ecosystemCandidateIds = new Set();
for (const { data: registry } of ecosystemRegistries) {
  const label = `ecosystem registry ${registry.id}`;
  requireString(registry, "id", label, failures);
  requireString(registry, "version", label, failures);
  requireString(registry, "status", label, failures);
  requireArray(registry, "candidates", label, failures);

  for (const candidate of registry.candidates || []) {
    const itemLabel = `ecosystem candidate ${registry.id}/${candidate.id || "unknown"}`;
    requireString(candidate, "id", itemLabel, failures);
    requireString(candidate, "name", itemLabel, failures);
    requireString(candidate, "entity_type", itemLabel, failures);
    requireString(candidate, "lifecycle_status", itemLabel, failures);
    requireString(candidate, "claim_status", itemLabel, failures);
    requireArray(candidate, "regions", itemLabel, failures);
    requireArray(candidate, "why_candidate", itemLabel, failures);
    requireArray(candidate, "known_or_expected_artifacts", itemLabel, failures);
    requireArray(candidate, "data_needs", itemLabel, failures);
    requireArray(candidate, "profile_impacts", itemLabel, failures);

    if (ecosystemCandidateIds.has(candidate.id)) {
      failures.push(`duplicate ecosystem candidate id: ${candidate.id}`);
    }
    ecosystemCandidateIds.add(candidate.id);
    if (!Number.isInteger(candidate.priority)) {
      failures.push(`${itemLabel} priority must be an integer`);
    }
    if (!candidate.why_candidate?.length) {
      failures.push(`${itemLabel} must explain why it is tracked`);
    }
    if (!candidate.data_needs?.length) {
      failures.push(`${itemLabel} must list data needs`);
    }
  }
}

const trustSignalIds = new Set();
for (const { data: registry } of trustRegistries) {
  const label = `trust registry ${registry.id}`;
  requireString(registry, "id", label, failures);
  requireString(registry, "version", label, failures);
  requireString(registry, "status", label, failures);
  requireArray(registry, "signals", label, failures);

  for (const signal of registry.signals || []) {
    const itemLabel = `trust signal ${registry.id}/${signal.id || "unknown"}`;
    requireString(signal, "id", itemLabel, failures);
    requireString(signal, "title", itemLabel, failures);
    requireString(signal, "direction", itemLabel, failures);
    requireString(signal, "source_type", itemLabel, failures);
    requireArray(signal, "applies_to", itemLabel, failures);
    requireArray(signal, "evidence_required", itemLabel, failures);
    requireString(signal, "description", itemLabel, failures);

    if (trustSignalIds.has(signal.id)) {
      failures.push(`duplicate trust signal id: ${signal.id}`);
    }
    trustSignalIds.add(signal.id);
    if (!Number.isInteger(signal.weight) || signal.weight < -100 || signal.weight > 100) {
      failures.push(`${itemLabel} weight must be an integer between -100 and 100`);
    }
    if (!["positive", "negative", "neutral"].includes(signal.direction)) {
      failures.push(`${itemLabel} has invalid direction: ${signal.direction}`);
    }
    if (!signal.evidence_required?.length) {
      failures.push(`${itemLabel} must define required evidence`);
    }
  }
}

console.log(
  `registry: ${profiles.length} profiles, ${rulePacks.length} rule packs, ${ruleIds.size} rules, ${recommendationIds.size} recommendations, ${ecosystemCandidateIds.size} ecosystem candidates, ${trustSignalIds.size} trust signals checked`
);

if (failures.length) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
