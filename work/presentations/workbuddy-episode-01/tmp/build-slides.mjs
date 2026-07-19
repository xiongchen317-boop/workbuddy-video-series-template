import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../..");
const OUTPUT = path.join(ROOT, "outputs", "workbuddy-episode-01-courseware.pptx");
const SLIDE_DIR = path.join(ROOT, "assets", "slides");
const PREVIEW_DIR = path.join(HERE, "preview");
const LAYOUT_DIR = path.join(HERE, "layout");

const C = {
  bg: "#FFF7E8",
  ink: "#17223B",
  orange: "#FF6B35",
  cobalt: "#3157F6",
  mint: "#21C99A",
  berry: "#F34B7D",
  sun: "#FFD23F",
  white: "#FFFEFA",
  muted: "#67718A",
  line: "#D9D4C6",
};

const accentColor = (accent) => C[accent] || C.orange;

function addShape(slide, geometry, position, fill, options = {}) {
  return slide.shapes.add({
    geometry,
    name: options.name,
    position,
    fill,
    line: options.line || { style: "solid", fill: "none", width: 0 },
    borderRadius: options.borderRadius,
    shadow: options.shadow,
    rotation: options.rotation,
  });
}

function addText(slide, text, position, options = {}) {
  const box = addShape(slide, "textbox", position, options.fill || "none", {
    name: options.name,
    line: { style: "solid", fill: "none", width: 0 },
  });
  box.text = text;
  box.text.style = {
    fontFamily: options.fontFamily || "Microsoft YaHei",
    fontSize: options.fontSize || 24,
    bold: options.bold ?? false,
    color: options.color || C.ink,
    alignment: options.alignment || "left",
    verticalAlignment: options.verticalAlignment || "middle",
  };
  return box;
}

function addPill(slide, text, left, top, width, color) {
  addShape(slide, "roundRect", { left, top, width, height: 42 }, color, {
    borderRadius: "rounded-xl",
  });
  addText(slide, text, { left: left + 8, top, width: width - 16, height: 42 }, {
    fontSize: 18,
    bold: true,
    color: C.white,
    alignment: "center",
  });
}

function addBase(slide, scene, index) {
  slide.background.fill = C.bg;
  const accent = accentColor(scene.accent);
  addShape(slide, "rect", { left: 0, top: 0, width: 1280, height: 14 }, accent);
  addShape(slide, "ellipse", { left: 1142, top: 24, width: 104, height: 104 }, C.sun, {
    name: "sunburst-disc",
  });
  addShape(slide, "ellipse", { left: 1178, top: 60, width: 32, height: 32 }, accent);
  addText(slide, "WORKBUDDY · EP 01", {
    left: 64,
    top: 34,
    width: 360,
    height: 32,
  }, {
    fontFamily: "JetBrains Mono",
    fontSize: 16,
    bold: true,
    color: accent,
  });
  addText(slide, scene.section, { left: 64, top: 665, width: 260, height: 26 }, {
    fontSize: 14,
    bold: true,
    color: C.muted,
  });
  addText(slide, `${index + 1} / 8`, { left: 1110, top: 665, width: 106, height: 26 }, {
    fontFamily: "JetBrains Mono",
    fontSize: 14,
    bold: true,
    color: C.muted,
    alignment: "right",
  });
}

function addHeadline(slide, scene, options = {}) {
  const accent = accentColor(scene.accent);
  addText(slide, scene.title, options.title || { left: 64, top: 88, width: 1120, height: 104 }, {
    fontSize: options.titleSize || 43,
    bold: true,
    color: C.ink,
    verticalAlignment: "top",
  });
  addShape(slide, "rect", options.rule || { left: 64, top: 202, width: 116, height: 7 }, accent);
  addText(slide, scene.claim, options.claim || { left: 64, top: 220, width: 1080, height: 66 }, {
    fontSize: options.claimSize || 24,
    bold: true,
    color: accent,
    verticalAlignment: "top",
  });
}

