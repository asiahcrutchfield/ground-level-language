import {
  getNextStoryLessonSection,
  getPreviousStoryLessonSection,
  getStoryLessonSectionIndex,
  storyLessonSectionOrder
} from "./storyLessonState"
import type { StoryLessonSectionElementMap, StoryLessonSectionId, StoryLessonShell } from "./storyLessonTypes"

type StoryLessonShellConfig = {
  sections: StoryLessonSectionElementMap
  progress: HTMLElement
  previousButton: HTMLButtonElement
  nextButton: HTMLButtonElement
  onSectionRequested?: (section: StoryLessonSectionId, previousSection: StoryLessonSectionId) => void
}

export function createStoryLessonShell({
  sections,
  progress,
  previousButton,
  nextButton,
  onSectionRequested
}: StoryLessonShellConfig): StoryLessonShell {
  let currentSection: StoryLessonSectionId = "preview"

  function renderProgress(): void {
    const dots = Array.from(progress.children)
    const activeIndex = getStoryLessonSectionIndex(currentSection)

    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === activeIndex)
      dot.classList.toggle("is-complete", index < activeIndex)
    })
    progress.setAttribute("aria-label", `Story lesson section ${activeIndex + 1} of ${storyLessonSectionOrder.length}`)
  }

  function updateNavigation(): void {
    previousButton.hidden = !getPreviousStoryLessonSection(currentSection)
    nextButton.hidden = !getNextStoryLessonSection(currentSection)
    previousButton.disabled = previousButton.hidden
    nextButton.disabled = nextButton.hidden
  }

  function showSection(section: StoryLessonSectionId): void {
    storyLessonSectionOrder.forEach((sectionId) => {
      sections[sectionId].hidden = sectionId !== section
    })
    currentSection = section
    renderProgress()
    updateNavigation()
  }

  function requestSection(section: StoryLessonSectionId): void {
    if (section === currentSection) {
      showSection(section)
      return
    }

    const previousSection = currentSection
    onSectionRequested?.(section, previousSection)
    showSection(section)
  }

  previousButton.addEventListener("click", () => {
    const previous = getPreviousStoryLessonSection(currentSection)
    if (previous) requestSection(previous)
  })

  nextButton.addEventListener("click", () => {
    const next = getNextStoryLessonSection(currentSection)
    if (next) requestSection(next)
  })

  showSection(currentSection)

  return {
    getSection: () => currentSection,
    setSection: showSection,
    goPrevious: () => {
      const previous = getPreviousStoryLessonSection(currentSection)
      if (previous) requestSection(previous)
    },
    goNext: () => {
      const next = getNextStoryLessonSection(currentSection)
      if (next) requestSection(next)
    }
  }
}
