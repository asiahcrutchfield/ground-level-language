import fs from "node:fs"
import path from "node:path"
import chokidar from "chokidar"

const root = process.cwd()
const publicEnginePath = path.join(root, "public", "engine")
const apps = ["ear-trainer", "mouth-trainer", "stories", "dictionary"]

function syncPublicEngineToApps() {
  if (!fs.existsSync(publicEnginePath)) {
    console.error("Missing public/engine. Nothing to sync.")
    return
  }

  for (const app of apps) {
    const target = path.join(root, "apps", app, "public", "engine")

    try {
      fs.rmSync(target, { recursive: true, force: true })
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.cpSync(publicEnginePath, target, { recursive: true })
      console.log(`Synced public/engine -> apps/${app}/public/engine`)
    } catch (error) {
      console.error(`Failed syncing engine to ${app}:`, error)
    }
  }
}

let timeoutId = null

function debouncedSync() {
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = setTimeout(syncPublicEngineToApps, 150)
}

syncPublicEngineToApps()

chokidar
  .watch(publicEnginePath, { persistent: true, ignoreInitial: true })
  .on("add", debouncedSync)
  .on("change", debouncedSync)
  .on("unlink", debouncedSync)
  .on("addDir", debouncedSync)
  .on("unlinkDir", debouncedSync)

console.log("Watching public/engine for changes.")
