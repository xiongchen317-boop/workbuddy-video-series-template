# WorkBuddy Episode 01 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a reusable HyperFrames tutorial-video template plus Episode 01, including editable PPT assets, Mandarin female narration, synchronized captions, rendered MP4, documentation, and a GitHub repository.

**Architecture:** A single `content/episode.json` drives the slide deck, voice clips, captions, and HyperFrames scene timeline. PowerPoint is the editable visual source; rendered slide PNGs become media layers inside a deterministic HTML/GSAP composition. Build scripts validate every artifact before packaging and publishing.

**Tech Stack:** HyperFrames CLI, HTML/CSS/GSAP, `@oai/artifact-tool`, PowerPoint PPTX/PNG, local Kokoro Mandarin TTS or reproducible local fallback, FFmpeg/FFprobe, Node.js, Git/GitHub CLI.

---

### Task 1: Establish source content and project contract

**Files:**
- Create: `content/episode.json`
- Create: `knowledge-base/SOURCES.md`
- Create: `package.json`

- [ ] Write the eight-scene Chinese teaching script with one narration block, one slide claim, and one safe demonstration prompt per scene.
- [ ] Record official and community source URLs with retrieval date and usage notes.
- [ ] Add stable build commands for slides, audio, video, validation, and packaging.
- [ ] Validate JSON parsing and package scripts, then commit.

### Task 2: Build editable PowerPoint source material

**Files:**
- Create: `work/presentations/workbuddy-episode-01/tmp/build-slides.mjs`
- Create: `outputs/workbuddy-episode-01-slides.pptx`
- Create: `assets/slides/slide-01.png` through `slide-08.png`

- [ ] Initialize the bundled artifact-tool workspace.
- [ ] Build eight 1280×720 slides from `content/episode.json`, applying `DESIGN.md` and embedding official screenshots where they materially improve understanding.
- [ ] Export PNG previews and layout JSON for every slide.
- [ ] Run slide overflow checks, inspect every slide and the montage, fix clipping or wrapping, then commit the generator and source notes.

### Task 3: Generate Mandarin female narration and caption timing

**Files:**
- Create: `audio/scene-01.wav` through `scene-08.wav`
- Create: `audio/timing.json`
- Create: `scripts/build-audio.ps1`

- [ ] Generate each scene with the same Mandarin female voice and steady tutorial delivery.
- [ ] Measure every clip with FFprobe and calculate deterministic scene start/end times with short breathing gaps.
- [ ] Build caption groups from the exact narration text and place each group within the owning scene duration.
- [ ] Check loudness, clipping, duration and pronunciation; regenerate only failed clips, then commit reproducible metadata and scripts.

### Task 4: Build the HyperFrames master composition

**Files:**
- Create: `hyperframes/index.html`
- Create: `hyperframes/assets/slides/*.png`
- Create: `hyperframes/assets/audio/*.wav`
- Create: `hyperframes/project.json`

- [ ] Implement a 1920×1080 standalone composition with one timed scene per PPT page.
- [ ] Add a consistent push-slide primary transition and blur-crossfade accent transitions.
- [ ] Add unique entrance choreography for every scene, deterministic ambient accents, and no non-final exit tweens.
- [ ] Add synchronized audio clips and one caption group at a time with hard kill timing.
- [ ] Run HyperFrames lint, validate, inspect, animation-map and selected-frame previews; fix every actionable error.

### Task 5: Render and quality-assure Episode 01

**Files:**
- Create: `outputs/workbuddy-episode-01.mp4`
- Create: `outputs/workbuddy-episode-01-poster.png`
- Create: `knowledge-base/QA.md`

- [ ] Render a draft, inspect opening/middle/closing frames and audio stream metadata.
- [ ] Render the final MP4 at 30 fps and high quality.
- [ ] Verify resolution, frame rate, duration, audio presence, peak level and file integrity with FFprobe/FFmpeg.
- [ ] Record the exact passing checks and disclose that the narrator is AI-generated.

### Task 6: Package the reusable series template

**Files:**
- Create: `README.md`
- Create: `knowledge-base/REUSE-GUIDE.md`
- Create: `knowledge-base/EPISODE-CHECKLIST.md`
- Create: `outputs/workbuddy-video-series-template.zip`

- [ ] Explain the one-file content replacement workflow and which assets must be changed for later episodes.
- [ ] Document setup, build, preview, render, troubleshooting and visual rules in plain Chinese.
- [ ] Add a checklist that prevents missed narration, captions, screenshots, credits and QA.
- [ ] Build a clean archive excluding caches, temporary previews and secrets; verify it can be listed and extracted.

### Task 7: Publish the project and knowledge base to GitHub

**Files:**
- Modify: `.gitignore`
- Create: `LICENSE`

- [ ] Scan tracked files for secrets and exclude generated caches.
- [ ] Commit the verified source, knowledge base and lightweight deliverables with intentional messages.
- [ ] Create a clearly named GitHub repository under the authenticated account, push `main`, and verify the remote tree and README.
- [ ] If the final MP4 exceeds normal Git limits, publish it as a GitHub Release asset; otherwise include it directly when practical.

### Plan self-review

- Every design requirement maps to a task: PPT, female narration, sync, bright layout, effects, reusable template, knowledge base, package and GitHub publication.
- File names and data flow are consistent across tasks.
- No placeholders remain; the first episode scope is intentionally limited to onboarding and one safe task.

