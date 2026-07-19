# Sunburst Classroom Visual Identity

## Style Prompt

明亮、鲜艳、亲切的中文零基础教学视觉。以暖奶油色画布承载高饱和橙、钴蓝、青绿和莓红，像一本会动的彩色课堂讲义。画面采用大字号、斜切色块、局部贴纸感标注和清晰的产品截图，优先让观众一眼看懂“现在该看哪里、该做什么”。视觉节奏活泼但不嘈杂，界面演示始终比装饰更重要。

## Colors

- Canvas: `#FFF7E8`
- Ink: `#17223B`
- WorkBuddy Orange: `#FF6B35`
- Cobalt: `#3157F6`
- Mint: `#21C99A`
- Berry: `#F34B7D`
- Sun: `#FFD23F`

## Typography

- Chinese display/body: `Microsoft YaHei`, title weight 900, body weight 400-600
- Labels/numbers: `JetBrains Mono`, weight 600-800
- Video headline: 72-112 px; body: 30-44 px; labels: 22-28 px

## Motion

- Primary transition: 0.45s horizontal push slide
- Accent transition: 0.5s blur crossfade at section changes
- Entrances use confident `expo.out`, playful `back.out(1.4)`, and calm `sine.out`
- Each scene has one ambient motion only; all motion is deterministic and timeline-driven

## What NOT to Do

- 不使用暗黑科技背景、紫蓝霓虹渐变或纯黑画布
- 不堆叠同尺寸卡片网格，不把画面做成网页仪表盘
- 不让装饰遮挡 WorkBuddy 截图或字幕
- 不用小于 20 px 的视频正文，也不把长段文字塞进一帧
- 不使用随机、无限循环或无法精确回放的动画
