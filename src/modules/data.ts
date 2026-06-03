import type {
  LanguageOption,
  LearningData,
  LearningPaths,
  PhonemeFile,
  SoundItem,
  Story,
  SupportedLanguage,
  VocabEntry,
  VocabItem
} from "./types"

export const supportedLanguages = ["en", "zh"] as const

export const languageOptions: readonly LanguageOption[] = [
  { code: "zh", name: "Mandarin", nativeName: "中文" },
  { code: "en", name: "English", nativeName: "English" }
]

export const languageStorageKey = "ground-level-language"

export function normalizeLanguage(value: string | null | undefined): SupportedLanguage {
  const code = value?.toLowerCase().split("-")[0]
  return code && (supportedLanguages as readonly string[]).includes(code) ? (code as SupportedLanguage) : "zh"
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
    vocabAudio: `engine/vocab/${lang}/natural/`,
    images: "engine/universal/images/",
    phonemes: `engine/phonetics/${lang}/phonemes/phonemes.json`,
    phonemeAudio: `engine/phonetics/${lang}/phonemes/`,
    storyMeta: "engine/stories/s0-001/meta.json",
    storyLines: `engine/stories/s0-001/lines/lines.${lang}.json`
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

type ContentVocabEntry = Omit<Partial<VocabEntry>, "audio" | "image"> & {
  audio?: {
    natural?: string
    slow?: string
  } | VocabEntry["audio"]
  images?: VocabEntry["image"]
  image?: VocabEntry["image"]
  vocab: string
}

type ContentStoryMeta = {
  id: string
  title: Partial<Record<SupportedLanguage, string>> | string
  arcId?: string
  arc: string
  perspective: string
  coreConcepts: string[]
  visualSignature?: string[]
  audio?: {
    natural?: string
    slow?: string
  } | string
  imageOrder?: Array<{
    filename: string
    startLine: number
    endLine: number
  }>
}

type ContentStoryLine = {
  line: string
  number: number
  concepts?: string[]
  timestamps?: {
    natural?: [string, string]
    slow?: [string, string]
  }
}

function parseTimestamp(value: string | undefined): number | undefined {
  if (!value) return undefined

  const parts = value.split(":").map(Number)
  if (parts.some((part) => Number.isNaN(part))) return undefined
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

function normalizeVocabEntry(entry: ContentVocabEntry): VocabEntry {
  const naturalAudio = Array.isArray(entry.audio) ? entry.audio : entry.audio?.natural

  return {
    vocab: entry.vocab,
    image: entry.image ?? entry.images ?? [],
    audio: typeof naturalAudio === "string" ? [{ filename: naturalAudio, gender: "" }] : naturalAudio ?? [],
    syllables: entry.syllables ?? 1,
    phonemes: entry.phonemes ?? [],
    syllablePattern: entry.syllablePattern,
    syllabicPattern: entry.syllabicPattern,
    rhythmPattern: entry.rhythmPattern ?? "",
    tonePattern: entry.tonePattern ?? ""
  }
}

function flattenVocab(file: Record<string, ContentVocabEntry>): VocabItem[] {
  return Object.entries(file).map(([id, entry]) => ({ id, ...normalizeVocabEntry(entry) }))
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

function normalizeContentStory(meta: ContentStoryMeta, lines: ContentStoryLine[], lang: SupportedLanguage): Story {
  const title = typeof meta.title === "string" ? meta.title : meta.title[lang] ?? meta.title.zh ?? meta.id
  const audio = typeof meta.audio === "string" ? meta.audio : meta.audio?.natural ?? ""

  return {
    id: meta.id,
    title,
    arcId: meta.arcId,
    arc: meta.arc,
    perspective: meta.perspective,
    coreConcepts: meta.coreConcepts,
    visualSignature: meta.visualSignature,
    lines: lines.map((line) => line.line),
    audio,
    scenes: meta.imageOrder?.map((image) => {
      const firstLine = lines.find((line) => line.number === image.startLine)
      const lastLine = lines.find((line) => line.number === image.endLine)
      const start = parseTimestamp(firstLine?.timestamps?.natural?.[0])
      const end = parseTimestamp(lastLine?.timestamps?.natural?.[1])

      return {
        id: `${meta.id}-${image.filename.replace(/\.[^.]+$/, "")}`,
        image: `images/${image.filename}`,
        start,
        end
      }
    })
  }
}

export async function loadLearningData(lang: SupportedLanguage): Promise<LearningData> {
  const paths = getLearningPaths(lang)
  const [vocabResult, phonemeFile, storyMeta, storyLines] = await Promise.all([
    loadFirstJson<Record<string, ContentVocabEntry>>([paths.vocab, "engine/vocab/zh/labels.json"]),
    loadJson<PhonemeFile>(paths.phonemes),
    loadJson<ContentStoryMeta>(paths.storyMeta),
    loadJson<ContentStoryLine[]>(paths.storyLines)
  ])

  return {
    lang,
    paths,
    vocab: flattenVocab(vocabResult.file),
    sounds: flattenSounds(phonemeFile),
    stories: [normalizeContentStory(storyMeta, storyLines, lang)],
    storyAudio: dirname(paths.storyMeta)
  }
}
