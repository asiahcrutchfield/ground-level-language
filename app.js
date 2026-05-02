const landing = document.querySelector("#landing")
const app = document.querySelector("#experience")
const visualStack = document.querySelector("#visual-stack")
const choiceGrid = document.querySelector("#choice-grid")
const pulseTrack = document.querySelector("#pulse-track")
const progressConstellation = document.querySelector("#progress-constellation")
const mainAudio = document.querySelector("#main-audio")
const choiceAudio = document.querySelector("#choice-audio")
const playButton = document.querySelector("#play-button")
const nextButton = document.querySelector("#next-button")
const backButton = document.querySelector("#back-button")
const homeButton = document.querySelector("#home-button")
const modeButtons = document.querySelectorAll(".mode-button")
const enterButtons = document.querySelectorAll("[data-enter-app]")

const lang = "zh"
const paths = {
  vocab: `engine/vocab/${lang}/labels.json`,
  vocabAudio: `engine/vocab/${lang}/audio/`,
  images: "engine/universal/images/",
  phonemes: `engine/speech/${lang}/generic/phonemes/phonemes.json`,
  phonemeAudio: `engine/speech/${lang}/generic/phonemes/`,
  story: "stories/public/stories/langs/zh/lvl_0/stories.json",
  storyAudio: "stories/public/stories/langs/zh/lvl_0/"
}

let mode = "vocab"
let vocab = []
let sounds = []
let stories = []
let currentIndex = 0
let currentAnswer = ""
let storyIndex = 0
let booted = false
let bootPromise = null

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5)
const sample = (items) => items[Math.floor(Math.random() * items.length)]

function setAudio(audio, src) {
  audio.pause()
  audio.src = src
  audio.currentTime = 0
  audio.load()
}

function safePlay(audio) {
  return audio.play().catch(() => undefined)
}

async function loadJson(path) {
  const response = await fetch(path)
  if (!response.ok) throw new Error(path)
  return response.json()
}

function flattenVocab(file) {
  return Object.entries(file).map(([id, entry]) => ({ id, ...entry }))
}

function flattenSounds(file) {
  return Object.entries(file).flatMap(([category, entries]) =>
    Object.entries(entries).map(([id, entry]) => ({ id, category, ...entry }))
  )
}

function getImage(entry) {
  return `${paths.images}${sample(entry.image).filename}`
}

function getVocabAudio(entry) {
  return `${paths.vocabAudio}${sample(entry.audio).filename}`
}

function getSoundAudio(sound) {
  return `${paths.phonemeAudio}${sound.category}/${sound.audio.default}`
}

function clearNode(node) {
  while (node.firstChild) node.firstChild.remove()
}

function setSurface(nextSurface) {
  const enteringExperience = nextSurface === "experience"
  landing.hidden = enteringExperience
  app.hidden = !enteringExperience
  document.body.classList.toggle("is-experience", enteringExperience)
  document.body.classList.toggle("is-landing", !enteringExperience)

  if (enteringExperience) {
    window.scrollTo({ top: 0 })
    boot().then(() => {
      render()
      window.setTimeout(playCurrent, 140)
    })
  } else {
    mainAudio.pause()
    choiceAudio.pause()
  }
}

function pulse(count = 5) {
  clearNode(pulseTrack)
  for (let i = 0; i < count; i += 1) {
    const dot = document.createElement("span")
    dot.style.setProperty("--delay", `${i * 90}ms`)
    pulseTrack.append(dot)
  }
}

function markFeedback(button, ok) {
  button.classList.add(ok ? "is-correct" : "is-wrong")
  app.dataset.feedback = ok ? "correct" : "wrong"
  window.setTimeout(() => {
    button.classList.remove("is-correct", "is-wrong")
    delete app.dataset.feedback
  }, 650)
}

function renderProgress() {
  clearNode(progressConstellation)
  const total = 6
  const filled = mode === "story" ? Math.min(storyIndex + 1, total) : Math.min(currentIndex + 1, total)

  for (let i = 0; i < total; i += 1) {
    const marker = document.createElement("span")
    if (i < filled) marker.className = "is-filled"
    progressConstellation.append(marker)
  }
}

