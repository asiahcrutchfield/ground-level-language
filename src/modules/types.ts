export type Mode = "vocab" | "ear" | "story" | "replay"

export type Surface = "landing" | "home" | "experience"

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

export type Story = {
  id: string
  title: string
  arc: string
  perspective: string
  coreConcepts: string[]
  lines: string[]
  audio: string
}

export type StoryFile = Story[] | Story[][]

export type LearningData = {
  vocab: VocabItem[]
  sounds: SoundItem[]
  stories: Story[]
}
