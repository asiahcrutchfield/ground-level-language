import type { PreviewMoment, PrimerItem, SoundPiece, Story, StoryScene, SupportedLanguage } from "./types"

export type MeaningArc = {
  id: string
  subject: string
  ariaLabel: string
  svg?: string
  fallbackSymbol: string
  unlocked: boolean
}

export type RecallMode = "audio-image" | "image-audio" | "audio-audio"

export type RecallPromptContent =
  | { kind: "audio"; audio?: string }
  | { kind: "image"; image?: string; symbol?: string }

export type RecallChoice =
  | { kind: "meaning"; image?: string; symbol?: string; id: string; audio?: string }
  | { kind: "perception"; pattern: number[]; id: string; audio?: string; symbol?: string }
  | { kind: "image"; image?: string; symbol?: string; id: string; audio?: string }
  | { kind: "audio"; audio?: string; symbol?: string; id: string }

export type RecallPrompt = {
  id: string
  family: "perception" | "meaning"
  mode?: RecallMode
  prompt?: RecallPromptContent
  audio?: string
  image?: string
  symbol?: string
  choices: RecallChoice[]
  correctIndex: number
}

export const conceptIcons: Record<string, string> = {
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
  bowl: "◇",
  meat: "🍖",
  human: "◯",
  hand: "✋",
  touch: "○",
  car: "▭",
  hands: "✋",
  home: "⌂",
  day: "○",
  tree: "♧",
  sun: "☼"
}

export const defaultSignature = ["cat", "food", "night"]
export const fallbackPrimerAudio = "engine/vocab/nan/audio/nan_u0002.wav"

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
  en: ["en_u0001.mp3", "en_u0002.mp3", "en_u0003.mp3", "en_u0004.mp3", "en_u0005.mp3"],
  nan: ["nan_u0001.wav", "nan_u0002.wav", "nan_u0003.mp3", "nan_u0004.mp3", "nan_u0005.mp3"],
  zh: ["zh_u0001.mp3", "zh_u0002.mp3", "zh_u0003.mp3", "zh_u0004.mp3", "zh_u0005.mp3"]
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

function getPrimerAudioFiles(selectedLanguage: SupportedLanguage): string[] {
  return getVocabAudioFiles(selectedLanguage).map(
    (audio) =>
      selectedLanguage === "en" ? `/engine/vocab/en/audio/natural/${audio}` : `engine/vocab/${selectedLanguage}/audio/${audio}`
  )
}

function createSoundPieces(count: number, prefix: string, audio: string): SoundPiece[] {
  return Array.from({ length: Math.max(1, count) }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    audio
  }))
}

function getFallbackVisualSignature(story: Story): string[] {
  if (story.perspective === "cat") return ["cat", "food", "night"]
  if (story.perspective === "dog") return ["dog", "food", "day"]
  if (story.perspective === "bird") return ["bird", "tree", "sun"]
  return ["○", "○", "○"]
}

export function getStorySignature(story: Story): string[] {
  if (story.visualSignature?.length) return story.visualSignature.slice(0, 3)
  return getFallbackVisualSignature(story)
}

export function renderArcButtons(options: {
  arcList: HTMLElement
  arcs: MeaningArc[]
  prefersReducedMotion: () => boolean
  selectionDelay?: number
  onArcSelected: (arc: MeaningArc, button: HTMLButtonElement) => void
}): void {
  const { arcList, arcs, prefersReducedMotion, selectionDelay, onArcSelected } = options
  arcs.forEach((arc, index) => {
    const item = document.createElement("li")
    item.className = arc.unlocked ? "arc-node-item is-unlocked" : "arc-node-item is-dormant"
    item.dataset.endpoint = String(index + 1)

    const button = document.createElement("button")
    button.className = arc.unlocked ? "arc-button" : "arc-button is-locked"
    button.type = "button"
    button.dataset.arcId = arc.id
    button.dataset.subject = arc.subject
    button.setAttribute("aria-label", arc.ariaLabel)
    button.setAttribute("aria-disabled", String(!arc.unlocked))

    const icon = document.createElement("span")
    icon.className = "arc-icon"
    icon.setAttribute("aria-hidden", "true")

    if (arc.svg) {
      icon.innerHTML = arc.svg.trim()
      icon.querySelector("svg")?.setAttribute("focusable", "false")
    } else {
      icon.textContent = arc.subject === "monkey" ? "🐒" : arc.fallbackSymbol
    }

    button.append(icon)
    button.addEventListener("click", () => {
      if (!arc.unlocked) {
        button.dataset.inactiveTap = "true"
        window.setTimeout(() => {
          delete button.dataset.inactiveTap
        }, 420)
        return
      }

      arcList.dataset.selecting = arc.subject
      button.dataset.selected = "true"
      window.setTimeout(
        () => {
          onArcSelected(arc, button)
          delete arcList.dataset.selecting
          delete button.dataset.selected
        },
        selectionDelay ?? (prefersReducedMotion() ? 20 : 520)
      )
    })

    item.append(button)
    arcList.append(item)
  })
}

