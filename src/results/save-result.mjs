import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

function safeTimestamp(value) {
  return value.replace(/[:.]/g, "-");
}

function targetSlug(targetPath) {
  return basename(targetPath).replace(/[^a-zA-Z0-9._-]+/g, "-") || "target";
}

export async function saveAssessmentResult({ result, outDir }) {
  const baseDir = resolve(outDir || join(result.assessment.target_path, ".agentsecuritylens", "runs"));
  await mkdir(baseDir, { recursive: true });

  const fileName = [
    safeTimestamp(result.assessment.started_at),
    targetSlug(result.assessment.target_path),
    result.assessment.id
  ].join("__");
  const outputPath = join(baseDir, `${fileName}.json`);

  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");

  return {
    path: outputPath,
    archived_at: new Date().toISOString()
  };
}
