import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

const TRUST_SIGNAL_FILES = ["data/trust/signal-taxonomy.json"];

export async function loadTrustSignalTaxonomies() {
  const taxonomies = [];
  for (const file of TRUST_SIGNAL_FILES) {
    const content = await readFile(join(ROOT, file), "utf8");
    taxonomies.push(JSON.parse(content));
  }
  return taxonomies;
}
