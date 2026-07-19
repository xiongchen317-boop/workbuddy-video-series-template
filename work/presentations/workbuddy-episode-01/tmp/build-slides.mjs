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

async function buildCover(presentation, scene, index) {
  const slide = presentation.slides.add();
  addBase(slide, scene, index);
  addText(slide, "零基础教程", { left: 64, top: 108, width: 300, height: 54 }, {
    fontSize: 26,
    bold: true,
    color: C.orange,
  });
  addText(slide, "WORK\nBUDDY", { left: 64, top: 160, width: 560, height: 240 }, {
    fontFamily: "JetBrains Mono",
    fontSize: 88,
    bold: true,
    color: C.ink,
    verticalAlignment: "top",
  });
  addText(slide, scene.claim, { left: 70, top: 428, width: 720, height: 74 }, {
    fontSize: 28,
    bold: true,
    color: C.cobalt,
    verticalAlignment: "top",
  });
  addShape(slide, "ellipse", { left: 858, top: 128, width: 300, height: 300 }, C.orange);
  addText(slide, "01", { left: 858, top: 128, width: 300, height: 300 }, {
    fontFamily: "JetBrains Mono",
    fontSize: 138,
    bold: true,
    color: C.white,
    alignment: "center",
  });
  const colors = [C.orange, C.cobalt, C.mint];
  scene.bullets.forEach((item, i) => addPill(slide, item, 70 + i * 205, 548, 176, colors[i]));
  return slide;
}

async function buildComparison(presentation, scene, index) {
  const slide = presentation.slides.add();
  addBase(slide, scene, index);
  addHeadline(slide, scene, {
    title: { left: 64, top: 82, width: 520, height: 100 },
    rule: { left: 64, top: 190, width: 110, height: 7 },
    claim: { left: 64, top: 208, width: 500, height: 78 },
    titleSize: 38,
    claimSize: 22,
  });
  const short = ["说清目标", "自动规划", "执行步骤", "右侧交付结果"];
  short.forEach((item, i) => addBullet(slide, item, 70, 330 + i * 62, 450, C.cobalt, i + 1));
  await addImage(slide, scene.sourceImage, { left: 590, top: 132, width: 612, height: 438 }, {
    alt: "WorkBuddy 任务执行与右侧结果预览界面",
    fit: "contain",
    lineColor: C.cobalt,
  });
  addShape(slide, "roundRect", { left: 928, top: 150, width: 258, height: 396 }, "none", {
    borderRadius: "rounded-xl",
    line: { style: "solid", fill: C.orange, width: 4 },
  });
  addPill(slide, "看这里：执行过程 + 结果", 778, 586, 310, C.orange);
  return slide;
}

async function buildSteps(presentation, scene, index) {
  const slide = presentation.slides.add();
  addBase(slide, scene, index);
  addHeadline(slide, scene, { title: { left: 64, top: 76, width: 560, height: 98 }, rule: { left: 64, top: 182, width: 100, height: 7 }, claim: { left: 64, top: 198, width: 540, height: 72 }, titleSize: 40, claimSize: 22 });
  scene.bullets.forEach((item, i) => addBullet(slide, item, 68, 300 + i * 72, 500, C.mint, i + 1));
  await addImage(slide, scene.sourceImage, { left: 620, top: 120, width: 580, height: 462 }, {
    alt: "WorkBuddy 官方下载页面截图",
    fit: "cover",
    lineColor: C.mint,
  });
  addText(slide, "只从官网下载安装", { left: 740, top: 542, width: 348, height: 44 }, {
    fontSize: 20, bold: true, color: C.white, alignment: "center", fill: C.mint,
  });
  return slide;
}

async function buildInterface(presentation, scene, index) {
  const slide = presentation.slides.add();
  addBase(slide, scene, index);
  addText(slide, scene.title, { left: 64, top: 76, width: 700, height: 70 }, { fontSize: 42, bold: true });
  addText(slide, scene.claim, { left: 66, top: 144, width: 780, height: 42 }, { fontSize: 23, bold: true, color: C.berry });
  await addImage(slide, scene.sourceImage, { left: 92, top: 212, width: 1096, height: 380 }, {
    alt: "WorkBuddy 主界面官方截图",
    fit: "cover",
    lineColor: C.berry,
  });
  const labels = [
    { text: "1 任务侧栏", left: 112, color: C.orange },
    { text: "2 对话区", left: 498, color: C.cobalt },
    { text: "3 结果区", left: 940, color: C.mint },
  ];
  labels.forEach((label) => addPill(slide, label.text, label.left, 604, 180, label.color));
  return slide;
}

