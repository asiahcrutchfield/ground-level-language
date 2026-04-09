import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// fix __dirname (ES modules don't have it by default)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const lang = process.argv[2];

if (!lang) {
  console.log("❌ Please provide a language code (e.g. nan, en, zh)");
  process.exit(1);
}

const basePath = path.join(__dirname, "engine", "speech", lang);

const folders = [
  "generic/phonemes",
  "generic/syllabic",
  "generic/rhythm"
];

const files = [
  { path: "generic/phonemes/phonemes.json", content: { vowels: {}, consonants: {} } },
  { path: "generic/syllabic/syllables.json", content: {} },
  { path: "generic/rhythm/rhythm.json", content: {} },
  { path: "specific/tone/tones.json", content: {} }
];

// create folders
folders.forEach(folder => {
  const fullPath = path.join(basePath, folder);
  fs.mkdirSync(fullPath, { recursive: true });
});

// create files
files.forEach(file => {
  const fullPath = path.join(basePath, file.path);

  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, JSON.stringify(file.content, null, 2));
  }
});

console.log(`✅ Language "${lang}" created successfully`);
