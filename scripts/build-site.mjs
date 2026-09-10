import { cp, mkdir, rm } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const projectRoot = resolve(process.cwd());
const outputDirectory = join(projectRoot, "site");
const files = ["index.html", "manifest.webmanifest", "service-worker.js"];
const directories = ["assets", join("dist", "css"), join("src", "js")];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const file of files) {
  await cp(join(projectRoot, file), join(outputDirectory, basename(file)));
}

for (const directory of directories) {
  await cp(join(projectRoot, directory), join(outputDirectory, directory), { recursive: true });
}

console.log(`Sitio preparado en ${outputDirectory}`);

