import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildTimeline,
  splitCaptionGroups,
  validateEpisode,
} from "../src/episode.mjs";
import { npxInvocation } from "../scripts/process-tools.mjs";
import { renderHyperframesHtml } from "../src/hyperframes-html.mjs";

const sampleEpisode = {
  id: "workbuddy-episode-01",
  title: "WorkBuddy 零基础入门",
  fps: 30,
  scenes: Array.from({ length: 8 }, (_, index) => ({
    id: `scene-${String(index + 1).padStart(2, "0")}`,
    title: `场景 ${index + 1}`,
    claim: `要点 ${index + 1}`,
    narration: "先指定范围，再说明动作。最后写清交付结果和安全边界。",
    promptParts: index === 5 ? ["范围", "动作", "交付", "边界"] : [],
  })),
};

test("episode contract accepts exactly eight uniquely identified scenes", () => {
  const result = validateEpisode(sampleEpisode);
  assert.equal(result.scenes.length, 8);
  assert.equal(new Set(result.scenes.map((scene) => scene.id)).size, 8);
});

test("episode contract rejects a prompt formula without all four parts", () => {
  const invalid = structuredClone(sampleEpisode);
  invalid.scenes[5].promptParts = ["范围", "动作", "交付"];
  assert.throws(() => validateEpisode(invalid), /范围、动作、交付、边界/);
});

test("caption grouping keeps Chinese phrases short and complete", () => {
  assert.deepEqual(
    splitCaptionGroups("先指定范围，再说明动作。最后写清交付结果和安全边界。"),
    ["先指定范围", "再说明动作", "最后写清交付结果", "和安全边界"],
  );
});

test("timeline places audio sequentially and captions inside each scene", () => {
  const durations = Object.fromEntries(
    sampleEpisode.scenes.map((scene, index) => [scene.id, 5 + index * 0.25]),
  );
  const timeline = buildTimeline(sampleEpisode, durations, { leadIn: 0.4, gap: 0.35 });

  assert.equal(timeline.scenes[0].start, 0);
  assert.equal(timeline.scenes[1].start, timeline.scenes[0].end);
  assert.equal(timeline.duration, timeline.scenes.at(-1).end);
  for (const scene of timeline.scenes) {
    assert.equal(scene.audioStart, scene.start + 0.4);
    assert.ok(scene.captions.every((caption) => caption.start >= scene.start));
    assert.ok(scene.captions.every((caption) => caption.end <= scene.end));
  }
});

test("npx invocation uses Node directly so Unicode narration survives on Windows", () => {
  const invocation = npxInvocation(["hyperframes", "tts", "你好"]);
  assert.equal(invocation.command, process.execPath);
  assert.ok(invocation.args[0].endsWith("npx-cli.js"));
  assert.deepEqual(invocation.args.slice(-3), ["hyperframes", "tts", "你好"]);
});

test("HyperFrames HTML contains eight scenes, eight audio clips, transitions, and registered timeline", () => {
  const durations = Object.fromEntries(sampleEpisode.scenes.map((scene) => [scene.id, 5]));
  const timeline = buildTimeline(sampleEpisode, durations);
  const html = renderHyperframesHtml(sampleEpisode, timeline);

  assert.equal((html.match(/class="scene"/g) || []).length, 8);
  assert.equal((html.match(/<audio/g) || []).length, 8);
  assert.equal((html.match(/class="clip narration"/g) || []).length, 8);
  assert.equal((html.match(/data-transition=/g) || []).length, 7);
  assert.match(html, /window\.__timelines\["workbuddy-episode-01"\] = tl/);
  assert.match(html, /visibility: "hidden"/);
  assert.doesNotMatch(html, /repeat\s*:\s*-1/);
});

test("HyperFrames HTML explicitly hides later scenes and declares the local Chinese font", () => {
  const durations = Object.fromEntries(sampleEpisode.scenes.map((scene) => [scene.id, 5]));
  const html = renderHyperframesHtml(sampleEpisode, buildTimeline(sampleEpisode, durations));
  assert.match(html, /#scene-02, #scene-03, #scene-04, #scene-05, #scene-06, #scene-07, #scene-08 \{ opacity: 0; \}/);
  assert.match(html, /@font-face \{ font-family: "Microsoft YaHei"; src: local\("Microsoft YaHei"\); \}/);
  assert.doesNotMatch(html, /pointer-events: none/);
  assert.doesNotMatch(html, /\n\s*\n/);
});

test("every instructional scene uses a WorkBuddy interface screenshot and no on-screen AI voice label", () => {
  const episode = JSON.parse(fs.readFileSync(new URL("../content/episode.json", import.meta.url), "utf8"));
  for (const scene of episode.scenes.slice(1)) {
    assert.match(scene.sourceImage || "", /^assets\/source\/workbuddy-.+\.png$/);
  }
  assert.doesNotMatch(JSON.stringify(episode), /AI 合成/);
});

test("HyperFrames reserves a dedicated subtitle lane and has no duplicate focus chip", () => {
  const durations = Object.fromEntries(sampleEpisode.scenes.map((scene) => [scene.id, 5]));
  const html = renderHyperframesHtml(sampleEpisode, buildTimeline(sampleEpisode, durations));
  assert.doesNotMatch(html, /focus-chip/);
  assert.match(html, /\.slide-image \{[^}]*width: 1920px;[^}]*height: 972px;/);
  assert.match(html, /\.caption-lane \{[^}]*bottom: 0;[^}]*height: 108px;/);
});

