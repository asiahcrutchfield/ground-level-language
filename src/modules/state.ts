import type { SupportedLanguage } from "./types"

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
  | "recall"
  | "reflection"

export type PathId = "meaning-tree" | "sound-garden"

export type AppState = {
  selectedLanguage: SupportedLanguage
  selectedPath: PathId | null
  selectedArcId: string | null
  selectedStoryId: string | null
  currentStorySceneIndex: number
  currentRecallIndex: number
  completedStoryIds: Set<string>
}

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
