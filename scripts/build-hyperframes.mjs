import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateEpisode } from "../src/episode.mjs";
import { renderHyperframesHtml } from "../src/hyperframes-html.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT = path.join(ROOT, "hyperframes");

async function copyFolderFiles(sourceDir, targetDir, extension) {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(extension)) {
      await fs.copyFile(path.join(sourceDir, entry.name), path.join(targetDir, entry.name));
    }
  }
}

async function main() {
  const episode = validateEpisode(JSON.parse(await fs.readFile(path.join(ROOT, "content", "episode.json"), "utf8")));
  const timeline = JSON.parse(await fs.readFile(path.join(ROOT, "audio", "timing.json"), "utf8"));
  const html = renderHyperframesHtml(episode, timeline);

  await fs.writeFile(path.join(PROJECT, "index.html"), html, "utf8");
  await fs.copyFile(path.join(ROOT, "DESIGN.md"), path.join(PROJECT, "DESIGN.md"));
  await copyFolderFiles(path.join(ROOT, "assets", "slides"), path.join(PROJECT, "assets", "slides"), ".png");
  await copyFolderFiles(path.join(ROOT, "audio"), path.join(PROJECT, "assets", "audio"), ".wav");
  console.log(`hyperframes: ${path.join(PROJECT, "index.html")}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
