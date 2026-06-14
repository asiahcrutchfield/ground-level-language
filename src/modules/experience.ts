import catArcSvgMarkup from "../assets/arc_screen/cat.html?raw"
import rootSvgMarkup from "../assets/arc_screen/background/root.html?raw"
import englishSeedSvgMarkup from "../assets/language_select/lang_en.html?raw"
import languageSelectMoundSvgMarkup from "../assets/language_select/select_mound.html?raw"
import taiwaneseSeedSvgMarkup from "../assets/language_select/lang_nan.html?raw"
import mandarinSeedSvgMarkup from "../assets/language_select/lang_zh.html?raw"
import autoplaySvgMarkup from "../assets/path_screen/meaning_tree/autoplay.html?raw"
import manualPlaySvgMarkup from "../assets/path_screen/meaning_tree/manual_play.html?raw"
import primerSoundwaveSvgMarkup from "../assets/meaning_tree_lesson/primer/soundwave.html?raw"
import reflectionFormSvgMarkup from "../assets/meaning_tree_lesson/reflection/form.html?raw"
import reflectionThumbsDownSvgMarkup from "../assets/meaning_tree_lesson/reflection/thumbs_down.html?raw"
import reflectionThumbsUpSvgMarkup from "../assets/meaning_tree_lesson/reflection/thumbs_up.html?raw"
import reflectionSproutSvgMarkup from "../assets/path_screen/meaning_tree/reflection/reflection_sprout.html?raw"
import gardenMoundSvgMarkup from "../assets/path_screen/meaning_tree/tree/mound.html?raw"
import soundFlowerOneSvgMarkup from "../assets/path_screen/sound_garden/flower_1.html?raw"
import soundFlowerTwoSvgMarkup from "../assets/path_screen/sound_garden/flower_2.html?raw"
import soundFlowerThreeSvgMarkup from "../assets/path_screen/sound_garden/flower_3.html?raw"
import seedSvgMarkup from "../assets/start_page/seed.html?raw"
import seedLogoSvgMarkup from "../assets/start_page/seed_logo.html?raw"
import seedPacketSvgMarkup from "../assets/start_page/seed_packet.html?raw"
import seedPacketOpenSvgMarkup from "../assets/start_page/seed_packet_open.html?raw"
import currentLessonBackNavSvgMarkup from "../assets/ui/current_lesson_back_nav.html?raw"
import currentLessonForwardNavSvgMarkup from "../assets/ui/current_lesson_forward_nav.html?raw"
import replaySvgMarkup from "../assets/ui/replay.html?raw"
import returnToMainNavSvgMarkup from "../assets/ui/return_to_main_nav.html?raw"
import sectionNavBackSvgMarkup from "../assets/ui/section_nav_back.html?raw"
import sectionNavForwardSvgMarkup from "../assets/ui/section_nav_forward.html?raw"
import storyGrassSvgMarkup from "../assets/meaning_tree_lesson/story/grass_curtains.html?raw"
import storyFlowerOneSvgMarkup from "../assets/meaning_tree_lesson/story/stage_flower1.html?raw"
import storyFlowerThreeSvgMarkup from "../assets/meaning_tree_lesson/story/stage_flower3.html?raw"
import storyPlayButtonSvgMarkup from "../assets/meaning_tree_lesson/story/play_button.html?raw"
import storyReplaySvgMarkup from "../assets/meaning_tree_lesson/story/replay.html?raw"
import { makeChime, runEchoGap as runAudioEchoGap, stopAudio } from "./audio"
import { getInitialLanguage, languageOptions, loadLearningData, saveLanguage } from "./data"
import { clearNode, mustQuery } from "./dom"
import {
  conceptIcons,
  defaultSignature,
  fallbackPrimerAudio,
  getPreviewMoments,
  getPrimerItems,
  getRecallPrompts,
  getStoryScenes,
  getStorySignature,
  renderArcButtons as renderMeaningArcButtons,
  renderStoryPods as renderMeaningStoryPods,
  resolveStoryAsset,
  type MeaningArc,
  type RecallChoice,
  type RecallMode,
  type RecallPrompt
} from "./meaning"
import type { SoundLesson, SoundLessonPreviewItem, SoundLessonStepId, SoundPreview, SoundSection, SoundVisualType } from "./sound"
import { createAppState, type AppSurface } from "./state"
import { createStoryLessonShell } from "./storyLesson/storyLesson"
import type { StoryLessonSectionId } from "./storyLesson/storyLessonTypes"
import type { PreviewMoment, PrimerItem, SoundPiece, Story, StoryScene, SupportedLanguage } from "./types"

// Local UI state and view-model types used only by the experience controller.
type Surface = AppSurface
type SeedState = "idle" | "previewing" | "revealed" | "selected"
type LanguageSeedDrag = {
  code: SupportedLanguage
  ghost: HTMLElement | null
  hasDragged: boolean
  offsetX: number
  offsetY: number
  pointerId: number
  sourceSeed: HTMLElement | null
  sourceRectLeft: number
  sourceRectTop: number
  sourceWidth: number
  startX: number
  startY: number
}
type StoryMode = "auto" | "manual"
type LanguageSeed = {
  code: SupportedLanguage
  state: SeedState
}
type StoryImagePreviewMoment = {
  id: string
  image?: string
  symbol?: string
  scene: "wake" | "smell" | "ground" | "big-cat" | "sleep"
}
type PreviewVocabularyPod = {
  id: string
  label: string
  items: readonly string[]
  audio: string[]
}

// Static configuration for language previews, demo mode, feedback links, and prototype lesson data.
const previewPath = (code: SupportedLanguage): string => `engine/previews/${code}/preview.mp3`

const languageSeedMarkup: Record<SupportedLanguage, string> = {
  en: englishSeedSvgMarkup,
  nan: taiwaneseSeedSvgMarkup,
  zh: mandarinSeedSvgMarkup
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

const openingAnimationDuration = 4300
const soundGardenEnterDuration = 760
const previewVocabularyPods = [
  { id: "cat-food", label: "Cat, food, ground", items: ["貓", "食物", "地上"] },
  { id: "action", label: "Walk, look, eat", items: ["走", "看", "吃"] },
  { id: "ending", label: "Big, small, night, sleep", items: ["大", "小", "晚上", "睡著"] }
] as const
const previewVocabularyAudioFiles: Partial<Record<SupportedLanguage, string[]>> = {
  zh: ["zh_u001.mp3", "zh_u002.mp3", "zh_u003.mp3", "zh_u004.mp3", "zh_u005.mp3"]
}

const demoConfig = {
  enabled: false,
  arcId: "cat-stray",
  storyId: "s0-001"
} as const

const feedbackFormUrls = {
  generic: "https://forms.gle/umYPWCuwYRZAE6pG9",
  positive: "https://forms.gle/umYPWCuwYRZAE6pG9",
  negative: "https://forms.gle/umYPWCuwYRZAE6pG9"
} as const

const soundSections: SoundSection[] = [
  {
    id: "tones",
    ariaLabel: "Tones and pitch",
    kind: "contour",
    iconType: "tone",
    previews: [
      { id: "tone-flat", ariaLabel: "Play flat tone preview", visual: "flat", audio: "/audio/placeholders/tone-flat.mp3" },
      { id: "tone-rising", ariaLabel: "Play rising tone preview", visual: "rising", audio: "/audio/placeholders/tone-rising.mp3" },
      { id: "tone-falling", ariaLabel: "Play falling tone preview", visual: "falling", audio: "/audio/placeholders/tone-falling.mp3" }
    ]
  },
  {
    id: "phonemes",
    ariaLabel: "Phonemes",
    kind: "particles",
    iconType: "phoneme",
    previews: [
      { id: "phoneme-1", ariaLabel: "Play first phoneme preview", visual: "dot", audio: "/audio/placeholders/phoneme-1.mp3" },
      { id: "phoneme-2", ariaLabel: "Play second phoneme preview", visual: "dot", audio: "/audio/placeholders/phoneme-2.mp3" },
      { id: "phoneme-3", ariaLabel: "Play third phoneme preview", visual: "dot", audio: "/audio/placeholders/phoneme-3.mp3" }
    ]
  },
  {
    id: "syllables",
    ariaLabel: "Syllables",
    kind: "pulses",
    iconType: "syllable",
    previews: [
      { id: "syllable-1", ariaLabel: "Play first syllable preview", visual: "single-pulse", audio: "/audio/placeholders/syllable-1.mp3" },
      { id: "syllable-2", ariaLabel: "Play second syllable preview", visual: "double-pulse", audio: "/audio/placeholders/syllable-2.mp3" },
      { id: "syllable-3", ariaLabel: "Play third syllable preview", visual: "long-pulse", audio: "/audio/placeholders/syllable-3.mp3" }
    ]
  },
  {
    id: "rhythm",
    ariaLabel: "Rhythm and stress",
    kind: "rhythm",
    iconType: "rhythm",
    previews: [
      { id: "rhythm-1", ariaLabel: "Play first rhythm preview", visual: "strong-weak", audio: "/audio/placeholders/rhythm-1.mp3" },
      { id: "rhythm-2", ariaLabel: "Play second rhythm preview", visual: "weak-strong", audio: "/audio/placeholders/rhythm-2.mp3" },
      { id: "rhythm-3", ariaLabel: "Play third rhythm preview", visual: "strong-weak-weak", audio: "/audio/placeholders/rhythm-3.mp3" }
    ]
  },
  {
    id: "features",
    ariaLabel: "Special sound features",
    kind: "resonance",
    iconType: "feature",
    previews: [
      { id: "feature-1", ariaLabel: "Play first feature preview", visual: "ring", audio: "/audio/placeholders/feature-1.mp3" },
      { id: "feature-2", ariaLabel: "Play second feature preview", visual: "clip", audio: "/audio/placeholders/feature-2.mp3" },
      { id: "feature-3", ariaLabel: "Play third feature preview", visual: "chime", audio: "/audio/placeholders/feature-3.mp3" }
    ]
  },
  {
    id: "phrase-tuning",
    ariaLabel: "Phrase tuning",
    kind: "phrase",
    iconType: "phrase",
    previews: [
      { id: "phrase-1", ariaLabel: "Play first phrase preview", visual: "wave", audio: "/audio/placeholders/phrase-1.mp3" },
      { id: "phrase-2", ariaLabel: "Play second phrase preview", visual: "wave", audio: "/audio/placeholders/phrase-2.mp3" },
      { id: "phrase-3", ariaLabel: "Play third phrase preview", visual: "wave", audio: "/audio/placeholders/phrase-3.mp3" }
    ]
  }
]

const soundLessonSteps: SoundLessonStepId[] = ["preview", "primer", "guided-tuning", "perception-recall", "reflection"]

// Sound Garden prototype lessons define the sound sections, practice cards, and lesson order.
const soundLessons: SoundLesson[] = [
  {
    id: "tone-001",
    sectionId: "tones",
    ariaLabel: "Tone lesson one",
    visualType: "contour",
    previewItems: [
      { id: "tone-flat", visual: "flat", audio: "/audio/placeholders/tone-flat.mp3" },
      { id: "tone-rising", visual: "rising", audio: "/audio/placeholders/tone-rising.mp3" },
      { id: "tone-falling", visual: "falling", audio: "/audio/placeholders/tone-falling.mp3" }
    ],
    unlocked: true,
    completed: false
  },
  {
    id: "tone-002",
    sectionId: "tones",
    ariaLabel: "Tone lesson two",
    visualType: "contour",
    previewItems: [
      { id: "tone-dipping", visual: "dipping", audio: "/audio/placeholders/tone-dipping.mp3" },
      { id: "tone-flat", visual: "flat", audio: "/audio/placeholders/tone-flat.mp3" }
    ],
    unlocked: true,
    completed: false
  },
  {
    id: "phoneme-001",
    sectionId: "phonemes",
    ariaLabel: "Phoneme lesson one",
    visualType: "particle",
    previewItems: [
      { id: "phoneme-1", visual: "dot", audio: "/audio/placeholders/phoneme-1.mp3" },
      { id: "phoneme-2", visual: "dot", audio: "/audio/placeholders/phoneme-2.mp3" }
    ],
    unlocked: true,
    completed: false
  },
  {
    id: "syllable-001",
    sectionId: "syllables",
    ariaLabel: "Syllable lesson one",
    visualType: "pulse",
    previewItems: [
      { id: "single-pulse", visual: "single-pulse", audio: "/audio/placeholders/syllable-1.mp3" },
      { id: "double-pulse", visual: "double-pulse", audio: "/audio/placeholders/syllable-2.mp3" }
    ],
    unlocked: true,
    completed: false
  },
  {
    id: "rhythm-001",
    sectionId: "rhythm",
    ariaLabel: "Rhythm lesson one",
    visualType: "rhythm",
    previewItems: [
      { id: "strong-weak", visual: "strong-weak", audio: "/audio/placeholders/rhythm-1.mp3" },
      { id: "weak-strong", visual: "weak-strong", audio: "/audio/placeholders/rhythm-2.mp3" }
    ],
    unlocked: true,
    completed: false
  },
  {
    id: "feature-001",
    sectionId: "features",
    ariaLabel: "Feature lesson one",
    visualType: "resonance",
    previewItems: [
      { id: "ring", visual: "ring", audio: "/audio/placeholders/feature-1.mp3" },
      { id: "clip", visual: "clip", audio: "/audio/placeholders/feature-2.mp3" }
    ],
    unlocked: true,
    completed: false
  },
  {
    id: "phrase-001",
    sectionId: "phrase-tuning",
    ariaLabel: "Phrase lesson one",
    visualType: "phrase",
    previewItems: [
      { id: "phrase-wave", visual: "wave", audio: "/audio/placeholders/phrase-full.mp3" },
      { id: "phrase-chunked", visual: "broken-wave", audio: "/audio/placeholders/phrase-chunked.mp3" }
    ],
    unlocked: true,
    completed: false
  }
]

// Meaning Tree arc definitions decide which branches are unlocked on the tree.
const meaningArcs: MeaningArc[] = [
  {
    id: "cat-stray",
    subject: "cat",
    ariaLabel: "Cat arc",
    svg: catArcSvgMarkup,
    fallbackSymbol: "🐈",
    unlocked: true
  },
  {
    id: "monkey",
    subject: "monkey",
    ariaLabel: "Monkey arc",
    fallbackSymbol: "\u{1F412}",
    unlocked: false
  },
  {
    id: "bird",
    subject: "bird",
    ariaLabel: "Bird arc",
    fallbackSymbol: "🐦",
    unlocked: false
  },
  {
    id: "rabbit",
    subject: "rabbit",
    ariaLabel: "Rabbit arc",
    fallbackSymbol: "🐇",
    unlocked: false
  }
]

const getDisplayName = (code: SupportedLanguage): string => {
  const option = languageOptions.find((language) => language.code === code)
  if (!option) return code
  return option.nativeName === option.name ? option.nativeName : `${option.nativeName} (${option.name})`
}

const getStoryArcId = (story: Story): string => story.arcId ?? `${story.perspective}-${story.arc}`

let seedSvgInstanceId = 0

// SVG helpers make injected raw SVG safe for repeated inline use.
function scopeInlineSvgIds(svg: SVGSVGElement, prefix: string): void {
  const idMap = new Map<string, string>()

  svg.querySelectorAll<SVGElement>("[id]").forEach((element) => {
    const currentId = element.id
    if (!currentId) return

    const scopedId = `${prefix}-${currentId}`
    idMap.set(currentId, scopedId)
    element.id = scopedId
  })

  if (idMap.size === 0) return

  svg.querySelectorAll<SVGElement>("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      let nextValue = attribute.value
      idMap.forEach((scopedId, currentId) => {
        nextValue = nextValue
          .replaceAll(`url(#${currentId})`, `url(#${scopedId})`)
          .replaceAll(`#${currentId}`, `#${scopedId}`)
      })
      if (nextValue !== attribute.value) {
        element.setAttribute(attribute.name, nextValue)
      }
    })
  })
}

function createSeedSvg(code: SupportedLanguage): HTMLElement {
  const wrapper = document.createElement("span")
  wrapper.className = "language-seed-art"
  wrapper.innerHTML = languageSeedMarkup[code].trim()
  const svg = wrapper.querySelector("svg")
  if (svg) {
    svg.setAttribute("focusable", "false")
    scopeInlineSvgIds(svg, `language-seed-${code}-${seedSvgInstanceId++}`)
  }
  return wrapper
}

function createOpeningStageMarkup(): string {
  const seed = seedSvgMarkup.trim()

  return `
    <span class="opening-stage" aria-hidden="true">
      <span class="packet-stack">
        <span class="packet-closed">${seedPacketSvgMarkup.trim()}</span>
        <span class="packet-open">${seedPacketOpenSvgMarkup.trim()}</span>
        <span class="packet-logo">${seedLogoSvgMarkup.trim()}</span>
        <span class="tear-line">
          <svg viewBox="0 0 463 463" aria-hidden="true" focusable="false">
            <path
              pathLength="1"
              d="M340 0 C348 13 355 25 363 35 L356 44 L374 54 L369 66 L390 74 L386 88 C393 92 399 98 405 104"
            />
          </svg>
        </span>
        <span class="corner-piece"></span>
      </span>
      <span class="seed-spill-layer">
        <span class="spilled-seed spilled-seed-a">${seed}</span>
        <span class="spilled-seed spilled-seed-b">${seed}</span>
        <span class="spilled-seed spilled-seed-c">${seed}</span>
      </span>
    </span>
  `
}

function setAssetIcon(element: HTMLElement, markup: string, modifier = ""): void {
  const trimmed = markup.trim()
  if (!trimmed) return

  element.classList.add("asset-icon-button")
  element.innerHTML = `<span class="asset-icon ${modifier}" aria-hidden="true">${trimmed}</span>`
  element.querySelectorAll("svg").forEach((svg) => {
    svg.setAttribute("focusable", "false")
    svg.setAttribute("aria-hidden", "true")
  })
}

function muteInlineSvg(element: HTMLElement): void {
  element.querySelectorAll("svg").forEach((svg) => {
    svg.setAttribute("focusable", "false")
    svg.setAttribute("aria-hidden", "true")
  })
}

function createGardenMeaningMarkup(): string {
  return `
    <span class="garden-mound-base">${gardenMoundSvgMarkup.trim()}</span>
  `
}