export function renderStoryPods(options: {
  storyPodBed: HTMLElement
  stories: Story[]
  completedStoryIds: Set<string>
  activeArc?: MeaningArc
  onStorySelected: (story: Story) => void
}): void {
  const { storyPodBed, stories, completedStoryIds, activeArc, onStorySelected } = options
  stories.forEach((story, index) => {
    const button = document.createElement("button")
    button.className = `story-pod ${index === 0 ? "is-current" : "is-future"}${completedStoryIds.has(story.id) ? " is-complete" : ""}`
    button.type = "button"
    button.setAttribute("role", "listitem")
    button.setAttribute("aria-label", story.title)
    button.dataset.storyIndex = String(index + 1)

    const symbols = document.createElement("span")
    symbols.className = "story-symbols"
    symbols.setAttribute("aria-hidden", "true")

    const sceneSignature = getStorySignature(story).filter((concept) => concept !== activeArc?.subject).slice(0, 3)
    const symbolsToRender = sceneSignature.length ? sceneSignature : getStorySignature(story).slice(1, 4)

    symbolsToRender.forEach((concept) => {
      const symbol = document.createElement("span")
      symbol.className = "story-symbol"
      symbol.textContent = conceptIcons[concept] ?? "○"
      symbols.append(symbol)
    })

    const progress = document.createElement("span")
    progress.className = "story-progress"
    progress.setAttribute("aria-hidden", "true")
    progress.append(document.createElement("span"))

    button.append(symbols, progress)
    button.addEventListener("click", () => {
      onStorySelected(story)
    })

    storyPodBed.append(button)
  })
}

export function getPreviewMoments(story: Story, selectedLanguage: SupportedLanguage): PreviewMoment[] {
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
      audio: audio
        ? selectedLanguage === "en"
          ? `/engine/vocab/en/audio/natural/${audio}`
          : `engine/vocab/${selectedLanguage}/audio/${audio}`
        : undefined
    }
  })
}

