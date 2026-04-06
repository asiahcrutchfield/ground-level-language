import fs from "fs";
import path from "path";
import chokidar from "chokidar";

const root = process.cwd();
const enginePath = path.join(root, "engine");

// add every Vite app here
const apps = ["ear-trainer", "mouth-trainer", "stories", "dictionary"];

function copyEngineToApps() {
  for (const app of apps) {
    const target = path.join(root, app, "public", "engine");

    try {
      fs.rmSync(target, { recursive: true, force: true });
      fs.cpSync(enginePath, target, { recursive: true });
      console.log(`✔ Synced engine -> ${app}/public/engine`);
    } catch (error) {
      console.error(`✘ Failed syncing engine to ${app}:`, error);
    }
  }
}

let timeoutId = null;

function debouncedSync() {
  if (timeoutId) clearTimeout(timeoutId);

  timeoutId = setTimeout(() => {
    console.log("🔄 Engine changed, syncing...");
    copyEngineToApps();
  }, 150);
}

// initial copy
copyEngineToApps();

// watch for changes
const watcher = chokidar.watch(enginePath, {
  persistent: true,
  ignoreInitial: true,
});

watcher
  .on("add", debouncedSync)
  .on("change", debouncedSync)
  .on("unlink", debouncedSync)
  .on("addDir", debouncedSync)
  .on("unlinkDir", debouncedSync);

console.log("👀 Watching engine/ for changes...");L
