import catArcSvgMarkup from "../../assets/symbols/arc_screen/cat.html?raw"
import meaningTreeSvgMarkup from "../../assets/symbols/path_screen/meaning_tree.html?raw"
import soundGardenSvgMarkup from "../../assets/symbols/path_screen/sound_garden.html?raw"
import seedSvgMarkup from "../../assets/symbols/start_page/start.html?raw"
import { getInitialLanguage, languageOptions, loadLearningData, saveLanguage } from "./data"
import { clearNode, mustQuery } from "./dom"
import type { Story, SupportedLanguage } from "./types"

type Surface = "start" | "language" | "path" | "meaningArc" | "storyBranch" | "meaningPreview"
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
  const previewSymbols = [
    mustQuery<HTMLElement>("#preview-symbol-a"),
    mustQuery<HTMLElement>("#preview-symbol-b"),
    mustQuery<HTMLElement>("#preview-symbol-c")
  ]
  const previewAudio = new Audio()

  let surface: Surface = "start"
  let hasBegun = false
  let previewRun = 0
  let activePreview: SupportedLanguage | null = null
  let selectedLanguage = getInitialLanguage()
  let selectedPath: PathId | null = null
  let selectedArcId: string | null = null
  let selectedStoryId: string | null = null
  let allStories: Story[] = []
  const languageSeeds: LanguageSeed[] = languageOptions.map((language) => ({
    code: language.code,
    state: "idle"
  }))

  function setSurface(nextSurface: Surface): void {
    surface = nextSurface
    startScreen.hidden = surface !== "start"
    languageScreen.hidden = surface !== "language"
    pathScreen.hidden = surface !== "path"
    meaningArcScreen.hidden = surface !== "meaningArc"
    storyBranchScreen.hidden = surface !== "storyBranch"
    meaningPreviewScreen.hidden = surface !== "meaningPreview"
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

  function renderMeaningPreview(story: Story): void {
    getStorySignature(story).forEach((concept, index) => {
      const symbol = previewSymbols[index]
      if (!symbol) return
      symbol.textContent = conceptIcons[concept] ?? "○"
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
        renderMeaningPreview(story)
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

  startSeedArt.innerHTML = seedSvgMarkup.trim()
  startSeedArt.querySelector("svg")?.setAttribute("focusable", "false")
  meaningTreeArt.innerHTML = meaningTreeSvgMarkup.trim()
  meaningTreeArt.querySelector("svg")?.setAttribute("focusable", "false")
  soundGardenArt.innerHTML = soundGardenSvgMarkup.trim()
  soundGardenArt.querySelector("svg")?.setAttribute("focusable", "false")
  renderLanguageSeeds()
  setSurface(surface)
}
