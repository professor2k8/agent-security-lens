import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

export async function loadRulePacks(profiles) {
  const packIds = new Set();
  for (const profile of profiles) {
    for (const packId of profile.rule_packs || []) {
      packIds.add(packId);
    }
  }

  const packs = [];
  for (const packId of packIds) {
    const content = await readFile(join(ROOT, "rule-packs", packId, "rules.json"), "utf8");
    packs.push(JSON.parse(content));
  }
  return packs;
}
