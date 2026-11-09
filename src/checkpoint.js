import fs from "node:fs";
import path from "node:path";

export const CHECKPOINT_PATH = path.resolve("savesweep-progress.json");

export function loadCheckpoint(filePath = CHECKPOINT_PATH) {
  if (!fs.existsSync(filePath)) return null;
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));

  if (!Array.isArray(parsed.links) || !Number.isInteger(parsed.nextIndex)) {
    throw new Error("Progress file is invalid. Move it aside and start a new collection.");
  }
  return {
    links: parsed.links,
    nextIndex: Math.max(0, Math.min(parsed.nextIndex, parsed.links.length)),
    results: parsed.results && typeof parsed.results === "object"
      ? parsed.results
      : { verified: [], failed: [] }
  };
}

export function saveCheckpoint(data, filePath = CHECKPOINT_PATH) {
  const temporaryPath = `${filePath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(temporaryPath, filePath);
}
