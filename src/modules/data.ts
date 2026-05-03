import type { LearningData, PhonemeFile, SoundItem, Story, StoryFile, VocabEntry, VocabItem } from "./types"

export const lang = "zh"

export const paths = {
  vocab: `engine/vocab/${lang}/labels.json`,
  vocabAudio: `engine/vocab/${lang}/audio/`,
  images: "engine/universal/images/",
  phonemes: `engine/speech/${lang}/generic/phonemes/phonemes.json`,
  phonemeAudio: `engine/speech/${lang}/generic/phonemes/`,
  story: "stories/public/stories/langs/zh/lvl_0/stories.json",
  storyAudio: "stories/public/stories/langs/zh/lvl_0/"
} as const

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Unable to load ${path}`)
  return (await response.json()) as T
}

function flattenVocab(file: Record<string, VocabEntry>): VocabItem[] {
  return Object.entries(file).map(([id, entry]) => ({ id, ...entry }))
}

function flattenSounds(file: PhonemeFile): SoundItem[] {
  return Object.entries(file).flatMap(([category, entries]) =>
    Object.entries(entries).map(([id, entry]) => ({
      id,
      category: category as SoundItem["category"],
      ...entry
    }))
  )
}

function normalizeStories(file: StoryFile): Story[] {
  return Array.isArray(file[0]) ? (file[0] as Story[]) : (file as Story[])
}

export async function loadLearningData(): Promise<LearningData> {
  const [vocabFile, phonemeFile, storyFile] = await Promise.all([
    loadJson<Record<string, VocabEntry>>(paths.vocab),
    loadJson<PhonemeFile>(paths.phonemes),
    loadJson<StoryFile>(paths.story)
  ])

  return {
    vocab: flattenVocab(vocabFile),
    sounds: flattenSounds(phonemeFile),
    stories: normalizeStories(storyFile)
  }
}
