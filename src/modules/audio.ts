// Shared audio helpers used by both lesson paths.

export function stopAudio(audio: HTMLAudioElement): void {
  audio.pause()
  audio.removeAttribute("src")
  audio.load()
}

// Adds a short visual echo class after audio or fallback sound feedback.
export function runEchoGap(element: HTMLElement, duration = 1200): void {
  element.classList.add("is-echoing")
  window.setTimeout(() => {
    element.classList.remove("is-echoing")
  }, duration)
}

// Plays the soft transition chime used when entering major garden spaces.
export function makeChime(): void {
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