function renderImage(entry, active = true) {
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

function renderVocab() {
  const item = vocab[currentIndex % vocab.length]
  currentAnswer = item.id
  clearNode(visualStack)
  clearNode(choiceGrid)
  app.dataset.mode = "vocab"

  const focus = renderImage(item)
  focus.addEventListener("click", () => playCurrent())
  visualStack.append(focus)

  const choices = shuffle([item, ...shuffle(vocab.filter((entry) => entry.id !== item.id)).slice(0, 2)])
  choices.forEach((choice) => {
    const button = renderImage(choice, false)
    button.addEventListener("click", () => {
      const ok = choice.id === currentAnswer
      markFeedback(button, ok)
      if (ok) window.setTimeout(next, 480)
      else setAudio(choiceAudio, getVocabAudio(choice))
      safePlay(choiceAudio)
    })
    choiceGrid.append(button)
  })

  setAudio(mainAudio, getVocabAudio(item))
  pulse(4)
}

function renderEar() {
  const question = sample(sounds)
  const wrong = sample(sounds.filter((sound) => sound.id !== question.id))
  currentAnswer = question.id
  clearNode(visualStack)
  clearNode(choiceGrid)
  app.dataset.mode = "ear"

  const ring = document.createElement("button")
  ring.type = "button"
  ring.className = "sound-ring is-focus"
  ring.addEventListener("click", playCurrent)
  visualStack.append(ring)

  shuffle([question, wrong]).forEach((sound) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "sound-choice"
    button.dataset.id = sound.id
    button.innerHTML = "<span></span><span></span><span></span>"
    button.addEventListener("click", () => {
      setAudio(choiceAudio, getSoundAudio(sound))
      safePlay(choiceAudio)
      const ok = sound.id === currentAnswer
      markFeedback(button, ok)
      if (ok) window.setTimeout(renderEar, 620)
    })
    choiceGrid.append(button)
  })

  setAudio(mainAudio, getSoundAudio(question))
  pulse(3)
}

function normalizeStories(file) {
  return Array.isArray(file[0]) ? file[0] : file
}

function renderStory() {
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
      safePlay(choiceAudio)
    })
    strip.append(frame)
  })
  visualStack.append(strip)

  setAudio(mainAudio, `${paths.storyAudio}${story.audio}`)
  pulse(Math.min(story.coreConcepts.length, 7))
}

function renderReplay() {
  const item = vocab[currentIndex % vocab.length]
  clearNode(visualStack)
  clearNode(choiceGrid)
  app.dataset.mode = "replay"

  const focus = renderImage(item)
  focus.addEventListener("click", replayLoop)
  visualStack.append(focus)

  const echo = document.createElement("button")
  echo.type = "button"
  echo.className = "echo-pad"
  echo.innerHTML = "<span></span><span></span><span></span>"
  echo.addEventListener("click", replayLoop)
  choiceGrid.append(echo)

  setAudio(mainAudio, getVocabAudio(item))
  pulse(6)
}

async function replayLoop() {
  await playCurrent()
  pulse(6)
  window.setTimeout(() => playCurrent(), 1300)
}

function render() {
  renderProgress()

  modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === mode)
  })

  if (mode === "ear") renderEar()
  if (mode === "vocab") renderVocab()
  if (mode === "story") renderStory()
  if (mode === "replay") renderReplay()
}

function playCurrent() {
  pulse(mode === "story" ? 7 : 4)
  mainAudio.currentTime = 0
  return safePlay(mainAudio)
}

function next() {
  if (mode === "story") storyIndex += 1
  else currentIndex = (currentIndex + 1) % vocab.length
  render()
  window.setTimeout(playCurrent, 120)
}

function back() {
  if (mode === "story") storyIndex = Math.max(0, storyIndex - 1)
  else currentIndex = (currentIndex - 1 + vocab.length) % vocab.length
  render()
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.mode
    render()
    window.setTimeout(playCurrent, 120)
  })
})

playButton.addEventListener("click", () => {
  if (mode === "replay") replayLoop()
  else playCurrent()
})
nextButton.addEventListener("click", next)
backButton.addEventListener("click", back)
homeButton.addEventListener("click", () => setSurface("landing"))
enterButtons.forEach((button) => {
  button.addEventListener("click", () => setSurface("experience"))
})

async function boot() {
  if (booted) return Promise.resolve()
  if (bootPromise) return bootPromise

  bootPromise = Promise.all([
    loadJson(paths.vocab),
    loadJson(paths.phonemes),
    loadJson(paths.story)
  ]).then(([vocabFile, phonemeFile, storyFile]) => {
    vocab = flattenVocab(vocabFile)
    sounds = flattenSounds(phonemeFile)
    stories = normalizeStories(storyFile)
    booted = true
  })

  return bootPromise
}

boot().catch(() => {
  app.classList.add("is-offline")
})
