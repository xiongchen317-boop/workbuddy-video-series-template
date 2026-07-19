function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function seconds(value) {
  return Number(value).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function sceneMarkup(scene, index) {
  const transition = index === 0 ? "" : ` data-transition="${index === 4 || index === 7 ? "blur" : "push"}"`;
  const demoFile = scene.demoVideo ? String(scene.demoVideo).split(/[\\/]/).at(-1) : null;
  const demoStart = Number.isFinite(Number(scene.demoStart)) ? Number(scene.demoStart) : 0;
  const requestedDemoDuration = Number.isFinite(Number(scene.demoDuration)) ? Number(scene.demoDuration) : 18;
  const demoDuration = Math.min(requestedDemoDuration, Math.max(1, scene.duration - 1.2));
  const demo = demoFile ? `
        <video id="${scene.id}-demo" class="screen-recording clip" data-start="${seconds(scene.start + 0.6)}" data-duration="${seconds(demoDuration)}" data-track-index="1" data-media-start="${seconds(demoStart)}" src="assets/video/${escapeHtml(demoFile)}" muted playsinline></video>` : "";
  return `
      <div id="${scene.id}" class="scene"${transition}>
        <img id="${scene.id}-slide" class="slide-image" src="assets/slides/slide-${String(index + 1).padStart(2, "0")}.png" alt="${escapeHtml(scene.title)}" />
${demo}
      </div>`;
}

function audioMarkup(scene) {
  return `
      <audio id="audio-${scene.id}" class="clip narration" data-start="${seconds(scene.audioStart)}" data-duration="${seconds(scene.audioDuration)}" data-track-index="2" data-volume="0.89" src="assets/audio/${scene.id}.wav"></audio>`;
}

function captionMarkup(scene, sceneIndex) {
  return scene.captions.map((caption, captionIndex) => `
      <div id="caption-${sceneIndex}-${captionIndex}" class="caption-group"><span>${escapeHtml(caption.text)}</span></div>`).join("");
}

function transitionJs(timeline) {
  return timeline.scenes.slice(1).map((scene, index) => {
    const oldScene = timeline.scenes[index];
    const T = seconds(scene.start);
    if (index + 1 === 4 || index + 1 === 7) {
      return `
      // ${oldScene.id} → ${scene.id}: section-change blur crossfade
      tl.to("#${oldScene.id}", { filter: "blur(10px)", scale: 1.03, opacity: 0, duration: 0.5, ease: "power2.inOut" }, ${T});
      tl.fromTo("#${scene.id}", { filter: "blur(10px)", scale: 0.97, opacity: 0 }, { filter: "blur(0px)", scale: 1, opacity: 1, duration: 0.5, ease: "power2.inOut" }, ${T});
      tl.set("#${oldScene.id}", { filter: "blur(0px)", scale: 1, opacity: 0 }, ${seconds(scene.start + 0.51)});`;
    }
    return `
      // ${oldScene.id} → ${scene.id}: primary push transition
      tl.to("#${oldScene.id}", { x: -1920, duration: 0.45, ease: "power3.inOut" }, ${T});
      tl.fromTo("#${scene.id}", { x: 1920, opacity: 1 }, { x: 0, opacity: 1, duration: 0.45, ease: "power3.inOut" }, ${T});
      tl.set("#${oldScene.id}", { x: 0, opacity: 0 }, ${seconds(scene.start + 0.46)});`;
  }).join("\n");
}

function entranceJs(timeline) {
  const eases = [
    ["expo.out", "back.out(1.4)", "power3.out", "sine.out", "power4.out"],
    ["power4.out", "expo.out", "back.out(1.2)", "sine.out", "power2.out"],
    ["back.out(1.35)", "power3.out", "expo.out", "sine.out", "power4.out"],
  ];
  return timeline.scenes.map((scene, index) => {
    const at = scene.start + (index === 0 ? 0 : 0.23);
    const e = eases[index % eases.length];
    const ambientDuration = Math.max(1, scene.duration - 1.4);
    if (index === 0) {
      return `
      // ${scene.id}: frame zero is already useful and fully visible.
      tl.from("#${scene.id}-slide", { scale: 0.995, duration: 0.58, ease: "${e[0]}" }, 0);
      tl.to("#${scene.id}-slide", { scale: 1.004, duration: ${seconds(ambientDuration)}, ease: "sine.inOut" }, 0.62);`;
    }
    return `
      // ${scene.id}: build → breathe
      tl.from("#${scene.id}-slide", { scale: 0.975, opacity: 0, duration: 0.72, ease: "${e[0]}" }, ${seconds(at)});
      tl.to("#${scene.id}-slide", { scale: 1.006, duration: ${seconds(ambientDuration)}, ease: "sine.inOut" }, ${seconds(at + 0.8)});`;
  }).join("\n");
}

function captionJs(timeline) {
  return timeline.scenes.flatMap((scene, sceneIndex) => scene.captions.map((caption, captionIndex) => {
    const selector = `#caption-${sceneIndex}-${captionIndex}`;
    const enterEnd = Math.min(caption.end - 0.18, caption.start + 0.34);
    const exitStart = Math.max(enterEnd + 0.05, caption.end - 0.12);
    return `
      tl.set("${selector}", { visibility: "visible" }, ${seconds(caption.start)});
      tl.fromTo("${selector}", { opacity: 0, y: 18, scale: 0.98 }, { opacity: 1, y: 0, scale: 1, duration: ${seconds(Math.max(0.12, enterEnd - caption.start))}, ease: "power3.out" }, ${seconds(caption.start)});
      tl.to("${selector}", { opacity: 0, scale: 0.98, duration: 0.12, ease: "power2.in" }, ${seconds(exitStart)});
      tl.set("${selector}", { opacity: 0, visibility: "hidden" }, ${seconds(caption.end)});`;
  })).join("\n");
}

export function renderHyperframesHtml(episode, timeline) {
  const scenes = timeline.scenes.map(sceneMarkup).join("\n");
  const audio = timeline.scenes.map(audioMarkup).join("\n");
  const captions = timeline.scenes.map(captionMarkup).join("\n");
  const finalScene = timeline.scenes.at(-1);
  const hiddenSceneCss = timeline.scenes.slice(1).map((scene) => `#${scene.id}`).join(", ");

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Microsoft YaHei"; src: local("Microsoft YaHei"); }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #FFF7E8; }
      body { font-family: "Microsoft YaHei", sans-serif; color: #17223B; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #FFF7E8; }
      .scene { position: absolute; inset: 0; width: 1920px; height: 1080px; overflow: hidden; background-color: #FFF7E8; }
      ${hiddenSceneCss} { opacity: 0; }
      .slide-image { position: absolute; left: 0; top: 0; width: 1920px; height: 972px; object-fit: contain; transform-origin: center top; }
      .screen-recording { position: absolute; left: 0; top: 0; width: 1920px; height: 972px; object-fit: contain; object-position: center center; background: #F6F7F9; z-index: 20; }
      .caption-lane { position: absolute; left: 0; right: 0; bottom: 0; height: 108px; background: #FFF7E8; border-top: 2px solid rgba(23,34,59,.1); z-index: 70; }
      .caption-group { position: absolute; left: 90px; right: 90px; bottom: 10px; height: 88px; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; z-index: 80; }
      .caption-group span { display: inline-block; max-width: 1600px; color: #FFFEFA; font-size: 46px; font-weight: 800; line-height: 1.08; letter-spacing: -0.02em; text-align: center; -webkit-text-stroke: 2px #17223B; paint-order: stroke fill; text-shadow: 0 3px 5px rgba(23,34,59,.45); }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="${escapeHtml(episode.id)}" data-start="0" data-duration="${seconds(timeline.duration)}" data-width="1920" data-height="1080">
${scenes}
${audio}
      <div class="caption-lane" data-layout-ignore></div>
${captions}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
${transitionJs(timeline)}
${entranceJs(timeline)}
${captionJs(timeline)}
      // Final scene stays useful through the last frame.
      tl.to("#${finalScene.id}-slide", { scale: 1.003, duration: 0.7, ease: "sine.out", overwrite: "auto" }, ${seconds(timeline.duration - 0.72)});
      window.__timelines["${escapeHtml(episode.id)}"] = tl;
    </script>
  </body>
</html>
`.replace(/\n\s*\n/g, "\n");
}
