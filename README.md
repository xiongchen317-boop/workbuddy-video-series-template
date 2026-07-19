# WorkBuddy 零基础视频系列模板

这是一个可复用的中文教学视频工程。第一集从零讲清楚 WorkBuddy 的界面、第一条任务指令和安全验收方法；后续各集只需要替换 `content/episode.json` 与对应素材，即可继续套用同一套明亮鲜艳的 PPT、女声旁白、字幕和动画版式。

## 第一集交付物

- 16:9、1920×1080、30fps 教学成片
- 8 页可编辑 PowerPoint
- 8 段固定音色中文女声旁白与逐场景时间轴
- HyperFrames 动画工程、字幕和转场
- 可复用内容协议、制作方法和验收清单

## 目录说明

| 目录 | 用途 |
| --- | --- |
| `content/episode.json` | 每一集唯一需要重点替换的内容入口 |
| `assets/source/` | 官方截图或自有素材 |
| `assets/slides/` | 从 PPT 导出的 16:9 页面图 |
| `audio/` | 分镜旁白、时长和时间轴 |
| `hyperframes/` | 可预览、检查和渲染的动画工程 |
| `knowledge-base/` | 系列复用方法、来源与验收规范 |
| `outputs/` | 成片、PPT 和工程压缩包 |

## 快速复用

准备环境：Windows、Node.js、FFmpeg/FFprobe、CosyVoice3 本地运行环境，以及可运行 `npx` 的网络环境。

1. 复制一份 `content/episode.json`，改标题、要点、旁白和素材路径。
2. 运行 `npm run validate`，先检查内容结构。
3. 运行 `npm run build:audio` 生成女声旁白。
4. 运行 `npm run build:slides` 生成 PPT 和页面图。
5. 运行 `npm run build:hyperframes` 生成动画页面。
6. 在 `hyperframes` 目录运行 `npm run check`，再运行 `npm run render -- --output <输出文件>`。

完整方法见 [knowledge-base/REUSE-GUIDE.md](knowledge-base/REUSE-GUIDE.md)。

## 声音配置

第一集使用知识库“男女访谈式”中的固定女声 `female_question_reference_999.wav`，通过 `Fun-CosyVoice3-0.5B` 生成。参考音色以 SHA-256 校验锁定，每段旁白保留整句语流、自然停顿和句尾转折，并记录音色相似度。

## 内容来源

产品定义、安装与界面说明依据 WorkBuddy 官方文档整理，来源链接见 [knowledge-base/SOURCES.md](knowledge-base/SOURCES.md)。

## License

工程代码和自制模板使用 MIT License。产品名称、官方截图及第三方素材的权利归各自权利人所有。
