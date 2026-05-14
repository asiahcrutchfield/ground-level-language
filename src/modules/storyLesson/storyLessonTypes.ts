export type StoryLessonSectionId = "preview" | "primer" | "story" | "recall" | "reflection"

export type StoryLessonSectionElementMap = Record<StoryLessonSectionId, HTMLElement>

export type StoryLessonShell = {
  getSection(): StoryLessonSectionId
  setSection(section: StoryLessonSectionId): void
  goPrevious(): void
  goNext(): void
}
