import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { buildTimeline, validateEpisode } from "../src/episode.mjs";
import { npxInvocation } from "./process-tools.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO_DIR = path.join(ROOT, "audio");
const EPISODE_PATH = path.join(ROOT, "content", "episode.json");
const force = process.argv.includes("--force");
const timelineOnly = process.argv.includes("--timeline-only");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || `exit ${result.status}`;
    throw new Error(`${command} failed: ${detail}`);
  }
  return result.stdout?.trim();
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await fs.mkdir(AUDIO_DIR, { recursive: true });
  const episode = validateEpisode(JSON.parse(await fs.readFile(EPISODE_PATH, "utf8")));
  const durations = {};
  for (const scene of episode.scenes) {
    const output = path.join(AUDIO_DIR, `${scene.id}.wav`);
    if (!timelineOnly && (force || !(await exists(output)))) {
      console.log(`tts ${scene.id}: ${scene.narration.length} chars`);
      const invocation = npxInvocation([
        "--yes",
        "hyperframes@0.7.64",
        "tts",
        scene.narration,
        "--voice",
        episode.voice.id,
        "--lang",
        episode.voice.language,
        "--speed",
        String(episode.voice.speed),
        "--output",
        output,
      ]);
      run(invocation.command, invocation.args);
    }
    if (!(await exists(output))) {
      throw new Error(`missing narration audio for ${scene.id}`);
    }
    const duration = Number(run("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      output,
    ], { capture: true }));
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error(`invalid duration for ${scene.id}`);
    }
    durations[scene.id] = Number(duration.toFixed(3));
  }

  const timeline = buildTimeline(episode, durations, { leadIn: 0.55, gap: 0.5 });
  await fs.writeFile(path.join(AUDIO_DIR, "timing.json"), `${JSON.stringify(timeline, null, 2)}\n`, "utf8");
  console.log(`timeline: ${timeline.duration.toFixed(3)}s`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
