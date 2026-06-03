import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const requiredPaths = [
  "content",
  "content/stories",
  "content/vocab",
  "content/phonetics",
  "content/universal/images",
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

const enNaturalDir = path.join(root, "content", "vocab", "en", "natural")
if (fs.existsSync(enNaturalDir)) {
  for (const file of fs.readdirSync(enNaturalDir)) {
    if (!/^en_u\d{3}\.mp3$/.test(file)) {
      errors.push(`Use en_u001.mp3-style names in en natural vocab audio: ${file}`)
    }
  }
}

const enSlowDir = path.join(root, "content", "vocab", "en", "slow")
if (fs.existsSync(enSlowDir)) {
  for (const file of fs.readdirSync(enSlowDir)) {
    if (!/^en_u\d{4}\.mp3$/.test(file)) {
      errors.push(`Use en_u0001.mp3-style names in en slow vocab audio: ${file}`)
    }
  }
}

const enStoryPiecesDir = path.join(root, "content", "stories", "s0-001", "audio", "en", "story_pieces")
if (fs.existsSync(enStoryPiecesDir)) {
  const stack = [enStoryPiecesDir]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        stack.push(entryPath)
      } else if (/-[NS]\d+\.mp3$/.test(entry.name)) {
        errors.push(`Use underscore before en story-piece variant labels: ${entry.name}`)
      }
    }
  }
}

const storyAudioRoot = path.join(root, "content", "stories", "s0-001", "audio")
if (fs.existsSync(storyAudioRoot)) {
  for (const langEntry of fs.readdirSync(storyAudioRoot, { withFileTypes: true })) {
    if (!langEntry.isDirectory()) continue

    const lang = langEntry.name
    const stack = [path.join(storyAudioRoot, lang)]
    while (stack.length) {
      const current = stack.pop()
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const entryPath = path.join(current, entry.name)
        if (entry.isDirectory()) {
          stack.push(entryPath)
          continue
        }

        if (!entry.name.startsWith(`${lang}_`)) {
          errors.push(`Prefix story audio filenames with language code and underscore: ${path.relative(root, entryPath)}`)
        }
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"))
  process.exit(1)
}

console.log("Content structure looks valid.")
