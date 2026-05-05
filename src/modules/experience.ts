import { getInitialLanguage, languageOptions, loadLearningData, saveLanguage } from "./data"
import { clearNode, mustQuery } from "./dom"
import type { LearningData, Mode, SoundItem, SupportedLanguage, Surface, VocabItem } from "./types"

const modeSequence: Mode[] = ["vocab", "ear", "story", "replay"]

const shuffle = <T>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5)
const sample = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

function setAudio(audio: HTMLAudioElement, src: string): void {
  audio.pause()
  audio.src = src
  audio.currentTime = 0
  audio.load()
}

function safePlay(audio: HTMLAudioElement): Promise<void | undefined> {
  return audio.play().catch(() => undefined)
}

export function createExperience(): void {
  const landing = mustQuery<HTMLElement>("#landing")
  const home = mustQuery<HTMLElement>("#home")
  const app = mustQuery<HTMLElement>("#experience")
  const visualStack = mustQuery<HTMLDivElement>("#visual-stack")
  const choiceGrid = mustQuery<HTMLElement>("#choice-grid")
  const pulseTrack = mustQuery<HTMLDivElement>("#pulse-track")
  const progressConstellation = mustQuery<HTMLDivElement>("#progress-constellation")
  const languageGrid = mustQuery<HTMLDivElement>("#language-grid")
  const mainAudio = mustQuery<HTMLAudioElement>("#main-audio")
  const choiceAudio = mustQuery<HTMLAudioElement>("#choice-audio")
  const playButton = mustQuery<HTMLButtonElement>("#play-button")
  const nextButton = mustQuery<HTMLButtonElement>("#next-button")
  const backButton = mustQuery<HTMLButtonElement>("#back-button")
  const homeButton = mustQuery<HTMLButtonElement>("#home-button")
  const modeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".mode-button"))
  const openHomeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-open-home]"))
  const openLandingButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-open-landing]"))
  const startModeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-start-mode]"))

  let selectedLanguage = getInitialLanguage()
  let mode: Mode = "vocab"
  let currentIndex = 0
  let currentAnswer = ""
  let storyIndex = 0
  let learningData: LearningData | null = null
  const dataCache = new Map<SupportedLanguage, Promise<LearningData>>()

  document.documentElement.dataset.learningLang = selectedLanguage

  function data(): LearningData {
    if (!learningData) throw new Error("Learning data has not loaded")
    return learningData
  }

  function boot(): Promise<LearningData> {
    if (learningData?.lang === selectedLanguage) return Promise.resolve(learningData)

    let bootPromise = dataCache.get(selectedLanguage)
    if (!bootPromise) {
      bootPromise = loadLearningData(selectedLanguage)
      dataCache.set(selectedLanguage, bootPromise)
    }

    return bootPromise.then((loaded) => {
      if (loaded.lang === selectedLanguage) learningData = loaded
      return loaded
    })
  }

  function setSurface(nextSurface: Surface): void {
    const enteringExperience = nextSurface === "experience"
    landing.hidden = nextSurface !== "landing"
    home.hidden = nextSurface !== "home"
    app.hidden = !enteringExperience
    document.body.classList.toggle("is-experience", enteringExperience)
    document.body.classList.toggle("is-landing", nextSurface === "landing")
    document.body.classList.toggle("is-home", nextSurface === "home")

    if (enteringExperience) {
      window.scrollTo({ top: 0 })
      boot()
        .then(() => {
          render()
          window.setTimeout(playCurrent, 140)
        })
        .catch(() => {
          app.classList.add("is-offline")
        })
    } else {
      mainAudio.pause()
      choiceAudio.pause()
      window.scrollTo({ top: 0 })
    }
  }

  function enterMode(nextMode: Mode): void {
    mode = nextMode
    setSurface("experience")
  }

  function renderLanguageOptions(): void {
    clearNode(languageGrid)

    languageOptions.forEach((option) => {
      const button = document.createElement("button")
      button.type = "button"
      button.className = "language-card"
      button.dataset.language = option.code
      button.setAttribute("role", "radio")
      button.setAttribute("aria-checked", String(option.code === selectedLanguage))

      const nativeName = document.createElement("strong")
      nativeName.textContent = option.nativeName

      const name = document.createElement("span")
      name.textContent = option.name

      button.append(nativeName, name)
      button.addEventListener("click", () => {
        selectLanguage(option.code)
      })

      languageGrid.append(button)
    })
  }

  function resetPractice(): void {
    currentIndex = 0
    storyIndex = 0
    currentAnswer = ""
    learningData = null
    mainAudio.removeAttribute("src")
    choiceAudio.removeAttribute("src")
    mainAudio.load()
    choiceAudio.load()
    clearNode(visualStack)
    clearNode(choiceGrid)
    clearNode(progressConstellation)
    clearNode(pulseTrack)
    app.classList.remove("is-offline")
  }

  function selectLanguage(nextLanguage: SupportedLanguage): void {
    if (nextLanguage === selectedLanguage) return

    selectedLanguage = nextLanguage
    document.documentElement.dataset.learningLang = selectedLanguage
    saveLanguage(selectedLanguage)
    resetPractice()
    renderLanguageOptions()

    if (!app.hidden) {
      boot()
        .then(() => {
          render()
          window.setTimeout(playCurrent, 140)
        })
        .catch(() => {
          app.classList.add("is-offline")
        })
    }
  }

  function pulse(count = 5): void {
    clearNode(pulseTrack)
    for (let i = 0; i < count; i += 1) {
      const dot = document.createElement("span")
      dot.style.setProperty("--delay", `${i * 90}ms`)
      pulseTrack.append(dot)
    }
  }

  function markFeedback(button: HTMLElement, ok: boolean): void {
    button.classList.add(ok ? "is-correct" : "is-wrong")
    app.dataset.feedback = ok ? "correct" : "wrong"

    window.setTimeout(() => {
      button.classList.remove("is-correct", "is-wrong")
      delete app.dataset.feedback
    }, 650)
  }

  function renderProgress(): void {
    clearNode(progressConstellation)
    const total = 6
    const filled = mode === "story" ? Math.min(storyIndex + 1, total) : Math.min(currentIndex + 1, total)

    for (let i = 0; i < total; i += 1) {
      const marker = document.createElement("span")
      if (i < filled) marker.className = "is-filled"
      progressConstellation.append(marker)
    }
  }

  function getImage(entry: VocabItem): string {
    return `${data().paths.images}${sample(entry.image).filename}`
  }

  function getVocabAudio(entry: VocabItem): string {
    return `${data().paths.vocabAudio}${sample(entry.audio).filename}`
  }

  function getSoundAudio(sound: SoundItem): string {
    return `${data().paths.phonemeAudio}${sound.category}/${sound.audio.default}`
  }

  function renderImage(entry: VocabItem, active = true): HTMLButtonElement {
    const figure = document.createElement("button")
    figure.type = "button"
    figure.className = active ? "image-tile is-focus" : "image-tile"
    figure.dataset.id = entry.id

    const img = document.createElement("img")
    img.src = getImage(entry)
    img.alt = ""
    img.decoding = "async"
    figure.append(img)

    return figure
  }

  function renderVocab(): void {
    const { vocab } = data()
    const item = vocab[currentIndex % vocab.length]
    currentAnswer = item.id
    clearNode(visualStack)
    clearNode(choiceGrid)
    app.dataset.mode = "vocab"

    const focus = renderImage(item)
    focus.addEventListener("click", () => {
      void playCurrent()
    })
    visualStack.append(focus)

    const choices = shuffle([item, ...shuffle(vocab.filter((entry) => entry.id !== item.id)).slice(0, 2)])
    choices.forEach((choice) => {
      const button = renderImage(choice, false)
      button.addEventListener("click", () => {
        const ok = choice.id === currentAnswer
        markFeedback(button, ok)
        if (ok) window.setTimeout(next, 480)
        else setAudio(choiceAudio, getVocabAudio(choice))
        void safePlay(choiceAudio)
      })
      choiceGrid.append(button)
    })

    setAudio(mainAudio, getVocabAudio(item))
    pulse(4)
  }

  function renderEar(): void {
    const { sounds } = data()
    const question = sample(sounds)
    const wrong = sample(sounds.filter((sound) => sound.id !== question.id))
    currentAnswer = question.id
    clearNode(visualStack)
    clearNode(choiceGrid)
    app.dataset.mode = "ear"

    const ring = document.createElement("button")
    ring.type = "button"
    ring.className = "sound-ring is-focus"
    ring.addEventListener("click", () => {
      void playCurrent()
    })
    visualStack.append(ring)

    shuffle([question, wrong]).forEach((sound) => {
      const button = document.createElement("button")
      button.type = "button"
      button.className = "sound-choice"
      button.dataset.id = sound.id
      button.append(document.createElement("span"), document.createElement("span"), document.createElement("span"))
      button.addEventListener("click", () => {
        setAudio(choiceAudio, getSoundAudio(sound))
        void safePlay(choiceAudio)
        const ok = sound.id === currentAnswer
        markFeedback(button, ok)
        if (ok) window.setTimeout(renderEar, 620)
      })
      choiceGrid.append(button)
    })

    setAudio(mainAudio, getSoundAudio(question))
    pulse(3)
  }

  function renderStory(): void {
    const { stories, storyAudio, vocab } = data()
    const available = stories.filter((story) => story.coreConcepts.length)
    const story = available[storyIndex % available.length]
    clearNode(visualStack)
    clearNode(choiceGrid)
    app.dataset.mode = "story"

    const strip = document.createElement("div")
    strip.className = "story-strip"
    story.coreConcepts.forEach((id, index) => {
      const entry = vocab.find((item) => item.id === id)
      if (!entry) return

      const frame = renderImage(entry, index === 0)
      frame.addEventListener("click", () => {
        setAudio(choiceAudio, getVocabAudio(entry))
        void safePlay(choiceAudio)
      })
      strip.append(frame)
    })
    visualStack.append(strip)

    setAudio(mainAudio, `${storyAudio}${story.audio}`)
    pulse(Math.min(story.coreConcepts.length, 7))
  }

  function renderReplay(): void {
    const { vocab } = data()
    const item = vocab[currentIndex % vocab.length]
    clearNode(visualStack)
    clearNode(choiceGrid)
    app.dataset.mode = "replay"

    const focus = renderImage(item)
    focus.addEventListener("click", () => {
      void replayLoop()
    })
    visualStack.append(focus)

    const echo = document.createElement("button")
    echo.type = "button"
    echo.className = "echo-pad"
    echo.append(document.createElement("span"), document.createElement("span"), document.createElement("span"))
    echo.addEventListener("click", () => {
      void replayLoop()
    })
    choiceGrid.append(echo)

    setAudio(mainAudio, getVocabAudio(item))
    pulse(6)
  }

  async function replayLoop(): Promise<void> {
    await playCurrent()
    pulse(6)
    window.setTimeout(() => {
      void playCurrent()
    }, 1300)
  }

  function render(): void {
    renderProgress()
    modeButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.mode === mode)
    })

    if (mode === "ear") renderEar()
    if (mode === "vocab") renderVocab()
    if (mode === "story") renderStory()
    if (mode === "replay") renderReplay()
  }

  function playCurrent(): Promise<void | undefined> {
    pulse(mode === "story" ? 7 : 4)
    mainAudio.currentTime = 0
    return safePlay(mainAudio)
  }

  function next(): void {
    if (mode === "story") storyIndex += 1
    else currentIndex = (currentIndex + 1) % data().vocab.length
    render()
    window.setTimeout(() => {
      void playCurrent()
    }, 120)
  }

  function back(): void {
    if (mode === "story") storyIndex = Math.max(0, storyIndex - 1)
    else currentIndex = (currentIndex - 1 + data().vocab.length) % data().vocab.length
    render()
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.mode
      if (!modeSequence.includes(nextMode as Mode)) return
      mode = nextMode as Mode
      render()
      window.setTimeout(() => {
        void playCurrent()
      }, 120)
    })
  })

  playButton.addEventListener("click", () => {
    if (mode === "replay") void replayLoop()
    else void playCurrent()
  })
  nextButton.addEventListener("click", next)
  backButton.addEventListener("click", back)
  homeButton.addEventListener("click", () => setSurface("home"))
  openHomeButtons.forEach((button) => {
    button.addEventListener("click", () => setSurface("home"))
  })
  openLandingButtons.forEach((button) => {
    button.addEventListener("click", () => setSurface("landing"))
  })
  startModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.startMode
      if (!modeSequence.includes(nextMode as Mode)) return
      enterMode(nextMode as Mode)
    })
  })

  renderLanguageOptions()
  boot().catch(() => {
    app.classList.add("is-offline")
  })
}
