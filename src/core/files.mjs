import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const DEFAULT_IGNORES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".cache",
  "__pycache__"
]);

const MAX_FILE_SIZE_BYTES = 512 * 1024;
const SUPPORTED_EXTENSIONS = new Set([
  "",
  ".md",
  ".txt",
  ".json",
  ".jsonc",
  ".yaml",
  ".yml",
  ".toml",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".py",
  ".sh",
  ".bash",
  ".zsh",
  ".ps1",
  ".env",
  ".example"
]);

function extnameLoose(path) {
  const name = path.toLowerCase();
  if (name.endsWith(".env") || name.includes(".env.")) return ".env";
  const index = name.lastIndexOf(".");
  return index === -1 ? "" : name.slice(index);
}

export async function discoverFiles(root) {
  const files = [];

  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (DEFAULT_IGNORES.has(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;

      const info = await stat(fullPath);
      if (info.size > MAX_FILE_SIZE_BYTES) continue;
      const ext = extnameLoose(fullPath);
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

      files.push({
        path: fullPath,
        relative_path: relative(root, fullPath).replaceAll("\\", "/"),
        size: info.size
      });
    }
  }

  await walk(root);
  return files;
}