export function getPrimerItems(story: Story, selectedLanguage: SupportedLanguage): PrimerItem[] {
  if (story.primerItems?.length) return story.primerItems.slice(0, 5)

  const moments = getPreviewMoments(story, selectedLanguage)
  const concepts = [
    ...(story.visualSignature ?? []),
    ...story.coreConcepts,
    ...defaultSignature
  ].filter(Boolean)
  const audioFiles = getPrimerAudioFiles(selectedLanguage)

  return moments.slice(0, 5).map((moment, index) => {
    const id = concepts[index % concepts.length] ?? moment.id
    const wholeAudio = moment.audio ?? audioFiles[index % audioFiles.length] ?? (selectedLanguage === "en" ? undefined : fallbackPrimerAudio)
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

export function resolveStoryAsset(path: string | undefined, base = ""): string {
  if (!path) return ""
  if (/^(https?:|data:|blob:|\/|engine\/|stories\/|assets\/)/.test(path)) return path
  return `${base}${path}`
}

export function getStoryScenes(story: Story, selectedLanguage: SupportedLanguage, storyAudioBase = ""): StoryScene[] {
  const providedScenes = story.scenes?.filter((scene) => scene.image || scene.audio || scene.start !== undefined)
  const sourceScenes: StoryScene[] = providedScenes?.length
    ? providedScenes
    : [
        ...getPrimerItems(story, selectedLanguage).map((item) => ({
          id: item.id,
          image: item.image,
          audio: item.wholeAudio
        })),
        ...universalImages.map((image, index) => ({
          id: `fallback-scene-${index + 1}`,
          image: `engine/universal/images/${image}`
        }))
      ] satisfies StoryScene[]

  const maxScenes = providedScenes?.length ? providedScenes.length : 5

  return sourceScenes.slice(0, maxScenes).map((scene, index) => {
    const start = scene.start ?? index * 3.8
    const end = scene.end ?? start + 3.8

    return {
      id: scene.id || `scene-${index + 1}`,
      image: scene.image ? resolveStoryAsset(scene.image, storyAudioBase) : `engine/universal/images/${universalImages[index % universalImages.length]}`,
      audio: scene.audio ? resolveStoryAsset(scene.audio, storyAudioBase) : undefined,
      audioPieces: scene.audioPieces?.map((piece) => resolveStoryAsset(piece, storyAudioBase)),
      start,
      end
    }
  })
}

function getRecallPattern(item: PrimerItem, fallbackIndex: number): number[] {
  const phonemeCount = Math.max(2, item.phonemes?.length ?? 2 + (fallbackIndex % 3))
  return Array.from({ length: Math.min(5, phonemeCount) }, (_, index) => (index % 2 === 0 ? 1 : 0.64))
}

export function getRecallPrompts(
  story: Story,
  selectedLanguage: SupportedLanguage,
  storyAudioBase = ""
): RecallPrompt[] {
  const primerItems = getPrimerItems(story, selectedLanguage).slice(0, 4)
  const scenes = getStoryScenes(story, selectedLanguage, storyAudioBase)
  const items = primerItems.length ? primerItems : scenes.map((scene) => ({ id: scene.id, image: scene.image, wholeAudio: scene.audio }))
  const first = items[0]
  const second = items[1] ?? items[0]
  const third = items[2] ?? items[0]
  const recallItems = items.slice(0, 4)
  if (!first || !second || !third) return []
  const beginnerItems = recallItems.slice(0, 2)
  let imageAudioItems = [third, first].filter(
    (item, index, itemList) => itemList.findIndex((candidate) => candidate.id === item.id) === index
  )
  if (imageAudioItems.length < 2 && second.id !== imageAudioItems[0]?.id) imageAudioItems = [...imageAudioItems, second]

  const meaningChoices = beginnerItems.map((item) => ({
    kind: "meaning" as const,
    id: item.id,
    image: item.image,
    symbol: conceptIcons[item.id],
    audio: item.wholeAudio
  }))

  const perceptionChoices = beginnerItems.map((item, index) => ({
    kind: "perception" as const,
    id: item.id,
    pattern: getRecallPattern(item, index),
    audio: item.wholeAudio,
    symbol: conceptIcons[item.id]
  }))

  const audioChoices = imageAudioItems.map((item) => ({
    kind: "audio" as const,
    id: item.id,
    audio: item.wholeAudio,
    symbol: conceptIcons[item.id]
  }))

  return [
    {
      id: `${first.id}-hear-shape`,
      family: "perception",
      mode: "audio-audio",
      prompt: { kind: "audio", audio: first.wholeAudio },
      audio: first.wholeAudio,
      choices: perceptionChoices,
      correctIndex: 0
    },
    {
      id: `${second.id}-meaning`,
      family: "meaning",
      mode: "audio-image",
      prompt: { kind: "audio", audio: second.wholeAudio },
      audio: second.wholeAudio,
      choices: meaningChoices,
      correctIndex: Math.min(1, meaningChoices.length - 1)
    },
    {
      id: `${third.id}-image-sound`,
      family: "perception",
      mode: "image-audio",
      prompt: { kind: "image", image: third.image, symbol: conceptIcons[third.id] },
      image: third.image,
      symbol: conceptIcons[third.id],
      choices: audioChoices,
      correctIndex: 0
    },
    {
      id: `${first.id}-meaning-return`,
      family: "meaning",
      mode: "audio-image",
      prompt: { kind: "audio", audio: first.wholeAudio },
      audio: first.wholeAudio,
      choices: [...meaningChoices].reverse(),
      correctIndex: Math.max(0, meaningChoices.length - 1)
    }
  ]
}
