import fs from "node:fs"
import path from "node:path"

// Scaffolds the minimum phonetics folders and JSON files for a new language.
const lang = process.argv[2]

if (!lang) {
  console.log("Please provide a language code, for example: nan, en, zh")
  process.exit(1)
}

const root = process.cwd()
const basePath = path.join(root, "content", "phonetics", lang)

// These folders mirror the expected phonetics content structure.
const folders = [
  "phonemes/consonants",
  "phonemes/vowels",
  "syllabic/audio/natural",
  "syllabic/audio/slow",
  "intonation/audio/natural",
  "intonation/audio/slow"
]

// Starter JSON files let validation and loaders run before real data exists.
const files = [
  { path: "phonemes/phonemes.json", content: { vowels: {}, consonants: {} } },
  { path: "syllabic/syllables.json", content: {} },
  { path: "intonation/tones.json", content: {} }
]

for (const folder of folders) {
  fs.mkdirSync(path.join(basePath, folder), { recursive: true })
}

for (const file of files) {
  const fullPath = path.join(basePath, file.path)
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, JSON.stringify(file.content, null, 2) + "\n")
  }
}

console.log(`Language "${lang}" content scaffold created.`)
