import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTimeline } from "../src/episode.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const episode = JSON.parse(
  await fs.readFile(path.join(ROOT, "content", "episode.json"), "utf8"),
);
const timing = JSON.parse(
  await fs.readFile(path.join(ROOT, "audio", "timing.json"), "utf8"),
);

const audioDurations = Array.isArray(timing.scenes)
  ? Object.fromEntries(timing.scenes.map((scene) => [scene.id, scene.audioDuration]))
  : timing;
const timeline = buildTimeline(episode, audioDurations, { leadIn: 0.55, gap: 0.5 });
await fs.writeFile(
  path.join(ROOT, "audio", "timeline.json"),
  `${JSON.stringify(timeline, null, 2)}\n`,
  "utf8",
);

console.log(`Wrote ${timeline.scenes.length} scenes to audio/timeline.json`);
