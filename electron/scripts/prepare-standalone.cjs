const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");
const standaloneDir = path.join(rootDir, ".next", "standalone");
const standaloneServerPath = path.join(standaloneDir, "server.js");
const nextStaticSrc = path.join(rootDir, ".next", "static");
const nextStaticDest = path.join(standaloneDir, ".next", "static");
const publicSrc = path.join(rootDir, "public");
const publicDest = path.join(standaloneDir, "public");

function ensureExists(filePath, message) {
  if (!fs.existsSync(filePath)) {
    throw new Error(message);
  }
}

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    return;
  }

  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function main() {
  ensureExists(
    standaloneServerPath,
    "Missing .next/standalone/server.js. Run `npm run desktop:build:web` first."
  );

  ensureExists(
    nextStaticSrc,
    "Missing .next/static. Desktop standalone prep requires a completed Next.js build."
  );

  copyDirectory(nextStaticSrc, nextStaticDest);
  copyDirectory(publicSrc, publicDest);

  const standaloneEnv = path.join(standaloneDir, ".env");
  if (fs.existsSync(standaloneEnv)) {
    fs.rmSync(standaloneEnv);
    console.log("- Removed .env from standalone (credentials must not be packaged)");
  }

  console.log("Prepared standalone assets for Electron:");
  console.log(`- ${path.relative(rootDir, nextStaticDest)}`);
  console.log(`- ${path.relative(rootDir, publicDest)}`);
}

main();
