import catArcSvgMarkup from "../../assets/arc_screen/cat.html?raw"
import englishSeedSvgMarkup from "../../assets/language_select/lang_en.html?raw"
import taiwaneseSeedSvgMarkup from "../../assets/language_select/lang_nan.html?raw"
import mandarinSeedSvgMarkup from "../../assets/language_select/lang_zh.html?raw"
import autoplaySvgMarkup from "../../assets/path_screen/meaning_tree/autoplay.html?raw"
import manualPlaySvgMarkup from "../../assets/path_screen/meaning_tree/manual_play.html?raw"
import playButtonSvgMarkup from "../../assets/path_screen/meaning_tree/play_btn.html?raw"
import activePlayButtonSvgMarkup from "../../assets/path_screen/meaning_tree/play_btn-active.html?raw"
import reflectionSproutSvgMarkup from "../../assets/path_screen/meaning_tree/reflection/reflection_sprout.html?raw"
import meaningTreeSvgMarkup from "../../assets/path_screen/meaning_tree.html?raw"
import soundGardenSvgMarkup from "../../assets/path_screen/sound_garden.html?raw"
import seedSvgMarkup from "../../assets/start_page/start.html?raw"
import currentLessonBackNavSvgMarkup from "../../assets/ui/current_lesson_back_nav.html?raw"
import currentLessonForwardNavSvgMarkup from "../../assets/ui/current_lesson_forward_nav.html?raw"
import replaySvgMarkup from "../../assets/ui/replay.html?raw"
import returnToMainNavSvgMarkup from "../../assets/ui/return_to_main_nav.html?raw"
import sectionNavBackSvgMarkup from "../../assets/ui/section_nav_back.html?raw"
import sectionNavForwardSvgMarkup from "../../assets/ui/section_nav_forward.html?raw"
import { getInitialLanguage, languageOptions, loadLearningData, saveLanguage } from "./data"
import { clearNode, mustQuery } from "./dom"
import type { PreviewMoment, PrimerItem, SoundPiece, Story, StoryScene, SupportedLanguage } from "./types"

type Surface = "start" | "language" | "path" | "soundGarden" | "soundLessonList" | "soundPath" | "meaningArc" | "storyBranch" | "meaningPreview" | "primer" | "story" | "recall" | "reflection"
type SeedState = "idle" | "previewing" | "revealed" | "selected"
type PathId = "meaning-tree" | "sound-garden"
type StoryMode = "auto" | "manual"
type SoundPathStepId = "preview" | "primer" | "guided-tuning" | "perception-recall" | "reflection"
type SoundVisualType = "contour" | "particle" | "pulse" | "rhythm" | "resonance" | "phrase"
type SoundPreview = {
  id: string
  ariaLabel: string
  visual: string
  audio: string
}
type SoundSection = {
  id: string
  ariaLabel: string
  kind: string
  iconType: string
  previews: SoundPreview[]
}
type SoundChoice = {
  id: string
  kind: SoundVisualType
  visualShape?: string
  correct?: boolean
}
type SoundGardenItem = {
  id: string
  visualType: SoundVisualType
  visualShape?: string
  audio?: string
  compareAudio?: string
  choices?: SoundChoice[]
}
type SoundGardenSection = {
  id: string
  ariaLabel: string
  visualType: SoundVisualType
  items: SoundGardenItem[]
}
type SoundLessonPreviewItem = {
  id: string
  visual: string
  audio: string
}
type SoundLesson = {
  id: string
  sectionId: string
  ariaLabel: string
  visualType: SoundVisualType
  previewItems: SoundLessonPreviewItem[]
  unlocked: boolean
  completed: boolean
}
type RecallChoice =
  | { kind: "meaning"; image?: string; symbol?: string; id: string }
  | { kind: "perception"; pattern: number[]; id: string }
type RecallPrompt = {
  id: string
  family: "perception" | "meaning"
  audio?: string
  choices: RecallChoice[]
  correctIndex: number
}

type LanguageSeed = {
  code: SupportedLanguage
  state: SeedState
}

type MeaningArc = {
  id: string
  subject: string
  ariaLabel: string
  svg?: string
  fallbackSymbol: string
  unlocked: boolean
}

const previewPath = (code: SupportedLanguage): string => `engine/speech/${code}/preview.mp3`

const languageSeedMarkup: Record<SupportedLanguage, string> = {
  en: englishSeedSvgMarkup,
  nan: taiwaneseSeedSvgMarkup,
  zh: mandarinSeedSvgMarkup
}

const conceptIcons: Record<string, string> = {
  cat: "🐈",
  dog: "🐕",
  bird: "🐦",
  rabbit: "🐇",
  food: "🍖",
  night: "🌙",
  rain: "🌧",
  shelter: "▰",
  fish: "🐟",
  table: "▔",
  box: "□",
  bowl: "◡",
  meat: "🍖",
  human: "◯",
  hand: "✋",
  touch: "◌",
  car: "▭",
  hands: "✋",
  home: "⌂",
  day: "○",
  tree: "♧",
  sun: "☼"
}

const defaultSignature = ["cat", "food", "night"]
const fallbackPrimerAudio = "engine/vocab/nan/audio/nan_u0002.wav"

const universalImages = [
  "u0001.webp",
  "u0002.webp",
  "u0003.gif",
  "u0004.webp",
  "u0005.gif",
  "u0006.webp",
  "u0007.gif",
  "u0008.webp",
  "u0009.webp"
]

const vocabAudioFiles: Partial<Record<SupportedLanguage, string[]>> = {
  nan: ["nan_u0001.wav", "nan_u0002.wav", "nan_u0003.mp3", "nan_u0004.mp3", "nan_u0005.mp3"],
  zh: ["zh_u0001.mp3", "zh_u0002.mp3", "zh_u0003.mp3", "zh_u0004.mp3", "zh_u0005.mp3"]
}

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

const soundPathSteps: SoundPathStepId[] = ["preview", "primer", "guided-tuning", "perception-recall", "reflection"]

const soundGardenSections: SoundGardenSection[] = [
  {
    id: "tones",
    ariaLabel: "Tones and pitch",
    visualType: "contour",
    items: [
      {
        id: "tone-flat",
        visualType: "contour",
        visualShape: "flat",
        audio: "/audio/placeholders/tone-flat.mp3",
        choices: [
          { id: "flat", kind: "contour", visualShape: "flat", correct: true },
          { id: "rising", kind: "contour", visualShape: "rising" },
          { id: "falling", kind: "contour", visualShape: "falling" }
        ]
      },
      {
        id: "tone-rising",
        visualType: "contour",
        visualShape: "rising",
        audio: "/audio/placeholders/tone-rising.mp3",
        compareAudio: "/audio/placeholders/tone-falling.mp3",
        choices: [
          { id: "flat", kind: "contour", visualShape: "flat" },
          { id: "rising", kind: "contour", visualShape: "rising", correct: true },
          { id: "falling", kind: "contour", visualShape: "falling" }
        ]
      }
    ]
  },
  {
    id: "phonemes",
    ariaLabel: "Phonemes",
    visualType: "particle",
    items: [
      {
        id: "phoneme-1",
        visualType: "particle",
        visualShape: "small-dot",
        audio: "/audio/placeholders/phoneme-1.mp3",
        compareAudio: "/audio/placeholders/phoneme-2.mp3",
        choices: [
          { id: "particle-a", kind: "particle", visualShape: "small-dot", correct: true },
          { id: "particle-b", kind: "particle", visualShape: "large-dot" }
        ]
      }
    ]
  },
  {
    id: "syllables",
    ariaLabel: "Syllables",
    visualType: "pulse",
    items: [
      {
        id: "syllable-1",
        visualType: "pulse",
        visualShape: "single-pulse",
        audio: "/audio/placeholders/syllable-1.mp3",
        choices: [
          { id: "single-pulse", kind: "pulse", visualShape: "single-pulse", correct: true },
          { id: "double-pulse", kind: "pulse", visualShape: "double-pulse" }
        ]
      }
    ]
  },
  {
    id: "rhythm",
    ariaLabel: "Rhythm and stress",
    visualType: "rhythm",
    items: [
      {
        id: "rhythm-1",
        visualType: "rhythm",
        visualShape: "strong-weak-weak",
        audio: "/audio/placeholders/rhythm-1.mp3",
        choices: [
          { id: "strong-weak-weak", kind: "rhythm", visualShape: "strong-weak-weak", correct: true },
          { id: "weak-strong", kind: "rhythm", visualShape: "weak-strong" }
        ]
      }
    ]
  },
  {
    id: "features",
    ariaLabel: "Special sound features",
    visualType: "resonance",
    items: [
      {
        id: "feature-1",
        visualType: "resonance",
        visualShape: "ring",
        audio: "/audio/placeholders/feature-1.mp3",
        choices: [
          { id: "ring", kind: "resonance", visualShape: "ring", correct: true },
          { id: "clip", kind: "resonance", visualShape: "clip" }
        ]
      }
    ]
  },
  {
    id: "phrase-tuning",
    ariaLabel: "Phrase tuning",
    visualType: "phrase",
    items: [
      {
        id: "phrase-1",
        visualType: "phrase",
        visualShape: "wave",
        audio: "/audio/placeholders/phrase-full.mp3",
        compareAudio: "/audio/placeholders/phrase-chunked.mp3",
        choices: [
          { id: "wave", kind: "phrase", visualShape: "wave", correct: true },
          { id: "broken-wave", kind: "phrase", visualShape: "broken-wave" }
        ]
      }
    ]
  }
]

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
    id: "dog-stray",
    subject: "dog",
    ariaLabel: "Dog arc",
    fallbackSymbol: "🐕",
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

function getFallbackVisualSignature(story: Story): string[] {
  if (story.perspective === "cat") return ["cat", "food", "night"]
  if (story.perspective === "dog") return ["dog", "food", "day"]
  if (story.perspective === "bird") return ["bird", "tree", "sun"]
  return ["○", "○", "○"]
}