// The experience controller owns screen transitions, lesson rendering, and user interaction wiring.
export function createExperience(): void {
  // Screen and control lookups bind the static HTML shell to the TypeScript controller.
  const app = mustQuery<HTMLElement>("#app")
  const startScreen = mustQuery<HTMLElement>("#start-screen")
  const languageScreen = mustQuery<HTMLElement>("#language-screen")
  const pathScreen = mustQuery<HTMLElement>("#path-screen")
  const meaningArcScreen = mustQuery<HTMLElement>("#meaning-arc-screen")
  const storyBranchScreen = mustQuery<HTMLElement>("#story-branch-screen")
  const meaningPreviewScreen = mustQuery<HTMLElement>("#story-lessons")
  const seedButton = mustQuery<HTMLButtonElement>("#seed-button")
  const startSeedArt = mustQuery<HTMLElement>("#start-seed-art")
  startSeedArt.innerHTML = createOpeningStageMarkup()
  startSeedArt.querySelectorAll("svg").forEach((svg) => {
    svg.setAttribute("focusable", "false")
    svg.setAttribute("aria-hidden", "true")
  })
  const meaningTreeArt = mustQuery<HTMLElement>("#meaning-tree-art")
  const meaningRootMound = mustQuery<HTMLElement>("#meaning-root-mound")
  const meaningRootArt = mustQuery<HTMLElement>("#meaning-root-art")
  const soundGardenArt = mustQuery<HTMLElement>("#sound-garden-art")
  const soundGardenSecondaryArt = mustQuery<HTMLElement>("#sound-garden-secondary-art")
  const soundGardenTertiaryArt = mustQuery<HTMLElement>("#sound-garden-tertiary-art")
  const meaningTreeButton = mustQuery<HTMLButtonElement>("#meaning-tree-button")
  const soundGardenButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-garden-sound]"))
  const soundGardenScreen = mustQuery<HTMLElement>("#sound-garden-screen")
  const soundGardenReturnButton = mustQuery<HTMLButtonElement>("#sound-garden-return-button")
  const soundPreviewList = mustQuery<HTMLUListElement>("#sound-preview-list")
  const soundLessonListScreen = mustQuery<HTMLElement>("#sound-lesson-list-screen")
  const lessonBackButton = mustQuery<HTMLButtonElement>("#lesson-back-button")
  const lessonHeader = mustQuery<HTMLElement>("#lesson-header")
  const soundLessonList = mustQuery<HTMLOListElement>("#sound-lesson-list")
  const soundLessonScreen = mustQuery<HTMLElement>("#sound-lesson-screen")
  const soundPreviewSection = mustQuery<HTMLElement>("#sound-preview-section")
  const soundPrimerSection = mustQuery<HTMLElement>("#sound-primer-section")
  const soundGuidedSection = mustQuery<HTMLElement>("#sound-guided-section")
  const soundRecallSection = mustQuery<HTMLElement>("#sound-recall-section")
  const soundReflectionSection = mustQuery<HTMLElement>("#sound-reflection-section")
  const soundLessonEcho = mustQuery<HTMLElement>("#sound-lesson-echo")
  const soundLessonProgress = mustQuery<HTMLElement>("#sound-lesson-progress")
  const soundLessonSectionBackButton = mustQuery<HTMLButtonElement>("#sound-lesson-section-back-button")
  const soundLessonBackButton = mustQuery<HTMLButtonElement>("#sound-lesson-back-button")
  const soundLessonReplayButton = mustQuery<HTMLButtonElement>("#sound-lesson-replay-button")
  const soundLessonNextButton = mustQuery<HTMLButtonElement>("#sound-lesson-next-button")
  const soundLessonSectionNextButton = mustQuery<HTMLButtonElement>("#sound-lesson-section-next-button")
  const languageSeedbed = mustQuery<HTMLElement>("#language-seedbed")
  const languageSelectGarden = mustQuery<HTMLElement>("#language-select-garden")
  const languageMoundButton = mustQuery<HTMLButtonElement>("#language-mound-button")
  const languageMoundArt = mustQuery<HTMLElement>("#language-mound-art")
  const arcList = mustQuery<HTMLUListElement>("#arc-list")
  const meaningArcReturnButton = mustQuery<HTMLButtonElement>("#meaning-arc-return-button")
  const storyBranchReturnButton = mustQuery<HTMLButtonElement>("#story-branch-return-button")
  const storyArcSymbol = mustQuery<HTMLElement>("#story-arc-symbol")
  const storyPodBed = mustQuery<HTMLElement>("#story-pod-bed")
  const previewSignature = mustQuery<HTMLElement>("#story-title")
  const previewImageTrack = mustQuery<HTMLElement>("#preview-image-track")
  const previewAudioTrack = mustQuery<HTMLElement>("#preview-audio-track")
  const previewStoryReturnButton = mustQuery<HTMLButtonElement>("#story-lessons-return-button")
  const primerScreen = mustQuery<HTMLElement>("#meaning-primer-screen")
  const primerCardTrack = mustQuery<HTMLElement>("#primer-card-track")
  const primerTrackBackButton = mustQuery<HTMLButtonElement>("#primer-track-back-button")
  const primerTrackNextButton = mustQuery<HTMLButtonElement>("#primer-track-next-button")
  const primerEcho = mustQuery<HTMLElement>("#primer-echo")
  const storyScreen = mustQuery<HTMLElement>("#meaning-story-screen")
  const storyWorld = mustQuery<HTMLElement>("#story-world")
  const storyModeGate = mustQuery<HTMLElement>("#story-mode-gate")
  const storyAutoButton = mustQuery<HTMLButtonElement>("#story-auto-button")
  const storyManualButton = mustQuery<HTMLButtonElement>("#story-manual-button")
  const storyStage = mustQuery<HTMLElement>("#story-stage")
  const storyImage = mustQuery<HTMLImageElement>("#story-image")
  const storyAudioButton = mustQuery<HTMLButtonElement>("#story-audio-button")
  const storyEcho = mustQuery<HTMLElement>("#story-echo")
  const storyProgress = mustQuery<HTMLElement>("#story-progress")
  const storyControls = mustQuery<HTMLElement>("#story-controls")
  const storyPrevButton = mustQuery<HTMLButtonElement>("#story-prev-button")
  const storyNextButton = mustQuery<HTMLButtonElement>("#story-next-button")
  const storyReplayButton = mustQuery<HTMLButtonElement>("#story-replay-button")
  const storyLessonProgress = mustQuery<HTMLElement>("#story-lesson-progress")
  const storySectionBackButton = mustQuery<HTMLButtonElement>("#story-section-back-button")
  const storyForwardButton = mustQuery<HTMLButtonElement>("#story-forward-button")
  const demoFinishScreen = mustQuery<HTMLElement>("#demo-finish-screen")
  const demoFinishStorySymbols = mustQuery<HTMLElement>("#demo-finish-story-symbols")
  const demoFinishReplayButton = mustQuery<HTMLButtonElement>("#demo-finish-replay-button")
  const demoFinishLanguageButton = mustQuery<HTMLButtonElement>("#demo-finish-language-button")
  const demoFinishStartButton = mustQuery<HTMLButtonElement>("#demo-finish-start-button")

  function createStoryStageDecoration(): DocumentFragment {
    const fragment = document.createDocumentFragment()

    const glow = document.createElement("span")
    glow.className = "story-stage-glow"
    glow.setAttribute("aria-hidden", "true")

    const frame = document.createElement("span")
    frame.className = "story-stage-frame"
    frame.setAttribute("aria-hidden", "true")

    const grassLeft = document.createElement("span")
    grassLeft.className = "story-stage-grass story-stage-grass-left"
    grassLeft.setAttribute("aria-hidden", "true")
    grassLeft.innerHTML = storyGrassSvgMarkup.trim()

    const grassRight = document.createElement("span")
    grassRight.className = "story-stage-grass story-stage-grass-right"
    grassRight.setAttribute("aria-hidden", "true")
    grassRight.innerHTML = storyGrassSvgMarkup.trim()

    const flowerLeft = document.createElement("span")
    flowerLeft.className = "story-stage-flower story-stage-flower-left"
    flowerLeft.setAttribute("aria-hidden", "true")
    flowerLeft.innerHTML = storyFlowerOneSvgMarkup.trim()

    const flowerRight = document.createElement("span")
    flowerRight.className = "story-stage-flower story-stage-flower-right"
    flowerRight.setAttribute("aria-hidden", "true")
    flowerRight.innerHTML = storyFlowerThreeSvgMarkup.trim()

    const base = document.createElement("span")
    base.className = "story-stage-base"
    base.setAttribute("aria-hidden", "true")

    fragment.append(glow, frame, grassLeft, grassRight, flowerLeft, flowerRight, base)
    fragment.querySelectorAll("svg").forEach((svg) => {
      svg.setAttribute("focusable", "false")
      svg.setAttribute("aria-hidden", "true")
    })

    return fragment
  }

  function setStoryAudioButtonIcon(kind: "play" | "replay"): void {
    const markup = kind === "replay" ? storyReplaySvgMarkup : storyPlayButtonSvgMarkup

    storyAudioButton.dataset.icon = kind
    storyAudioButton.innerHTML = `
      <span class="story-play-button-art" aria-hidden="true">
        ${markup.trim()}
      </span>
    `
    muteInlineSvg(storyAudioButton)
  }
  const recallScreen = mustQuery<HTMLElement>("#meaning-recall-screen")
  const recallWorld = mustQuery<HTMLElement>("#recall-world")
  const recallPromptZone = mustQuery<HTMLElement>("#recall-prompt-zone")
  const recallAnswerZone = mustQuery<HTMLElement>("#recall-answer-zone")
  const recallFeedbackZone = mustQuery<HTMLElement>("#recall-feedback-zone")
  const recallProgress = mustQuery<HTMLElement>("#recall-progress")
  const reflectionScreen = mustQuery<HTMLElement>("#meaning-reflection-screen")
  const reflectionGrowth = mustQuery<HTMLElement>("#reflection-growth")
  const reflectionStoryPod = mustQuery<HTMLElement>("#reflection-story-pod")
  const reflectionStorySymbols = mustQuery<HTMLElement>("#reflection-story-symbols")
  const reflectionReplayButton = mustQuery<HTMLButtonElement>("#reflection-replay-button")
  const reflectionPathsButton = mustQuery<HTMLButtonElement>("#reflection-paths-button")
  const reflectionSoundGardenButton = mustQuery<HTMLButtonElement>("#reflection-sound-garden-button")
  const previewAudio = new Audio()
  const previewMomentAudio = new Audio()
  const primerAudio = new Audio()
  const recallAudio = new Audio()
  const primerBackdrop = document.createElement("button")

  // Transient state tracks active screens, audio objects, selected lessons, and animation timers.
  let surface: Surface = "start"
  let hasBegun = false
  let openingTransitionTimer = 0
  let previewRun = 0
  let activePreview: SupportedLanguage | null = null
  let previewRelease: SupportedLanguage | null = null
  let previewReleaseTimer = 0
  let pendingLanguage: SupportedLanguage | null = null
  let visibleLanguageName: SupportedLanguage | null = null
  let languageNameTimer = 0
  let isPlantingLanguage = false
  let languageSeedDrag: LanguageSeedDrag | null = null
  let suppressNextLanguageSeedClick = false
  let gardenLabelTimer = 0
  let isGardenTransitioning = false
  const appState = createAppState(getInitialLanguage())
  let selectedSoundSectionId: string | null = null
  let selectedSoundLessonId: string | null = null
  let currentSoundPreviewAudio: HTMLAudioElement | null = null
  let currentLessonPreviewAudio: HTMLAudioElement | null = null
  let currentSoundLessonStep: SoundLessonStepId | null = null
  let currentSoundItemIndex = 0
  let currentSoundPairIndex = 0
  let currentRecallItemIndex = 0
  let currentSoundAudio: HTMLAudioElement | null = null
  const completedSoundSectionIds = new Set<string>()
  let expandedPrimerCard: HTMLElement | null = null
  let selectedStoryMode: StoryMode | null = null
  let currentStoryAudio: HTMLAudioElement | null = null
  let currentStory: Story | null = null
  let storySceneTimer = 0
  let storyAudioBase = ""
  let previewGlimpsesRevealed = false
  const revealedPreviewStoryIds = new Set<string>()
  let previewGlimpseRevealTimer = 0
  let currentRecallPrompts: RecallPrompt[] = []
  let activeRecallPromptButton: HTMLButtonElement | null = null
  let selectedRecallAudioAnswer: { promptId: string; index: number; element: HTMLElement } | null = null
  let allStories: Story[] = []
  const languageSeeds: LanguageSeed[] = languageOptions.map((language) => ({
    code: language.code,
    state: "idle"
  }))

  // Story lesson shell maps surface changes onto the shared section navigation chrome.
  const storyLessonSurfaceSections: Partial<Record<Surface, StoryLessonSectionId>> = {
    meaningPreview: "preview",
    primer: "primer",
    story: "story",
    demoFinish: undefined,
    recall: "recall",
    reflection: "reflection"
  }
  const storyLessonSectionSurfaces: Record<StoryLessonSectionId, Surface> = {
    preview: "meaningPreview",
    primer: "primer",
    story: "story",
    recall: "recall",
    reflection: "reflection"
  }
  const storyLessonShell = createStoryLessonShell({
    sections: {
      preview: mustQuery<HTMLElement>("#preview-world"),
      primer: primerScreen,
      story: storyScreen,
      recall: recallScreen,
      reflection: reflectionScreen
    },
    progress: storyLessonProgress,
    previousButton: storySectionBackButton,
    nextButton: storyForwardButton,
    onSectionRequested: enterStoryLessonSection
  })

  // Surface helpers show one app screen at a time and keep lesson section state synchronized.
  function isStoryLessonSurface(value: Surface): boolean {
    return storyLessonSurfaceSections[value] !== undefined
  }

  function getSoundLessonSection(step: SoundLessonStepId): HTMLElement {
    const sectionMap: Record<SoundLessonStepId, HTMLElement> = {
      preview: soundPreviewSection,
      primer: soundPrimerSection,
      "guided-tuning": soundGuidedSection,
      "perception-recall": soundRecallSection,
      reflection: soundReflectionSection
    }

    return sectionMap[step]
  }

  function showSoundLessonSection(step: SoundLessonStepId): void {
    soundLessonSteps.forEach((candidate) => {
      getSoundLessonSection(candidate).hidden = candidate !== step
    })
    app.dataset.soundStep = step
  }

  function setSurface(nextSurface: Surface): void {
    if (surface === "meaningPreview" && nextSurface !== "meaningPreview") stopPreviewMomentAudio()
    if (surface === "story" && nextSurface !== "story") stopStoryAudio()
    if (surface === "recall" && nextSurface !== "recall") stopRecallAudio()
    if (surface === "soundGarden" && nextSurface !== "soundGarden") stopCurrentSoundPreview()
    if (surface === "soundLessonList" && nextSurface !== "soundLessonList") stopLessonPreviewAudio()
    if (surface === "soundLesson" && nextSurface !== "soundLesson") stopSoundLessonAudio()
    surface = nextSurface
    startScreen.hidden = surface !== "start"
    languageScreen.hidden = surface !== "language"
    pathScreen.hidden = surface !== "path"
    soundGardenScreen.hidden = surface !== "soundGarden"
    soundLessonListScreen.hidden = surface !== "soundLessonList"
    soundLessonScreen.hidden = surface !== "soundLesson"
    meaningArcScreen.hidden = surface !== "meaningArc"
    storyBranchScreen.hidden = surface !== "storyBranch"
    demoFinishScreen.hidden = surface !== "demoFinish"
    meaningPreviewScreen.hidden = !isStoryLessonSurface(surface)
    const storyLessonSection = storyLessonSurfaceSections[surface]
    meaningPreviewScreen.classList.toggle("is-reflection", storyLessonSection === "reflection")
    if (storyLessonSection) storyLessonShell.setSection(storyLessonSection)
    if (storyLessonSection === "recall") {
      setRecallComplete(recallWorld.dataset.recallComplete === "true")
    } else {
      storyForwardButton.disabled = false
      storyForwardButton.removeAttribute("aria-disabled")
      storyForwardButton.classList.remove("is-recall-ready")
    }
    app.dataset.surface = surface
    if (surface === "soundGarden") updateSoundGardenPreviewAlignment()
    if (surface !== "path") clearGardenLabels()
  }

  // Language preview helpers manage seed states, preview audio, and temporary labels.
  function clearGardenLabels(): void {
    window.clearTimeout(gardenLabelTimer)
    document.querySelectorAll<HTMLElement>(".garden-choice.is-label-visible").forEach((choice) => {
      choice.classList.remove("is-label-visible")
    })
  }

  function revealGardenLabel(choice: HTMLElement): void {
    clearGardenLabels()
    choice.classList.add("is-label-visible")
    gardenLabelTimer = window.setTimeout(() => {
      choice.classList.remove("is-label-visible")
    }, 1500)
  }

  function setLanguageState(code: SupportedLanguage, state: SeedState): void {
    languageSeeds.forEach((seed) => {
      if (seed.code === code) seed.state = state
      else if (state === "selected") seed.state = "idle"
    })
  }

  function syncLanguageSeedStates(): void {
    // Sync language seed UI state from the current preview, pending, and label timers.
    languageSeeds.forEach((seed) => {
      const row = languageSeedbed.querySelector<HTMLElement>(`.language-seed-row[data-language="${seed.code}"]`)
      if (!row) return

      row.dataset.state = seed.state
      row.dataset.previewing = String(activePreview === seed.code)
      row.dataset.previewRelease = String(previewRelease === seed.code)
      row.dataset.nameVisible = String(visibleLanguageName === seed.code)
      row.dataset.pending = String(pendingLanguage === seed.code)
      row
        .querySelector(".language-seed-button")
        ?.setAttribute("aria-pressed", String(seed.state === "selected" || pendingLanguage === seed.code))
      row
        .querySelector(".language-name")
        ?.setAttribute("aria-hidden", String(visibleLanguageName !== seed.code))
    })

    const moundActive = Boolean(pendingLanguage)
    languageSelectGarden.dataset.hasPending = String(moundActive)
    languageMoundButton.dataset.active = String(moundActive)
    languageMoundButton.disabled = isPlantingLanguage
    languageMoundButton.setAttribute("aria-disabled", String(!moundActive || isPlantingLanguage))
  }

  function resetActivePreview(): void {
    // Clear any active language preview audio and temporary label state.
    previewRun += 1
    window.clearTimeout(previewReleaseTimer)
    window.clearTimeout(languageNameTimer)
    stopAudio(previewAudio)

    activePreview = null
    previewRelease = null
    visibleLanguageName = null
    syncLanguageSeedStates()
  }

  function restoreLanguageSeedVisibility(): void {
    // Restore source seeds and remove any temporary drag or planting ghosts.
    languageSeedbed.querySelectorAll<HTMLElement>(".language-seed-art.is-being-dragged").forEach((seed) => {
      seed.classList.remove("is-being-dragged")
    })
    languageSelectGarden.querySelector(".language-planting-seed")?.remove()
    document.querySelector(".language-drag-seed")?.remove()
    languageSelectGarden.dataset.planting = "false"
    languageMoundButton.dataset.planting = "false"
    isPlantingLanguage = false
    languageSeedDrag = null
  }

  function releaseLanguagePreview(code: SupportedLanguage): void {
    // Play the short visual release state after preview audio finishes.
    activePreview = null
    previewRelease = code
    syncLanguageSeedStates()

    window.clearTimeout(previewReleaseTimer)
    previewReleaseTimer = window.setTimeout(() => {
      if (previewRelease !== code) return
      previewRelease = null
      syncLanguageSeedStates()
    }, 680)
  }

  function revealLanguage(code: SupportedLanguage, run: number): void {
    if (run !== previewRun) return
    releaseLanguagePreview(code)
  }

  function finishLanguagePreview(code: SupportedLanguage, run: number, shouldShowName: boolean): void {
    // End a preview run and briefly reveal the language name when appropriate.
    if (run !== previewRun) return
    if (shouldShowName) revealLanguageNameTemporarily(code)
    releaseLanguagePreview(code)
  }

  function revealLanguageNameTemporarily(code: SupportedLanguage): void {
    // Show the language label for a short confirmation moment after preview.
    visibleLanguageName = code
    syncLanguageSeedStates()

    window.clearTimeout(languageNameTimer)
    languageNameTimer = window.setTimeout(() => {
      if (visibleLanguageName !== code) return
      visibleLanguageName = null
      syncLanguageSeedStates()
    }, 1100)
  }

  function selectLanguage(code: SupportedLanguage): void {
    resetActivePreview()
    window.clearTimeout(languageNameTimer)
    appState.selectedLanguage = code
    pendingLanguage = null
    visibleLanguageName = null
    appState.selectedArcId = null
    appState.selectedStoryId = null
    allStories = []
    setLanguageState(code, "selected")
    saveLanguage(code)
    document.documentElement.dataset.learningLang = code
    syncLanguageSeedStates()

    window.setTimeout(() => {
      if (demoConfig.enabled) {
        openDemoMeaningTree()
        return
      }

      setSurface("path")
    }, 360)
  }

  // Meaning Tree preview and primer helpers manage image glimpses, audio nodes, and expandable cards.
  function stopPreviewMomentAudio(): void {
    stopAudio(previewMomentAudio)
    document.querySelectorAll(".is-preview-playing").forEach((element) => {
      element.classList.remove("is-preview-playing", "preview-audio-node-playing", "preview-audio-pod-playing")
    })
  }

  function stopPrimerAudio(): void {
    stopAudio(primerAudio)
    document.querySelectorAll(".is-primer-playing").forEach((element) => {
      element.classList.remove("is-primer-playing")
    })
  }

  function markPrimerItemHeard(card: HTMLElement | null): void {
    if (!card) return
    card.classList.add("is-heard")
  }

  function runEchoGap(duration = 1200): void {
    runAudioEchoGap(primerEcho, duration)
  }

  function playPrimerAudio(audioSrc: string | undefined, sourceElement: HTMLElement, echo = false): void {
    stopPrimerAudio()
    const src = audioSrc || fallbackPrimerAudio
    const card = sourceElement.closest<HTMLElement>(".primer-card")
    sourceElement.classList.add("is-primer-playing")
    card?.classList.add("is-primer-playing")
    primerAudio.src = src
    primerAudio.currentTime = 0
    primerAudio.onended = () => {
      sourceElement.classList.remove("is-primer-playing")
      card?.classList.remove("is-primer-playing")
      markPrimerItemHeard(card)
      if (echo) runEchoGap(Number.isFinite(primerAudio.duration) ? Math.min(1800, Math.max(900, primerAudio.duration * 420)) : 1200)
    }
    primerAudio.onerror = () => {
      sourceElement.classList.remove("is-primer-playing")
      card?.classList.remove("is-primer-playing")
      if (echo) runEchoGap()
    }
    primerAudio.play().catch(() => {
      sourceElement.classList.remove("is-primer-playing")
      card?.classList.remove("is-primer-playing")
      if (echo) runEchoGap()
    })
  }

  function playPreviewMomentAudio(moment: PreviewMoment, sourceButton: HTMLElement): void {
    stopPreviewMomentAudio()
    if (!moment.audio) return

    sourceButton.classList.add("is-preview-playing", "preview-audio-node-playing", "preview-audio-node-heard")
    previewMomentAudio.src = moment.audio
    previewMomentAudio.currentTime = 0
    previewMomentAudio.onended = () => {
      sourceButton.classList.remove("is-preview-playing", "preview-audio-node-playing")
    }
    previewMomentAudio.onerror = () => {
      sourceButton.classList.remove("is-preview-playing", "preview-audio-node-playing")
    }
    previewMomentAudio.play().catch(() => {
      sourceButton.classList.remove("is-preview-playing", "preview-audio-node-playing")
    })
  }

  function playPreviewVocabularyPod(pod: PreviewVocabularyPod, sourceButton: HTMLElement): void {
    stopPreviewMomentAudio()
    sourceButton.classList.add("is-preview-playing", "preview-audio-pod-playing")

    const playNext = (index: number): void => {
      const src = pod.audio[index]
      if (!src) {
        sourceButton.classList.remove("is-preview-playing", "preview-audio-pod-playing")
        sourceButton.classList.add("preview-audio-pod-heard")
        return
      }

      previewMomentAudio.src = src
      previewMomentAudio.currentTime = 0
      previewMomentAudio.onended = () => {
        playNext(index + 1)
      }
      previewMomentAudio.onerror = () => {
        playNext(index + 1)
      }
      previewMomentAudio.play().catch(() => {
        playNext(index + 1)
      })
    }

    playNext(0)
  }

  function collapsePrimerCard(): void {
    if (!expandedPrimerCard) return

    stopPrimerAudio()
    expandedPrimerCard.querySelector<HTMLElement>(".primer-breakdown")?.setAttribute("hidden", "")
    expandedPrimerCard.querySelector<HTMLButtonElement>(".primer-collapse-button")?.setAttribute("hidden", "")
    expandedPrimerCard.classList.remove("is-expanded", "primer-card-expanded")
    primerCardTrack.classList.remove("has-expanded-card")
    primerBackdrop.hidden = true
    expandedPrimerCard = null
  }

  function scrollStoryTrack(track: HTMLElement, direction: -1 | 1): void {
    track.scrollBy({
      left: direction * Math.max(180, track.clientWidth * 0.76),
      behavior: prefersReducedMotion() ? "auto" : "smooth"
    })
  }

  function getPreviewVocabularyPods(): PreviewVocabularyPod[] {
    const audioLanguage = previewVocabularyAudioFiles[appState.selectedLanguage] ? appState.selectedLanguage : "zh"
    const audioFiles = previewVocabularyAudioFiles[audioLanguage] ?? previewVocabularyAudioFiles.zh ?? []

    return previewVocabularyPods.map((pod, podIndex) => {
      const audio = pod.items.map((_, itemIndex) => {
        const audio = audioFiles[(podIndex * 3 + itemIndex) % Math.max(1, audioFiles.length)]
        return audio ? `engine/vocab/${audioLanguage}/natural/${audio}` : fallbackPrimerAudio
      })

      return { ...pod, audio }
    })
  }

  function getStoryImagePreviewMoments(story: Story): StoryImagePreviewMoment[] {
    const catStoryScenes: StoryImagePreviewMoment[] = [
      { id: "cat-wakes-up", scene: "wake", symbol: "cat", image: "/engine/stories/s0-001/images/s0-01.png" },
      { id: "cat-smells-food", scene: "smell", symbol: "food", image: "/engine/stories/s0-001/images/s0-02.png" },
      { id: "food-on-ground", scene: "ground", symbol: "food", image: "/engine/stories/s0-001/images/s0-03.png" },
      { id: "big-cat-appears", scene: "big-cat", symbol: "cat", image: "/engine/stories/s0-001/images/s0-06.png" },
      { id: "cat-sleeps-at-night", scene: "sleep", symbol: "night", image: "/engine/stories/s0-001/images/s0-09.png" }
    ]

    if (story.id === "s0-001" && getStoryArcId(story) === "cat-stray") return catStoryScenes

    const moments = getPreviewMoments(story, appState.selectedLanguage)
    const sceneOrder: StoryImagePreviewMoment["scene"][] = ["wake", "smell", "ground", "big-cat", "sleep"]

    return moments.slice(0, 5).map((moment, index) => ({
      id: moment.id,
      image: moment.image,
      symbol: moment.symbol,
      scene: sceneOrder[index] ?? "ground"
    }))
  }

  function revealStoryGlimpses(): void {
    if (previewGlimpsesRevealed) return
    if (previewImageTrack.classList.contains("is-glimpse-revealing")) return
    window.clearTimeout(previewGlimpseRevealTimer)
    previewImageTrack.classList.add("is-glimpse-revealing")
    previewImageTrack.classList.remove("is-glimpse-waiting")
    meaningPreviewScreen.classList.remove("is-story-glimpse-waiting")
    meaningPreviewScreen.classList.add("is-story-glimpse-revealing")

    const cards = previewImageTrack.querySelectorAll(".story-glimpse-card")
    const revealDuration = prefersReducedMotion() ? 80 : Math.max(520, cards.length * 120 + 360)

    previewGlimpseRevealTimer = window.setTimeout(() => {
      previewGlimpsesRevealed = true
      if (appState.selectedStoryId) revealedPreviewStoryIds.add(appState.selectedStoryId)
      previewImageTrack.classList.add("is-glimpse-revealed")
      previewImageTrack.classList.remove("is-glimpse-revealing")
      meaningPreviewScreen.classList.remove("is-story-glimpse-revealing")
      meaningPreviewScreen.classList.add("is-story-glimpse-complete")
      storyForwardButton.classList.add("is-preview-next-ready")
      previewGlimpseRevealTimer = 0
    }, revealDuration)
  }

  function createStoryFragmentCard(moment: StoryImagePreviewMoment, index: number, total: number): HTMLElement {
    const imageFrame = document.createElement("figure")
    imageFrame.className = "preview-moment story-fragment-card story-glimpse-card"
    imageFrame.dataset.scene = moment.scene
    imageFrame.dataset.fragmentIndex = String(index)
    imageFrame.style.setProperty("--glimpse-index", String(index))
    imageFrame.style.setProperty("--fragment-count", String(total))
    imageFrame.setAttribute("aria-label", `Story image ${index + 1}`)
    imageFrame.setAttribute("role", "button")
    imageFrame.tabIndex = 0

    const fragmentFrame = document.createElement("span")
    fragmentFrame.className = "preview-fragment-frame"
    fragmentFrame.setAttribute("aria-hidden", "true")

    if (moment.image) {
      const img = document.createElement("img")
      img.className = "preview-image"
      img.src = moment.image
      img.alt = ""
      fragmentFrame.append(img)
    } else {
      const scene = document.createElement("span")
      scene.className = `story-image-scene story-image-scene-${moment.scene}`
      scene.setAttribute("aria-hidden", "true")

      const cat = document.createElement("span")
      cat.className = "story-image-scene-cat"
      cat.textContent = conceptIcons.cat ?? "cat"

      const food = document.createElement("span")
      food.className = "story-image-scene-food"
      food.textContent = moment.scene === "big-cat" ? conceptIcons.cat ?? "cat" : conceptIcons.food ?? "food"

      const accent = document.createElement("span")
      accent.className = "story-image-scene-accent"

      scene.append(cat, food, accent)
      fragmentFrame.append(scene)
    }

    const vignette = document.createElement("span")
    vignette.className = "preview-fragment-vignette"
    vignette.setAttribute("aria-hidden", "true")

    const vine = document.createElement("span")
    vine.className = "preview-fragment-vine"
    vine.setAttribute("aria-hidden", "true")

    const leaves = document.createElement("span")
    leaves.className = "preview-fragment-leaves"
    leaves.setAttribute("aria-hidden", "true")

    fragmentFrame.append(vignette, vine, leaves)
    imageFrame.append(fragmentFrame)

    imageFrame.addEventListener("click", () => {
      if (!previewGlimpsesRevealed) return
      imageFrame.classList.add("is-glimpse-peek")
      window.setTimeout(() => imageFrame.classList.remove("is-glimpse-peek"), 520)
    })

    imageFrame.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return
      event.preventDefault()
      imageFrame.click()
    })

    return imageFrame
  }

  function createStoryGlimpseSeed(): HTMLButtonElement {
    const button = document.createElement("button")
    button.className = "story-glimpse-seed"
    button.type = "button"
    button.setAttribute("aria-label", "Reveal story glimpses")

    const core = document.createElement("span")
    core.className = "story-glimpse-seed-core"
    core.setAttribute("aria-hidden", "true")

    button.append(core)
    button.addEventListener("click", revealStoryGlimpses)

    return button
  }

  function renderStoryFragmentPath(story: Story): void {
    const shouldShowRevealed = revealedPreviewStoryIds.has(story.id)
    previewGlimpsesRevealed = shouldShowRevealed
    window.clearTimeout(previewGlimpseRevealTimer)
    clearNode(previewImageTrack)
    previewImageTrack.className = shouldShowRevealed ? "story-fragment-list is-glimpse-revealed" : "story-fragment-list is-glimpse-waiting"
    meaningPreviewScreen.classList.toggle("is-story-glimpse-waiting", !shouldShowRevealed)
    meaningPreviewScreen.classList.remove("is-story-glimpse-revealing")
    meaningPreviewScreen.classList.toggle("is-story-glimpse-complete", shouldShowRevealed)
    storyForwardButton.classList.toggle("is-preview-next-ready", shouldShowRevealed)

    if (!shouldShowRevealed) previewImageTrack.append(createStoryGlimpseSeed())

    const moments = getStoryImagePreviewMoments(story).slice(0, 5)
    moments.forEach((moment, index) => {
      previewImageTrack.append(createStoryFragmentCard(moment, index, moments.length))
    })
  }

  function expandPrimerCard(card: HTMLElement): void {
    if (expandedPrimerCard === card) return
    collapsePrimerCard()

    expandedPrimerCard = card
    card.classList.add("is-expanded", "primer-card-expanded")
    card.querySelector<HTMLElement>(".primer-breakdown")?.removeAttribute("hidden")
    card.querySelector<HTMLButtonElement>(".primer-collapse-button")?.removeAttribute("hidden")
    primerCardTrack.classList.add("has-expanded-card")
    primerBackdrop.hidden = false
  }

  function renderMeaningPreviewWorld(storyId: string): void {
    const story = allStories.find((candidate) => candidate.id === storyId)
    if (!story) return

    stopPreviewMomentAudio()
    clearNode(previewSignature)
    clearNode(previewAudioTrack)
    previewAudioTrack.hidden = true

    getStorySignature(story).forEach((concept) => {
      const symbol = document.createElement("span")
      symbol.className = "preview-title-symbol"
      symbol.textContent = conceptIcons[concept] ?? "○"
      previewSignature.append(symbol)
    })

    const moments: PreviewMoment[] = []
    renderStoryFragmentPath(story)

    return

    moments.forEach((moment) => {
      const imageFrame = document.createElement("figure")
      imageFrame.className = "preview-moment"
      imageFrame.setAttribute("aria-hidden", "true")

      if (moment.image) {
        const img = document.createElement("img")
        img.className = "preview-image"
        img.src = moment.image
        img.alt = ""
        imageFrame.append(img)
      } else {
        const fallbackSymbol = document.createElement("span")
        fallbackSymbol.className = "preview-fallback-symbol"
        fallbackSymbol.textContent = conceptIcons[moment.symbol ?? moment.id] ?? "○"
        imageFrame.append(fallbackSymbol)
      }

      void imageFrame

      const audioButton = document.createElement("button")
      audioButton.className = "preview-sound preview-audio-node"
      audioButton.type = "button"
      audioButton.setAttribute("aria-label", `Play ${moment.symbol ?? moment.id} audio`)
      const ripple = document.createElement("span")
      ripple.className = "preview-audio-ripple"
      audioButton.append(ripple)
      audioButton.addEventListener("click", () => {
        playPreviewMomentAudio(moment, audioButton)
      })
      previewAudioTrack.append(audioButton)
    })
  }

  function createTrack(type: "phonemes" | "syllables" | "tone" | "features", pieces: SoundPiece[]): HTMLElement | null {
    if (!pieces.length && type === "features") return null

    const track = document.createElement("div")
    track.className = `sound-track sound-track-${type}`
    track.setAttribute("aria-label", `${type} track`)

    const playablePieces = pieces.length ? pieces : [{ id: `${type}-fallback`, audio: fallbackPrimerAudio }]

    playablePieces.forEach((piece) => {
      const button = document.createElement("button")
      button.className = type === "tone" ? `sound-contour sound-contour-${piece.shape ?? "soft"}` : `sound-particle sound-particle-${type}`
      button.type = "button"
      button.setAttribute("aria-label", `Play ${type} sound`)
      button.addEventListener("click", () => {
        playPrimerAudio(piece.audio, button)
      })
      track.append(button)
    })

    return track
  }

  function renderSoundBreakdown(item: PrimerItem, container: HTMLElement): void {
    const roots = document.createElement("div")
    roots.className = "primer-sound-roots"

    const wordSeed = document.createElement("button")
    wordSeed.className = "primer-word-seed"
    wordSeed.type = "button"
    wordSeed.setAttribute("aria-label", "Play whole word audio")
    wordSeed.innerHTML = "<span aria-hidden=\"true\"></span>"
    wordSeed.addEventListener("click", () => {
      playPrimerAudio(item.wholeAudio, wordSeed)
    })

    const syllableRow = document.createElement("button")
    syllableRow.className = "primer-syllable-row"
    syllableRow.type = "button"
    syllableRow.setAttribute("aria-label", "Play syllable shape")
    const syllableCount = Math.max(1, Math.min(4, item.syllables?.length ?? 1))
    Array.from({ length: syllableCount }).forEach(() => {
      const dot = document.createElement("span")
      dot.className = "primer-syllable-dot"
      syllableRow.append(dot)
    })
    syllableRow.addEventListener("click", () => {
      const syllableAudio = item.syllables?.find((piece) => piece.audio && piece.audio !== item.wholeAudio)?.audio
      if (!syllableAudio) {
        syllableRow.classList.add("primer-syllable-row-playing")
        window.setTimeout(() => syllableRow.classList.remove("primer-syllable-row-playing"), 520)
        return
      }

      playPrimerAudio(syllableAudio, syllableRow)
    })

    const toneButton = document.createElement("button")
    toneButton.className = "primer-tone-contour"
    toneButton.type = "button"
    toneButton.setAttribute("aria-label", "Play tone contour")
    toneButton.innerHTML = "<span aria-hidden=\"true\"></span>"
    toneButton.addEventListener("click", () => {
      const toneAudio = item.toneOrPitch?.find((piece) => piece.audio && piece.audio !== item.wholeAudio)?.audio
      if (!toneAudio) {
        toneButton.classList.add("is-primer-playing")
        window.setTimeout(() => toneButton.classList.remove("is-primer-playing"), 520)
        return
      }

      playPrimerAudio(toneAudio, toneButton)
    })

    roots.append(wordSeed, syllableRow, toneButton)
    container.append(roots)
  }

  function renderPrimerCard(item: PrimerItem): HTMLElement {
    const card = document.createElement("article")
    card.className = "primer-card"
    card.dataset.primerId = item.id

    const expandButton = document.createElement("button")
    expandButton.className = "primer-expand-zone primer-expanded-image"
    expandButton.type = "button"
    expandButton.setAttribute("aria-label", "Expand sound pieces")

    if (item.image) {
      const img = document.createElement("img")
      img.className = "primer-image"
      img.src = item.image
      img.alt = ""
      img.setAttribute("aria-hidden", "true")
      expandButton.append(img)
    } else {
      const symbol = document.createElement("span")
      symbol.className = "primer-fallback-symbol"
      symbol.textContent = conceptIcons[item.id] ?? "○"
      symbol.setAttribute("aria-hidden", "true")
      expandButton.append(symbol)
    }

    const audioButton = document.createElement("button")
    audioButton.className = "primer-audio-button"
    audioButton.type = "button"
    audioButton.setAttribute("aria-label", "Play full sound")
    audioButton.innerHTML = `
      <span class="primer-soundwave-play" aria-hidden="true">
        ${primerSoundwaveSvgMarkup.trim()}
      </span>
    `
    audioButton.querySelectorAll("svg").forEach((svg) => {
      svg.setAttribute("focusable", "false")
      svg.setAttribute("aria-hidden", "true")
    })
    audioButton.addEventListener("click", (event) => {
      event.stopPropagation()
      playPrimerAudio(item.wholeAudio, audioButton)
    })

    const expandCue = document.createElement("span")
    expandCue.className = "primer-expand-cue"
    expandCue.setAttribute("aria-hidden", "true")

    const collapseButton = document.createElement("button")
    collapseButton.className = "primer-collapse-button primer-expanded-close"
    collapseButton.type = "button"
    collapseButton.hidden = true
    collapseButton.setAttribute("aria-label", "Collapse primer card")
    collapseButton.innerHTML = "<span aria-hidden=\"true\"></span>"
    collapseButton.addEventListener("click", (event) => {
      event.stopPropagation()
      collapsePrimerCard()
    })

    const breakdown = document.createElement("div")
    breakdown.className = "primer-breakdown"
    breakdown.hidden = true
    renderSoundBreakdown(item, breakdown)

    expandButton.addEventListener("click", () => {
      expandPrimerCard(card)
    })

    card.append(expandButton, audioButton, expandCue, collapseButton, breakdown)
    return card
  }

  function renderMeaningPrimer(storyId: string): void {
    const story = allStories.find((candidate) => candidate.id === storyId)
    if (!story) return

    stopPrimerAudio()
    collapsePrimerCard()
    clearNode(primerCardTrack)
    clearNode(previewSignature)
    getStorySignature(story).forEach((concept) => {
      const symbol = document.createElement("span")
      symbol.className = "preview-title-symbol"
      symbol.textContent = conceptIcons[concept] ?? "â—‹"
      previewSignature.append(symbol)
    })
    const primerItems = getPrimerItems(story, appState.selectedLanguage)
    primerCardTrack.dataset.count = String(primerItems.length)
    primerItems.forEach((item) => {
      primerCardTrack.append(renderPrimerCard(item))
    })
  }

  // Story playback helpers drive scene images, auto/manual modes, progress, and audio timing.
  function getStoryById(storyId: string): Story | undefined {
    return allStories.find((candidate) => candidate.id === storyId)
  }

  function getSceneIndexFromTime(scenes: StoryScene[], time: number): number {
    const sceneIndex = scenes.findIndex((scene, index) => {
      const start = scene.start ?? index * 3.8
      const end = scene.end ?? start + 3.8
      return time >= start && time < end
    })

    if (sceneIndex >= 0) return sceneIndex
    return time >= (scenes.at(-1)?.end ?? 0) ? Math.max(0, scenes.length - 1) : 0
  }

  function renderStoryProgress(scenes: StoryScene[]): void {
    clearNode(storyProgress)

    scenes.forEach((_, index) => {
      const dot = document.createElement("span")
      dot.className = index === appState.currentStorySceneIndex ? "is-active" : index < appState.currentStorySceneIndex ? "is-complete" : ""
      dot.setAttribute("aria-hidden", "true")
      storyProgress.append(dot)
    })
  }

  function updateStoryProgress(story: Story, sceneIndex: number): void {
    const scenes = getStoryScenes(story, appState.selectedLanguage, storyAudioBase)
    if (storyProgress.children.length !== scenes.length) renderStoryProgress(scenes)

    Array.from(storyProgress.children).forEach((dot, index) => {
      dot.classList.toggle("is-active", index === sceneIndex)
      dot.classList.toggle("is-complete", index < sceneIndex)
    })
    storyProgress.setAttribute("aria-label", `Section ${sceneIndex + 1} of ${scenes.length}`)
  }

  function updateStoryModeButtons(): void {
    storyAutoButton.classList.toggle("is-active", selectedStoryMode === "auto")
    storyManualButton.classList.toggle("is-active", selectedStoryMode === "manual")
    storyAutoButton.setAttribute("aria-pressed", String(selectedStoryMode === "auto"))
    storyManualButton.setAttribute("aria-pressed", String(selectedStoryMode === "manual"))
  }

  function showStoryScene(story: Story, sceneIndex: number): void {
    const scenes = getStoryScenes(story, appState.selectedLanguage, storyAudioBase)
    const scene = scenes[sceneIndex]
    if (!scene) return

    appState.currentStorySceneIndex = sceneIndex
    storyImage.classList.add("is-changing")

    window.setTimeout(() => {
      storyImage.src = scene.image || ""
      storyImage.classList.remove("is-changing")
    }, 180)

    const isFirstScene = sceneIndex <= 0
    const isLastScene = sceneIndex >= scenes.length - 1
    storyPrevButton.disabled = isFirstScene
    storyPrevButton.hidden = isFirstScene
    storyNextButton.disabled = isLastScene
    storyNextButton.hidden = isLastScene
    updateStoryProgress(story, sceneIndex)
  }

  function runStoryEcho(duration = 1200): void {
    runAudioEchoGap(storyEcho, duration)
  }

  function getStoryAudioSource(story: Story): string {
    return resolveStoryAsset(story.audio, storyAudioBase)
  }

  function stopStoryAudio(): void {
    window.clearTimeout(storySceneTimer)
    storyStage.classList.remove("is-playing")
    storyAudioButton.classList.remove("is-playing")

    if (!currentStoryAudio) return

    stopAudio(currentStoryAudio)
    currentStoryAudio = null
  }

  function finishStory(): void {
    window.clearTimeout(storySceneTimer)
    storyStage.classList.remove("is-playing")
    storyAudioButton.classList.remove("is-playing")
    currentStoryAudio = null
    selectedStoryMode = null
    storyWorld.dataset.storyMode = "complete"
    storyModeGate.hidden = true
    storyControls.hidden = true
    storyProgress.hidden = true
    updateStoryModeButtons()
    storyReplayButton.hidden = true
    storyAudioButton.hidden = false
    setStoryAudioButtonIcon("replay")
  }

  function runTimedAutoStory(story: Story, sceneIndex = 0): void {
    const scenes = getStoryScenes(story, appState.selectedLanguage, storyAudioBase)
    const scene = scenes[sceneIndex]
    if (!scene) {
      finishStory()
      return
    }

    showStoryScene(story, sceneIndex)
    const duration = Math.max(1200, ((scene.end ?? sceneIndex * 3.8 + 3.8) - (scene.start ?? sceneIndex * 3.8)) * 1000)
    storySceneTimer = window.setTimeout(() => {
      runTimedAutoStory(story, sceneIndex + 1)
    }, duration)
  }

  function playFullStoryAudio(story: Story): void {
    const scenes = getStoryScenes(story, appState.selectedLanguage, storyAudioBase)
    const src = getStoryAudioSource(story)

    if (!src) {
      runTimedAutoStory(story)
      return
    }

    const audio = new Audio(src)
    currentStoryAudio = audio

    audio.addEventListener("timeupdate", () => {
      const sceneIndex = getSceneIndexFromTime(scenes, audio.currentTime)
      if (sceneIndex !== appState.currentStorySceneIndex) showStoryScene(story, sceneIndex)
    })

    audio.addEventListener("ended", finishStory)
    audio.addEventListener("error", () => {
      currentStoryAudio = null
      runTimedAutoStory(story, appState.currentStorySceneIndex)
    })

    audio.play().catch(() => {
      currentStoryAudio = null
      runTimedAutoStory(story, appState.currentStorySceneIndex)
    })
  }

  function startAutoStory(story: Story): void {
    selectedStoryMode = "auto"
    stopStoryAudio()
    storyWorld.dataset.storyMode = "playing"
    setStoryAudioButtonIcon("play")
    updateStoryModeButtons()
    storyStage.classList.add("is-playing")
    storyAudioButton.classList.add("is-playing")
    storyModeGate.hidden = true
    storyControls.hidden = true
    storyProgress.hidden = true
    storyAudioButton.hidden = false
    storyPrevButton.hidden = true
    storyNextButton.hidden = true
    storyReplayButton.hidden = true
    storyForwardButton.hidden = false
    appState.currentStorySceneIndex = 0
    showStoryScene(story, 0)
    playFullStoryAudio(story)
  }

  function playSceneAudio(story: Story, sceneIndex: number): void {
    const scene = getStoryScenes(story, appState.selectedLanguage, storyAudioBase)[sceneIndex]
    if (!scene) return

    stopStoryAudio()
    storyStage.classList.add("is-playing")
    storyAudioButton.classList.add("is-playing")

    const sceneAudio = scene.audio
    const fullStoryAudio = getStoryAudioSource(story)
    const audio = new Audio(sceneAudio || fullStoryAudio)

    if (!sceneAudio && !fullStoryAudio) {
      storyStage.classList.remove("is-playing")
      storyAudioButton.classList.remove("is-playing")
      runStoryEcho()
      return
    }

    currentStoryAudio = audio
    const sceneEnd = scene.end

    if (!sceneAudio && scene.start !== undefined) {
      audio.addEventListener("loadedmetadata", () => {
        audio.currentTime = scene.start ?? 0
      })
      audio.addEventListener("timeupdate", () => {
        if (sceneEnd !== undefined && audio.currentTime >= sceneEnd) {
          stopStoryAudio()
          runStoryEcho()
        }
      })
    }

    audio.addEventListener("ended", () => {
      storyStage.classList.remove("is-playing")
      storyAudioButton.classList.remove("is-playing")
      currentStoryAudio = null
      runStoryEcho(Number.isFinite(audio.duration) ? Math.min(1800, Math.max(900, audio.duration * 360)) : 1200)
    })
    audio.addEventListener("error", () => {
      storyStage.classList.remove("is-playing")
      storyAudioButton.classList.remove("is-playing")
      currentStoryAudio = null
      runStoryEcho()
    })

    audio.play().catch(() => {
      storyStage.classList.remove("is-playing")
      storyAudioButton.classList.remove("is-playing")
      currentStoryAudio = null
      runStoryEcho()
    })
  }

  function startManualStory(story: Story): void {
    selectedStoryMode = "manual"
    stopStoryAudio()
    storyWorld.dataset.storyMode = "manual"
    updateStoryModeButtons()
    appState.currentStorySceneIndex = Math.min(appState.currentStorySceneIndex, getStoryScenes(story, appState.selectedLanguage, storyAudioBase).length - 1)
    storyModeGate.hidden = true
    storyControls.hidden = false
    storyProgress.hidden = false
    storyAudioButton.hidden = false
    storyPrevButton.hidden = false
    storyNextButton.hidden = false
    storyReplayButton.hidden = true
    storyForwardButton.hidden = false
    showStoryScene(story, appState.currentStorySceneIndex)
    updateStoryProgress(story, appState.currentStorySceneIndex)
  }

  function renderMeaningStory(storyId: string): void {
    const story = getStoryById(storyId)
    if (!story) return

    stopStoryAudio()
    currentStory = story
    appState.currentStorySceneIndex = 0
    selectedStoryMode = null
    storyWorld.dataset.storyMode = "ready"
    storyModeGate.hidden = true
    storyControls.hidden = true
    storyProgress.hidden = true
    storyAudioButton.hidden = false
    storyReplayButton.hidden = true
    storyPrevButton.hidden = true
    storyNextButton.hidden = true
    storyForwardButton.hidden = false
    setStoryAudioButtonIcon("play")
    updateStoryModeButtons()
    showStoryScene(story, 0)
  }

  // Story lesson navigation connects shell buttons to section-specific renderers.
  function enterStoryLessonSection(section: StoryLessonSectionId, previousSection: StoryLessonSectionId): void {
    if (previousSection === "preview" && section !== "preview") {
      stopPreviewMomentAudio()
      window.clearTimeout(previewGlimpseRevealTimer)
      storyForwardButton.classList.remove("is-preview-next-ready")
      meaningPreviewScreen.classList.remove("is-story-glimpse-waiting", "is-story-glimpse-revealing", "is-story-glimpse-complete")
    }
    if (previousSection === "primer" && section !== "primer") {
      collapsePrimerCard()
      stopPrimerAudio()
    }
    if (previousSection === "story" && section !== "story") stopStoryAudio()
    if (previousSection === "recall" && section !== "recall") stopRecallAudio()

    if (!appState.selectedStoryId) return

    if (demoConfig.enabled && previousSection === "story" && section === "recall") {
      renderDemoFinishScreen(appState.selectedStoryId)
      setSurface("demoFinish")
      return
    }

    if (section === "preview") renderMeaningPreviewWorld(appState.selectedStoryId)
    if (section === "primer") renderMeaningPrimer(appState.selectedStoryId)
    if (section === "story") renderMeaningStory(appState.selectedStoryId)
    if (section === "recall") renderMeaningRecall(appState.selectedStoryId)
    if (section === "reflection") renderMeaningReflection(appState.selectedStoryId)
    setSurface(storyLessonSectionSurfaces[section])
  }

  // Recall helpers render prompts, answer choices, feedback, and audio previews.
  function goBackToStorySelection(): void {
    stopStoryAudio()
    if (demoConfig.enabled) {
      const story = appState.selectedStoryId ? getStoryById(appState.selectedStoryId) : undefined
      renderDemoMeaningTreeIntro(story)
      setSurface("meaningArc")
      return
    }

    if (appState.selectedArcId) renderStoryPods(getStoriesForArc(appState.selectedArcId))
    setSurface("storyBranch")
  }

  function goForwardFromStory(): void {
    stopStoryAudio()
    if (demoConfig.enabled) {
      if (appState.selectedStoryId) renderDemoFinishScreen(appState.selectedStoryId)
      setSurface("demoFinish")
      return
    }

    if (appState.selectedStoryId) renderMeaningRecall(appState.selectedStoryId)
    setSurface("recall")
  }

  function stopRecallAudio(): void {
    activeRecallPromptButton?.classList.remove("is-playing")
    recallScreen.querySelectorAll(".is-playing").forEach((element) => element.classList.remove("is-playing"))
    stopAudio(recallAudio)
  }

  function getRecallPromptAudio(prompt: RecallPrompt | undefined): string | undefined {
    if (!prompt) return undefined
    if (prompt.prompt?.kind === "audio") return prompt.prompt.audio
    return prompt.audio
  }

  function getRecallPromptImage(prompt: RecallPrompt | undefined): { image?: string; symbol?: string } {
    if (!prompt) return {}
    if (prompt.prompt?.kind === "image") return { image: prompt.prompt.image, symbol: prompt.prompt.symbol }
    return { image: prompt.image, symbol: prompt.symbol }
  }

  function recallChoiceHasImage(choice: RecallChoice): boolean {
    return choice.kind === "meaning" || choice.kind === "image"
  }

  function recallChoiceHasAudio(choice: RecallChoice): boolean {
    return Boolean(choice.audio) || choice.kind === "audio" || choice.kind === "perception"
  }

  function getRecallMode(prompt: RecallPrompt): RecallMode {
    if (prompt.mode) return prompt.mode

    const hasPromptAudio = Boolean(getRecallPromptAudio(prompt))
    const promptImage = getRecallPromptImage(prompt)
    const hasPromptImage = Boolean(promptImage.image || promptImage.symbol)
    const choicesAreImages = prompt.choices.every(recallChoiceHasImage)
    const choicesHaveAudio = prompt.choices.every(recallChoiceHasAudio)

    if (hasPromptAudio && choicesAreImages) return "audio-image"
    if (hasPromptImage && choicesHaveAudio) return "image-audio"
    if (hasPromptAudio && choicesHaveAudio) return "audio-audio"

    return "audio-image"
  }

  function setRecallComplete(isComplete: boolean): void {
    recallWorld.dataset.recallComplete = String(isComplete)
    storyForwardButton.disabled = !isComplete
    storyForwardButton.setAttribute("aria-disabled", String(!isComplete))
    storyForwardButton.classList.toggle("is-recall-ready", isComplete)
  }

  function playRecallPrompt(): void {
    const prompt = currentRecallPrompts[appState.currentRecallIndex]
    const audio = getRecallPromptAudio(prompt)
    stopRecallAudio()
    if (!audio || !activeRecallPromptButton) {
      recallWorld.dataset.promptHeard = "true"
      return
    }

    recallWorld.dataset.promptHeard = "true"
    activeRecallPromptButton.classList.add("is-playing")
    recallAudio.src = audio
    recallAudio.currentTime = 0
    recallAudio.onended = () => {
      activeRecallPromptButton?.classList.remove("is-playing")
      window.setTimeout(() => {
        if (currentRecallPrompts[appState.currentRecallIndex] === prompt) recallWorld.dataset.promptHeard = "true"
      }, 100)
    }
    recallAudio.onerror = () => {
      activeRecallPromptButton?.classList.remove("is-playing")
      recallWorld.dataset.promptHeard = "true"
    }
    recallAudio.play().catch(() => {
      activeRecallPromptButton?.classList.remove("is-playing")
      recallWorld.dataset.promptHeard = "true"
    })
  }

  function playRecallChoiceAudio(audioSrc: string | undefined, activeElement: HTMLElement): void {
    stopRecallAudio()
    activeElement.classList.add("is-playing")

    if (!audioSrc) {
      window.setTimeout(() => {
        activeElement.classList.remove("is-playing")
      }, 700)
      return
    }

    recallAudio.src = audioSrc
    recallAudio.currentTime = 0
    recallAudio.onended = () => {
      activeElement.classList.remove("is-playing")
    }
    recallAudio.onerror = () => {
      activeElement.classList.remove("is-playing")
    }
    recallAudio.play().catch(() => {
      window.setTimeout(() => {
        activeElement.classList.remove("is-playing")
      }, 700)
    })
  }

  function renderRecallProgress(): void {
    clearNode(recallProgress)
    currentRecallPrompts.forEach((_, index) => {
      const dot = document.createElement("span")
      dot.className = index === appState.currentRecallIndex ? "is-active" : index < appState.currentRecallIndex ? "is-complete" : ""
      recallProgress.append(dot)
    })
  }

  function renderPerceptionChoice(choice: Extract<RecallChoice, { kind: "perception" }>, button: HTMLElement): void {
    const track = document.createElement("span")
    track.className = "recall-perception-track"
    choice.pattern.forEach((scale) => {
      const particle = document.createElement("span")
      particle.style.setProperty("--scale", String(scale))
      track.append(particle)
    })
    button.append(track)
  }

  function renderMeaningChoice(choice: Extract<RecallChoice, { kind: "meaning" | "image" }>, button: HTMLElement): void {
    if (choice.image) {
      const img = document.createElement("img")
      img.src = choice.image
      img.alt = ""
      img.setAttribute("aria-hidden", "true")
      button.append(img)
      return
    }

    const symbol = document.createElement("span")
    symbol.className = "recall-choice-symbol"
    symbol.textContent = choice.symbol ?? conceptIcons[choice.id] ?? "○"
    symbol.setAttribute("aria-hidden", "true")
    button.append(symbol)
  }

  function createRecallPromptImage(prompt: RecallPrompt): HTMLElement {
    const frame = document.createElement("figure")
    frame.className = "recall-prompt-image"
    frame.setAttribute("aria-label", "Recall image prompt")

    const promptImage = getRecallPromptImage(prompt)

    if (promptImage.image) {
      const img = document.createElement("img")
      img.src = promptImage.image
      img.alt = ""
      img.setAttribute("aria-hidden", "true")
      frame.append(img)
    } else {
      const symbol = document.createElement("span")
      symbol.className = "recall-choice-symbol"
      symbol.textContent = promptImage.symbol ? conceptIcons[promptImage.symbol] ?? "○" : "○"
      symbol.setAttribute("aria-hidden", "true")
      frame.append(symbol)
    }

    return frame
  }

  function createRecallPromptButton(className = "recall-prompt-button"): HTMLButtonElement {
    const button = document.createElement("button")
    button.className = className
    button.id = "recall-audio-button"
    button.type = "button"
    button.setAttribute("aria-label", "Replay recall prompt")
    button.innerHTML = "<span class=\"recall-prompt-orb\" aria-hidden=\"true\"></span>"
    button.addEventListener("click", playRecallPrompt)
    activeRecallPromptButton = button
    return button
  }

  function clearRecallConfirmButtons(): void {
    recallAnswerZone.querySelectorAll(".recall-confirm-button").forEach((button) => button.remove())
  }

  function renderRecallConfirmButton(prompt: RecallPrompt, index: number, element: HTMLElement): HTMLButtonElement {
    const confirmButton = document.createElement("button")
    confirmButton.className = "recall-confirm-button"
    confirmButton.type = "button"
    confirmButton.setAttribute("aria-label", "Confirm answer")
    confirmButton.innerHTML = "<span aria-hidden=\"true\"></span>"
    confirmButton.addEventListener("click", (event) => {
      event.stopPropagation()
      confirmAudioAnswer(prompt, index, element)
    })
    return confirmButton
  }

  function selectAudioAnswerPreview(prompt: RecallPrompt, index: number, element: HTMLElement, audioSrc: string | undefined): void {
    clearRecallConfirmButtons()
    recallAnswerZone.querySelectorAll(".recall-answer-orb").forEach((choiceElement) => {
      choiceElement.classList.remove("is-selected", "is-soft-miss")
    })
    recallFeedbackZone.className = "recall-feedback-zone"
    selectedRecallAudioAnswer = { promptId: prompt.id, index, element }
    element.classList.add("is-selected", "is-heard")
    element.append(renderRecallConfirmButton(prompt, index, element))
    playRecallChoiceAudio(audioSrc, element)
  }

  function confirmAudioAnswer(prompt: RecallPrompt, index: number, element: HTMLElement): void {
    if (selectedRecallAudioAnswer?.promptId !== prompt.id || selectedRecallAudioAnswer.index !== index) return
    selectRecallChoice(prompt, index, element)
  }

  function createRecallAnswerOrb(choice: RecallChoice, prompt: RecallPrompt, index: number): HTMLButtonElement {
    const button = document.createElement("button")
    button.className = "recall-choice recall-answer-orb"
    button.type = "button"
    button.setAttribute("role", "listitem")
    button.setAttribute("aria-label", "Audio answer choice")

    const core = document.createElement("span")
    core.className = "recall-answer-orb-core"
    core.setAttribute("aria-hidden", "true")

    const bars = document.createElement("span")
    bars.className = "recall-answer-orb-bars"
    bars.setAttribute("aria-hidden", "true")
    bars.innerHTML = "<span></span><span></span><span></span>"
    core.append(bars)

    button.append(core)
    button.addEventListener("click", () => {
      selectAudioAnswerPreview(prompt, index, button, choice.audio)
    })
    return button
  }

  function createRecallImageChoice(choice: Extract<RecallChoice, { kind: "meaning" | "image" }>, prompt: RecallPrompt, index: number): HTMLButtonElement {
    const button = document.createElement("button")
    button.className = "recall-choice recall-image-choice"
    button.type = "button"
    button.setAttribute("role", "listitem")
    button.setAttribute("aria-label", "Image answer choice")
    renderMeaningChoice(choice, button)
    button.addEventListener("click", () => selectRecallChoice(prompt, index, button))
    return button
  }

  function selectRecallChoice(prompt: RecallPrompt, index: number, element: HTMLElement): void {
    clearRecallConfirmButtons()
    selectedRecallAudioAnswer = null
    recallAnswerZone.querySelectorAll(".recall-choice").forEach((choiceElement) => {
      choiceElement.classList.remove("is-selected", "is-correct", "is-soft-miss")
    })

    element.classList.add("is-selected")

    if (index !== prompt.correctIndex) {
      element.classList.add("is-soft-miss")
      recallFeedbackZone.className = "recall-feedback-zone is-soft-miss"
      window.setTimeout(() => {
        element.classList.remove("is-soft-miss")
        recallFeedbackZone.className = "recall-feedback-zone"

        const promptAudio = getRecallPromptAudio(prompt)
        if (promptAudio) {
          playRecallPrompt()
        } else {
          recallPromptZone.classList.add("is-reprompting")
          window.setTimeout(() => {
            recallPromptZone.classList.remove("is-reprompting")
          }, 520)
        }
      }, 420)
      return
    }

    element.classList.add("is-correct")
    recallFeedbackZone.className = "recall-feedback-zone is-correct"

    window.setTimeout(() => {
      if (currentRecallPrompts[appState.currentRecallIndex] !== prompt) return
      stopRecallAudio()
      recallFeedbackZone.className = "recall-feedback-zone"

      if (appState.currentRecallIndex < currentRecallPrompts.length - 1) {
        appState.currentRecallIndex += 1
        renderRecallPrompt()
        return
      }

      setRecallComplete(true)
      renderRecallProgress()
    }, 420)
  }

  function renderImagePrompt(prompt: RecallPrompt): void {
    const { image, symbol } = getRecallPromptImage(prompt)
    const promptCard = document.createElement("div")
    promptCard.className = "recall-image-prompt"
    promptCard.setAttribute("aria-hidden", "true")

    if (image) {
      const img = document.createElement("img")
      img.src = image
      img.alt = ""
      img.setAttribute("aria-hidden", "true")
      promptCard.append(img)
    } else {
      const fallback = document.createElement("span")
      fallback.className = "recall-choice-symbol"
      fallback.textContent = symbol ?? "○"
      fallback.setAttribute("aria-hidden", "true")
      promptCard.append(fallback)
    }

    recallPromptZone.append(promptCard)
  }

  function renderRecallPromptZone(prompt: RecallPrompt): void {
    clearNode(recallPromptZone)
    activeRecallPromptButton = null

    const mode = getRecallMode(prompt)
    recallPromptZone.hidden = false

    if (mode === "image-audio") {
      recallPromptZone.append(createRecallPromptImage(prompt))
      return
    }

    const promptButton = createRecallPromptButton("recall-prompt-button recall-prompt-sound")
    promptButton.dataset.family = prompt.family ?? "meaning"
    recallPromptZone.append(promptButton)
  }

  function renderRecallAnswerZone(prompt: RecallPrompt): void {
    clearNode(recallAnswerZone)
    const mode = getRecallMode(prompt)
    recallAnswerZone.className = "recall-answer-zone"
    recallAnswerZone.classList.add(`recall-answer-zone-${mode}`)
    if (mode === "audio-audio" || mode === "image-audio") recallAnswerZone.classList.add("recall-answer-zone-sound-pair")

    if (mode === "audio-image") {
      prompt.choices.forEach((choice, index) => {
        const imageChoice = recallChoiceHasImage(choice)
          ? createRecallImageChoice(choice as Extract<RecallChoice, { kind: "meaning" | "image" }>, prompt, index)
          : createRecallImageChoice({ kind: "image", id: choice.id, symbol: conceptIcons[choice.id] ?? "○" }, prompt, index)
        imageChoice.dataset.choiceIndex = String(index)
        recallAnswerZone.append(imageChoice)
      })
      return
    }

    if (mode === "image-audio") {
      prompt.choices.forEach((choice, index) => {
        const audioChoice = createRecallAnswerOrb(choice, prompt, index)
        audioChoice.dataset.choiceIndex = String(index)
        recallAnswerZone.append(audioChoice)
      })
      return
    }

    prompt.choices.forEach((choice, index) => {
      const audioChoice = createRecallAnswerOrb(choice, prompt, index)
      audioChoice.dataset.choiceIndex = String(index)
      recallAnswerZone.append(audioChoice)
    })
  }

  function renderRecallPrompt(): void {
    const prompt = currentRecallPrompts[appState.currentRecallIndex]
    selectedRecallAudioAnswer = null
    activeRecallPromptButton = null
    stopRecallAudio()
    clearNode(recallPromptZone)
    clearNode(recallAnswerZone)
    clearNode(recallFeedbackZone)
    recallFeedbackZone.className = "recall-feedback-zone"
    if (!prompt) {
      setRecallComplete(true)
      return
    }
    setRecallComplete(false)

    const mode = getRecallMode(prompt)
    recallWorld.dataset.recallMode = mode
    recallWorld.dataset.choiceCount = String(prompt.choices.length)
    recallWorld.dataset.promptHeard = mode === "image-audio" ? "true" : "false"
    recallWorld.classList.remove("recall--audio-image", "recall--image-audio", "recall--audio-audio")
    recallWorld.classList.toggle("is-audio-audio", mode === "audio-audio")
    recallWorld.classList.toggle("is-audio-image", mode === "audio-image")
    recallWorld.classList.toggle("is-image-audio", mode === "image-audio")
    recallWorld.classList.add(`recall--${mode}`)
    renderRecallPromptZone(prompt)
    renderRecallAnswerZone(prompt)
    renderRecallProgress()

    if (mode === "audio-audio" || mode === "audio-image") window.setTimeout(playRecallPrompt, 220)
  }

  function renderMeaningRecall(storyId: string): void {
    const story = getStoryById(storyId)
    if (!story) return

    stopRecallAudio()
    currentStory = story
    currentRecallPrompts = getRecallPrompts(story, appState.selectedLanguage, storyAudioBase)
    appState.currentRecallIndex = 0
    setRecallComplete(currentRecallPrompts.length === 0)
    renderRecallPrompt()
  }

  // Reflection helpers mark story completion and route the learner to the next action.
  function goBackToStory(): void {
    stopRecallAudio()
    if (appState.selectedStoryId) renderMeaningStory(appState.selectedStoryId)
    setSurface("story")
  }

  function continueFromRecall(): void {
    stopRecallAudio()
    if (appState.selectedStoryId) renderMeaningReflection(appState.selectedStoryId)
    setSurface("reflection")
  }

  function openFeedbackForm(kind: "generic" | "positive" | "negative" = "generic"): void {
    const url = feedbackFormUrls[kind]
    if (!url) return
    window.open(url, "_blank", "noopener,noreferrer")
  }

  function createReflectionFeedbackButton(kind: "positive" | "negative", markup: string): HTMLButtonElement {
    const button = document.createElement("button")
    button.className = `reflection-feedback-button reflection-feedback-${kind}`
    button.type = "button"
    button.setAttribute("aria-label", kind === "positive" ? "Positive demo feedback" : "Negative demo feedback")
    button.innerHTML = `
      <span class="reflection-feedback-icon" aria-hidden="true">
        ${markup.trim()}
      </span>
    `
    button.addEventListener("click", () => {
      reflectionScreen.dataset.feedback = kind
      openFeedbackForm(kind)
    })
    return button
  }

  function renderMeaningReflection(storyId: string): void {
    const story = getStoryById(storyId)
    if (!story) return

    appState.completedStoryIds.add(storyId)
    delete reflectionScreen.dataset.feedback
    reflectionGrowth.innerHTML = reflectionSproutSvgMarkup.trim()
    reflectionGrowth.querySelectorAll("svg").forEach((svg) => {
      svg.setAttribute("focusable", "false")
      svg.setAttribute("aria-hidden", "true")
    })
    clearNode(reflectionStorySymbols)
    getStorySignature(story).forEach((concept) => {
      const symbol = document.createElement("span")
      symbol.textContent = conceptIcons[concept] ?? "○"
      reflectionStorySymbols.append(symbol)
    })
    reflectionStoryPod.removeAttribute("aria-hidden")
    reflectionStoryPod.classList.add("is-feedback-pod")
    clearNode(reflectionStorySymbols)
    reflectionStorySymbols.className = "reflection-feedback-row"
    reflectionStorySymbols.append(
      createReflectionFeedbackButton("positive", reflectionThumbsUpSvgMarkup),
      createReflectionFeedbackButton("negative", reflectionThumbsDownSvgMarkup)
    )
    muteInlineSvg(reflectionStorySymbols)
  }

  function replayStoryFromReflection(): void {
    if (!appState.selectedStoryId) return
    stopStoryAudio()
    stopRecallAudio()
    renderMeaningPreviewWorld(appState.selectedStoryId)
    setSurface("meaningPreview")
  }

  function returnToPathSelection(): void {
    appState.selectedArcId = null
    appState.selectedStoryId = null
    setSurface("path")
  }

  function retryRecallFromReflection(): void {
    openFeedbackForm("generic")
  }

  function continueFromReflection(): void {
    goBackToStorySelection()
  }

  // Sound Garden overview renders sound categories and their playable previews.
  function enterSoundGardenWithTransition(sourceButton?: HTMLElement): void {
    if (isGardenTransitioning) return

    isGardenTransitioning = true
    appState.selectedPath = "sound-garden"
    sourceButton?.classList.add("is-entering-sound-garden")
    app.dataset.transition = "sound-garden-enter"
    makeChime()

    window.setTimeout(
      () => {
        renderSoundGarden()
        setSurface("soundGarden")

        sourceButton?.classList.remove("is-entering-sound-garden")
        delete app.dataset.transition
        isGardenTransitioning = false
      },
      prefersReducedMotion() ? 0 : soundGardenEnterDuration
    )
  }

  function createSectionIcon(section: SoundSection): string {
    return `<span class="sound-section-icon sound-section-icon-${section.iconType}" aria-hidden="true"></span>`
  }

  function createSoundVisual(section: SoundSection, preview: SoundPreview): HTMLElement {
    const visual = document.createElement("span")
    visual.className = `sound-preview-visual sound-preview-visual-${section.kind} sound-preview-visual-${preview.visual}`
    visual.setAttribute("aria-hidden", "true")
    return visual
  }

  function renderSoundPreviewExample(section: SoundSection, preview: SoundPreview): HTMLLIElement {
    const item = document.createElement("li")
    const visual = createSoundVisual(section, preview)

    const button = document.createElement("button")
    button.className = "sound-preview-play"
    button.type = "button"
    button.dataset.previewSound = preview.id
    button.setAttribute("aria-label", preview.ariaLabel)
    button.innerHTML = "<span aria-hidden=\"true\"></span>"
    button.addEventListener("click", () => {
      playSoundPreview(preview, item)
    })

    item.append(visual, button)
    return item
  }

  function renderSoundPreviewSection(section: SoundSection): HTMLLIElement {
    const item = document.createElement("li")
    item.className = "sound-preview-item"

    const article = document.createElement("article")
    article.className = "sound-preview"
    article.dataset.soundSection = section.id

    const mark = document.createElement("div")
    mark.className = `sound-preview-mark sound-preview-mark-${section.id}`
    mark.setAttribute("aria-hidden", "true")
    mark.innerHTML = createSectionIcon(section)

    const trackWrap = document.createElement("div")
    trackWrap.className = "sound-preview-track-wrap"

    const track = document.createElement("ul")
    track.className = `sound-preview-track sound-preview-track-${section.id}`

    section.previews.forEach((preview) => {
      track.append(renderSoundPreviewExample(section, preview))
    })

    trackWrap.append(track)
    trackWrap.scrollLeft = 0

    const enterButton = document.createElement("button")
    enterButton.className = "sound-preview-enter"
    enterButton.type = "button"
    enterButton.dataset.enterSection = section.id
    enterButton.setAttribute("aria-label", `Enter ${section.ariaLabel} section`)
    enterButton.innerHTML = "<span aria-hidden=\"true\"></span>"
    enterButton.addEventListener("click", () => {
      enterSoundSection(section.id)
    })

    article.append(mark, trackWrap, enterButton)
    item.append(article)
    return item
  }

  function renderSoundGarden(): void {
    clearNode(soundPreviewList)
    soundSections.forEach((section) => {
      soundPreviewList.append(renderSoundPreviewSection(section))
    })
    updateSoundGardenPreviewAlignment()
  }

  function updateSoundGardenPreviewAlignment(): void {
    window.requestAnimationFrame(() => {
      soundPreviewList.querySelectorAll<HTMLElement>(".sound-preview-track-wrap").forEach((trackWrap) => {
        const track = trackWrap.querySelector<HTMLElement>(".sound-preview-track")
        if (!track || !trackWrap.clientWidth) return

        trackWrap.classList.remove("has-overflow")
        trackWrap.scrollLeft = 0
        if (track.scrollWidth > trackWrap.clientWidth) {
          trackWrap.classList.add("has-overflow")
          trackWrap.scrollLeft = 0
        }
      })
    })
  }

  function stopCurrentSoundPreview(): void {
    if (currentSoundPreviewAudio) {
      currentSoundPreviewAudio.pause()
      currentSoundPreviewAudio.currentTime = 0
      currentSoundPreviewAudio = null
    }

    document.querySelectorAll(".sound-preview-track li.is-playing").forEach((item) => {
      item.classList.remove("is-playing")
    })
  }

  function playSoundPreview(preview: SoundPreview, element: HTMLElement): void {
    stopCurrentSoundPreview()
    element.classList.add("is-playing")

    const audio = new Audio(preview.audio)
    currentSoundPreviewAudio = audio

    const clearPlaying = () => {
      element.classList.remove("is-playing")
      currentSoundPreviewAudio = null
    }

    audio.addEventListener("ended", clearPlaying)
    audio.addEventListener("error", () => {
      window.setTimeout(clearPlaying, 900)
    })
    audio.play().catch(() => {
      window.setTimeout(clearPlaying, 900)
    })
  }

  function enterSoundSection(sectionId: string): void {
    selectedSoundSectionId = sectionId
    selectedSoundLessonId = null
    stopCurrentSoundPreview()
    stopLessonPreviewAudio()
    renderSoundLessonList()
    setSurface("soundLessonList")
  }

  // Sound lesson list helpers show lessons inside the chosen sound category.
  function renderLessonHeader(sectionId: string): void {
    const section = soundSections.find((candidate) => candidate.id === sectionId)
    clearNode(lessonHeader)
    if (!section) return
    lessonHeader.innerHTML = createSectionIcon(section)
  }

  function renderLessonPreviewVisual(item: SoundLessonPreviewItem, visualType: SoundVisualType): HTMLElement {
    const visual = document.createElement("span")
    visual.className = `lesson-preview-visual lesson-preview-visual-${visualType} lesson-preview-visual-${item.visual}`
    visual.setAttribute("aria-hidden", "true")
    return visual
  }

  function renderSoundLessonCard(lesson: SoundLesson): HTMLLIElement {
    const item = document.createElement("li")
    item.className = "sound-lesson-item"

    const article = document.createElement("article")
    article.className = "sound-lesson-card"
    article.dataset.soundLessonId = lesson.id
    article.setAttribute("aria-label", lesson.ariaLabel)
    if (!lesson.unlocked) article.classList.add("is-locked")
    if (lesson.completed) article.classList.add("is-complete")

    const mark = document.createElement("div")
    mark.className = "lesson-card-mark"
    mark.setAttribute("aria-hidden", "true")
    const markVisual = document.createElement("span")
    markVisual.className = `lesson-preview-visual lesson-preview-visual-${lesson.visualType} lesson-preview-visual-${lesson.previewItems[0]?.visual ?? "soft"}`
    mark.append(markVisual)

    const previewTrackWrap = document.createElement("div")
    previewTrackWrap.className = "lesson-preview-track-wrap"

    const previewTrack = document.createElement("ul")
    previewTrack.className = "lesson-preview-track"

    lesson.previewItems.forEach((previewItem) => {
      const previewLi = document.createElement("li")
      previewLi.className = "lesson-preview-item"

      const playButton = document.createElement("button")
      playButton.className = "lesson-preview-play"
      playButton.type = "button"
      playButton.setAttribute("aria-label", "Play lesson preview sound")
      playButton.innerHTML = "<span aria-hidden=\"true\"></span>"
      playButton.addEventListener("click", (event) => {
        event.stopPropagation()
        playLessonPreviewAudio(previewItem.audio, previewLi)
      })

      previewLi.append(renderLessonPreviewVisual(previewItem, lesson.visualType), playButton)
      previewTrack.append(previewLi)
    })
    previewTrackWrap.append(previewTrack)
    previewTrackWrap.scrollLeft = 0

    const enterButton = document.createElement("button")
    enterButton.className = "lesson-enter-button"
    enterButton.type = "button"
    enterButton.setAttribute("aria-label", "Enter lesson")
    enterButton.innerHTML = "<span aria-hidden=\"true\"></span>"
    enterButton.addEventListener("click", () => {
      if (!lesson.unlocked) return
      enterSoundLesson(lesson.id)
    })

    article.append(mark, previewTrackWrap, enterButton)
    item.append(article)
    return item
  }

  function renderSoundLessonList(): void {
    clearNode(soundLessonList)
    if (!selectedSoundSectionId) return
    renderLessonHeader(selectedSoundSectionId)

    soundLessons
      .filter((lesson) => lesson.sectionId === selectedSoundSectionId)
      .forEach((lesson) => soundLessonList.append(renderSoundLessonCard(lesson)))
  }

  // Sound lesson section renderers cover preview, primer, guided tuning, recall, and reflection.
  function stopLessonPreviewAudio(): void {
    if (currentLessonPreviewAudio) {
      currentLessonPreviewAudio.pause()
      currentLessonPreviewAudio.currentTime = 0
      currentLessonPreviewAudio = null
    }

    document.querySelectorAll(".lesson-preview-item.is-playing").forEach((item) => {
      item.classList.remove("is-playing")
    })
  }

  function playLessonPreviewAudio(audioSrc: string | undefined, activeElement?: HTMLElement): void {
    stopLessonPreviewAudio()
    activeElement?.classList.add("is-playing")
    if (!audioSrc) {
      window.setTimeout(() => activeElement?.classList.remove("is-playing"), 900)
      return
    }

    const audio = new Audio(audioSrc)
    currentLessonPreviewAudio = audio
    const clearPlaying = () => {
      activeElement?.classList.remove("is-playing")
      currentLessonPreviewAudio = null
    }
    audio.addEventListener("ended", clearPlaying)
    audio.addEventListener("error", () => window.setTimeout(clearPlaying, 900))
    audio.play().catch(() => window.setTimeout(clearPlaying, 900))
  }

  function getSoundLessonById(lessonId: string | null): SoundLesson | undefined {
    return soundLessons.find((lesson) => lesson.id === lessonId)
  }

  function markSoundLessonComplete(lessonId: string): void {
    const lesson = getSoundLessonById(lessonId)
    if (!lesson) return

    lesson.completed = true
    app.dataset.completedSoundLessons = String(soundLessons.filter((candidate) => candidate.completed).length)
  }

  function getLessonsForCurrentSection(): SoundLesson[] {
    if (!selectedSoundSectionId) return []
    return soundLessons.filter((lesson) => lesson.sectionId === selectedSoundSectionId)
  }

  function getNextSoundLesson(currentLessonId: string | null): SoundLesson | undefined {
    if (!currentLessonId) return undefined

    const lessons = getLessonsForCurrentSection()
    const currentIndex = lessons.findIndex((lesson) => lesson.id === currentLessonId)

    if (currentIndex < 0) return undefined

    return lessons[currentIndex + 1]
  }

  function createSoundLessonStepFrame(
    step: Exclude<SoundLessonStepId, "preview">,
    options: { interactiveVisual?: boolean } = {}
  ): { visual: HTMLElement; content: HTMLElement } {
    const section = getSoundLessonSection(step)
    clearNode(section)
    showSoundLessonSection(step)

    const visual = document.createElement("div")
    visual.className = "sound-lesson-visual"
    if (!options.interactiveVisual) visual.setAttribute("aria-hidden", "true")

    const content = document.createElement("div")
    content.className = "sound-lesson-content"

    section.append(visual, content)
    return { visual, content }
  }

  function enterSoundLesson(lessonId: string): void {
    selectedSoundLessonId = lessonId
    currentSoundLessonStep = "preview"
    currentSoundItemIndex = 0
    currentSoundPairIndex = 0
    currentRecallItemIndex = 0
    stopLessonPreviewAudio()
    stopSoundLessonAudio()
    app.dataset.soundLesson = lessonId
    renderSoundLessonPreview(lessonId)
    setSurface("soundLesson")
  }

  function renderSoundLessonPreview(lessonId: string): void {
    const lesson = getSoundLessonById(lessonId)
    if (!lesson) return

    currentSoundLessonStep = "preview"
    currentSoundItemIndex = 0
    stopSoundLessonAudio()
    clearNode(soundPreviewSection)
    showSoundLessonSection("preview")

    renderSoundLessonPreviewCards(lesson)
    renderSoundLessonProgress("preview")

    soundLessonReplayButton.disabled = false
    soundLessonBackButton.disabled = true
    soundLessonNextButton.disabled = false
  }

  function renderSoundLessonPreviewCards(lesson: SoundLesson): void {
    const preview = document.createElement("div")
    preview.className = "sound-lesson-preview"

    const trackWrap = document.createElement("div")
    trackWrap.className = "sound-lesson-preview-track-wrap"

    const track = document.createElement("ul")
    track.className = "sound-lesson-preview-track"

    lesson.previewItems.forEach((item, index) => {
      const previewItem = document.createElement("li")
      previewItem.className = "sound-lesson-preview-item"

      const card = document.createElement("button")
      card.className = "sound-lesson-preview-card"
      card.type = "button"
      card.setAttribute("aria-label", "Play lesson preview sound")

      const visual = document.createElement("span")
      visual.className = [
        "sound-lesson-preview-visual",
        `sound-lesson-preview-visual-${lesson.visualType}`,
        `sound-lesson-preview-visual-${item.visual}`
      ].join(" ")
      visual.setAttribute("aria-hidden", "true")

      const playDot = document.createElement("span")
      playDot.className = "sound-lesson-preview-play-dot"
      playDot.setAttribute("aria-hidden", "true")

      card.append(visual, playDot)
      card.addEventListener("click", () => {
        currentSoundItemIndex = index
        playSoundLessonAudio(item.audio, card)
      })

      previewItem.append(card)
      track.append(previewItem)
    })

    trackWrap.append(track)
    trackWrap.scrollLeft = 0

    const playAllButton = document.createElement("button")
    playAllButton.className = "sound-lesson-preview-main-play"
    playAllButton.type = "button"
    playAllButton.setAttribute("aria-label", "Play all preview sounds")
    playAllButton.innerHTML = "<span aria-hidden=\"true\"></span>"
    playAllButton.addEventListener("click", () => {
      void playLessonPreviewSequence(lesson)
    })

    preview.append(trackWrap, playAllButton)
    soundPreviewSection.append(preview)
  }

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
  }

  async function playLessonPreviewSequence(lesson: SoundLesson): Promise<void> {
    stopSoundLessonAudio()
    const cards = Array.from(soundPreviewSection.querySelectorAll<HTMLElement>(".sound-lesson-preview-card"))

    for (let index = 0; index < lesson.previewItems.length; index += 1) {
      const item = lesson.previewItems[index]
      currentSoundItemIndex = index
      await playSoundLessonAudioAsPromise(item.audio, cards[index])
      await wait(450)
    }
  }

  function renderSoundLessonPrimer(): void {
    const lesson = getSoundLessonById(selectedSoundLessonId)
    if (!lesson) return

    const item = lesson.previewItems[currentSoundItemIndex] ?? lesson.previewItems[0]
    if (!item) return

    stopSoundLessonAudio()

    currentSoundLessonStep = "primer"
    const { visual, content } = createSoundLessonStepFrame("primer")

    renderSoundLessonPrimerVisual(lesson, item, visual)
    renderSoundLessonPrimerContent(lesson, item, content)
    renderSoundLessonProgress("primer")

    soundLessonBackButton.disabled = false
    soundLessonNextButton.disabled = false
    soundLessonReplayButton.disabled = false
  }

  function renderSoundLessonPrimerVisual(lesson: SoundLesson, item: SoundLessonPreviewItem, container: HTMLElement): void {
    const visual = document.createElement("span")

    visual.className = [
      "sound-lesson-shape",
      `sound-lesson-shape-${lesson.visualType}`,
      `sound-lesson-shape-${item.visual}`
    ].join(" ")

    visual.setAttribute("aria-hidden", "true")
    container.append(visual)
  }

  function renderSoundLessonPrimerContent(lesson: SoundLesson, item: SoundLessonPreviewItem, container: HTMLElement): void {
    const primer = document.createElement("div")
    primer.className = "sound-lesson-primer"

    const focusCard = document.createElement("div")
    focusCard.className = "sound-lesson-primer-focus"

    const playButton = document.createElement("button")
    playButton.className = "sound-lesson-primer-play"
    playButton.type = "button"
    playButton.setAttribute("aria-label", "Play primer sound")
    playButton.innerHTML = "<span aria-hidden=\"true\"></span>"

    playButton.addEventListener("click", () => {
      playSoundLessonAudio(item.audio, playButton)
    })

    const itemProgress = document.createElement("div")
    itemProgress.className = "sound-lesson-primer-item-progress"
    itemProgress.setAttribute("aria-hidden", "true")

    lesson.previewItems.forEach((_, index) => {
      const dot = document.createElement("span")
      dot.className = index === currentSoundItemIndex ? "is-active" : ""
      itemProgress.append(dot)
    })

    const itemControls = document.createElement("div")
    itemControls.className = "sound-lesson-primer-item-controls"

    const previousItemButton = document.createElement("button")
    previousItemButton.className = "sound-lesson-primer-item-back"
    previousItemButton.type = "button"
    previousItemButton.setAttribute("aria-label", "Previous primer sound")
    previousItemButton.innerHTML = "<span aria-hidden=\"true\"></span>"
    previousItemButton.disabled = currentSoundItemIndex <= 0

    previousItemButton.addEventListener("click", () => {
      if (currentSoundItemIndex <= 0) return
      currentSoundItemIndex -= 1
      renderSoundLessonPrimer()
    })

    const nextItemButton = document.createElement("button")
    nextItemButton.className = "sound-lesson-primer-item-next"
    nextItemButton.type = "button"
    nextItemButton.setAttribute("aria-label", "Next primer sound")
    nextItemButton.innerHTML = "<span aria-hidden=\"true\"></span>"
    nextItemButton.disabled = currentSoundItemIndex >= lesson.previewItems.length - 1

    nextItemButton.addEventListener("click", () => {
      if (currentSoundItemIndex >= lesson.previewItems.length - 1) return
      currentSoundItemIndex += 1
      renderSoundLessonPrimer()
    })

    itemControls.append(previousItemButton, nextItemButton)
    focusCard.append(playButton, itemProgress, itemControls)
    primer.append(focusCard)
    container.append(primer)
  }

  function getGuidedTuningPairs(lesson: SoundLesson): Array<{ first: SoundLessonPreviewItem; second: SoundLessonPreviewItem }> {
    const items = lesson.previewItems

    if (items.length < 2) return []

    return items.slice(0, -1).map((item, index) => ({
      first: item,
      second: items[index + 1]
    }))
  }

  function renderSoundGuidedTuning(): void {
    const lesson = getSoundLessonById(selectedSoundLessonId)
    if (!lesson) return

    const pairs = getGuidedTuningPairs(lesson)
    const pair = pairs[currentSoundPairIndex]

    if (!pair) {
      currentRecallItemIndex = 0
      renderSoundPerceptionRecall()
      return
    }

    stopSoundLessonAudio()

    currentSoundLessonStep = "guided-tuning"
    const { visual, content } = createSoundLessonStepFrame("guided-tuning")

    renderGuidedTuningVisual(lesson, pair, visual)
    renderGuidedTuningContent(lesson, pair, pairs.length, content)
    renderSoundLessonProgress("guided-tuning")

    soundLessonBackButton.disabled = false
    soundLessonNextButton.disabled = false
    soundLessonReplayButton.disabled = false
  }

  function renderGuidedTuningVisual(
    lesson: SoundLesson,
    pair: { first: SoundLessonPreviewItem; second: SoundLessonPreviewItem },
    container: HTMLElement
  ): void {
    const bridge = document.createElement("div")
    bridge.className = "sound-guided-bridge"

    const firstVisual = document.createElement("span")
    firstVisual.className = [
      "sound-guided-bridge-visual",
      `sound-guided-bridge-visual-${lesson.visualType}`,
      `sound-guided-bridge-visual-${pair.first.visual}`
    ].join(" ")
    firstVisual.setAttribute("aria-hidden", "true")

    const line = document.createElement("span")
    line.className = "sound-guided-bridge-line"
    line.setAttribute("aria-hidden", "true")

    const secondVisual = document.createElement("span")
    secondVisual.className = [
      "sound-guided-bridge-visual",
      `sound-guided-bridge-visual-${lesson.visualType}`,
      `sound-guided-bridge-visual-${pair.second.visual}`
    ].join(" ")
    secondVisual.setAttribute("aria-hidden", "true")

    bridge.append(firstVisual, line, secondVisual)
    container.append(bridge)
  }

  function renderGuidedTuningContent(
    lesson: SoundLesson,
    pair: { first: SoundLessonPreviewItem; second: SoundLessonPreviewItem },
    pairCount: number,
    container: HTMLElement
  ): void {
    const tuning = document.createElement("div")
    tuning.className = "sound-guided-tuning"

    const pairGrid = document.createElement("div")
    pairGrid.className = "sound-guided-pair"

    const firstCard = createGuidedTuningCard(lesson, pair.first, "first")
    const secondCard = createGuidedTuningCard(lesson, pair.second, "second")

    pairGrid.append(firstCard, secondCard)

    const sequenceButton = document.createElement("button")
    sequenceButton.className = "sound-guided-sequence-button"
    sequenceButton.type = "button"
    sequenceButton.setAttribute("aria-label", "Play sound pair sequence")
    sequenceButton.innerHTML = "<span aria-hidden=\"true\"></span>"

    sequenceButton.addEventListener("click", () => {
      void playGuidedTuningSequence(pair, sequenceButton)
    })

    const pairProgress = document.createElement("div")
    pairProgress.className = "sound-guided-pair-progress"
    pairProgress.setAttribute("aria-hidden", "true")

    for (let index = 0; index < pairCount; index += 1) {
      const dot = document.createElement("span")
      dot.className = index === currentSoundPairIndex ? "is-active" : ""
      pairProgress.append(dot)
    }

    const pairControls = document.createElement("div")
    pairControls.className = "sound-guided-pair-controls"

    const previousPairButton = document.createElement("button")
    previousPairButton.className = "sound-guided-pair-back"
    previousPairButton.type = "button"
    previousPairButton.setAttribute("aria-label", "Previous sound pair")
    previousPairButton.innerHTML = "<span aria-hidden=\"true\"></span>"
    previousPairButton.disabled = currentSoundPairIndex <= 0

    previousPairButton.addEventListener("click", () => {
      if (currentSoundPairIndex <= 0) return
      currentSoundPairIndex -= 1
      renderSoundGuidedTuning()
    })

    const nextPairButton = document.createElement("button")
    nextPairButton.className = "sound-guided-pair-next"
    nextPairButton.type = "button"
    nextPairButton.setAttribute("aria-label", "Next sound pair")
    nextPairButton.innerHTML = "<span aria-hidden=\"true\"></span>"
    nextPairButton.disabled = currentSoundPairIndex >= pairCount - 1

    nextPairButton.addEventListener("click", () => {
      if (currentSoundPairIndex >= pairCount - 1) return
      currentSoundPairIndex += 1
      renderSoundGuidedTuning()
    })

    pairControls.append(previousPairButton, nextPairButton)

    tuning.append(pairGrid, sequenceButton, pairProgress, pairControls)
    container.append(tuning)
  }

  function createGuidedTuningCard(lesson: SoundLesson, item: SoundLessonPreviewItem, position: "first" | "second"): HTMLButtonElement {
    const card = document.createElement("button")
    card.className = `sound-guided-card sound-guided-card-${position}`
    card.type = "button"
    card.setAttribute("aria-label", "Play comparison sound")

    const visual = document.createElement("span")
    visual.className = [
      "sound-guided-card-visual",
      `sound-guided-card-visual-${lesson.visualType}`,
      `sound-guided-card-visual-${item.visual}`
    ].join(" ")
    visual.setAttribute("aria-hidden", "true")

    const playDot = document.createElement("span")
    playDot.className = "sound-guided-card-play-dot"
    playDot.setAttribute("aria-hidden", "true")

    card.append(visual, playDot)

    card.addEventListener("click", () => {
      playSoundLessonAudio(item.audio, card)
    })

    return card
  }

  async function playGuidedTuningSequence(
    pair: { first: SoundLessonPreviewItem; second: SoundLessonPreviewItem },
    activeElement?: HTMLElement
  ): Promise<void> {
    stopSoundLessonAudio()

    activeElement?.classList.add("is-playing")
    await playSoundLessonAudioAsPromise(pair.first.audio)
    activeElement?.classList.add("is-playing")
    await wait(350)
    await playSoundLessonAudioAsPromise(pair.second.audio)

    activeElement?.classList.remove("is-playing")
  }

  function getShuffledSoundChoices(lesson: SoundLesson, correctItem: SoundLessonPreviewItem): SoundLessonPreviewItem[] {
    const otherItems = lesson.previewItems.filter((item) => item.id !== correctItem.id)
    const choices = [correctItem, ...otherItems].slice(0, 3)

    return choices.sort(() => Math.random() - 0.5)
  }

  function renderSoundPerceptionRecall(): void {
    const lesson = getSoundLessonById(selectedSoundLessonId)
    if (!lesson) return

    const item = lesson.previewItems[currentRecallItemIndex] ?? lesson.previewItems[0]
    if (!item) return

    stopSoundLessonAudio()

    currentSoundLessonStep = "perception-recall"
    const { visual, content } = createSoundLessonStepFrame("perception-recall", { interactiveVisual: true })

    const promptButton = renderPerceptionRecallPromptVisual(visual)
    renderPerceptionRecallContent(lesson, item, content)
    renderSoundLessonProgress("perception-recall")

    soundLessonBackButton.disabled = false
    soundLessonNextButton.disabled = false
    soundLessonReplayButton.disabled = false

    const recallIndexAtRender = currentRecallItemIndex
    window.setTimeout(() => {
      if (currentSoundLessonStep !== "perception-recall" || currentRecallItemIndex !== recallIndexAtRender) return
      playSoundLessonAudio(item.audio, promptButton)
    }, 180)
  }

  function renderPerceptionRecallPromptVisual(container: HTMLElement): HTMLButtonElement {
    const promptButton = document.createElement("button")
    promptButton.className = "sound-recall-prompt-button"
    promptButton.type = "button"
    promptButton.setAttribute("aria-label", "Replay recall prompt")

    const promptOrb = document.createElement("span")
    promptOrb.className = "sound-recall-prompt-orb"
    promptOrb.setAttribute("aria-hidden", "true")

    const promptPlayDot = document.createElement("span")
    promptPlayDot.className = "sound-recall-prompt-dot"
    promptPlayDot.setAttribute("aria-hidden", "true")

    promptButton.append(promptOrb, promptPlayDot)
    promptButton.addEventListener("click", () => {
      const lesson = getSoundLessonById(selectedSoundLessonId)
      const item = lesson?.previewItems[currentRecallItemIndex] ?? lesson?.previewItems[0]
      if (item) playSoundLessonAudio(item.audio, promptButton)
    })

    container.append(promptButton)
    return promptButton
  }

  function renderPerceptionRecallContent(lesson: SoundLesson, correctItem: SoundLessonPreviewItem, container: HTMLElement): void {
    const recall = document.createElement("div")
    recall.className = "sound-perception-recall"

    const choiceGrid = document.createElement("div")
    choiceGrid.className = "sound-recall-choice-grid"

    const choices = getShuffledSoundChoices(lesson, correctItem)

    choices.forEach((choice) => {
      const button = createSoundRecallChoice(lesson, choice, correctItem)
      choiceGrid.append(button)
    })

    const recallProgress = document.createElement("div")
    recallProgress.className = "sound-recall-item-progress"
    recallProgress.setAttribute("aria-hidden", "true")

    lesson.previewItems.forEach((_, index) => {
      const dot = document.createElement("span")
      dot.className = index === currentRecallItemIndex ? "is-active" : ""
      recallProgress.append(dot)
    })

    const recallControls = document.createElement("div")
    recallControls.className = "sound-recall-item-controls"

    const previousRecallButton = document.createElement("button")
    previousRecallButton.className = "sound-recall-item-back"
    previousRecallButton.type = "button"
    previousRecallButton.setAttribute("aria-label", "Previous recall sound")
    previousRecallButton.innerHTML = "<span aria-hidden=\"true\"></span>"
    previousRecallButton.disabled = currentRecallItemIndex <= 0

    previousRecallButton.addEventListener("click", () => {
      if (currentRecallItemIndex <= 0) return
      currentRecallItemIndex -= 1
      renderSoundPerceptionRecall()
    })

    const nextRecallButton = document.createElement("button")
    nextRecallButton.className = "sound-recall-item-next"
    nextRecallButton.type = "button"
    nextRecallButton.setAttribute("aria-label", "Next recall sound")
    nextRecallButton.innerHTML = "<span aria-hidden=\"true\"></span>"
    nextRecallButton.disabled = currentRecallItemIndex >= lesson.previewItems.length - 1

    nextRecallButton.addEventListener("click", () => {
      if (currentRecallItemIndex >= lesson.previewItems.length - 1) return
      currentRecallItemIndex += 1
      renderSoundPerceptionRecall()
    })

    recallControls.append(previousRecallButton, nextRecallButton)
    recall.append(choiceGrid, recallProgress, recallControls)
    container.append(recall)
  }

  function createSoundRecallChoice(
    lesson: SoundLesson,
    choice: SoundLessonPreviewItem,
    correctItem: SoundLessonPreviewItem
  ): HTMLButtonElement {
    const button = document.createElement("button")
    button.className = "sound-recall-choice-card"
    button.type = "button"
    button.setAttribute("aria-label", "Choose sound shape")

    const visual = document.createElement("span")
    visual.className = [
      "sound-recall-choice-visual",
      `sound-recall-choice-visual-${lesson.visualType}`,
      `sound-recall-choice-visual-${choice.visual}`
    ].join(" ")
    visual.setAttribute("aria-hidden", "true")

    button.append(visual)

    if (choice.audio) {
      const answerAudioButton = document.createElement("button")
      answerAudioButton.className = "sound-recall-answer-audio"
      answerAudioButton.type = "button"
      answerAudioButton.setAttribute("aria-label", "Play answer sound")
      answerAudioButton.innerHTML = "<span aria-hidden=\"true\"></span>"
      answerAudioButton.addEventListener("click", (event) => {
        event.stopPropagation()
        playSoundLessonAudio(choice.audio, answerAudioButton)
      })
      button.append(answerAudioButton)
    }

    button.addEventListener("click", () => {
      handleSoundRecallSelection(choice, correctItem, button)
    })

    return button
  }

  function handleSoundRecallSelection(
    choice: SoundLessonPreviewItem,
    correctItem: SoundLessonPreviewItem,
    button: HTMLElement
  ): void {
    soundRecallSection.querySelectorAll(".sound-recall-choice-card").forEach((element) => {
      element.classList.remove("is-selected", "is-correct", "is-soft-miss")
    })

    button.classList.add("is-selected")

    if (choice.id === correctItem.id) {
      button.classList.add("is-correct")
      runSoundLessonEchoGap(700)
      return
    }

    button.classList.add("is-soft-miss")
    runSoundLessonEchoGap(500)
  }

  function playSoundLessonAudioAsPromise(audioSrc: string | undefined, activeElement?: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      stopSoundLessonAudio()
      activeElement?.classList.add("is-playing")
      activeElement?.closest(".sound-lesson-visual")?.classList.add("is-playing")

      if (!audioSrc) {
        window.setTimeout(() => {
          activeElement?.classList.remove("is-playing")
          activeElement?.closest(".sound-lesson-visual")?.classList.remove("is-playing")
          runSoundLessonEchoGap(700)
          resolve()
        }, 700)
        return
      }

      const audio = new Audio(audioSrc)
      currentSoundAudio = audio

      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        activeElement?.classList.remove("is-playing")
        activeElement?.closest(".sound-lesson-visual")?.classList.remove("is-playing")
        currentSoundAudio = null
        runSoundLessonEchoGap(700)
        resolve()
      }

      audio.addEventListener("ended", finish, { once: true })
      audio.addEventListener("error", finish, { once: true })
      audio.play().catch(finish)
    })
  }

  // Sound lesson navigation moves between steps, lessons, sections, and the path gate.
  function goBackToSoundGarden(): void {
    stopLessonPreviewAudio()
    selectedSoundLessonId = null
    renderSoundGarden()
    setSurface("soundGarden")
  }

  function renderSoundLessonProgress(step: SoundLessonStepId): void {
    clearNode(soundLessonProgress)
    soundLessonSteps.forEach((candidate) => {
      const dot = document.createElement("span")
      dot.className = candidate === step ? "is-active" : ""
      soundLessonProgress.append(dot)
    })
    soundLessonBackButton.disabled = soundLessonSteps.indexOf(step) <= 0
  }

  function playSoundLessonAudio(audioSrc: string | undefined, activeElement?: HTMLElement): void {
    stopSoundLessonAudio()
    if (!audioSrc) {
      activeElement?.classList.add("is-playing")
      window.setTimeout(() => {
        activeElement?.classList.remove("is-playing")
        runSoundLessonEchoGap()
      }, 900)
      return
    }

    const audio = new Audio(audioSrc)
    currentSoundAudio = audio
    activeElement?.classList.add("is-playing")
    activeElement?.closest(".sound-lesson-visual")?.classList.add("is-playing")

    const clearPlaying = () => {
      activeElement?.classList.remove("is-playing")
      activeElement?.closest(".sound-lesson-visual")?.classList.remove("is-playing")
      currentSoundAudio = null
    }

    audio.addEventListener("ended", () => {
      clearPlaying()
      runSoundLessonEchoGap(Number.isFinite(audio.duration) ? Math.min(1800, Math.max(900, audio.duration * 420)) : 1200)
    })
    audio.addEventListener("error", () => {
      clearPlaying()
      runSoundLessonEchoGap()
    })
    audio.play().catch(() => {
      window.setTimeout(() => {
        clearPlaying()
        runSoundLessonEchoGap()
      }, 900)
    })
  }

  function stopSoundLessonAudio(): void {
    if (currentSoundAudio) {
      currentSoundAudio.pause()
      currentSoundAudio.currentTime = 0
      currentSoundAudio = null
    }
    soundLessonScreen.querySelectorAll(".is-playing").forEach((element) => element.classList.remove("is-playing"))
  }

  function runSoundLessonEchoGap(duration = 1200): void {
    runAudioEchoGap(soundLessonEcho, duration)
  }

  function goToNextSoundLessonStep(): void {
    if (!currentSoundLessonStep) return
    if (!selectedSoundLessonId) return

    if (currentSoundLessonStep === "preview") {
      currentSoundItemIndex = 0
      renderSoundLessonPrimer()
      return
    }

    if (currentSoundLessonStep === "primer") {
      currentSoundPairIndex = 0
      renderSoundGuidedTuning()
      return
    }

    if (currentSoundLessonStep === "guided-tuning") {
      currentRecallItemIndex = 0
      renderSoundPerceptionRecall()
      return
    }

    if (currentSoundLessonStep === "perception-recall") {
      renderSoundReflection()
      return
    }

    if (currentSoundLessonStep === "reflection") {
      const nextLesson = getNextSoundLesson(selectedSoundLessonId)

      if (nextLesson) {
        enterSoundLesson(nextLesson.id)
        return
      }

      if (selectedSoundSectionId) renderSoundLessonList()
      setSurface("soundLessonList")
    }
  }

  function renderSoundReflection(): void {
    const lesson = getSoundLessonById(selectedSoundLessonId)
    if (!lesson) return

    stopSoundLessonAudio()

    currentSoundLessonStep = "reflection"
    const { visual, content } = createSoundLessonStepFrame("reflection")

    markSoundLessonComplete(lesson.id)

    renderSoundReflectionVisual(visual)
    renderSoundReflectionContent(lesson, content)
    renderSoundLessonProgress("reflection")

    soundLessonBackButton.disabled = false
    soundLessonNextButton.disabled = false
    soundLessonReplayButton.disabled = false
  }

  function renderSoundReflectionVisual(container: HTMLElement): void {
    const bloom = document.createElement("div")
    bloom.className = "sound-lesson-reflection-bloom"
    bloom.setAttribute("aria-hidden", "true")

    bloom.append(
      document.createElement("span"),
      document.createElement("span"),
      document.createElement("span"),
      document.createElement("span")
    )

    container.append(bloom)
  }

  function renderSoundReflectionContent(lesson: SoundLesson, container: HTMLElement): void {
    const reflection = document.createElement("div")
    reflection.className = "sound-lesson-reflection"

    const resonance = document.createElement("div")
    resonance.className = "sound-lesson-reflection-resonance"
    resonance.setAttribute("aria-hidden", "true")

    resonance.append(document.createElement("span"), document.createElement("span"), document.createElement("span"))

    const actions = document.createElement("div")
    actions.className = "sound-lesson-reflection-actions"

    const repeatButton = document.createElement("button")
    repeatButton.className = "sound-lesson-reflection-action sound-lesson-reflection-repeat"
    repeatButton.type = "button"
    repeatButton.setAttribute("aria-label", "Repeat lesson")
    setAssetIcon(repeatButton, replaySvgMarkup)

    repeatButton.addEventListener("click", () => {
      currentSoundLessonStep = "preview"
      currentSoundItemIndex = 0
      currentSoundPairIndex = 0
      currentRecallItemIndex = 0
      renderSoundLessonPreview(lesson.id)
    })

    const lessonListButton = document.createElement("button")
    lessonListButton.className = "sound-lesson-reflection-action sound-lesson-reflection-list"
    lessonListButton.type = "button"
    lessonListButton.setAttribute("aria-label", "Return to lesson list")
    setAssetIcon(lessonListButton, currentLessonBackNavSvgMarkup)

    lessonListButton.addEventListener("click", () => {
      stopSoundLessonAudio()
      if (selectedSoundSectionId) renderSoundLessonList()
      setSurface("soundLessonList")
    })

    const nextLesson = getNextSoundLesson(lesson.id)

    const nextLessonButton = document.createElement("button")
    nextLessonButton.className = "sound-lesson-reflection-action sound-lesson-reflection-next"
    nextLessonButton.type = "button"
    nextLessonButton.setAttribute("aria-label", "Continue to next lesson")
    setAssetIcon(nextLessonButton, sectionNavForwardSvgMarkup, "asset-icon-forward")
    nextLessonButton.disabled = !nextLesson

    nextLessonButton.addEventListener("click", () => {
      if (!nextLesson) return
      enterSoundLesson(nextLesson.id)
    })

    const gardenButton = document.createElement("button")
    gardenButton.className = "sound-lesson-reflection-action sound-lesson-reflection-garden"
    gardenButton.type = "button"
    gardenButton.setAttribute("aria-label", "Return to Sound Garden")
    setAssetIcon(gardenButton, returnToMainNavSvgMarkup)

    gardenButton.addEventListener("click", () => {
      stopSoundLessonAudio()
      selectedSoundLessonId = null
      renderSoundGarden()
      setSurface("soundGarden")
    })

    actions.append(repeatButton, lessonListButton, nextLessonButton, gardenButton)
    reflection.append(resonance, actions)
    container.append(reflection)
  }

  function goToPreviousSoundLessonStep(): void {
    if (!currentSoundLessonStep) return
    if (!selectedSoundLessonId) return

    if (currentSoundLessonStep === "primer") {
      renderSoundLessonPreview(selectedSoundLessonId)
      return
    }

    if (currentSoundLessonStep === "guided-tuning") {
      renderSoundLessonPrimer()
      return
    }

    if (currentSoundLessonStep === "perception-recall") {
      renderSoundGuidedTuning()
      return
    }

    if (currentSoundLessonStep === "reflection") {
      renderSoundPerceptionRecall()
    }
  }

  function returnToSoundGardenSelection(): void {
    stopSoundLessonAudio()
    renderSoundGarden()
    setSurface("soundGarden")
  }

  function returnToSoundLessonList(): void {
    stopSoundLessonAudio()
    if (selectedSoundSectionId) renderSoundLessonList()
    setSurface("soundLessonList")
  }

  function markSoundSectionComplete(sectionId: string): void {
    completedSoundSectionIds.add(sectionId)
    app.dataset.completedSoundSections = String(completedSoundSectionIds.size)
  }

  function enterNextSoundSection(sectionId: string): void {
    const index = soundSections.findIndex((section) => section.id === sectionId)
    const nextSection = soundSections[(index + 1) % soundSections.length]
    if (nextSection) enterSoundSection(nextSection.id)
  }

  function returnToPathGate(): void {
    stopCurrentSoundPreview()
    stopSoundLessonAudio()
    stopLessonPreviewAudio()
    appState.selectedArcId = null
    selectedSoundSectionId = null
    selectedSoundLessonId = null
    if (demoConfig.enabled) {
      appState.selectedPath = null
      restoreLanguageSeedVisibility()
      setSurface("language")
      return
    }

    setSurface("path")
  }

  // Meaning Tree navigation renders arcs, story pods, and demo-only entry points.
  function getStoriesForArc(arcId: string): Story[] {
    return allStories.filter((story) => getStoryArcId(story) === arcId)
  }

  function renderArcButtons(): void {
    clearNode(arcList)
    renderMeaningArcButtons({
      arcList,
      arcs: meaningArcs,
      prefersReducedMotion,
      onArcSelected: (arc) => {
        appState.selectedArcId = arc.id
        renderStoryPods(getStoriesForArc(arc.id))
        setSurface("storyBranch")
      }
    })
  }

  function renderStoryPods(stories: Story[]): void {
    clearNode(storyPodBed)
    renderStoryArcContext()
    renderMeaningStoryPods({
      storyPodBed,
      stories,
      completedStoryIds: appState.completedStoryIds,
      activeArc: meaningArcs.find((arc) => arc.id === appState.selectedArcId),
      onStorySelected: (story) => {
        appState.selectedStoryId = story.id
        renderMeaningPreviewWorld(story.id)
        setSurface("meaningPreview")
      }
    })
  }

  function renderDemoMeaningTreeIntro(story?: Story): void {
    clearNode(arcList)
    clearNode(storyPodBed)

    const arc = meaningArcs.find((candidate) => candidate.id === demoConfig.arcId)
    const item = document.createElement("li")
    item.className = "arc-node-item demo-arc-item is-unlocked"
    item.dataset.endpoint = "1"

    const button = document.createElement("button")
    button.className = "arc-button demo-cat-arc-button"
    button.type = "button"
    button.dataset.arcId = demoConfig.arcId
    button.dataset.subject = arc?.subject ?? "cat"
    button.disabled = !story
    button.setAttribute("aria-label", story ? `Start ${story.title}` : "Story unavailable")
    button.setAttribute("aria-disabled", String(!story))

    const icon = document.createElement("span")
    icon.className = "arc-icon"
    icon.setAttribute("aria-hidden", "true")

    if (arc?.svg) {
      icon.innerHTML = arc.svg.trim()
      muteInlineSvg(icon)
    } else {
      icon.textContent = arc?.fallbackSymbol ?? "cat"
    }

    button.append(icon)

    if (story) {
      button.addEventListener("click", () => {
        appState.selectedStoryId = demoConfig.storyId
        renderMeaningPreviewWorld(story.id)
        setSurface("meaningPreview")
      })
    }

    item.append(button)
    arcList.append(item)
  }

  function renderDemoFinishScreen(storyId: string): void {
    const story = getStoryById(storyId)
    if (story) appState.completedStoryIds.add(storyId)

    clearNode(demoFinishStorySymbols)
    ;(story ? getStorySignature(story) : defaultSignature).forEach((concept) => {
      const symbol = document.createElement("span")
      symbol.textContent = conceptIcons[concept] ?? "○"
      demoFinishStorySymbols.append(symbol)
    })
  }

  function replayDemoStory(): void {
    if (appState.selectedStoryId) renderMeaningStory(appState.selectedStoryId)
    setSurface("story")
  }

  function tryAnotherDemoLanguage(): void {
    stopStoryAudio()
    resetActivePreview()
    restoreLanguageSeedVisibility()
    pendingLanguage = null
    visibleLanguageName = null
    appState.selectedPath = null
    appState.selectedArcId = null
    appState.selectedStoryId = null
    allStories = []
    storyAudioBase = ""
    syncLanguageSeedStates()
    setSurface("language")
  }

  function returnToDemoStart(): void {
    stopStoryAudio()
    stopRecallAudio()
    resetActivePreview()
    restoreLanguageSeedVisibility()
    pendingLanguage = null
    visibleLanguageName = null
    appState.selectedPath = null
    appState.selectedArcId = null
    appState.selectedStoryId = null
    allStories = []
    storyAudioBase = ""
    hasBegun = false
    delete app.dataset.opening
    syncLanguageSeedStates()
    setSurface("start")
  }

  function renderStoryArcContext(): void {
    const arc = meaningArcs.find((candidate) => candidate.id === appState.selectedArcId)
    clearNode(storyArcSymbol)
    if (!arc) return

    if (arc.svg) {
      storyArcSymbol.innerHTML = arc.svg.trim()
      muteInlineSvg(storyArcSymbol)
    } else {
      storyArcSymbol.textContent = arc.subject === "monkey" ? "🐒" : arc.fallbackSymbol
    }
  }

  function returnToMeaningArcs(): void {
    appState.selectedArcId = null
    appState.selectedStoryId = null
    if (demoConfig.enabled) {
      renderDemoMeaningTreeIntro()
      setSurface("meaningArc")
      return
    }

    renderArcButtons()
    setSurface("meaningArc")
  }

  function openMeaningArcs(): void {
    appState.selectedPath = "meaning-tree"
    appState.selectedArcId = null
    appState.selectedStoryId = null
    clearNode(arcList)
    clearNode(storyPodBed)

    loadLearningData(appState.selectedLanguage)
      .then((data) => {
        allStories = data.stories
        storyAudioBase = data.storyAudio
        renderArcButtons()
        setSurface("meaningArc")
      })
      .catch(() => {
        storyAudioBase = ""
        allStories = [
          {
            id: "fallback-story",
            title: "Food on the Ground",
            arcId: "cat-stray",
            arc: "stray",
            perspective: "cat",
            coreConcepts: [],
            visualSignature: defaultSignature,
            lines: [],
            audio: ""
          }
        ]
        renderArcButtons()
        setSurface("meaningArc")
      })
  }

  // Language selection flow handles previewing, planting, dragging, and committing seeds.
  function previewLanguage(code: SupportedLanguage): void {
    // Start language preview audio without committing to the language yet.
    if (activePreview === code && !previewAudio.paused) return

    resetActivePreview()
    pendingLanguage = code
    setLanguageState(code, "selected")
    previewRun += 1
    const run = previewRun
    syncLanguageSeedStates()

    previewAudio.src = previewPath(code)
    previewAudio.currentTime = 0

    previewAudio.onplaying = () => {
      if (run !== previewRun) return
      activePreview = code
      syncLanguageSeedStates()
    }

    previewAudio.onended = () => {
      finishLanguagePreview(code, run, true)
    }

    previewAudio.onerror = () => {
      finishLanguagePreview(code, run, true)
    }

    previewAudio
      .play()
      .then(() => {
        if (run !== previewRun) return
        activePreview = code
        syncLanguageSeedStates()
      })
      .catch(() => {
        finishLanguagePreview(code, run, true)
      })
  }

  function openDemoMeaningTree(): void {
    appState.selectedPath = "meaning-tree"
    appState.selectedArcId = demoConfig.arcId
    appState.selectedStoryId = demoConfig.storyId
    clearNode(arcList)
    clearNode(storyPodBed)

    loadLearningData(appState.selectedLanguage)
      .then((data) => {
        allStories = data.stories
        storyAudioBase = data.storyAudio
        const story = allStories.find((candidate) => candidate.id === demoConfig.storyId)
        renderDemoMeaningTreeIntro(story)
        setSurface("meaningArc")
      })
      .catch(() => {
        allStories = []
        storyAudioBase = ""
        renderDemoMeaningTreeIntro()
        setSurface("meaningArc")
      })
  }

  function finishLanguagePlanting(sourceSeed: HTMLElement | null): void {
    // Restore language-screen planting state after the app has left the screen.
    window.setTimeout(() => {
      sourceSeed?.classList.remove("is-being-dragged")
      languageSelectGarden.dataset.planting = "false"
      languageMoundButton.dataset.planting = "false"
      isPlantingLanguage = false
    }, 80)
  }

  function plantSelectedLanguage(startRectOverride?: DOMRect): void {
    // Animate the pending language seed into the mound, then enter that language.
    if (!pendingLanguage || isPlantingLanguage) return

    const code = pendingLanguage
    const sourceRow = languageSeedbed.querySelector<HTMLElement>(`.language-seed-row[data-language="${code}"]`)
    const sourceSeed = sourceRow?.querySelector<HTMLElement>(".language-seed-art")
    const gardenRect = languageSelectGarden.getBoundingClientRect()
    const sourceRect = startRectOverride ?? sourceSeed?.getBoundingClientRect()
    const moundRect = languageMoundButton.getBoundingClientRect()

    isPlantingLanguage = true
    languageSelectGarden.dataset.planting = "true"
    languageMoundButton.dataset.planting = "true"
    syncLanguageSeedStates()

    if (sourceRect && !prefersReducedMotion()) {
      const plantedSeed = createSeedSvg(code)
      plantedSeed.classList.add("language-planting-seed")
      const startX = sourceRect.left - gardenRect.left + sourceRect.width * 0.5
      const startY = sourceRect.top - gardenRect.top + sourceRect.height * 0.5
      const endX = moundRect.left - gardenRect.left + moundRect.width * 0.5
      const endY = moundRect.top - gardenRect.top + moundRect.height * 0.46
      plantedSeed.style.left = `${startX}px`
      plantedSeed.style.top = `${startY}px`
      plantedSeed.style.setProperty("--plant-start-x", `${startX}px`)
      plantedSeed.style.setProperty("--plant-start-y", `${startY}px`)
      plantedSeed.style.setProperty("--plant-x", `${endX - startX}px`)
      plantedSeed.style.setProperty("--plant-y", `${endY - startY}px`)
      plantedSeed.style.setProperty(
        "--plant-start-w",
        `${sourceRect.width}px`
      )
      languageSelectGarden.append(plantedSeed)
      sourceSeed?.classList.add("is-being-dragged")
    }

    window.setTimeout(() => {
      languageSelectGarden.querySelector(".language-planting-seed")?.remove()
      selectLanguage(code)
      finishLanguagePlanting(sourceSeed ?? null)
    }, prefersReducedMotion() ? 80 : 1220)
  }

  function isPointInMound(clientX: number, clientY: number): boolean {
    const rect = languageMoundButton.getBoundingClientRect()
    const leeway = 24
    return (
      clientX >= rect.left - leeway &&
      clientX <= rect.right + leeway &&
      clientY >= rect.top - leeway &&
      clientY <= rect.bottom + leeway
    )
  }

  function moveLanguageDragGhost(clientX: number, clientY: number): void {
    // Move the body-level drag ghost with CSS variables so it follows the pointer.
    if (!languageSeedDrag?.ghost) return

    const nextX = clientX - languageSeedDrag.offsetX
    const nextY = clientY - languageSeedDrag.offsetY
    languageSeedDrag.ghost.style.setProperty("--drag-x", `${nextX}px`)
    languageSeedDrag.ghost.style.setProperty("--drag-y", `${nextY}px`)
  }

  function startLanguageSeedDrag(event: PointerEvent, code: SupportedLanguage): void {
    // Store pointer geometry; a real drag is not created until movement passes threshold.
    if (isPlantingLanguage) return
    if (event.button !== 0) return

    const sourceSeed = (event.currentTarget as HTMLElement).querySelector<HTMLElement>(".language-seed-art")
    const sourceRect = sourceSeed?.getBoundingClientRect()
    languageSeedDrag = {
      code,
      ghost: null,
      hasDragged: false,
      offsetX: sourceRect ? event.clientX - sourceRect.left : 0,
      offsetY: sourceRect ? event.clientY - sourceRect.top : 0,
      pointerId: event.pointerId,
      sourceSeed,
      sourceRectLeft: sourceRect ? sourceRect.left : 0,
      sourceRectTop: sourceRect ? sourceRect.top : 0,
      sourceWidth: sourceRect?.width ?? 58,
      startX: event.clientX,
      startY: event.clientY
    }

    if (sourceRect) {
      languageSeedDrag.offsetX = Math.min(Math.max(languageSeedDrag.offsetX, 0), sourceRect.width)
      languageSeedDrag.offsetY = Math.min(Math.max(languageSeedDrag.offsetY, 0), sourceRect.height)
    }

    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  function updateLanguageSeedDrag(event: PointerEvent): void {
    // Create and move the drag ghost only after intentional movement.
    if (!languageSeedDrag || languageSeedDrag.pointerId !== event.pointerId) return

    const distance = Math.hypot(event.clientX - languageSeedDrag.startX, event.clientY - languageSeedDrag.startY)
    if (!languageSeedDrag.hasDragged && distance < 8) return

    if (event.cancelable) {
      event.preventDefault()
    }

    if (!languageSeedDrag.hasDragged) {
      suppressNextLanguageSeedClick = true
      languageSeedDrag.hasDragged = true
      resetActivePreview()
      pendingLanguage = languageSeedDrag.code
      setLanguageState(languageSeedDrag.code, "selected")
      visibleLanguageName = null
      syncLanguageSeedStates()

      const ghost = createSeedSvg(languageSeedDrag.code)
      ghost.classList.remove("language-seed-art")
      ghost.classList.add("language-drag-seed")
      ghost.style.setProperty("--drag-w", `${languageSeedDrag.sourceWidth}px`)
      
      const initialX = languageSeedDrag.startX - languageSeedDrag.offsetX
      const initialY = languageSeedDrag.startY - languageSeedDrag.offsetY
      
      ghost.style.setProperty("--drag-x", `${initialX}px`)
      ghost.style.setProperty("--drag-y", `${initialY}px`)
      ghost.style.setProperty("--drag-return-x", `${languageSeedDrag.sourceRectLeft}px`)
      ghost.style.setProperty("--drag-return-y", `${languageSeedDrag.sourceRectTop}px`)
      document.body.append(ghost)
      languageSeedDrag.ghost = ghost
      languageSeedDrag.sourceSeed?.classList.add("is-being-dragged")
      languageSelectGarden.dataset.dragging = "true"
    }

    moveLanguageDragGhost(event.clientX, event.clientY)
    languageMoundButton.dataset.dragOver = String(isPointInMound(event.clientX, event.clientY))
  }

  function endLanguageSeedDrag(event: PointerEvent): void {
    // Either plant the dragged seed on the mound or return it to its source.
    if (!languageSeedDrag || languageSeedDrag.pointerId !== event.pointerId) return

    const shouldPlant = languageSeedDrag.hasDragged && isPointInMound(event.clientX, event.clientY)
    const endedDrag = languageSeedDrag
    const ghostRect = endedDrag.ghost?.getBoundingClientRect()
    languageSeedDrag = null
    languageSelectGarden.dataset.dragging = "false"
    languageMoundButton.dataset.dragOver = "false"

    if (shouldPlant) {
      endedDrag.sourceSeed?.classList.remove("is-being-dragged")
      endedDrag.ghost?.remove()
      plantSelectedLanguage(ghostRect)
      return
    }

    if (endedDrag.hasDragged && endedDrag.ghost && !prefersReducedMotion()) {
      endedDrag.ghost.classList.add("is-returning")
      window.setTimeout(() => {
        endedDrag.ghost?.remove()
        endedDrag.sourceSeed?.classList.remove("is-being-dragged")
      }, 260)
    } else {
      endedDrag.ghost?.remove()
      endedDrag.sourceSeed?.classList.remove("is-being-dragged")
    }

    syncLanguageSeedStates()
  }

  function renderLanguageSeeds(): void {
    // Render the seed options; button comes before label so names appear below seeds.
    clearNode(languageSeedbed)
    languageSeedbed.classList.add("language-seed-layer")
    languageSeedbed.dataset.count = String(languageSeeds.length)

    languageSeeds.forEach((languageSeed, index) => {
      const option = languageOptions.find((language) => language.code === languageSeed.code)
      if (!option) return

      const row = document.createElement("div")
      row.className = `language-seed-row language-seed-${["a", "b", "c"][index] ?? "a"}`
      row.dataset.state = languageSeed.state
      row.dataset.language = languageSeed.code
      row.setAttribute("role", "listitem")

      const button = document.createElement("button")
      button.className = "language-seed-button"
      button.type = "button"
      button.setAttribute("aria-label", `Preview ${option.name}`)
      button.setAttribute("aria-pressed", String(languageSeed.state === "selected"))
      button.append(createSeedSvg(languageSeed.code))
      button.addEventListener("click", () => {
        if (suppressNextLanguageSeedClick) {
          suppressNextLanguageSeedClick = false
          return
        }
        previewLanguage(languageSeed.code)
      })
      button.addEventListener("pointerdown", (event) => {
        startLanguageSeedDrag(event, languageSeed.code)
      })
      button.addEventListener("pointermove", updateLanguageSeedDrag)
      button.addEventListener("pointerup", endLanguageSeedDrag)
      button.addEventListener("pointercancel", endLanguageSeedDrag)

      const nameGroup = document.createElement("span")
      nameGroup.className = "language-name"
      nameGroup.setAttribute("aria-hidden", "true")

      const name = document.createElement("span")
      name.textContent = getDisplayName(languageSeed.code)

      nameGroup.append(name)
      row.append(button, nameGroup)
      languageSeedbed.append(row)
    })

    syncLanguageSeedStates()
  }

  function finishOpening(): void {
    window.clearTimeout(openingTransitionTimer)
    delete app.dataset.opening
    setSurface("language")
  }

  // Event listeners connect static controls to the stateful render functions above.
  seedButton.addEventListener("click", () => {
    if (hasBegun) return
    hasBegun = true
    app.dataset.audio = "unlocked"
    makeChime()

    window.requestAnimationFrame(() => {
      app.dataset.opening = "spilling"
    })

    openingTransitionTimer = window.setTimeout(finishOpening, prefersReducedMotion() ? 140 : openingAnimationDuration)
  })

  languageMoundButton.addEventListener("click", () => {
    if (!pendingLanguage || isPlantingLanguage) {
      languageMoundButton.dataset.inactiveTap = "true"
      window.setTimeout(() => {
        delete languageMoundButton.dataset.inactiveTap
      }, 360)
      return
    }

    plantSelectedLanguage()
  })

  meaningTreeButton.addEventListener("click", () => {
    revealGardenLabel(meaningTreeButton)
    if (demoConfig.enabled) {
      openDemoMeaningTree()
      return
    }

    openMeaningArcs()
  })

  soundGardenButtons.forEach((button) => {
    button.addEventListener("click", () => {
      revealGardenLabel(button)
      enterSoundGardenWithTransition(button)
    })
  })

  soundGardenReturnButton.addEventListener("click", returnToPathGate)

  window.addEventListener("resize", updateSoundGardenPreviewAlignment)

  lessonBackButton.addEventListener("click", goBackToSoundGarden)

  meaningArcReturnButton.addEventListener("click", returnToPathGate)

  storyBranchReturnButton.addEventListener("click", (event) => {
    event.stopPropagation()
    returnToMeaningArcs()
  })

  soundLessonSectionBackButton.addEventListener("click", returnToSoundLessonList)

  soundLessonBackButton.addEventListener("click", goToPreviousSoundLessonStep)

  soundLessonReplayButton.addEventListener("click", () => {
    const lesson = getSoundLessonById(selectedSoundLessonId)
    if (lesson && currentSoundLessonStep === "preview") {
      void playLessonPreviewSequence(lesson)
      return
    }

    if (lesson && currentSoundLessonStep === "primer") {
      const item = lesson.previewItems[currentSoundItemIndex] ?? lesson.previewItems[0]
      if (item) playSoundLessonAudio(item.audio, soundLessonReplayButton)
      return
    }

    if (lesson && currentSoundLessonStep === "guided-tuning") {
      const pairs = getGuidedTuningPairs(lesson)
      const pair = pairs[currentSoundPairIndex]
      if (pair) void playGuidedTuningSequence(pair, soundLessonReplayButton)
      return
    }

    if (lesson && currentSoundLessonStep === "perception-recall") {
      const item = lesson.previewItems[currentRecallItemIndex] ?? lesson.previewItems[0]
      if (item) {
        const promptButton = soundRecallSection.querySelector<HTMLElement>(".sound-recall-prompt-button")
        playSoundLessonAudio(item.audio, promptButton ?? soundLessonReplayButton)
      }
      return
    }

    if (lesson && currentSoundLessonStep === "reflection") {
      makeChime()
      runSoundLessonEchoGap(900)
      return
    }

    const item = lesson?.previewItems[currentSoundItemIndex] ?? lesson?.previewItems[0]
    if (item) playSoundLessonAudio(item.audio, soundLessonReplayButton)
  })

  soundLessonNextButton.addEventListener("click", goToNextSoundLessonStep)

  soundLessonSectionNextButton.addEventListener("click", () => {
    if (selectedSoundSectionId) enterNextSoundSection(selectedSoundSectionId)
  })

  previewStoryReturnButton.addEventListener("click", goBackToStorySelection)

  primerTrackBackButton.addEventListener("click", () => {
    collapsePrimerCard()
    scrollStoryTrack(primerCardTrack, -1)
  })

  primerTrackNextButton.addEventListener("click", () => {
    collapsePrimerCard()
    scrollStoryTrack(primerCardTrack, 1)
  })

  storyAutoButton.addEventListener("click", () => {
    const story = currentStory ?? (appState.selectedStoryId ? getStoryById(appState.selectedStoryId) : undefined)
    if (story) startAutoStory(story)
  })

  storyManualButton.addEventListener("click", () => {
    const story = currentStory ?? (appState.selectedStoryId ? getStoryById(appState.selectedStoryId) : undefined)
    if (story) startManualStory(story)
  })

  storyAudioButton.addEventListener("click", () => {
    const story = currentStory ?? (appState.selectedStoryId ? getStoryById(appState.selectedStoryId) : undefined)
    if (!story) return

    const storyMode = storyWorld.dataset.storyMode
    if (storyMode === "playing" || storyStage.classList.contains("is-playing")) return

    if (storyMode === "ready" || storyMode === "complete" || !selectedStoryMode) {
      startAutoStory(story)
      return
    }

    if (selectedStoryMode === "manual") {
      playSceneAudio(story, appState.currentStorySceneIndex)
      return
    }

    startAutoStory(story)
  })

  storyPrevButton.addEventListener("click", () => {
    if (!currentStory) return
    stopStoryAudio()
    showStoryScene(currentStory, Math.max(0, appState.currentStorySceneIndex - 1))
  })

  storyNextButton.addEventListener("click", () => {
    if (!currentStory) return
    const scenes = getStoryScenes(currentStory, appState.selectedLanguage, storyAudioBase)
    stopStoryAudio()
    showStoryScene(currentStory, Math.min(scenes.length - 1, appState.currentStorySceneIndex + 1))
  })

  storyReplayButton.addEventListener("click", () => {
    const story = currentStory ?? (appState.selectedStoryId ? getStoryById(appState.selectedStoryId) : undefined)
    if (!story) return
    if (selectedStoryMode === "manual") playSceneAudio(story, appState.currentStorySceneIndex)
    else startAutoStory(story)
  })

  demoFinishReplayButton.addEventListener("click", replayDemoStory)
  demoFinishLanguageButton.addEventListener("click", tryAnotherDemoLanguage)
  demoFinishStartButton.addEventListener("click", returnToDemoStart)


  reflectionReplayButton.addEventListener("click", replayStoryFromReflection)
  reflectionPathsButton.addEventListener("click", retryRecallFromReflection)
  reflectionSoundGardenButton.addEventListener("click", continueFromReflection)

  primerBackdrop.className = "primer-backdrop"
  primerBackdrop.type = "button"
  primerBackdrop.hidden = true
  primerBackdrop.setAttribute("aria-label", "Collapse primer card")
  primerBackdrop.addEventListener("click", collapsePrimerCard)
  primerScreen.append(primerBackdrop)
  storyStage.prepend(createStoryStageDecoration())
  setStoryAudioButtonIcon("play")

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && surface === "primer") collapsePrimerCard()
  })

  document.addEventListener("touchmove", (event) => {
    if (languageSeedDrag?.hasDragged) {
      if (event.cancelable) event.preventDefault()
    }
  }, { passive: false })

  setAssetIcon(soundGardenReturnButton, returnToMainNavSvgMarkup)
  setAssetIcon(lessonBackButton, currentLessonBackNavSvgMarkup)
  setAssetIcon(soundLessonSectionBackButton, sectionNavBackSvgMarkup)
  setAssetIcon(soundLessonBackButton, currentLessonBackNavSvgMarkup)
  setAssetIcon(soundLessonReplayButton, replaySvgMarkup)
  setAssetIcon(soundLessonNextButton, currentLessonForwardNavSvgMarkup, "asset-icon-forward")
  setAssetIcon(soundLessonSectionNextButton, sectionNavForwardSvgMarkup, "asset-icon-forward")
  setAssetIcon(meaningArcReturnButton, returnToMainNavSvgMarkup)
  setAssetIcon(storyBranchReturnButton, returnToMainNavSvgMarkup)
  setAssetIcon(previewStoryReturnButton, returnToMainNavSvgMarkup)
  setAssetIcon(primerTrackBackButton, currentLessonBackNavSvgMarkup)
  setAssetIcon(primerTrackNextButton, currentLessonForwardNavSvgMarkup, "asset-icon-forward")
  setAssetIcon(storyAutoButton, autoplaySvgMarkup, "asset-icon-story-mode")
  setAssetIcon(storyManualButton, manualPlaySvgMarkup, "asset-icon-story-mode")
  setAssetIcon(storyPrevButton, currentLessonBackNavSvgMarkup)
  setAssetIcon(storyNextButton, currentLessonForwardNavSvgMarkup, "asset-icon-forward")
  setAssetIcon(storyReplayButton, replaySvgMarkup)
  setAssetIcon(storySectionBackButton, currentLessonBackNavSvgMarkup)
  setAssetIcon(storyForwardButton, currentLessonForwardNavSvgMarkup, "asset-icon-forward")
  setAssetIcon(demoFinishReplayButton, replaySvgMarkup)
  setAssetIcon(demoFinishLanguageButton, returnToMainNavSvgMarkup)
  setAssetIcon(demoFinishStartButton, seedLogoSvgMarkup)
  setAssetIcon(reflectionReplayButton, replaySvgMarkup)
  reflectionPathsButton.setAttribute("aria-label", "Open feedback form")
  setAssetIcon(reflectionPathsButton, reflectionFormSvgMarkup, "asset-icon-reflection-form")
  reflectionSoundGardenButton.setAttribute("aria-label", "Continue")
  setAssetIcon(reflectionSoundGardenButton, sectionNavForwardSvgMarkup, "asset-icon-forward")

  languageMoundArt.innerHTML = languageSelectMoundSvgMarkup.trim()
  muteInlineSvg(languageMoundArt)
  meaningRootMound.innerHTML = gardenMoundSvgMarkup.trim()
  meaningRootArt.innerHTML = rootSvgMarkup.trim()
  muteInlineSvg(meaningRootMound)
  muteInlineSvg(meaningRootArt)
  meaningTreeArt.innerHTML = createGardenMeaningMarkup()
  soundGardenArt.innerHTML = soundFlowerOneSvgMarkup.trim()
  soundGardenSecondaryArt.innerHTML = soundFlowerTwoSvgMarkup.trim()
  soundGardenTertiaryArt.innerHTML = soundFlowerThreeSvgMarkup.trim()
  muteInlineSvg(meaningTreeArt)
  muteInlineSvg(soundGardenArt)
  muteInlineSvg(soundGardenSecondaryArt)
  muteInlineSvg(soundGardenTertiaryArt)
  renderLanguageSeeds()
  if (demoConfig.enabled) app.dataset.demo = "meaning-tree"
  setSurface(surface)
}