function addBullet(slide, text, left, top, width, accent, number) {
  addShape(slide, "ellipse", { left, top: top + 4, width: 34, height: 34 }, accent);
  addText(slide, String(number), { left, top: top + 4, width: 34, height: 34 }, {
    fontFamily: "JetBrains Mono",
    fontSize: 16,
    bold: true,
    color: C.white,
    alignment: "center",
  });
  addText(slide, text, { left: left + 48, top, width: width - 48, height: 44 }, {
    fontSize: 21,
    bold: true,
    color: C.ink,
  });
}

async function readImage(relativePath) {
  const bytes = await fs.readFile(path.join(ROOT, relativePath));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function addImage(slide, relativePath, position, options = {}) {
  addShape(slide, "roundRect", {
    left: position.left - 8,
    top: position.top - 8,
    width: position.width + 16,
    height: position.height + 16,
  }, options.frameColor || C.white, {
    borderRadius: "rounded-xl",
    line: { style: "solid", fill: options.lineColor || C.line, width: 1 },
    shadow: "shadow-md",
  });
  slide.images.add({
    blob: await readImage(relativePath),
    contentType: "image/png",
    alt: options.alt || "WorkBuddy 官方界面截图",
    fit: options.fit || "contain",
    position,
    geometry: "roundRect",
    borderRadius: "rounded-xl",
  });
}

function addFocusBox(slide, box, color) {
  addShape(slide, "roundRect", box, "none", {
    borderRadius: "rounded-xl",
    line: { style: "solid", fill: color, width: 4 },
  });
}

async function addFullBleedInterface(slide, scene, index, options = {}) {
  slide.background.fill = C.bg;
  const accent = accentColor(scene.accent);
  await addImage(slide, scene.sourceImage, { left: 20, top: 28, width: 1240, height: 664 }, {
    alt: options.alt || "本机 WorkBuddy 实际界面",
    fit: "cover",
    lineColor: accent,
  });
  addShape(slide, "roundRect", { left: 38, top: 44, width: 930, height: 58 }, C.white, {
    borderRadius: "rounded-xl",
    line: { style: "solid", fill: accent, width: 2 },
    shadow: "shadow-sm",
  });
  addText(slide, options.title || scene.title, { left: 58, top: 47, width: 890, height: 52 }, {
    fontSize: options.titleSize || 32,
    bold: true,
    color: C.ink,
  });
  (options.focusBoxes || []).forEach((box) => addFocusBox(slide, box, accent));
  if (options.callout) {
    addPill(slide, options.callout, options.calloutLeft || 760, 632, options.calloutWidth || 450, accent);
  }
  addPill(slide, `EP 01 · ${index + 1}/8`, 1070, 46, 160, C.ink);
  return slide;
}

async function buildCover(presentation, scene, index) {
  const slide = presentation.slides.add();
  await addFullBleedInterface(slide, scene, index, { title: "WorkBuddy 零基础｜跑通第一个任务", titleSize: 36 });
  addShape(slide, "roundRect", { left: 62, top: 132, width: 610, height: 170 }, C.white, {
    borderRadius: "rounded-xl",
    line: { style: "solid", fill: C.orange, width: 3 },
    shadow: "shadow-md",
  });
  addText(slide, "看界面 · 写指令 · 验结果", { left: 92, top: 150, width: 550, height: 72 }, {
    fontSize: 42,
    bold: true,
    color: C.ink,
  });
  addText(slide, "全程使用本机 WorkBuddy 实际操作画面", { left: 94, top: 224, width: 540, height: 48 }, {
    fontSize: 24,
    bold: true,
    color: C.orange,
  });
  return slide;
}

async function buildComparison(presentation, scene, index) {
  const slide = presentation.slides.add();
  return addFullBleedInterface(slide, scene, index, {
    callout: "从输入框开始：说清楚你要的结果",
    focusBoxes: [{ left: 430, top: 405, width: 610, height: 138 }],
  });
}

async function buildSteps(presentation, scene, index) {
  const slide = presentation.slides.add();
  return addFullBleedInterface(slide, scene, index, {
    callout: "安装登录后，先点左上角「新建任务」",
    focusBoxes: [{ left: 34, top: 82, width: 188, height: 42 }],
  });
}

async function buildInterface(presentation, scene, index) {
  const slide = presentation.slides.add();
  return addFullBleedInterface(slide, scene, index, {
    callout: "左边找任务 · 中间看过程 · 底部继续输入",
    calloutLeft: 670,
    calloutWidth: 540,
    focusBoxes: [
      { left: 34, top: 80, width: 188, height: 520 },
      { left: 420, top: 160, width: 630, height: 260 },
      { left: 420, top: 420, width: 630, height: 150 },
    ],
  });
}

async function buildDemo(presentation, scene, index) {
  const slide = presentation.slides.add();
  return addFullBleedInterface(slide, scene, index, {
    callout: "点「选择工作空间」，只授权练习文件夹",
    calloutLeft: 760,
    calloutWidth: 450,
    focusBoxes: [{ left: 438, top: 428, width: 205, height: 154 }],
  });
}

async function buildFormula(presentation, scene, index) {
  const slide = presentation.slides.add();
  return addFullBleedInterface(slide, scene, index, {
    callout: "实际录屏：输入 → 优化 → 检查",
    calloutLeft: 820,
    calloutWidth: 390,
    focusBoxes: [{ left: 430, top: 365, width: 630, height: 220 }],
  });
}

async function buildSafety(presentation, scene, index) {
  const slide = presentation.slides.add();
  return addFullBleedInterface(slide, scene, index, {
    callout: "保持默认权限；需要时再临时放开",
    calloutLeft: 790,
    calloutWidth: 420,
    focusBoxes: [{ left: 525, top: 455, width: 205, height: 122 }],
  });
}

async function buildChecklist(presentation, scene, index) {
  const slide = presentation.slides.add();
  return addFullBleedInterface(slide, scene, index, {
    callout: "打开结果，逐项核对状态和交付文件",
    calloutLeft: 760,
    calloutWidth: 450,
    focusBoxes: [{ left: 410, top: 150, width: 665, height: 260 }],
  });
}

async function main() {
  await fs.mkdir(SLIDE_DIR, { recursive: true });
  await fs.mkdir(PREVIEW_DIR, { recursive: true });
  await fs.mkdir(LAYOUT_DIR, { recursive: true });
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });

  const episode = JSON.parse(await fs.readFile(path.join(ROOT, "content", "episode.json"), "utf8"));
  const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
  const builders = [buildCover, buildComparison, buildSteps, buildInterface, buildDemo, buildFormula, buildSafety, buildChecklist];

  for (let index = 0; index < episode.scenes.length; index += 1) {
    await builders[index](presentation, episode.scenes[index], index);
  }

  for (const [index, slide] of presentation.slides.items.entries()) {
    const stem = `slide-${String(index + 1).padStart(2, "0")}`;
    const png = await presentation.export({ slide, format: "png", scale: 1.5 });
    const bytes = new Uint8Array(await png.arrayBuffer());
    await fs.writeFile(path.join(SLIDE_DIR, `${stem}.png`), bytes);
    await fs.writeFile(path.join(PREVIEW_DIR, `${stem}.png`), bytes);
    const layout = await slide.export({ format: "layout" });
    await fs.writeFile(path.join(LAYOUT_DIR, `${stem}.layout.json`), await layout.text());
  }

  const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
  await fs.writeFile(path.join(PREVIEW_DIR, "deck-montage.webp"), new Uint8Array(await montage.arrayBuffer()));
  const pptx = await PresentationFile.exportPptx(presentation);
  await pptx.save(OUTPUT);
  console.log(`slides: ${presentation.slides.items.length}`);
  console.log(`pptx: ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
