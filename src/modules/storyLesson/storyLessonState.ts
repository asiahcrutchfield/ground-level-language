import type { StoryLessonSectionId } from "./storyLessonTypes"

export const storyLessonSectionOrder = [
  "preview",
  "primer",
  "story",
  "recall",
  "reflection"
] as const satisfies readonly StoryLessonSectionId[]

export function getStoryLessonSectionIndex(section: StoryLessonSectionId): number {
  return storyLessonSectionOrder.indexOf(section)
}

export function getPreviousStoryLessonSection(section: StoryLessonSectionId): StoryLessonSectionId | null {
  const index = getStoryLessonSectionIndex(section)
  return index > 0 ? storyLessonSectionOrder[index - 1] ?? null : null
}

export function getNextStoryLessonSection(section: StoryLessonSectionId): StoryLessonSectionId | null {
  const index = getStoryLessonSectionIndex(section)
  return index >= 0 && index < storyLessonSectionOrder.length - 1
    ? storyLessonSectionOrder[index + 1] ?? null
    : null
}
