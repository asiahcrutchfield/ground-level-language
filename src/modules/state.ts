import type { SupportedLanguage } from "./types"

// App-level surfaces correspond to the major screens controlled by experience.ts.
export type AppSurface =
  | "start"
  | "language"
  | "path"
  | "soundGarden"
  | "soundLessonList"
  | "soundLesson"
  | "meaningArc"
  | "storyBranch"
  | "meaningPreview"
  | "primer"
  | "story"
  | "demoFinish"
  | "recall"
  | "reflection"

export type PathId = "meaning-tree" | "sound-garden"

// Mutable navigation state for the current session.
export type AppState = {
  selectedLanguage: SupportedLanguage
  selectedPath: PathId | null
  selectedArcId: string | null
  selectedStoryId: string | null
  currentStorySceneIndex: number
  currentRecallIndex: number
  completedStoryIds: Set<string>
}

// Creates the initial app state before any path, arc, or story is selected.
export function createAppState(selectedLanguage: SupportedLanguage): AppState {
  return {
    selectedLanguage,
    selectedPath: null,
    selectedArcId: null,
    selectedStoryId: null,
    currentStorySceneIndex: 0,
    currentRecallIndex: 0,
    completedStoryIds: new Set<string>()
  }
}
