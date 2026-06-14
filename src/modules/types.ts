// Shared data contracts for content loaded from public/engine and rendered in the app.

export type Mode = "vocab" | "ear" | "story" | "replay"

export type Surface = "landing" | "home" | "experience"

export type SupportedLanguage = "en" | "nan" | "zh"

export type LanguageOption = {
  code: SupportedLanguage
  name: string
  nativeName: string
}

export type LearningPaths = {
  vocab: string
  vocabAudio: string
  images: string
  phonemes: string
  phonemeAudio: string
  storyMeta: string
  storyLines: string
}

// Vocabulary entries describe a meaning, its visual assets, and playable audio.
export type VocabImage = {
  filename: string
  type: string
}

export type VocabAudio = {
  filename: string
  gender: string
}

export type VocabEntry = {
  vocab: string
  image: VocabImage[]
  audio: VocabAudio[]
  syllables: number
  phonemes: string[]
  syllablePattern?: string
  syllabicPattern?: string
  rhythmPattern: string
  tonePattern?: string
}

export type VocabItem = VocabEntry & {
  id: string
}

export type SoundEntry = {
  ipa: string
  transcription: {
    pinyin: string
    zhuyin: string
  }
  audio: {
    default: string
  }
}

export type SoundItem = SoundEntry & {
  id: string
  category: "vowels" | "consonants"
}

export type PhonemeFile = Record<"vowels" | "consonants", Record<string, SoundEntry>>

// Story records are the normalized shape used by the Meaning Tree lesson flow.
export type Story = {
  id: string
  title: string
  arcId?: string
  arc: string
  perspective: string
  coreConcepts: string[]
  visualSignature?: string[]
  previewMoments?: PreviewMoment[]
  primerItems?: PrimerItem[]
  scenes?: StoryScene[]
  lines: string[]
  audio: string
}

// Preview, primer, and scene types feed the staged lesson sections.
export type PreviewMoment = {
  id: string
  image?: string
  audio?: string
  symbol?: string
}

export type SoundPiece = {
  id: string
  audio?: string
  shape?: string
}

export type PrimerItem = {
  id: string
  image?: string
  wholeAudio?: string
  phonemes?: SoundPiece[]
  syllables?: SoundPiece[]
  toneOrPitch?: SoundPiece[]
  features?: SoundPiece[]
}

export type StoryScene = {
  id: string
  image?: string
  audio?: string
  start?: number
  end?: number
}

export type StoryFile = Story[] | Story[][]

export type LearningData = {
  lang: SupportedLanguage
  paths: LearningPaths
  vocab: VocabItem[]
  sounds: SoundItem[]
  stories: Story[]
  storyAudio: string
}
