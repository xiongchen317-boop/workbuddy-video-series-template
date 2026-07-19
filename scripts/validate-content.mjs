import fs from "node:fs/promises";
import { validateEpisode } from "../src/episode.mjs";

const episode = JSON.parse(await fs.readFile(new URL("../content/episode.json", import.meta.url), "utf8"));
validateEpisode(episode);
console.log(`content ok: ${episode.id} (${episode.scenes.length} scenes)`);
