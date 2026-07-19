import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COSY_ROOT = process.env.COSYVOICE_ROOT || "D:\\AI\\CosyVoice";
const PYTHON = process.env.COSYVOICE_PYTHON || path.join(COSY_ROOT, ".venv", "Scripts", "python.exe");

const result = spawnSync(PYTHON, [
  path.join(ROOT, "scripts", "build-cosyvoice-narration.py"),
  "--project", ROOT,
  "--cosy-root", COSY_ROOT,
  ...process.argv.slice(2),
], { cwd: ROOT, stdio: "inherit", shell: false });

if (result.status !== 0) process.exit(result.status ?? 1);

const timeline = spawnSync(process.execPath, [
  path.join(ROOT, "scripts", "build-audio.mjs"),
  "--timeline-only",
], { cwd: ROOT, stdio: "inherit", shell: false });

if (timeline.status !== 0) process.exit(timeline.status ?? 1);

const publishedTimeline = spawnSync(process.execPath, [
  path.join(ROOT, "scripts", "build-timeline.mjs"),
], { cwd: ROOT, stdio: "inherit", shell: false });

process.exit(publishedTimeline.status ?? 1);
