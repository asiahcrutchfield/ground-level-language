import { createReadStream, cpSync, existsSync, rmSync, statSync } from "node:fs"
import { extname, resolve } from "node:path"
import { defineConfig, type Plugin } from "vite"

function copyLearningAssets(): Plugin {
  const copies = [
    ["engine", "engine"],
    ["stories/public/stories", "stories"]
  ] as const

  const contentTypes: Record<string, string> = {
    ".json": "application/json",
    ".jpg": "image/jpeg",
    ".mp3": "audio/mpeg",
    ".png": "image/png",
    ".wav": "audio/wav"
  }

  return {
    name: "copy-learning-assets",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const urlPath = decodeURIComponent(request.url?.split("?")[0] ?? "")
        const match = copies.find(([, to]) => urlPath.startsWith(`/${to}/`))
        if (!match) return next()

        const [from, to] = match
        const sourceRoot = resolve(from)
        const filePath = resolve(sourceRoot, urlPath.slice(to.length + 2))
        if (!filePath.startsWith(sourceRoot) || !existsSync(filePath)) return next()

        const stat = statSync(filePath)
        if (!stat.isFile()) return next()

        response.statusCode = 200
        response.setHeader("Content-Type", contentTypes[extname(filePath)] ?? "application/octet-stream")
        createReadStream(filePath).pipe(response)
      })
    },
    closeBundle() {
      for (const [from, to] of copies) {
        const source = resolve(from)
        if (!existsSync(source)) continue
        const destination = resolve("dist", to)
        rmSync(destination, { recursive: true, force: true })
        cpSync(source, destination, { recursive: true })
      }
    }
  }
}

export default defineConfig({
  plugins: [copyLearningAssets()]
})
