import catArcSvgMarkup from "../../assets/symbols/arc_screen/cat.html?raw"
import meaningTreeSvgMarkup from "../../assets/symbols/path_screen/meaning_tree.html?raw"
import soundGardenSvgMarkup from "../../assets/symbols/path_screen/sound_garden.html?raw"
import seedSvgMarkup from "../../assets/symbols/start_page/start.html?raw"
import { getInitialLanguage, languageOptions, loadLearningData, saveLanguage } from "./data"
import { clearNode, mustQuery } from "./dom"
import type { PreviewMoment, PrimerItem, SoundPiece, Story, SupportedLanguage } from "./types"

type Surface = "start" | "language" | "path" | "meaningArc" | "storyBranch" | "meaningPreview" | "primer" | "story"
type SeedState = "idle" | "previewing" | "revealed" | "selected"
type PathId = "meaning-tree" | "sound-garden"

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

function createSeedSvg(): HTMLElement {
  const wrapper = document.createElement("span")
  wrapper.className = "language-seed-art"
  wrapper.innerHTML = seedSvgMarkup.trim()
  wrapper.querySelector("svg")?.setAttribute("focusable", "false")
  return wrapper
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
  const languageSeedbed = mustQuery<HTMLElement>("#language-seedbed")
  const arcList = mustQuery<HTMLUListElement>("#arc-list")
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
  const storyScreen = mustQuery<HTMLElement>("#story-screen")
  const previewAudio = new Audio()
  const previewMomentAudio = new Audio()
  const primerAudio = new Audio()
  const primerBackdrop = document.createElement("button")

  let surface: Surface = "start"
  let hasBegun = false
  let previewRun = 0
  let activePreview: SupportedLanguage | null = null
  let selectedLanguage = getInitialLanguage()
  let selectedPath: PathId | null = null
  let selectedArcId: string | null = null
  let selectedStoryId: string | null = null
  let expandedPrimerCard: HTMLElement | null = null
  let allStories: Story[] = []
  const languageSeeds: LanguageSeed[] = languageOptions.map((language) => ({
    code: language.code,
    state: "idle"
  }))

  function setSurface(nextSurface: Surface): void {
    if (surface === "meaningPreview" && nextSurface !== "meaningPreview") stopPreviewMomentAudio()
    surface = nextSurface
    startScreen.hidden = surface !== "start"
    languageScreen.hidden = surface !== "language"
    pathScreen.hidden = surface !== "path"
    meaningArcScreen.hidden = surface !== "meaningArc"
    storyBranchScreen.hidden = surface !== "storyBranch"
    meaningPreviewScreen.hidden = surface !== "meaningPreview"
    primerScreen.hidden = surface !== "primer"
    storyScreen.hidden = surface !== "story"
    app.dataset.surface = surface
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

  function openMeaningArcs(): void {
    selectedPath = "meaning-tree"
    selectedArcId = null
    selectedStoryId = null
    clearNode(arcList)
    clearNode(storyPodBed)

    loadLearningData(selectedLanguage)
      .then((data) => {
        allStories = data.stories
        renderArcButtons()
        setSurface("meaningArc")
      })
      .catch(() => {
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
      button.append(createSeedSvg())
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
    setSurface("story")
  })

  primerBackdrop.className = "primer-backdrop"
  primerBackdrop.type = "button"
  primerBackdrop.hidden = true
  primerBackdrop.setAttribute("aria-label", "Collapse primer card")
  primerBackdrop.addEventListener("click", collapsePrimerCard)
  primerScreen.append(primerBackdrop)

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && surface === "primer") collapsePrimerCard()
  })

  startSeedArt.innerHTML = seedSvgMarkup.trim()
  startSeedArt.querySelector("svg")?.setAttribute("focusable", "false")
  meaningTreeArt.innerHTML = meaningTreeSvgMarkup.trim()
  meaningTreeArt.querySelector("svg")?.setAttribute("focusable", "false")
  soundGardenArt.innerHTML = soundGardenSvgMarkup.trim()
  soundGardenArt.querySelector("svg")?.setAttribute("focusable", "false")
  renderLanguageSeeds()
  setSurface(surface)
}
