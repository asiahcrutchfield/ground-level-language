import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const requiredPaths = [
  "content",
  "content/stories",
  "content/vocab",
  "content/phonetics",
  "content/universal/images",
  "public/engine",
  "public/stories",
  "apps",
  "src",
  "scripts"
]

const errors = []

for (const relativePath of requiredPaths) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    errors.push(`Missing ${relativePath}`)
  }
}

function readJson(relativePath) {
  const filePath = path.join(root, relativePath)
  if (!fs.existsSync(filePath)) return undefined
  const raw = fs.readFileSync(filePath, "utf8")
  if (!raw.trim()) {
    errors.push(`Empty JSON file: ${relativePath}`)
    return undefined
  }
  try {
    return JSON.parse(raw)
  } catch (error) {
    errors.push(`Invalid JSON in ${relativePath}: ${error.message}`)
    return undefined
  }
}

for (const relativePath of [
  "content/stories/s0-001/meta.json",
  "content/stories/s0-001/lines/lines.zh.json",
  "content/vocab/zh/labels.json"
]) {
  readJson(relativePath)
}

const zhNaturalDir = path.join(root, "content", "vocab", "zh", "natural")
if (fs.existsSync(zhNaturalDir)) {
  for (const file of fs.readdirSync(zhNaturalDir)) {
    if (file.includes("-")) errors.push(`Use underscores in zh natural vocab audio: ${file}`)
  }
}

if (errors.length) {
  console.error(errors.join("\n"))
  process.exit(1)
}

console.log("Content structure looks valid.")
