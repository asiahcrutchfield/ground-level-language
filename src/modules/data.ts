import type {
  LanguageOption,
  LearningData,
  LearningPaths,
  PhonemeFile,
  SoundItem,
  Story,
  StoryFile,
  SupportedLanguage,
  VocabEntry,
  VocabItem
} from "./types"

export const supportedLanguages = ["en", "nan", "zh"] as const

export const languageOptions: readonly LanguageOption[] = [
  { code: "zh", name: "Mandarin", nativeName: "中文" },
  { code: "nan", name: "Taiwanese", nativeName: "台語" },
  { code: "en", name: "English", nativeName: "English" }
]

export const languageStorageKey = "ground-level-language"

export function normalizeLanguage(value: string | null | undefined): SupportedLanguage {
  const code = value?.toLowerCase().split("-")[0]
  return supportedLanguages.includes(code as SupportedLanguage) ? (code as SupportedLanguage) : "zh"
}

export function getInitialLanguage(): SupportedLanguage {
  try {
    const savedLanguage = window.localStorage.getItem(languageStorageKey)
    if (savedLanguage) return normalizeLanguage(savedLanguage)
  } catch {
    // Storage can be unavailable in private or embedded browser contexts.
  }

  return normalizeLanguage(document.documentElement.dataset.learningLang)
}

export function saveLanguage(lang: SupportedLanguage): void {
  try {
    window.localStorage.setItem(languageStorageKey, lang)
  } catch {
    // The in-memory selection still works when persistence is unavailable.
  }
}

export function getLearningPaths(lang: SupportedLanguage): LearningPaths {
  return {
    vocab: `engine/vocab/${lang}/labels.json`,
    vocabAudio: `engine/vocab/${lang}/audio/`,
    images: "engine/universal/images/",
    phonemes: `engine/speech/${lang}/generic/phonemes/phonemes.json`,
    phonemeAudio: `engine/speech/${lang}/generic/phonemes/`,
    stories: [`stories/langs/${lang}/stories.json`, `stories/langs/${lang}/lvl_0/stories.json`]
  }
}

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) throw new Error(`Unable to load ${path}`)
  return (await response.json()) as T
}

async function loadFirstJson<T>(candidatePaths: readonly string[]): Promise<{ file: T; path: string }> {
  const errors: Error[] = []

  for (const path of candidatePaths) {
    try {
      return { file: await loadJson<T>(path), path }
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)))
    }
  }

  throw new Error(errors.map((error) => error.message).join("; "))
}

function dirname(path: string): string {
  return path.slice(0, path.lastIndexOf("/") + 1)
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

export async function loadLearningData(lang: SupportedLanguage): Promise<LearningData> {
  const paths = getLearningPaths(lang)
  const [vocabFile, phonemeFile, storyResult] = await Promise.all([
    loadJson<Record<string, VocabEntry>>(paths.vocab),
    loadJson<PhonemeFile>(paths.phonemes),
    loadFirstJson<StoryFile>(paths.stories)
  ])

  return {
    lang,
    paths,
    vocab: flattenVocab(vocabFile),
    sounds: flattenSounds(phonemeFile),
    stories: normalizeStories(storyResult.file),
    storyAudio: dirname(storyResult.path)
  }
}
