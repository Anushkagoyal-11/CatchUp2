import { cp, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const outputRoot = resolve(root, "dist/tesseract");
const coreSource = resolve(root, "node_modules/tesseract.js-core");
const coreOutput = resolve(outputRoot, "core");
const languageOutput = resolve(outputRoot, "lang");
const licenseOutput = resolve(outputRoot, "licenses");

await mkdir(coreOutput, { recursive: true });
await mkdir(languageOutput, { recursive: true });
await mkdir(licenseOutput, { recursive: true });
await cp(resolve(root, "node_modules/tesseract.js/dist/worker.min.js"), resolve(outputRoot, "worker.min.js"));

for (const filename of await readdir(coreSource)) {
  if (filename.startsWith("tesseract-core.wasm") && (filename.endsWith(".js") || filename.endsWith(".wasm"))) {
    await cp(resolve(coreSource, filename), resolve(coreOutput, filename));
  }
}

await cp(
  resolve(root, "node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz"),
  resolve(languageOutput, "eng.traineddata.gz"),
);

const licenses = [
  ["node_modules/tesseract.js/LICENSE.md", "tesseract.js-Apache-2.0.txt"],
  ["node_modules/tesseract.js-core/LICENSE", "tesseract.js-core-Apache-2.0.txt"],
  ["node_modules/jszip/LICENSE.markdown", "jszip-MIT.txt"],
  ["node_modules/react/LICENSE", "react-MIT.txt"],
  ["node_modules/react-dom/LICENSE", "react-dom-MIT.txt"],
];
for (const [source, destination] of licenses) await cp(resolve(root, source), resolve(licenseOutput, destination));
