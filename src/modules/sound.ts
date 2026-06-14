// Sound Garden data contracts describe sound lesson navigation and preview media.

export type SoundLessonStepId = "preview" | "primer" | "guided-tuning" | "perception-recall" | "reflection"

export type SoundVisualType = "contour" | "particle" | "pulse" | "rhythm" | "resonance" | "phrase"

export type SoundPreview = {
  id: string
  ariaLabel: string
  visual: string
  audio: string
}

export type SoundSection = {
  id: string
  ariaLabel: string
  kind: string
  iconType: string
  previews: SoundPreview[]
}

export type SoundLessonPreviewItem = {
  id: string
  visual: string
  audio: string
}

export type SoundLesson = {
  id: string
  sectionId: string
  ariaLabel: string
  visualType: SoundVisualType
  previewItems: SoundLessonPreviewItem[]
  unlocked: boolean
  completed: boolean
}
