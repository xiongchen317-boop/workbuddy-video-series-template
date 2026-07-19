const REQUIRED_PROMPT_PARTS = ["范围", "动作", "交付", "边界"];

function requireText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} 必须是非空文本`);
  }
}

export function validateEpisode(episode) {
  if (!episode || typeof episode !== "object") {
    throw new Error("episode 必须是对象");
  }
  requireText(episode.id, "episode.id");
  requireText(episode.title, "episode.title");
  if (!Array.isArray(episode.scenes) || episode.scenes.length !== 8) {
    throw new Error("第一集必须包含恰好八个场景");
  }

  const ids = new Set();
  for (const [index, scene] of episode.scenes.entries()) {
    requireText(scene.id, `scenes[${index}].id`);
    requireText(scene.title, `scenes[${index}].title`);
    requireText(scene.claim, `scenes[${index}].claim`);
    requireText(scene.narration, `scenes[${index}].narration`);
    if (ids.has(scene.id)) throw new Error(`场景 id 重复：${scene.id}`);
    ids.add(scene.id);
  }

  const formulaScene = episode.scenes.find((scene) => scene.promptParts?.length);
  if (
    !formulaScene ||
    formulaScene.promptParts.length !== REQUIRED_PROMPT_PARTS.length ||
    !REQUIRED_PROMPT_PARTS.every((part, index) => formulaScene.promptParts[index] === part)
  ) {
    throw new Error("指令公式必须按顺序包含范围、动作、交付、边界");
  }
  return episode;
}

export function splitCaptionGroups(text) {
  requireText(text, "caption text");
  const phrases = text
    .split(/[，。！？；：]/u)
    .map((phrase) => phrase.trim())
    .filter(Boolean);

  return phrases.flatMap((phrase) => {
    const conjunction = phrase.indexOf("和");
    if (phrase.length > 10 && conjunction >= 4 && conjunction < phrase.length - 2) {
      return [phrase.slice(0, conjunction), phrase.slice(conjunction)];
    }
    return [phrase];
  });
}

export function buildTimeline(episode, audioDurations, options = {}) {
  validateEpisode(episode);
  const leadIn = options.leadIn ?? 0.4;
  const gap = options.gap ?? 0.35;
  let cursor = 0;

  const scenes = episode.scenes.map((scene) => {
    const audioDuration = Number(audioDurations[scene.id]);
    if (!Number.isFinite(audioDuration) || audioDuration <= 0) {
      throw new Error(`缺少有效旁白时长：${scene.id}`);
    }

    const start = cursor;
    const audioStart = start + leadIn;
    const groups = splitCaptionGroups(scene.narration);
    const totalCharacters = groups.reduce((sum, group) => sum + group.length, 0);
    let captionCursor = audioStart;
    const captions = groups.map((text, index) => {
      const isLast = index === groups.length - 1;
      const share = text.length / totalCharacters;
      const end = isLast ? audioStart + audioDuration : captionCursor + audioDuration * share;
      const caption = { text, start: captionCursor, end };
      captionCursor = end;
      return caption;
    });

    const end = audioStart + audioDuration + gap;
    cursor = end;
    return {
      ...scene,
      start,
      end,
      duration: end - start,
      audioStart,
      audioDuration,
      captions,
    };
  });

  return { id: episode.id, fps: episode.fps ?? 30, duration: cursor, scenes };
}
