import fs from "node:fs"
import path from "node:path"

const root = process.cwd()

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"))
}

function writeJson(relativePath, value) {
  const filePath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n")
}

function copyDirectory(fromRelativePath, toRelativePath) {
  const from = path.join(root, fromRelativePath)
  const to = path.join(root, toRelativePath)
  if (!fs.existsSync(from)) return
  fs.rmSync(to, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.cpSync(from, to, { recursive: true })
}

function copyFileIfExists(fromRelativePath, toRelativePath) {
  const from = path.join(root, fromRelativePath)
  if (!fs.existsSync(from)) return
  const to = path.join(root, toRelativePath)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to)
}

function buildVocab() {
  copyDirectory("content/universal/images", "public/engine/universal/images")

  const zhLabels = readJson("content/vocab/zh/labels.json")
  copyDirectory("content/vocab/zh/natural", "public/engine/vocab/zh/audio/natural")
  copyDirectory("content/vocab/zh/slow", "public/engine/vocab/zh/audio/slow")

  const publicZhLabels = Object.fromEntries(
    Object.entries(zhLabels).map(([id, entry]) => [
      id,
      {
        vocab: entry.vocab,
        image: entry.images,
        audio: entry.audio?.natural ? [{ filename: entry.audio.natural }] : [],
        syllables: entry.syllables,
        syllablePattern: entry.syllablePattern,
        tonePattern: entry.tonePattern ?? ""
      }
    ])
  )

  writeJson("public/engine/vocab/zh/labels.json", publicZhLabels)
}

function buildStories() {
  const meta = readJson("content/stories/s0-001/meta.json")
  const zhLines = readJson("content/stories/s0-001/lines/lines.zh.json")

  copyDirectory("content/stories/s0-001/images", "public/stories/arcs/cat/s0")
  copyDirectory("content/stories/s0-001/audio/zh", "public/stories/langs/zh")

  writeJson("public/stories/langs/zh/stories.json", [
    [
      {
        id: meta.id,
        title: meta.title.zh,
        arcId: meta.arcId,
        arc: meta.arc,
        perspective: meta.perspective,
        coreConcepts: meta.coreConcepts,
        lines: zhLines,
        imageOrder: meta.imageOrder,
        visualSignature: meta.visualSignature,
        audio: path.basename(meta.audio.natural)
      }
    ]
  ])
}

function buildPhoneticsAndPreviews() {
  for (const lang of ["en", "nan", "zh"]) {
    copyFileIfExists(`content/previews/${lang}/preview.mp3`, `public/engine/speech/${lang}/preview.mp3`)
  }
}

buildVocab()
buildStories()
buildPhoneticsAndPreviews()

console.log("Built public assets from content.")