function shuffled<T>(items: readonly T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function getPreviewCount(story: Story): number {
  return Math.max(3, Math.min(5, story.visualSignature?.length || story.coreConcepts.length || 5))
}

function getVocabAudioFiles(lang: SupportedLanguage): string[] {
  return vocabAudioFiles[lang] ?? vocabAudioFiles.nan ?? []
}

function makeChime(): void {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextConstructor) return

  const context = new AudioContextConstructor()
  void context.resume()
  const now = context.currentTime
  const master = context.createGain()
  master.gain.setValueAtTime(0.0001, now)
  master.gain.exponentialRampToValueAtTime(0.16, now + 0.04)
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.65)
  master.connect(context.destination)

  ;[392, 523.25, 659.25].forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = now + index * 0.09

    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(frequency, start)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.012, start + 1.1)

    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.32 / (index + 1), start + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.3)

    oscillator.connect(gain)
    gain.connect(master)
    oscillator.start(start)
    oscillator.stop(start + 1.45)
  })
}

function createSeedSvg(code: SupportedLanguage): HTMLElement {
  const wrapper = document.createElement("span")
  wrapper.className = "language-seed-art"
  wrapper.innerHTML = languageSeedMarkup[code].trim()
  wrapper.querySelector("svg")?.setAttribute("focusable", "false")
  return wrapper
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

export function createExperience(): void {
  const app = mustQuery<HTMLElement>("#app")
  const startScreen = mustQuery<HTMLElement>("#start-screen")
  const languageScreen = mustQuery<HTMLElement>("#language-screen")
  const pathScreen = mustQuery<HTMLElement>("#path-screen")
  const meaningArcScreen = mustQuery<HTMLElement>("#meaning-arc-screen")
  const storyBranchScreen = mustQuery<HTMLElement>("#story-branch-screen")
  const meaningPreviewScreen = mustQuery<HTMLElement>("#meaning-preview-screen")
  const seedButton = mustQuery<HTMLButtonElement>("#seed-button")
  const startSeedArt = mustQuery<HTMLElement>("#start-seed-art")
  const meaningTreeArt = mustQuery<HTMLElement>("#meaning-tree-art")
  const soundGardenArt = mustQuery<HTMLElement>("#sound-garden-art")
  const meaningTreeButton = mustQuery<HTMLButtonElement>("#meaning-tree-button")
  const soundGardenButton = mustQuery<HTMLButtonElement>("#sound-garden-button")
  const soundGardenScreen = mustQuery<HTMLElement>("#sound-garden-screen")
  const soundGardenReturnButton = mustQuery<HTMLButtonElement>("#sound-garden-return-button")
  const soundPreviewList = mustQuery<HTMLUListElement>("#sound-preview-list")
  const soundLessonListScreen = mustQuery<HTMLElement>("#sound-lesson-list-screen")
  const lessonBackButton = mustQuery<HTMLButtonElement>("#lesson-back-button")
  const lessonHeader = mustQuery<HTMLElement>("#lesson-header")
  const soundLessonList = mustQuery<HTMLOListElement>("#sound-lesson-list")
  const soundPathScreen = mustQuery<HTMLElement>("#sound-path-screen")
  const soundPathVisual = mustQuery<HTMLElement>("#sound-path-visual")
  const soundPathContent = mustQuery<HTMLElement>("#sound-path-content")
  const soundPathEcho = mustQuery<HTMLElement>("#sound-path-echo")
  const soundPathProgress = mustQuery<HTMLElement>("#sound-path-progress")
  const soundPathSectionBackButton = mustQuery<HTMLButtonElement>("#sound-path-section-back-button")
  const soundPathBackButton = mustQuery<HTMLButtonElement>("#sound-path-back-button")
  const soundPathReplayButton = mustQuery<HTMLButtonElement>("#sound-path-replay-button")
  const soundPathNextButton = mustQuery<HTMLButtonElement>("#sound-path-next-button")
  const soundPathSectionNextButton = mustQuery<HTMLButtonElement>("#sound-path-section-next-button")
  const languageSeedbed = mustQuery<HTMLElement>("#language-seedbed")
  const arcList = mustQuery<HTMLUListElement>("#arc-list")
  const meaningArcReturnButton = mustQuery<HTMLButtonElement>("#meaning-arc-return-button")
  const storyBranchReturnButton = mustQuery<HTMLButtonElement>("#story-branch-return-button")
  const storyPodBed = mustQuery<HTMLElement>("#story-pod-bed")
  const previewSignature = mustQuery<HTMLElement>("#preview-signature")
  const previewImageTrack = mustQuery<HTMLElement>("#preview-image-track")
  const previewAudioTrack = mustQuery<HTMLElement>("#preview-audio-track")
  const previewBackButton = mustQuery<HTMLButtonElement>("#preview-back-button")
  const previewEnterButton = mustQuery<HTMLButtonElement>("#preview-enter-button")
  const primerScreen = mustQuery<HTMLElement>("#meaning-primer-screen")
  const primerCardTrack = mustQuery<HTMLElement>("#primer-card-track")
  const primerEcho = mustQuery<HTMLElement>("#primer-echo")
  const primerBackButton = mustQuery<HTMLButtonElement>("#primer-back-button")
  const primerNextButton = mustQuery<HTMLButtonElement>("#primer-next-button")
  const storyScreen = mustQuery<HTMLElement>("#meaning-story-screen")
  const storyModeGate = mustQuery<HTMLElement>("#story-mode-gate")
  const storyAutoButton = mustQuery<HTMLButtonElement>("#story-auto-button")
  const storyManualButton = mustQuery<HTMLButtonElement>("#story-manual-button")
  const storyStage = mustQuery<HTMLElement>("#story-stage")
  const storyImage = mustQuery<HTMLImageElement>("#story-image")
  const storyAudioButton = mustQuery<HTMLButtonElement>("#story-audio-button")
  const storyEcho = mustQuery<HTMLElement>("#story-echo")
  const storyProgress = mustQuery<HTMLElement>("#story-progress")
  const storyControls = mustQuery<HTMLElement>("#story-controls")
  const storyBackButton = mustQuery<HTMLButtonElement>("#story-back-button")
  const storyPrevButton = mustQuery<HTMLButtonElement>("#story-prev-button")
  const storyNextButton = mustQuery<HTMLButtonElement>("#story-next-button")
  const storyReplayButton = mustQuery<HTMLButtonElement>("#story-replay-button")
  const storyForwardButton = mustQuery<HTMLButtonElement>("#story-forward-button")
  const recallScreen = mustQuery<HTMLElement>("#meaning-recall-screen")
  const recallPromptOrb = mustQuery<HTMLElement>("#recall-prompt-orb")
  const recallAudioButton = mustQuery<HTMLButtonElement>("#recall-audio-button")
  const recallChoiceBed = mustQuery<HTMLElement>("#recall-choice-bed")
  const recallProgress = mustQuery<HTMLElement>("#recall-progress")
  const recallStoryButton = mustQuery<HTMLButtonElement>("#recall-story-button")
  const recallPrevButton = mustQuery<HTMLButtonElement>("#recall-prev-button")
  const recallNextQuestionButton = mustQuery<HTMLButtonElement>("#recall-next-question-button")
  const recallContinueButton = mustQuery<HTMLButtonElement>("#recall-continue-button")
  const reflectionScreen = mustQuery<HTMLElement>("#meaning-reflection-screen")
  const reflectionGrowth = mustQuery<HTMLElement>("#reflection-growth")
  const reflectionStorySymbols = mustQuery<HTMLElement>("#reflection-story-symbols")
  const reflectionReplayButton = mustQuery<HTMLButtonElement>("#reflection-replay-button")
  const reflectionPathsButton = mustQuery<HTMLButtonElement>("#reflection-paths-button")
  const reflectionSoundGardenButton = mustQuery<HTMLButtonElement>("#reflection-sound-garden-button")
  const previewAudio = new Audio()
  const previewMomentAudio = new Audio()
  const primerAudio = new Audio()
  const recallAudio = new Audio()
  const primerBackdrop = document.createElement("button")

  let surface: Surface = "start"
  let hasBegun = false
  let previewRun = 0
  let activePreview: SupportedLanguage | null = null
  let selectedLanguage = getInitialLanguage()
  let selectedPath: PathId | null = null
  let selectedSoundSectionId: string | null = null
  let selectedSoundLessonId: string | null = null
  let currentSoundPreviewAudio: HTMLAudioElement | null = null
  let currentLessonPreviewAudio: HTMLAudioElement | null = null
  let currentSoundPathStep: SoundPathStepId | null = null
  let currentSoundItemIndex = 0
  let currentSoundPairIndex = 0
  let currentRecallItemIndex = 0
  let currentSoundAudio: HTMLAudioElement | null = null
  const completedSoundSectionIds = new Set<string>()
  let selectedArcId: string | null = null
  let selectedStoryId: string | null = null
  let expandedPrimerCard: HTMLElement | null = null
  let selectedStoryMode: StoryMode | null = null
  let currentStorySceneIndex = 0
  let currentStoryAudio: HTMLAudioElement | null = null
  let currentStory: Story | null = null
  let storySceneTimer = 0
  let storyAudioBase = ""
  let currentRecallPrompts: RecallPrompt[] = []
  let currentRecallIndex = 0
  const completedStoryIds = new Set<string>()
  let allStories: Story[] = []
  const languageSeeds: LanguageSeed[] = languageOptions.map((language) => ({
    code: language.code,
    state: "idle"
  }))

  function setSurface(nextSurface: Surface): void {
    if (surface === "meaningPreview" && nextSurface !== "meaningPreview") stopPreviewMomentAudio()
    if (surface === "story" && nextSurface !== "story") stopStoryAudio()
    if (surface === "recall" && nextSurface !== "recall") stopRecallAudio()
    if (surface === "soundGarden" && nextSurface !== "soundGarden") stopCurrentSoundPreview()
    if (surface === "soundLessonList" && nextSurface !== "soundLessonList") stopLessonPreviewAudio()
    if (surface === "soundPath" && nextSurface !== "soundPath") stopSoundPathAudio()
    surface = nextSurface
    startScreen.hidden = surface !== "start"
    languageScreen.hidden = surface !== "language"
    pathScreen.hidden = surface !== "path"
    soundGardenScreen.hidden = surface !== "soundGarden"
    soundLessonListScreen.hidden = surface !== "soundLessonList"
    soundPathScreen.hidden = surface !== "soundPath"
    meaningArcScreen.hidden = surface !== "meaningArc"
    storyBranchScreen.hidden = surface !== "storyBranch"
    meaningPreviewScreen.hidden = surface !== "meaningPreview"
    primerScreen.hidden = surface !== "primer"
    storyScreen.hidden = surface !== "story"
    recallScreen.hidden = surface !== "recall"
    reflectionScreen.hidden = surface !== "reflection"
    app.dataset.surface = surface
    if (surface === "soundGarden") updateSoundGardenPreviewAlignment()
  }

  function setLanguageState(code: SupportedLanguage, state: SeedState): void {
    languageSeeds.forEach((seed) => {
      if (seed.code === code) seed.state = state
      else if (state === "selected" && seed.state === "selected") seed.state = "revealed"
    })
  }

  function resetActivePreview(): void {
    previewRun += 1
    previewAudio.pause()
    previewAudio.removeAttribute("src")
    previewAudio.load()

    if (activePreview) {
      const activeSeed = languageSeeds.find((seed) => seed.code === activePreview)
      if (activeSeed?.state === "previewing") activeSeed.state = "idle"
    }

    activePreview = null
  }

  function revealLanguage(code: SupportedLanguage, run: number): void {
    if (run !== previewRun) return
    activePreview = null
    setLanguageState(code, "revealed")
    renderLanguageSeeds()
  }

  function selectLanguage(code: SupportedLanguage): void {
    resetActivePreview()
    selectedLanguage = code
    selectedArcId = null
    selectedStoryId = null
    allStories = []
    setLanguageState(code, "selected")
    saveLanguage(code)
    document.documentElement.dataset.learningLang = code
    renderLanguageSeeds()

    window.setTimeout(() => {
      setSurface("path")
    }, 360)
  }

  function getStorySignature(story: Story): string[] {
    if (story.visualSignature?.length) return story.visualSignature.slice(0, 3)
    return getFallbackVisualSignature(story)
  }

  function getPreviewMoments(story: Story): PreviewMoment[] {
    if (story.previewMoments?.length) return story.previewMoments.slice(0, 5)

    const count = getPreviewCount(story)
    const signature = story.visualSignature?.length ? story.visualSignature : getFallbackVisualSignature(story)
    const concepts = [...signature, ...story.coreConcepts].filter(Boolean)
    const imageFiles = shuffled(universalImages).slice(0, count)
    const audioFiles = shuffled(getVocabAudioFiles(selectedLanguage)).slice(0, count)

    return imageFiles.map((image, index) => {
      const concept = concepts[index % concepts.length] ?? `moment-${index + 1}`
      const audio = audioFiles[index % audioFiles.length]

      return {
        id: concept,
        symbol: concept,
        image: `engine/universal/images/${image}`,
        audio: audio ? `engine/vocab/${selectedLanguage === "en" ? "nan" : selectedLanguage}/audio/${audio}` : undefined
      }
    })
  }

  function getPrimerAudioFiles(): string[] {
    return getVocabAudioFiles(selectedLanguage).map(
      (audio) => `engine/vocab/${selectedLanguage === "en" ? "nan" : selectedLanguage}/audio/${audio}`
    )
  }

  function createSoundPieces(count: number, prefix: string, audio: string): SoundPiece[] {
    return Array.from({ length: Math.max(1, count) }, (_, index) => ({
      id: `${prefix}-${index + 1}`,
      audio
    }))
  }

  function getPrimerItems(story: Story): PrimerItem[] {
    if (story.primerItems?.length) return story.primerItems.slice(0, 5)

    const moments = getPreviewMoments(story)
    const concepts = [
      ...(story.visualSignature ?? []),
      ...story.coreConcepts,
      ...defaultSignature
    ].filter(Boolean)
    const audioFiles = getPrimerAudioFiles()

    return moments.slice(0, 5).map((moment, index) => {
      const id = concepts[index % concepts.length] ?? moment.id
      const wholeAudio = moment.audio ?? audioFiles[index % audioFiles.length] ?? fallbackPrimerAudio
      const phonemeCount = Math.max(2, Math.min(4, id.length || 3))
      const syllableCount = Math.max(1, Math.min(3, Math.ceil((id.length || 3) / 3)))

      return {
        id,
        image: moment.image,
        wholeAudio,
        phonemes: createSoundPieces(phonemeCount, `${id}-sound`, wholeAudio),
        syllables: createSoundPieces(syllableCount, `${id}-pulse`, wholeAudio),
        toneOrPitch: [{ id: `${id}-contour`, audio: wholeAudio, shape: selectedLanguage === "en" ? "single-pulse" : "contour" }],
        features: []
      }
    })
  }

  function stopPreviewMomentAudio(): void {
    previewMomentAudio.pause()
    previewMomentAudio.removeAttribute("src")
    previewMomentAudio.load()
    document.querySelectorAll(".is-preview-playing").forEach((element) => {
      element.classList.remove("is-preview-playing")
    })
  }

  function stopPrimerAudio(): void {
    primerAudio.pause()
    primerAudio.removeAttribute("src")
    primerAudio.load()
    document.querySelectorAll(".is-primer-playing").forEach((element) => {
      element.classList.remove("is-primer-playing")
    })
  }

  function runEchoGap(duration = 1200): void {
    primerEcho.classList.add("is-echoing")
    window.setTimeout(() => {
      primerEcho.classList.remove("is-echoing")
    }, duration)
  }

  function playPrimerAudio(audioSrc: string | undefined, sourceElement: HTMLElement, echo = false): void {
    stopPrimerAudio()
    const src = audioSrc || fallbackPrimerAudio
    sourceElement.classList.add("is-primer-playing")
    sourceElement.closest(".primer-card")?.classList.add("is-primer-playing")
    primerAudio.src = src
    primerAudio.currentTime = 0
    primerAudio.onended = () => {
      sourceElement.classList.remove("is-primer-playing")
      sourceElement.closest(".primer-card")?.classList.remove("is-primer-playing")
      if (echo) runEchoGap(Number.isFinite(primerAudio.duration) ? Math.min(1800, Math.max(900, primerAudio.duration * 420)) : 1200)
    }
    primerAudio.onerror = () => {
      sourceElement.classList.remove("is-primer-playing")
      sourceElement.closest(".primer-card")?.classList.remove("is-primer-playing")
      if (echo) runEchoGap()
    }
    primerAudio.play().catch(() => {
      sourceElement.classList.remove("is-primer-playing")
      sourceElement.closest(".primer-card")?.classList.remove("is-primer-playing")
      if (echo) runEchoGap()
    })
  }

  function playPreviewMomentAudio(moment: PreviewMoment, sourceButton: HTMLElement): void {
    stopPreviewMomentAudio()
    if (!moment.audio) return

    sourceButton.classList.add("is-preview-playing")
    previewMomentAudio.src = moment.audio
    previewMomentAudio.currentTime = 0
    previewMomentAudio.onended = () => {
      sourceButton.classList.remove("is-preview-playing")
    }
    previewMomentAudio.onerror = () => {
      sourceButton.classList.remove("is-preview-playing")
    }
    previewMomentAudio.play().catch(() => {
      sourceButton.classList.remove("is-preview-playing")
    })
  }

  function collapsePrimerCard(): void {
    if (!expandedPrimerCard) return

    stopPrimerAudio()
    expandedPrimerCard.querySelector<HTMLElement>(".primer-breakdown")?.setAttribute("hidden", "")
    expandedPrimerCard.querySelector<HTMLButtonElement>(".primer-collapse-button")?.setAttribute("hidden", "")
    expandedPrimerCard.classList.remove("is-expanded")
    primerCardTrack.classList.remove("has-expanded-card")
    primerBackdrop.hidden = true
    expandedPrimerCard = null
  }

  function expandPrimerCard(card: HTMLElement): void {
    if (expandedPrimerCard === card) return
    collapsePrimerCard()

    expandedPrimerCard = card
    card.classList.add("is-expanded")
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
    clearNode(previewImageTrack)
    clearNode(previewAudioTrack)

    getStorySignature(story).forEach((concept) => {
      const symbol = document.createElement("span")
      symbol.className = "preview-title-symbol"
      symbol.textContent = conceptIcons[concept] ?? "○"
      previewSignature.append(symbol)
    })

    const moments = getPreviewMoments(story)

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

      previewImageTrack.append(imageFrame)

      const audioButton = document.createElement("button")
      audioButton.className = "preview-sound"
      audioButton.type = "button"
      audioButton.setAttribute("aria-label", `Play ${moment.id} audio`)
      audioButton.append(document.createElement("span"), document.createElement("span"), document.createElement("span"))
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
    const tracks = [
      createTrack("phonemes", item.phonemes ?? []),
      createTrack("syllables", item.syllables ?? []),
      createTrack("tone", item.toneOrPitch ?? []),
      createTrack("features", item.features ?? [])
    ]

    tracks.forEach((track) => {
      if (track) container.append(track)
    })
  }

  function renderPrimerCard(item: PrimerItem): HTMLElement {
    const card = document.createElement("article")
    card.className = "primer-card"
    card.dataset.primerId = item.id

    const expandButton = document.createElement("button")
    expandButton.className = "primer-expand-zone"
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
    audioButton.innerHTML = "<span aria-hidden=\"true\"></span>"
    audioButton.addEventListener("click", (event) => {
      event.stopPropagation()
      playPrimerAudio(item.wholeAudio, audioButton, true)
    })

    const collapseButton = document.createElement("button")
    collapseButton.className = "primer-collapse-button"
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

    card.append(expandButton, audioButton, collapseButton, breakdown)
    return card
  }

  function renderMeaningPrimer(storyId: string): void {
    const story = allStories.find((candidate) => candidate.id === storyId)
    if (!story) return

    stopPrimerAudio()
    collapsePrimerCard()
    clearNode(primerCardTrack)
    getPrimerItems(story).forEach((item) => {
      primerCardTrack.append(renderPrimerCard(item))
    })
  }

  function resolveStoryAsset(path: string | undefined, base = storyAudioBase): string {
    if (!path) return ""
    if (/^(https?:|data:|blob:|\/|engine\/|stories\/|assets\/)/.test(path)) return path
    return `${base}${path}`
  }

  function getStoryById(storyId: string): Story | undefined {
    return allStories.find((candidate) => candidate.id === storyId)
  }

  function getStoryScenes(story: Story): StoryScene[] {
    const providedScenes = story.scenes?.filter((scene) => scene.image || scene.audio || scene.start !== undefined)
    const sourceScenes: StoryScene[] = providedScenes?.length
      ? providedScenes
      : [
          ...getPrimerItems(story).map((item) => ({
            id: item.id,
            image: item.image,
            audio: item.wholeAudio
          })),
          ...universalImages.map((image, index) => ({
            id: `fallback-scene-${index + 1}`,
            image: `engine/universal/images/${image}`
          }))
        ] satisfies StoryScene[]

    return sourceScenes.slice(0, 5).map((scene, index) => {
      const start = scene.start ?? index * 3.8
      const end = scene.end ?? start + 3.8

      return {
        id: scene.id || `scene-${index + 1}`,
        image: scene.image ? resolveStoryAsset(scene.image) : `engine/universal/images/${universalImages[index % universalImages.length]}`,
        audio: scene.audio ? resolveStoryAsset(scene.audio) : undefined,
        start,
        end
      }
    })
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
      dot.className = index === currentStorySceneIndex ? "is-active" : ""
      storyProgress.append(dot)
    })
  }

  function updateStoryProgress(story: Story, sceneIndex: number): void {
    const scenes = getStoryScenes(story)
    if (storyProgress.children.length !== scenes.length) renderStoryProgress(scenes)

    Array.from(storyProgress.children).forEach((dot, index) => {
      dot.classList.toggle("is-active", index === sceneIndex)
    })
  }

  function updateStoryModeButtons(): void {
    storyAutoButton.classList.toggle("is-active", selectedStoryMode === "auto")
    storyManualButton.classList.toggle("is-active", selectedStoryMode === "manual")
    storyAutoButton.setAttribute("aria-pressed", String(selectedStoryMode === "auto"))
    storyManualButton.setAttribute("aria-pressed", String(selectedStoryMode === "manual"))
  }

  function showStoryScene(story: Story, sceneIndex: number): void {
    const scenes = getStoryScenes(story)
    const scene = scenes[sceneIndex]
    if (!scene) return

    currentStorySceneIndex = sceneIndex
    storyImage.classList.add("is-changing")

    window.setTimeout(() => {
      storyImage.src = scene.image || ""
      storyImage.classList.remove("is-changing")
    }, 180)

    storyPrevButton.disabled = sceneIndex <= 0
    storyNextButton.disabled = sceneIndex >= scenes.length - 1
    updateStoryProgress(story, sceneIndex)
  }

  function runStoryEcho(duration = 1200): void {
    storyEcho.classList.add("is-echoing")
    window.setTimeout(() => {
      storyEcho.classList.remove("is-echoing")
    }, duration)
  }

  function stopStoryAudio(): void {
    window.clearTimeout(storySceneTimer)
    storyStage.classList.remove("is-playing")
    storyAudioButton.classList.remove("is-playing")

    if (!currentStoryAudio) return

    currentStoryAudio.pause()
    currentStoryAudio.removeAttribute("src")
    currentStoryAudio.load()
    currentStoryAudio = null
  }

  function finishStory(): void {
    window.clearTimeout(storySceneTimer)
    storyStage.classList.remove("is-playing")
    storyAudioButton.classList.remove("is-playing")
    currentStoryAudio = null
    storyModeGate.hidden = false
    updateStoryModeButtons()
    storyReplayButton.hidden = false
    storyAudioButton.hidden = false
  }

  function runTimedAutoStory(story: Story, sceneIndex = 0): void {
    const scenes = getStoryScenes(story)
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
    const scenes = getStoryScenes(story)
    const src = resolveStoryAsset(story.audio)

    if (!src) {
      runTimedAutoStory(story)
      return
    }

    const audio = new Audio(src)
    currentStoryAudio = audio

    audio.addEventListener("timeupdate", () => {
      const sceneIndex = getSceneIndexFromTime(scenes, audio.currentTime)
      if (sceneIndex !== currentStorySceneIndex) showStoryScene(story, sceneIndex)
    })

    audio.addEventListener("ended", finishStory)
    audio.addEventListener("error", () => {
      currentStoryAudio = null
      runTimedAutoStory(story, currentStorySceneIndex)
    })

    audio.play().catch(() => {
      currentStoryAudio = null
      runTimedAutoStory(story, currentStorySceneIndex)
    })
  }

  function startAutoStory(story: Story): void {
    selectedStoryMode = "auto"
    stopStoryAudio()
    updateStoryModeButtons()
    storyStage.classList.add("is-playing")
    storyAudioButton.classList.add("is-playing")
    storyModeGate.hidden = false
    storyAudioButton.hidden = false
    storyPrevButton.hidden = true
    storyNextButton.hidden = true
    storyReplayButton.hidden = true
    storyForwardButton.hidden = false
    currentStorySceneIndex = 0
    showStoryScene(story, 0)
    playFullStoryAudio(story)
  }

  function playSceneAudio(story: Story, sceneIndex: number): void {
    const scene = getStoryScenes(story)[sceneIndex]
    if (!scene) return

    stopStoryAudio()
    storyStage.classList.add("is-playing")
    storyAudioButton.classList.add("is-playing")

    const sceneAudio = scene.audio
    const fullStoryAudio = resolveStoryAsset(story.audio)
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
    updateStoryModeButtons()
    currentStorySceneIndex = Math.min(currentStorySceneIndex, getStoryScenes(story).length - 1)
    storyModeGate.hidden = false
    storyAudioButton.hidden = false
    storyPrevButton.hidden = false
    storyNextButton.hidden = false
    storyReplayButton.hidden = false
    storyForwardButton.hidden = false
    showStoryScene(story, currentStorySceneIndex)
    updateStoryProgress(story, currentStorySceneIndex)
  }

  function renderMeaningStory(storyId: string): void {
    const story = getStoryById(storyId)
    if (!story) return

    stopStoryAudio()
    currentStory = story
    currentStorySceneIndex = 0
    selectedStoryMode = "manual"
    storyBackButton.hidden = false
    storyControls.hidden = false
    startManualStory(story)
  }

  function goBackToPrimer(): void {
    stopStoryAudio()
    if (selectedStoryId) renderMeaningPrimer(selectedStoryId)
    setSurface("primer")
  }

  function goForwardFromStory(): void {
    stopStoryAudio()
    if (selectedStoryId) renderMeaningRecall(selectedStoryId)
    setSurface("recall")
  }

  function stopRecallAudio(): void {
    recallPromptOrb.classList.remove("is-playing")
    recallAudioButton.classList.remove("is-playing")
    recallAudio.pause()
    recallAudio.removeAttribute("src")
    recallAudio.load()
  }

  function playRecallPrompt(): void {
    const prompt = currentRecallPrompts[currentRecallIndex]
    stopRecallAudio()
    if (!prompt?.audio) return

    recallPromptOrb.classList.add("is-playing")
    recallAudioButton.classList.add("is-playing")
    recallAudio.src = prompt.audio
    recallAudio.currentTime = 0
    recallAudio.onended = () => {
      recallPromptOrb.classList.remove("is-playing")
      recallAudioButton.classList.remove("is-playing")
    }
    recallAudio.onerror = () => {
      recallPromptOrb.classList.remove("is-playing")
      recallAudioButton.classList.remove("is-playing")
    }
    recallAudio.play().catch(() => {
      recallPromptOrb.classList.remove("is-playing")
      recallAudioButton.classList.remove("is-playing")
    })
  }

  function getRecallPattern(item: PrimerItem, fallbackIndex: number): number[] {
    const phonemeCount = Math.max(2, item.phonemes?.length ?? 2 + (fallbackIndex % 3))
    return Array.from({ length: Math.min(5, phonemeCount) }, (_, index) => (index % 2 === 0 ? 1 : 0.64))
  }

  function getRecallPrompts(story: Story): RecallPrompt[] {
    const primerItems = getPrimerItems(story).slice(0, 4)
    const scenes = getStoryScenes(story)
    const items = primerItems.length ? primerItems : scenes.map((scene) => ({ id: scene.id, image: scene.image, wholeAudio: scene.audio }))
    const first = items[0]
    const second = items[1] ?? items[0]
    const third = items[2] ?? items[0]
    if (!first || !second || !third) return []

    const meaningChoices = items.slice(0, 3).map((item) => ({
      kind: "meaning" as const,
      id: item.id,
      image: item.image,
      symbol: conceptIcons[item.id]
    }))

    const perceptionChoices = [first, second, third].map((item, index) => ({
      kind: "perception" as const,
      id: item.id,
      pattern: getRecallPattern(item, index)
    }))

    return [
      {
        id: `${first.id}-hear-shape`,
        family: "perception",
        audio: first.wholeAudio,
        choices: perceptionChoices,
        correctIndex: 0
      },
      {
        id: `${second.id}-meaning`,
        family: "meaning",
        audio: second.wholeAudio,
        choices: meaningChoices,
        correctIndex: Math.min(1, meaningChoices.length - 1)
      },
      {
        id: `${third.id}-hear-shape`,
        family: "perception",
        audio: third.wholeAudio,
        choices: [...perceptionChoices].reverse(),
        correctIndex: Math.max(0, perceptionChoices.length - 1 - 2)
      },
      {
        id: `${first.id}-meaning-return`,
        family: "meaning",
        audio: first.wholeAudio,
        choices: [...meaningChoices].reverse(),
        correctIndex: Math.max(0, meaningChoices.length - 1)
      }
    ]
  }

  function renderRecallProgress(): void {
    clearNode(recallProgress)
    currentRecallPrompts.forEach((_, index) => {
      const dot = document.createElement("span")
      dot.className = index === currentRecallIndex ? "is-active" : ""
      recallProgress.append(dot)
    })
  }

  function renderPerceptionChoice(choice: Extract<RecallChoice, { kind: "perception" }>, button: HTMLButtonElement): void {
    const track = document.createElement("span")
    track.className = "recall-perception-track"
    choice.pattern.forEach((scale) => {
      const particle = document.createElement("span")
      particle.style.setProperty("--scale", String(scale))
      track.append(particle)
    })
    button.append(track)
  }

  function renderMeaningChoice(choice: Extract<RecallChoice, { kind: "meaning" }>, button: HTMLButtonElement): void {
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

  function renderRecallPrompt(): void {
    const prompt = currentRecallPrompts[currentRecallIndex]
    clearNode(recallChoiceBed)
    renderRecallProgress()
    recallPrevButton.disabled = currentRecallIndex <= 0
    recallNextQuestionButton.disabled = currentRecallIndex >= currentRecallPrompts.length - 1
    recallContinueButton.disabled = !currentRecallPrompts.length
    recallPromptOrb.dataset.family = prompt?.family ?? "meaning"
    if (!prompt) return

    prompt.choices.forEach((choice, index) => {
      const button = document.createElement("button")
      button.className = `recall-choice recall-choice-${choice.kind}`
      button.type = "button"
      button.setAttribute("role", "listitem")
      button.setAttribute("aria-label", choice.kind === "meaning" ? "Meaning choice" : "Sound shape choice")

      if (choice.kind === "meaning") renderMeaningChoice(choice, button)
      else renderPerceptionChoice(choice, button)

      button.addEventListener("click", () => {
        recallChoiceBed.querySelectorAll(".recall-choice").forEach((element) => {
          element.classList.remove("is-selected", "is-correct")
        })
        button.classList.add("is-selected")
        if (index === prompt.correctIndex) button.classList.add("is-correct")
      })

      recallChoiceBed.append(button)
    })
  }

  function renderMeaningRecall(storyId: string): void {
    const story = getStoryById(storyId)
    if (!story) return

    stopRecallAudio()
    currentStory = story
    currentRecallPrompts = getRecallPrompts(story)
    currentRecallIndex = 0
    renderRecallPrompt()
    window.setTimeout(playRecallPrompt, 180)
  }

  function goBackToStory(): void {
    stopRecallAudio()
    if (selectedStoryId) renderMeaningStory(selectedStoryId)
    setSurface("story")
  }

  function continueFromRecall(): void {
    stopRecallAudio()
    if (selectedStoryId) renderMeaningReflection(selectedStoryId)
    setSurface("reflection")
  }

  function renderMeaningReflection(storyId: string): void {
    const story = getStoryById(storyId)
    if (!story) return

    completedStoryIds.add(storyId)
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
  }

  function replayStoryFromReflection(): void {
    if (selectedStoryId) renderMeaningStory(selectedStoryId)
    setSurface("story")
  }

  function returnToPathSelection(): void {
    selectedArcId = null
    selectedStoryId = null
    setSurface("path")
  }

  function enterSoundGardenFromReflection(): void {
    selectedPath = "sound-garden"
    renderSoundGarden()
    setSurface("soundGarden")
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

  function enterSoundLesson(lessonId: string): void {
    selectedSoundLessonId = lessonId
    currentSoundPathStep = "preview"
    currentSoundItemIndex = 0
    currentSoundPairIndex = 0
    currentRecallItemIndex = 0
    stopLessonPreviewAudio()
    stopSoundPathAudio()
    app.dataset.soundLesson = lessonId
    renderSoundLessonPreview(lessonId)
    setSurface("soundPath")
  }

  function renderSoundLessonPreview(lessonId: string): void {
    const lesson = getSoundLessonById(lessonId)
    if (!lesson) return

    clearNode(soundPathContent)
    clearNode(soundPathVisual)

    currentSoundPathStep = "preview"
    currentSoundItemIndex = 0
    app.dataset.soundStep = "preview"
    soundPathVisual.hidden = true

    renderSoundLessonPreviewCards(lesson)
    renderSoundPathProgress("preview")

    soundPathReplayButton.disabled = false
    soundPathBackButton.disabled = true
    soundPathNextButton.disabled = false
  }

  function renderSoundLessonPreviewHero(lesson: SoundLesson): void {
    clearNode(soundPathVisual)
    const item = lesson.previewItems[currentSoundItemIndex] ?? lesson.previewItems[0]

    const visual = document.createElement("span")
    visual.className = [
      "sound-path-shape",
      `sound-path-shape-${lesson.visualType}`,
      `sound-path-shape-${item?.visual ?? "soft"}`
    ].join(" ")
    visual.setAttribute("aria-hidden", "true")
    soundPathVisual.append(visual)
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
        playSoundPathAudio(item.audio, card)
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
    soundPathContent.append(preview)
  }

  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms))
  }

  async function playLessonPreviewSequence(lesson: SoundLesson): Promise<void> {
    stopSoundPathAudio()
    const cards = Array.from(soundPathContent.querySelectorAll<HTMLElement>(".sound-lesson-preview-card"))

    for (let index = 0; index < lesson.previewItems.length; index += 1) {
      const item = lesson.previewItems[index]
      currentSoundItemIndex = index
      await playSoundPathAudioAsPromise(item.audio, cards[index])
      await wait(450)
    }
  }

  function renderSoundLessonPrimer(): void {
    const lesson = getSoundLessonById(selectedSoundLessonId)
    if (!lesson) return

    const item = lesson.previewItems[currentSoundItemIndex] ?? lesson.previewItems[0]
    if (!item) return

    stopSoundPathAudio()

    app.dataset.soundStep = "primer"
    soundPathVisual.hidden = false

    clearNode(soundPathVisual)
    clearNode(soundPathContent)

    renderSoundLessonPrimerVisual(lesson, item)
    renderSoundLessonPrimerContent(lesson, item)
    renderSoundPathProgress("primer")

    soundPathBackButton.disabled = false
    soundPathNextButton.disabled = false
    soundPathReplayButton.disabled = false
  }

  function renderSoundLessonPrimerVisual(lesson: SoundLesson, item: SoundLessonPreviewItem): void {
    const visual = document.createElement("span")

    visual.className = [
      "sound-path-shape",
      `sound-path-shape-${lesson.visualType}`,
      `sound-path-shape-${item.visual}`
    ].join(" ")

    visual.setAttribute("aria-hidden", "true")
    soundPathVisual.append(visual)
  }

  function renderSoundLessonPrimerContent(lesson: SoundLesson, item: SoundLessonPreviewItem): void {
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
      playSoundPathAudio(item.audio, playButton)
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
    soundPathContent.append(primer)
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

    stopSoundPathAudio()

    currentSoundPathStep = "guided-tuning"
    app.dataset.soundStep = "guided-tuning"
    soundPathVisual.hidden = false

    clearNode(soundPathVisual)
    clearNode(soundPathContent)

    renderGuidedTuningVisual(lesson, pair)
    renderGuidedTuningContent(lesson, pair, pairs.length)
    renderSoundPathProgress("guided-tuning")

    soundPathBackButton.disabled = false
    soundPathNextButton.disabled = false
    soundPathReplayButton.disabled = false
  }

  function renderGuidedTuningVisual(
    lesson: SoundLesson,
    pair: { first: SoundLessonPreviewItem; second: SoundLessonPreviewItem }
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
    soundPathVisual.append(bridge)
  }

  function renderGuidedTuningContent(
    lesson: SoundLesson,
    pair: { first: SoundLessonPreviewItem; second: SoundLessonPreviewItem },
    pairCount: number
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
    soundPathContent.append(tuning)
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
      playSoundPathAudio(item.audio, card)
    })

    return card
  }

  async function playGuidedTuningSequence(
    pair: { first: SoundLessonPreviewItem; second: SoundLessonPreviewItem },
    activeElement?: HTMLElement
  ): Promise<void> {
    stopSoundPathAudio()

    activeElement?.classList.add("is-playing")
    await playSoundPathAudioAsPromise(pair.first.audio)
    activeElement?.classList.add("is-playing")
    await wait(350)
    await playSoundPathAudioAsPromise(pair.second.audio)

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

    stopSoundPathAudio()

    currentSoundPathStep = "perception-recall"
    app.dataset.soundStep = "perception-recall"
    soundPathVisual.hidden = false

    clearNode(soundPathVisual)
    clearNode(soundPathContent)

    renderPerceptionRecallPromptVisual()
    renderPerceptionRecallContent(lesson, item)
    renderSoundPathProgress("perception-recall")

    soundPathBackButton.disabled = false
    soundPathNextButton.disabled = false
    soundPathReplayButton.disabled = false

    const recallIndexAtRender = currentRecallItemIndex
    window.setTimeout(() => {
      if (currentSoundPathStep !== "perception-recall" || currentRecallItemIndex !== recallIndexAtRender) return
      playSoundPathAudio(item.audio, soundPathVisual)
    }, 180)
  }

  function renderPerceptionRecallPromptVisual(): void {
    const prompt = document.createElement("span")
    prompt.className = "sound-recall-prompt-orb"
    prompt.setAttribute("aria-hidden", "true")

    soundPathVisual.append(prompt)
  }

  function renderPerceptionRecallContent(lesson: SoundLesson, correctItem: SoundLessonPreviewItem): void {
    const recall = document.createElement("div")
    recall.className = "sound-perception-recall"

    const replayButton = document.createElement("button")
    replayButton.className = "sound-recall-prompt-play"
    replayButton.type = "button"
    replayButton.setAttribute("aria-label", "Replay recall prompt")
    replayButton.innerHTML = "<span aria-hidden=\"true\"></span>"

    replayButton.addEventListener("click", () => {
      playSoundPathAudio(correctItem.audio, replayButton)
    })

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
    recall.append(replayButton, choiceGrid, recallProgress, recallControls)
    soundPathContent.append(recall)
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
    soundPathContent.querySelectorAll(".sound-recall-choice-card").forEach((element) => {
      element.classList.remove("is-selected", "is-correct", "is-soft-miss")
    })

    button.classList.add("is-selected")

    if (choice.id === correctItem.id) {
      button.classList.add("is-correct")
      runSoundEchoGap(700)
      return
    }

    button.classList.add("is-soft-miss")
    runSoundEchoGap(500)
  }

  function playSoundPathAudioAsPromise(audioSrc: string | undefined, activeElement?: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      stopSoundPathAudio()
      activeElement?.classList.add("is-playing")
      soundPathVisual.classList.add("is-playing")

      if (!audioSrc) {
        window.setTimeout(() => {
          activeElement?.classList.remove("is-playing")
          soundPathVisual.classList.remove("is-playing")
          runSoundEchoGap(700)
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
        soundPathVisual.classList.remove("is-playing")
        currentSoundAudio = null
        runSoundEchoGap(700)
        resolve()
      }

      audio.addEventListener("ended", finish, { once: true })
      audio.addEventListener("error", finish, { once: true })
      audio.play().catch(finish)
    })
  }

  function goBackToSoundGarden(): void {
    stopLessonPreviewAudio()
    selectedSoundLessonId = null
    renderSoundGarden()
    setSurface("soundGarden")
  }

  function getSoundGardenSectionById(sectionId: string | null): SoundGardenSection | undefined {
    return soundGardenSections.find((section) => section.id === sectionId)
  }

  function renderSoundPath(sectionId: string | null): void {
    const section = getSoundGardenSectionById(sectionId)
    if (!section || !currentSoundPathStep) return
    renderSoundPathStep(section, currentSoundPathStep)
  }

  function renderSoundPathStep(section: SoundGardenSection, step: SoundPathStepId): void {
    stopSoundPathAudio()
    app.dataset.soundStep = step
    soundPathVisual.hidden = false
    renderSoundPathVisual(section.items[currentSoundItemIndex] ?? section.items[0] ?? { id: section.id, visualType: section.visualType })
    clearNode(soundPathContent)

    if (step === "preview") renderSoundPreviewStep(section)
    if (step === "primer") renderSoundPrimerStep(section)
    if (step === "guided-tuning") renderGuidedTuningStep(section)
    if (step === "perception-recall") renderPerceptionRecallStep(section)
    if (step === "reflection") renderSoundReflectionStep(section)

    renderSoundPathProgress(step)
  }

  function getSoundVisualKind(itemOrChoice: SoundGardenItem | SoundChoice): SoundVisualType {
    return "kind" in itemOrChoice ? itemOrChoice.kind : itemOrChoice.visualType
  }

  function renderSoundPathVisual(itemOrChoice: SoundGardenItem | SoundChoice): HTMLElement {
    clearNode(soundPathVisual)
    const visual = document.createElement("span")
    visual.className = `sound-path-shape sound-path-shape-${getSoundVisualKind(itemOrChoice)} sound-path-shape-${itemOrChoice.visualShape ?? "soft"}`
    soundPathVisual.append(visual)
    return visual
  }

  function renderSoundPathProgress(step: SoundPathStepId): void {
    clearNode(soundPathProgress)
    soundPathSteps.forEach((candidate) => {
      const dot = document.createElement("span")
      dot.className = candidate === step ? "is-active" : ""
      soundPathProgress.append(dot)
    })
    soundPathBackButton.disabled = soundPathSteps.indexOf(step) <= 0
  }

  function renderSoundPathPreviewItem(item: SoundGardenItem): HTMLLIElement {
    const rowItem = document.createElement("li")
    rowItem.append(renderSoundPathMiniVisual(item))

    const button = document.createElement("button")
    button.className = "sound-path-play-button"
    button.type = "button"
    button.setAttribute("aria-label", `Play ${item.id}`)
    button.innerHTML = "<span aria-hidden=\"true\"></span>"
    button.addEventListener("click", () => {
      currentSoundItemIndex = Math.max(0, getCurrentSoundSectionItems().findIndex((candidate) => candidate.id === item.id))
      renderSoundPathVisual(item)
      playSoundPathAudio(item.audio, rowItem)
    })
    rowItem.append(button)
    return rowItem
  }

  function renderSoundPathMiniVisual(itemOrChoice: SoundGardenItem | SoundChoice): HTMLElement {
    const visual = document.createElement("span")
    visual.className = `sound-path-mini-visual sound-path-mini-${getSoundVisualKind(itemOrChoice)} sound-path-mini-${itemOrChoice.visualShape ?? "soft"}`
    visual.setAttribute("aria-hidden", "true")
    return visual
  }

  function renderSoundPreviewStep(section: SoundGardenSection): void {
    const trackWrap = document.createElement("div")
    trackWrap.className = "sound-path-preview-track-wrap"

    const track = document.createElement("ul")
    track.className = "sound-path-preview-track"
    section.items.forEach((item) => track.append(renderSoundPathPreviewItem(item)))
    trackWrap.append(track)
    trackWrap.scrollLeft = 0
    soundPathContent.append(trackWrap)
  }

  function renderSoundPrimerStep(section: SoundGardenSection): void {
    const item = section.items[currentSoundItemIndex] ?? section.items[0]
    if (!item) return

    const card = document.createElement("div")
    card.className = "sound-path-primer-card"
    card.append(renderSoundPathMiniVisual(item))

    const nextItemButton = document.createElement("button")
    nextItemButton.className = "sound-path-small-next"
    nextItemButton.type = "button"
    nextItemButton.setAttribute("aria-label", "Next sound")
    nextItemButton.innerHTML = "<span aria-hidden=\"true\"></span>"
    nextItemButton.addEventListener("click", () => {
      currentSoundItemIndex = (currentSoundItemIndex + 1) % section.items.length
      renderSoundPathStep(section, "primer")
    })

    card.append(nextItemButton)
    soundPathContent.append(card)
  }

  function renderGuidedTuningStep(section: SoundGardenSection): void {
    const item = section.items[currentSoundItemIndex] ?? section.items[0]
    const nextItem = section.items[(currentSoundItemIndex + 1) % section.items.length] ?? item
    if (!item) return

    const grid = document.createElement("div")
    grid.className = "sound-compare-grid"
    ;[
      { item, audio: item.audio },
      { item: nextItem, audio: item.compareAudio ?? nextItem.audio }
    ].forEach(({ item: compareItem, audio }) => {
      const card = document.createElement("button")
      card.className = "sound-compare-card"
      card.type = "button"
      card.setAttribute("aria-label", "Play comparison sound")
      card.append(renderSoundPathMiniVisual(compareItem))
      card.addEventListener("click", () => playSoundPathAudio(audio, card))
      grid.append(card)
    })
    soundPathContent.append(grid)
  }

  function renderPerceptionRecallStep(section: SoundGardenSection): void {
    const item = section.items[currentSoundItemIndex] ?? section.items[0]
    if (!item) return

    const choices = item.choices?.length ? item.choices : [{ id: item.id, kind: item.visualType, visualShape: item.visualShape, correct: true }]
    const bed = document.createElement("div")
    bed.className = "sound-recall-choice-bed"

    choices.forEach((choice) => {
      const button = document.createElement("button")
      button.className = "sound-recall-choice"
      button.type = "button"
      button.setAttribute("aria-label", "Choose sound shape")
      button.append(renderSoundPathMiniVisual(choice))
      button.addEventListener("click", () => handleSoundRecallChoice(choice, button))
      bed.append(button)
    })
    soundPathContent.append(bed)
  }

  function renderSoundReflectionStep(section: SoundGardenSection): void {
    markSoundSectionComplete(section.id)
    const growth = document.createElement("div")
    growth.className = "sound-reflection-growth"
    growth.append(document.createElement("span"), document.createElement("span"), document.createElement("span"))

    const actions = document.createElement("div")
    actions.className = "sound-reflection-actions"
    ;[
      { label: "Repeat sound path", action: () => enterSoundSection(section.id), className: "repeat" },
      { label: "Continue to next sound path", action: () => enterNextSoundSection(section.id), className: "next" },
      { label: "Enter Meaning Tree", action: openMeaningArcs, className: "tree" }
    ].forEach(({ label, action, className }) => {
      const button = document.createElement("button")
      button.className = `sound-reflection-action sound-reflection-action-${className}`
      button.type = "button"
      button.setAttribute("aria-label", label)
      button.innerHTML = "<span aria-hidden=\"true\"></span>"
      button.addEventListener("click", action)
      actions.append(button)
    })

    soundPathContent.append(growth, actions)
  }

  function getCurrentSoundSectionItems(): SoundGardenItem[] {
    return getSoundGardenSectionById(selectedSoundSectionId)?.items ?? []
  }

  function playSoundPathAudio(audioSrc: string | undefined, activeElement?: HTMLElement): void {
    stopSoundPathAudio()
    if (!audioSrc) {
      activeElement?.classList.add("is-playing")
      window.setTimeout(() => {
        activeElement?.classList.remove("is-playing")
        runSoundEchoGap()
      }, 900)
      return
    }

    const audio = new Audio(audioSrc)
    currentSoundAudio = audio
    activeElement?.classList.add("is-playing")
    soundPathVisual.classList.add("is-playing")

    const clearPlaying = () => {
      activeElement?.classList.remove("is-playing")
      soundPathVisual.classList.remove("is-playing")
      currentSoundAudio = null
    }

    audio.addEventListener("ended", () => {
      clearPlaying()
      runSoundEchoGap(Number.isFinite(audio.duration) ? Math.min(1800, Math.max(900, audio.duration * 420)) : 1200)
    })
    audio.addEventListener("error", () => {
      clearPlaying()
      runSoundEchoGap()
    })
    audio.play().catch(() => {
      window.setTimeout(() => {
        clearPlaying()
        runSoundEchoGap()
      }, 900)
    })
  }

  function stopSoundPathAudio(): void {
    if (currentSoundAudio) {
      currentSoundAudio.pause()
      currentSoundAudio.currentTime = 0
      currentSoundAudio = null
    }
    soundPathVisual.classList.remove("is-playing")
    soundPathContent.querySelectorAll(".is-playing").forEach((element) => element.classList.remove("is-playing"))
  }

  function runSoundEchoGap(duration = 1200): void {
    soundPathEcho.classList.add("is-echoing")
    window.setTimeout(() => soundPathEcho.classList.remove("is-echoing"), duration)
  }

  function handleSoundRecallChoice(choice: SoundChoice, button: HTMLElement): void {
    soundPathContent.querySelectorAll(".sound-recall-choice").forEach((element) => element.classList.remove("is-selected", "is-correct", "is-soft-miss"))
    button.classList.add("is-selected")
    button.classList.add(choice.correct ? "is-correct" : "is-soft-miss")
    if (!choice.correct) runSoundEchoGap(700)
  }

  function goToNextSoundPathStep(): void {
    if (!currentSoundPathStep) return
    if (selectedSoundLessonId) {
      if (currentSoundPathStep === "preview") {
        currentSoundPathStep = "primer"
        currentSoundItemIndex = 0
        renderSoundLessonPrimer()
        return
      }

      if (currentSoundPathStep === "primer") {
        currentSoundPathStep = "guided-tuning"
        currentSoundPairIndex = 0
        renderSoundGuidedTuning()
        return
      }

      if (currentSoundPathStep === "guided-tuning") {
        currentSoundPathStep = "perception-recall"
        currentRecallItemIndex = 0
        renderSoundPerceptionRecall()
        return
      }

      if (currentSoundPathStep === "perception-recall") {
        currentSoundPathStep = "reflection"
        renderSoundReflection()
        return
      }

      if (currentSoundPathStep === "reflection") {
        const nextLesson = getNextSoundLesson(selectedSoundLessonId)

        if (nextLesson) {
          enterSoundLesson(nextLesson.id)
          return
        }

        if (selectedSoundSectionId) renderSoundLessonList()
        setSurface("soundLessonList")
        return
      }

      return
    }

    const nextStep = soundPathSteps[soundPathSteps.indexOf(currentSoundPathStep) + 1]
    if (!nextStep) {
      renderSoundGarden()
      setSurface("soundGarden")
      return
    }
    currentSoundPathStep = nextStep
    renderSoundPath(selectedSoundSectionId)
  }

  function renderSoundReflection(): void {
    const lesson = getSoundLessonById(selectedSoundLessonId)
    if (!lesson) return

    stopSoundPathAudio()

    currentSoundPathStep = "reflection"
    app.dataset.soundStep = "reflection"
    soundPathVisual.hidden = false

    markSoundLessonComplete(lesson.id)

    clearNode(soundPathVisual)
    clearNode(soundPathContent)

    renderSoundReflectionVisual()
    renderSoundReflectionContent(lesson)
    renderSoundPathProgress("reflection")

    soundPathBackButton.disabled = false
    soundPathNextButton.disabled = false
    soundPathReplayButton.disabled = false
  }

  function renderSoundReflectionVisual(): void {
    const bloom = document.createElement("div")
    bloom.className = "sound-lesson-reflection-bloom"
    bloom.setAttribute("aria-hidden", "true")

    bloom.append(
      document.createElement("span"),
      document.createElement("span"),
      document.createElement("span"),
      document.createElement("span")
    )

    soundPathVisual.append(bloom)
  }

  function renderSoundReflectionContent(lesson: SoundLesson): void {
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
      currentSoundPathStep = "preview"
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
      stopSoundPathAudio()
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
      stopSoundPathAudio()
      selectedSoundLessonId = null
      renderSoundGarden()
      setSurface("soundGarden")
    })

    actions.append(repeatButton, lessonListButton, nextLessonButton, gardenButton)
    reflection.append(resonance, actions)
    soundPathContent.append(reflection)
  }

  function goToPreviousSoundPathStep(): void {
    if (!currentSoundPathStep) return
    if (selectedSoundLessonId) {
      if (currentSoundPathStep === "primer") {
        renderSoundLessonPreview(selectedSoundLessonId)
      }

      if (currentSoundPathStep === "guided-tuning") {
        currentSoundPathStep = "primer"
        renderSoundLessonPrimer()
        return
      }

      if (currentSoundPathStep === "perception-recall") {
        currentSoundPathStep = "guided-tuning"
        renderSoundGuidedTuning()
        return
      }

      if (currentSoundPathStep === "reflection") {
        currentSoundPathStep = "perception-recall"
        renderSoundPerceptionRecall()
        return
      }

      return
    }

    const previousStep = soundPathSteps[soundPathSteps.indexOf(currentSoundPathStep) - 1]
    if (!previousStep) return
    currentSoundPathStep = previousStep
    renderSoundPath(selectedSoundSectionId)
  }

  function returnToSoundGardenSelection(): void {
    stopSoundPathAudio()
    renderSoundGarden()
    setSurface("soundGarden")
  }

  function returnToSoundLessonList(): void {
    stopSoundPathAudio()
    if (selectedSoundSectionId) renderSoundLessonList()
    setSurface("soundLessonList")
  }

  function markSoundSectionComplete(sectionId: string): void {
    completedSoundSectionIds.add(sectionId)
    app.dataset.completedSoundSections = String(completedSoundSectionIds.size)
  }

  function enterNextSoundSection(sectionId: string): void {
    const index = soundGardenSections.findIndex((section) => section.id === sectionId)
    const nextSection = soundGardenSections[(index + 1) % soundGardenSections.length]
    if (nextSection) enterSoundSection(nextSection.id)
  }

  function returnToPathGate(): void {
    stopCurrentSoundPreview()
    stopSoundPathAudio()
    stopLessonPreviewAudio()
    selectedArcId = null
    selectedSoundSectionId = null
    selectedSoundLessonId = null
    setSurface("path")
  }

  function getStoriesForArc(arcId: string): Story[] {
    return allStories.filter((story) => getStoryArcId(story) === arcId)
  }

  function renderArcButtons(): void {
    clearNode(arcList)

    meaningArcs.forEach((arc) => {
      const item = document.createElement("li")
      const button = document.createElement("button")
      button.className = arc.unlocked ? "arc-button" : "arc-button is-locked"
      button.type = "button"
      button.dataset.arcId = arc.id
      button.setAttribute("aria-label", arc.ariaLabel)
      button.disabled = !arc.unlocked

      const icon = document.createElement("span")
      icon.className = "arc-icon"
      icon.setAttribute("aria-hidden", "true")

      if (arc.svg) {
        icon.innerHTML = arc.svg.trim()
        icon.querySelector("svg")?.setAttribute("focusable", "false")
      } else {
        icon.textContent = arc.fallbackSymbol
      }

      button.append(icon)
      button.addEventListener("click", () => {
        selectedArcId = arc.id
        renderStoryPods(getStoriesForArc(arc.id))
        setSurface("storyBranch")
      })

      item.append(button)
      arcList.append(item)
    })
  }

  function renderStoryPods(stories: Story[]): void {
    clearNode(storyPodBed)

    stories.forEach((story) => {
      const button = document.createElement("button")
      button.className = "story-pod"
      button.type = "button"
      button.setAttribute("role", "listitem")
      button.setAttribute("aria-label", story.title)

      const symbols = document.createElement("span")
      symbols.className = "story-symbols"
      symbols.setAttribute("aria-hidden", "true")

      getStorySignature(story).forEach((concept) => {
        const symbol = document.createElement("span")
        symbol.className = "story-symbol"
        symbol.textContent = conceptIcons[concept] ?? "○"
        symbols.append(symbol)
      })

      const progress = document.createElement("span")
      progress.className = "story-progress"
      progress.setAttribute("aria-hidden", "true")
      progress.append(document.createElement("span"), document.createElement("span"), document.createElement("span"))

      button.append(symbols, progress)
      button.addEventListener("click", () => {
        selectedStoryId = story.id
        renderMeaningPreviewWorld(story.id)
        setSurface("meaningPreview")
      })

      storyPodBed.append(button)
    })
  }

  function returnToMeaningArcs(): void {
    selectedArcId = null
    selectedStoryId = null
    renderArcButtons()
    setSurface("meaningArc")
  }

  function openMeaningArcs(): void {
    selectedPath = "meaning-tree"
    selectedArcId = null
    selectedStoryId = null
    clearNode(arcList)
    clearNode(storyPodBed)

    loadLearningData(selectedLanguage)
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

  function previewLanguage(code: SupportedLanguage): void {
    const seed = languageSeeds.find((candidate) => candidate.code === code)
    if (seed?.state === "revealed" || seed?.state === "selected") {
      selectLanguage(code)
      return
    }

    resetActivePreview()
    previewRun += 1
    const run = previewRun
    activePreview = code
    setLanguageState(code, "previewing")
    renderLanguageSeeds()

    previewAudio.src = previewPath(code)
    previewAudio.currentTime = 0

    previewAudio.onended = () => {
      revealLanguage(code, run)
    }

    previewAudio.onerror = () => {
      revealLanguage(code, run)
    }

    previewAudio.play().catch(() => {
      revealLanguage(code, run)
    })
  }

  function renderLanguageSeeds(): void {
    clearNode(languageSeedbed)

    languageSeeds.forEach((languageSeed) => {
      const option = languageOptions.find((language) => language.code === languageSeed.code)
      if (!option) return

      const row = document.createElement("div")
      row.className = "language-seed-row"
      row.dataset.state = languageSeed.state
      row.dataset.language = languageSeed.code
      row.setAttribute("role", "listitem")

      const button = document.createElement("button")
      button.className = "language-seed-button"
      button.type = "button"
      button.setAttribute("aria-label", `${option.name} preview`)
      button.setAttribute("aria-pressed", String(languageSeed.state === "selected"))
      button.append(createSeedSvg(languageSeed.code))
      button.addEventListener("click", () => {
        previewLanguage(languageSeed.code)
      })

      const nameGroup = document.createElement("span")
      nameGroup.className = "language-name"
      nameGroup.setAttribute("aria-hidden", String(languageSeed.state === "idle" || languageSeed.state === "previewing"))

      const name = document.createElement("span")
      name.textContent = getDisplayName(languageSeed.code)

      const enterButton = document.createElement("button")
      enterButton.className = "language-enter"
      enterButton.type = "button"
      enterButton.setAttribute("aria-label", `Enter ${option.name}`)
      enterButton.addEventListener("click", () => {
        selectLanguage(languageSeed.code)
      })

      const chevron = document.createElement("span")
      chevron.setAttribute("aria-hidden", "true")
      enterButton.append(chevron)
      nameGroup.append(name, enterButton)
      row.append(button, nameGroup)
      languageSeedbed.append(row)
    })
  }

  seedButton.addEventListener("click", () => {
    if (hasBegun) return
    hasBegun = true
    app.dataset.audio = "unlocked"
    makeChime()

    window.setTimeout(() => {
      setSurface("language")
    }, 980)
  })

  meaningTreeButton.addEventListener("click", () => {
    openMeaningArcs()
  })

  soundGardenButton.addEventListener("click", () => {
    selectedPath = "sound-garden"
    renderSoundGarden()
    setSurface("soundGarden")
  })

  soundGardenReturnButton.addEventListener("click", returnToPathGate)

  window.addEventListener("resize", updateSoundGardenPreviewAlignment)

  lessonBackButton.addEventListener("click", goBackToSoundGarden)

  meaningArcReturnButton.addEventListener("click", returnToPathGate)

  storyBranchReturnButton.addEventListener("click", (event) => {
    event.stopPropagation()
    returnToMeaningArcs()
  })

  soundPathSectionBackButton.addEventListener("click", returnToSoundLessonList)

  soundPathBackButton.addEventListener("click", goToPreviousSoundPathStep)

  soundPathReplayButton.addEventListener("click", () => {
    const lesson = getSoundLessonById(selectedSoundLessonId)
    if (lesson && currentSoundPathStep === "preview") {
      void playLessonPreviewSequence(lesson)
      return
    }

    if (lesson && currentSoundPathStep === "primer") {
      const item = lesson.previewItems[currentSoundItemIndex] ?? lesson.previewItems[0]
      if (item) playSoundPathAudio(item.audio, soundPathReplayButton)
      return
    }

    if (lesson && currentSoundPathStep === "guided-tuning") {
      const pairs = getGuidedTuningPairs(lesson)
      const pair = pairs[currentSoundPairIndex]
      if (pair) void playGuidedTuningSequence(pair, soundPathReplayButton)
      return
    }

    if (lesson && currentSoundPathStep === "perception-recall") {
      const item = lesson.previewItems[currentRecallItemIndex] ?? lesson.previewItems[0]
      if (item) playSoundPathAudio(item.audio, soundPathReplayButton)
      return
    }

    if (lesson && currentSoundPathStep === "reflection") {
      makeChime()
      runSoundEchoGap(900)
      return
    }

    const section = getSoundGardenSectionById(selectedSoundSectionId)
    const item = section?.items[currentSoundItemIndex] ?? section?.items[0]
    if (item) playSoundPathAudio(item.audio, soundPathReplayButton)
  })

  soundPathNextButton.addEventListener("click", goToNextSoundPathStep)

  soundPathSectionNextButton.addEventListener("click", () => {
    if (selectedSoundSectionId) enterNextSoundSection(selectedSoundSectionId)
  })

  previewBackButton.addEventListener("click", () => {
    stopPreviewMomentAudio()
    setSurface("storyBranch")
  })

  previewEnterButton.addEventListener("click", () => {
    stopPreviewMomentAudio()
    if (selectedStoryId) renderMeaningPrimer(selectedStoryId)
    setSurface("primer")
  })

  primerBackButton.addEventListener("click", () => {
    collapsePrimerCard()
    stopPrimerAudio()
    if (selectedStoryId) renderMeaningPreviewWorld(selectedStoryId)
    setSurface("meaningPreview")
  })

  primerNextButton.addEventListener("click", () => {
    collapsePrimerCard()
    stopPrimerAudio()
    if (selectedStoryId) renderMeaningStory(selectedStoryId)
    setSurface("story")
  })

  storyAutoButton.addEventListener("click", () => {
    const story = currentStory ?? (selectedStoryId ? getStoryById(selectedStoryId) : undefined)
    if (story) startAutoStory(story)
  })

  storyManualButton.addEventListener("click", () => {
    const story = currentStory ?? (selectedStoryId ? getStoryById(selectedStoryId) : undefined)
    if (story) startManualStory(story)
  })

  storyAudioButton.addEventListener("click", () => {
    const story = currentStory ?? (selectedStoryId ? getStoryById(selectedStoryId) : undefined)
    if (!story) return
    if (selectedStoryMode === "manual") playSceneAudio(story, currentStorySceneIndex)
    else startAutoStory(story)
  })

  storyPrevButton.addEventListener("click", () => {
    if (!currentStory) return
    stopStoryAudio()
    showStoryScene(currentStory, Math.max(0, currentStorySceneIndex - 1))
  })

  storyNextButton.addEventListener("click", () => {
    if (!currentStory) return
    const scenes = getStoryScenes(currentStory)
    stopStoryAudio()
    showStoryScene(currentStory, Math.min(scenes.length - 1, currentStorySceneIndex + 1))
  })

  storyReplayButton.addEventListener("click", () => {
    const story = currentStory ?? (selectedStoryId ? getStoryById(selectedStoryId) : undefined)
    if (!story) return
    if (selectedStoryMode === "manual") playSceneAudio(story, currentStorySceneIndex)
    else startAutoStory(story)
  })

  storyBackButton.addEventListener("click", goBackToPrimer)
  storyForwardButton.addEventListener("click", goForwardFromStory)

  recallAudioButton.addEventListener("click", playRecallPrompt)

  recallStoryButton.addEventListener("click", goBackToStory)

  recallPrevButton.addEventListener("click", () => {
    if (currentRecallIndex <= 0) return
    stopRecallAudio()
    currentRecallIndex -= 1
    renderRecallPrompt()
    playRecallPrompt()
  })

  recallNextQuestionButton.addEventListener("click", () => {
    if (currentRecallIndex >= currentRecallPrompts.length - 1) return
    stopRecallAudio()
    currentRecallIndex += 1
    renderRecallPrompt()
    playRecallPrompt()
  })

  recallContinueButton.addEventListener("click", continueFromRecall)

  reflectionReplayButton.addEventListener("click", replayStoryFromReflection)
  reflectionPathsButton.addEventListener("click", returnToPathSelection)
  reflectionSoundGardenButton.addEventListener("click", enterSoundGardenFromReflection)

  primerBackdrop.className = "primer-backdrop"
  primerBackdrop.type = "button"
  primerBackdrop.hidden = true
  primerBackdrop.setAttribute("aria-label", "Collapse primer card")
  primerBackdrop.addEventListener("click", collapsePrimerCard)
  primerScreen.append(primerBackdrop)

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && surface === "primer") collapsePrimerCard()
  })

  setAssetIcon(soundGardenReturnButton, returnToMainNavSvgMarkup)
  setAssetIcon(lessonBackButton, currentLessonBackNavSvgMarkup)
  setAssetIcon(soundPathSectionBackButton, sectionNavBackSvgMarkup)
  setAssetIcon(soundPathBackButton, currentLessonBackNavSvgMarkup)
  setAssetIcon(soundPathReplayButton, replaySvgMarkup)
  setAssetIcon(soundPathNextButton, currentLessonForwardNavSvgMarkup, "asset-icon-forward")
  setAssetIcon(soundPathSectionNextButton, sectionNavForwardSvgMarkup, "asset-icon-forward")
  setAssetIcon(meaningArcReturnButton, returnToMainNavSvgMarkup)
  setAssetIcon(storyBranchReturnButton, currentLessonBackNavSvgMarkup)
  setAssetIcon(previewBackButton, currentLessonBackNavSvgMarkup)
  setAssetIcon(previewEnterButton, currentLessonForwardNavSvgMarkup, "asset-icon-forward")
  setAssetIcon(primerBackButton, currentLessonBackNavSvgMarkup)
  setAssetIcon(primerNextButton, currentLessonForwardNavSvgMarkup, "asset-icon-forward")
  setAssetIcon(storyAutoButton, autoplaySvgMarkup, "asset-icon-story-mode")
  setAssetIcon(storyManualButton, manualPlaySvgMarkup, "asset-icon-story-mode")
  setAssetIcon(storyAudioButton, playButtonSvgMarkup, "asset-icon-play")
  setAssetIcon(storyBackButton, currentLessonBackNavSvgMarkup)
  setAssetIcon(storyPrevButton, currentLessonBackNavSvgMarkup)
  setAssetIcon(storyNextButton, currentLessonForwardNavSvgMarkup, "asset-icon-forward")
  setAssetIcon(storyReplayButton, replaySvgMarkup)
  setAssetIcon(storyForwardButton, currentLessonForwardNavSvgMarkup, "asset-icon-forward")
  setAssetIcon(recallAudioButton, activePlayButtonSvgMarkup, "asset-icon-play")
  setAssetIcon(recallStoryButton, currentLessonBackNavSvgMarkup)
  setAssetIcon(recallPrevButton, currentLessonBackNavSvgMarkup)
  setAssetIcon(recallNextQuestionButton, currentLessonForwardNavSvgMarkup, "asset-icon-forward")
  setAssetIcon(recallContinueButton, currentLessonForwardNavSvgMarkup, "asset-icon-forward")
  setAssetIcon(reflectionReplayButton, replaySvgMarkup)
  setAssetIcon(reflectionPathsButton, returnToMainNavSvgMarkup)
  setAssetIcon(reflectionSoundGardenButton, sectionNavForwardSvgMarkup, "asset-icon-forward")

  startSeedArt.innerHTML = seedSvgMarkup.trim()
  startSeedArt.querySelector("svg")?.setAttribute("focusable", "false")
  meaningTreeArt.innerHTML = meaningTreeSvgMarkup.trim()
  meaningTreeArt.querySelector("svg")?.setAttribute("focusable", "false")
  soundGardenArt.innerHTML = soundGardenSvgMarkup.trim()
  soundGardenArt.querySelector("svg")?.setAttribute("focusable", "false")
  renderLanguageSeeds()
  setSurface(surface)
}
