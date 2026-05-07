import seedSvgMarkup from "../../assets/symbols/start_page/start.html?raw"
import meaningTreeSvgMarkup from "../../assets/symbols/path_screen/meaning_tree.html?raw"
import soundGardenSvgMarkup from "../../assets/symbols/path_screen/sound_garden.html?raw"
import { languageOptions, saveLanguage } from "./data"
import { clearNode, mustQuery } from "./dom"
import type { SupportedLanguage } from "./types"

type Surface = "start" | "language" | "path"
type SeedState = "idle" | "previewing" | "revealed" | "selected"

type LanguageSeed = {
  code: SupportedLanguage
  state: SeedState
}

const previewPath = (code: SupportedLanguage): string => `engine/speech/${code}/preview.mp3`

const getDisplayName = (code: SupportedLanguage): string => {
  const option = languageOptions.find((language) => language.code === code)
  if (!option) return code
  return option.nativeName === option.name ? option.nativeName : `${option.nativeName} (${option.name})`
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
  const seedButton = mustQuery<HTMLButtonElement>("#seed-button")
  const startSeedArt = mustQuery<HTMLElement>("#start-seed-art")
  const meaningTreeArt = mustQuery<HTMLElement>("#meaning-tree-art")
  const soundGardenArt = mustQuery<HTMLElement>("#sound-garden-art")
  const languageSeedbed = mustQuery<HTMLElement>("#language-seedbed")
  const previewAudio = new Audio()

  let surface: Surface = "start"
  let hasBegun = false
  let previewRun = 0
  let activePreview: SupportedLanguage | null = null
  const languageSeeds: LanguageSeed[] = languageOptions.map((language) => ({
    code: language.code,
    state: "idle"
  }))

  function setSurface(nextSurface: Surface): void {
    surface = nextSurface
    startScreen.hidden = surface !== "start"
    languageScreen.hidden = surface !== "language"
    pathScreen.hidden = surface !== "path"
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
    setLanguageState(code, "selected")
    saveLanguage(code)
    document.documentElement.dataset.learningLang = code
    renderLanguageSeeds()

    window.setTimeout(() => {
      setSurface("path")
    }, 360)
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

  startSeedArt.innerHTML = seedSvgMarkup.trim()
  startSeedArt.querySelector("svg")?.setAttribute("focusable", "false")
  meaningTreeArt.innerHTML = meaningTreeSvgMarkup.trim()
  meaningTreeArt.querySelector("svg")?.setAttribute("focusable", "false")
  soundGardenArt.innerHTML = soundGardenSvgMarkup.trim()
  soundGardenArt.querySelector("svg")?.setAttribute("focusable", "false")
  renderLanguageSeeds()
  setSurface(surface)
}
