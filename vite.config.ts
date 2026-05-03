import { cpSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { defineConfig, type Plugin } from "vite"

function copyLearningAssets(): Plugin {
  const copies = [
    ["engine", "engine"],
    ["stories/public/stories", "stories/public/stories"]
  ] as const

  return {
    name: "copy-learning-assets",
    closeBundle() {
      for (const [from, to] of copies) {
        const source = resolve(from)
        if (!existsSync(source)) continue
        cpSync(source, resolve("dist", to), { recursive: true })
      }
    }
  }
}

export default defineConfig({
  plugins: [copyLearningAssets()]
})
