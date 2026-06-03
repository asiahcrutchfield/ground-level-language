import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

function copyDirectory(fromRelativePath, toRelativePath) {
  const from = path.join(root, fromRelativePath)
  const to = path.join(root, toRelativePath)
  if (!fs.existsSync(from)) return
  fs.rmSync(to, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.cpSync(from, to, { recursive: true })
}

function mirrorContentToEngine() {
  const enginePath = path.join(root, "public/engine")
  fs.rmSync(enginePath, { recursive: true, force: true })
  fs.rmSync(path.join(root, "public/stories"), { recursive: true, force: true })

  for (const entry of fs.readdirSync(path.join(root, "content"), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name === "private-notes") continue

    copyDirectory(path.join("content", entry.name), path.join("public/engine", entry.name))
  }
}

mirrorContentToEngine()

console.log("Mirrored content to public/engine, excluding private-notes.")
