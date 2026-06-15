import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { compareAssessmentResults } from "../results/compare-results.mjs";

const DEFAULT_STORE_DIR = join(process.cwd(), ".agentsecuritylens", "store", "assessments");

function safeTimestamp(value) {
  return value.replace(/[:.]/g, "-");
}

function targetSlug(targetPath) {
  return basename(targetPath).replace(/[^a-zA-Z0-9._-]+/g, "-") || "target";
}

export function assessmentStoreDir() {
  return resolve(process.env.ASL_STORE_DIR || DEFAULT_STORE_DIR);
}

function assessmentFileName(result) {
  return [
    safeTimestamp(result.assessment.started_at),
    targetSlug(result.assessment.target_path),
    result.assessment.id
  ].join("__") + ".json";
}

function summaryFromResult(result, filePath) {
  return {
    id: result.assessment.id,
    target_path: result.assessment.target_path,
    completed_at: result.assessment.completed_at,
    selected_profile: result.lineage.profile_selection.selected_profile,
    trust_score: result.summary.trust_score,
    total_findings: result.summary.total_findings,
    trust_signals: result.trust_signals?.length || 0,
    file_path: filePath
  };
}

export async function saveToAssessmentStore(result) {
  const dir = assessmentStoreDir();
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, assessmentFileName(result));
  await writeFile(filePath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return summaryFromResult(result, filePath);
}

export async function listAssessmentStore() {
  const dir = assessmentStoreDir();
  await mkdir(dir, { recursive: true });
  const files = (await readdir(dir)).filter((file) => file.endsWith(".json"));
  const items = [];

  for (const file of files) {
    const filePath = join(dir, file);
    try {
      const result = JSON.parse(await readFile(filePath, "utf8"));
      items.push(summaryFromResult(result, filePath));
    } catch {
      continue;
    }
  }

  return items.sort((left, right) => right.completed_at.localeCompare(left.completed_at));
}

export async function readAssessmentFromStore(id) {
  const items = await listAssessmentStore();
  const item = items.find((entry) => entry.id === id);
  if (!item) throw new Error(`Assessment not found: ${id}`);
  return JSON.parse(await readFile(item.file_path, "utf8"));
}

export async function compareStoredAssessments(previousId, currentId) {
  const previous = await readAssessmentFromStore(previousId);
  const current = await readAssessmentFromStore(currentId);
  return compareAssessmentResults(previous, current);
}
