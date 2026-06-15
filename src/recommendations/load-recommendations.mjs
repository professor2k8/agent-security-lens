import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

const RECOMMENDATION_PACK_FILES = ["data/recommendations/core/recommendations.json"];

export async function loadRecommendationPacks() {
  const packs = [];
  for (const file of RECOMMENDATION_PACK_FILES) {
    const content = await readFile(join(ROOT, file), "utf8");
    packs.push(JSON.parse(content));
  }
  return packs;
}