async function buildDemo(presentation, scene, index) {
  const slide = presentation.slides.add();
  addBase(slide, scene, index);
  addHeadline(slide, scene, {
    title: { left: 64, top: 82, width: 650, height: 92 },
    rule: { left: 64, top: 182, width: 110, height: 7 },
    claim: { left: 64, top: 200, width: 620, height: 66 },
    titleSize: 39,
    claimSize: 22,
  });
  const colors = [C.cobalt, C.mint, C.orange, C.berry];
  scene.bullets.forEach((item, i) => {
    const top = 312 + i * 66;
    addShape(slide, "rect", { left: 64, top, width: 10, height: 52 }, colors[i]);
    addText(slide, item, { left: 94, top: top - 2, width: 520, height: 56 }, { fontSize: 22, bold: true });
  });
  await addImage(slide, scene.sourceImage, { left: 724, top: 146, width: 420, height: 430 }, {
    alt: "WorkBuddy 选择工作空间界面",
    fit: "contain",
    lineColor: C.sun,
  });
  addShape(slide, "roundRect", { left: 756, top: 480, width: 356, height: 74 }, "none", {
    borderRadius: "rounded-xl",
    line: { style: "solid", fill: C.orange, width: 4 },
  });
  addPill(slide, "点这里：选择工作空间", 785, 588, 300, C.orange);
  return slide;
}

async function buildFormula(presentation, scene, index) {
  const slide = presentation.slides.add();
  addBase(slide, scene, index);
  addText(slide, scene.title, { left: 64, top: 76, width: 1120, height: 72 }, { fontSize: 37, bold: true });
  const colors = [C.orange, C.cobalt, C.mint, C.berry];
  scene.promptParts.forEach((part, i) => {
    const top = 174 + i * 82;
    addShape(slide, "roundRect", { left: 64, top, width: 350, height: 62 }, colors[i], { borderRadius: "rounded-xl" });
    addText(slide, `0${i + 1}`, { left: 82, top: top + 8, width: 52, height: 44 }, { fontFamily: "JetBrains Mono", fontSize: 16, bold: true, color: C.white });
    addText(slide, part, { left: 142, top: top + 4, width: 230, height: 50 }, { fontSize: 26, bold: true, color: C.white });
  });
  await addImage(slide, scene.sourceImage, { left: 470, top: 154, width: 730, height: 450 }, {
    alt: "WorkBuddy 对话输入框与任务界面",
    fit: "contain",
    lineColor: C.cobalt,
  });
  addShape(slide, "roundRect", { left: 686, top: 500, width: 486, height: 82 }, "none", {
    borderRadius: "rounded-xl",
    line: { style: "solid", fill: C.orange, width: 4 },
  });
  addPill(slide, "把四块内容写进这里，再发送", 675, 610, 500, C.orange);
  return slide;
}

async function buildSafety(presentation, scene, index) {
  const slide = presentation.slides.add();
  addBase(slide, scene, index);
  addText(slide, "先看计划，再让它动手", { left: 64, top: 88, width: 700, height: 78 }, { fontSize: 46, bold: true, color: C.ink });
  addText(slide, scene.claim, { left: 66, top: 170, width: 650, height: 64 }, { fontSize: 23, bold: true, color: C.berry, verticalAlignment: "top" });
  scene.bullets.forEach((item, i) => addBullet(slide, item, 72, 280 + i * 62, 560, C.orange, i + 1));
  await addImage(slide, scene.sourceImage, { left: 760, top: 142, width: 390, height: 430 }, {
    alt: "WorkBuddy Plan 模式选择界面",
    fit: "contain",
    lineColor: C.orange,
  });
  addShape(slide, "roundRect", { left: 796, top: 280, width: 146, height: 78 }, "none", {
    borderRadius: "rounded-xl",
    line: { style: "solid", fill: C.berry, width: 4 },
  });
  addPill(slide, "点这里：Plan（先规划）", 788, 590, 300, C.orange);
  return slide;
}

async function buildChecklist(presentation, scene, index) {
  const slide = presentation.slides.add();
  addBase(slide, scene, index);
  addHeadline(slide, scene, { title: { left: 64, top: 82, width: 670, height: 86 }, rule: { left: 64, top: 177, width: 110, height: 7 }, claim: { left: 64, top: 198, width: 620, height: 72 }, titleSize: 38, claimSize: 22 });
  const positions = [[64, 304], [64, 376], [64, 448], [64, 520]];
  const colors = [C.orange, C.cobalt, C.mint, C.berry];
  scene.bullets.forEach((item, i) => {
    const [left, top] = positions[i];
    addShape(slide, "ellipse", { left, top, width: 48, height: 48 }, colors[i]);
    addText(slide, "✓", { left, top, width: 48, height: 48 }, { fontSize: 24, bold: true, color: C.white, alignment: "center" });
    addText(slide, item, { left: left + 66, top: top - 2, width: 390, height: 52 }, { fontSize: 23, bold: true });
  });
  await addImage(slide, scene.sourceImage, { left: 620, top: 142, width: 580, height: 440 }, {
    alt: "WorkBuddy 右侧结果区与产物预览",
    fit: "contain",
    lineColor: C.mint,
  });
  addShape(slide, "roundRect", { left: 906, top: 160, width: 274, height: 400 }, "none", {
    borderRadius: "rounded-xl",
    line: { style: "solid", fill: C.orange, width: 4 },
  });
  addPill(slide, "点右侧结果区：打开、抽查、对照", 760, 596, 390, C.orange);
  return slide;
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