test("all slides stay inside episode one and narration keeps peak headroom", () => {
  const slideBuilder = fs.readFileSync(
    new URL("../work/presentations/workbuddy-episode-01/tmp/build-slides.mjs", import.meta.url),
    "utf8",
  );
  assert.match(slideBuilder, /WORKBUDDY · EP 01/);
  assert.doesNotMatch(slideBuilder, /WORKBUDDY · EP \$\{String\(index \+ 1\)/);

  const durations = Object.fromEntries(sampleEpisode.scenes.map((scene) => [scene.id, 5]));
  const html = renderHyperframesHtml(sampleEpisode, buildTimeline(sampleEpisode, durations));
  assert.match(html, /data-volume="0\.89"/);
});

test("published timeline metadata stays synchronized with the selected CosyVoice audio", () => {
  const timing = JSON.parse(fs.readFileSync(new URL("../audio/timing.json", import.meta.url), "utf8"));
  const timeline = JSON.parse(fs.readFileSync(new URL("../audio/timeline.json", import.meta.url), "utf8"));
  assert.equal(timeline.duration, timing.duration);
  assert.deepEqual(
    timeline.scenes.map((scene) => scene.audioDuration),
    timing.scenes.map((scene) => scene.audioDuration),
  );

  const cosyWrapper = fs.readFileSync(
    new URL("../scripts/build-cosyvoice-audio.mjs", import.meta.url),
    "utf8",
  );
  assert.match(cosyWrapper, /build-timeline\.mjs/);
  assert.match(cosyWrapper, /revoice-existing-narration\.py/);
});

test("instructional slides prioritize readable live WorkBuddy captures", () => {
  const episode = JSON.parse(fs.readFileSync(new URL("../content/episode.json", import.meta.url), "utf8"));
  assert.equal(episode.scenes[0].sourceImage, "assets/source/workbuddy-live-home.png");
  for (const scene of episode.scenes.slice(1)) {
    assert.match(scene.sourceImage || "", /^assets\/source\/workbuddy-live-.+\.png$/);
  }
  assert.equal(episode.scenes[5].demoVideo, "assets/source/workbuddy-live-demo.mp4");

  const slideBuilder = fs.readFileSync(
    new URL("../work/presentations/workbuddy-episode-01/tmp/build-slides.mjs", import.meta.url),
    "utf8",
  );
  assert.match(slideBuilder, /function addFullBleedInterface\(/);
  assert.match(slideBuilder, /left: 20, top: 28, width: 1240, height: 664/);
  assert.doesNotMatch(slideBuilder, /const short = \["说清目标"/);
});

test("video begins with useful content and embeds the real WorkBuddy recording", () => {
  const episode = structuredClone(sampleEpisode);
  episode.scenes[5].demoVideo = "assets/source/workbuddy-live-demo.mp4";
  episode.scenes[5].demoStart = 11.5;
  episode.scenes[5].demoDuration = 6.5;
  const durations = Object.fromEntries(episode.scenes.map((scene) => [scene.id, scene.id === "scene-06" ? 8 : 5]));
  const html = renderHyperframesHtml(episode, buildTimeline(episode, durations));

  assert.match(html, /\.slide-image \{[^}]*left: 0;[^}]*width: 1920px;[^}]*height: 972px;/);
  assert.match(html, /class="screen-recording clip"/);
  assert.match(html, /muted playsinline/);
  assert.match(html, /data-duration="6\.5"[^>]*data-media-start="11\.5"/);
  assert.doesNotMatch(html, /tl\.from\("#scene-01-slide", \{[^}]*opacity: 0/);
  assert.match(html, /Final scene stays useful[\s\S]*overwrite: "auto"/);
});

test("CosyVoice selection enforces cross-segment speaker continuity", () => {
  const generator = fs.readFileSync(
    new URL("../scripts/build-cosyvoice-narration.py", import.meta.url),
    "utf8",
  );
  assert.match(generator, /ADJACENT_SIMILARITY_THRESHOLD\s*=\s*0\.86/);
  assert.match(generator, /def select_consistent_sequence\(/);
  assert.match(generator, /previousSegmentSimilarity/);
  assert.doesNotMatch(generator, /20260719 \+ index/);
  assert.doesNotMatch(generator, /20261719 \+ index/);
});

test("CosyVoice continuity repair keeps timing and converts every existing segment to the fixed reference", () => {
  const repair = fs.readFileSync(
    new URL("../scripts/revoice-existing-narration.py", import.meta.url),
    "utf8",
  );
  assert.match(repair, /model\.inference_vc\(/);
  assert.match(repair, /ADJACENT_SIMILARITY_THRESHOLD\s*=\s*0\.86/);
  assert.match(repair, /female_question_reference_999\.wav/);
  assert.match(repair, /previousSegmentSimilarity/);
  assert.match(repair, /speed=1\.0/);
});

test("narration ASR gate blocks prompt leakage and low transcript similarity", () => {
  const audit = fs.readFileSync(
    new URL("../scripts/audit-narration-asr.py", import.meta.url),
    "utf8",
  );
  assert.match(audit, /AVERAGE_SIMILARITY_THRESHOLD\s*=\s*0\.72/);
  assert.match(audit, /保持原音色/);
  assert.match(audit, /不要停顿/);
  assert.match(audit, /asr-audit\.json/);
});
