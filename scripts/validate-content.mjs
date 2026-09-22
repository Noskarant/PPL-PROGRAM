import { readFileSync } from "node:fs";

const manual = [1, 2, 3]
  .map(part => readFileSync(new URL("../src/content/manual-" + part + ".md", import.meta.url), "utf8"))
  .join("\n");

const weeks = (manual.match(/^## Semaine \d+ - /gm) || []).length;
const lessons = (manual.match(/^### Jour \d+ - /gm) || []).length;
const controls = (manual.match(/^#### Contrôle hebdomadaire/gm) || []).length;

const finalBlock = manual.match(/## Annexe F - 60 questions de contrôle final\s*([\s\S]*?)(?=\n## Annexe G)/);
const finalQuestions = finalBlock
  ? (finalBlock[1].match(/^\s*\d+[.)]\s+/gm) || []).length
  : 0;

const training = readFileSync(new URL("../src/data/training.ts", import.meta.url), "utf8");
const mcqs = (training.match(/q\("w\d+-\d+"/g) || []).length;
const missions = (training.match(/\{ id:"mission-/g) || []).length;

const checks = [
  ["semaines", weeks, 26],
  ["séances", lessons, 104],
  ["contrôles hebdomadaires", controls, 26],
  ["questions finales", finalQuestions, 60],
  ["QCM interactifs", mcqs, 52],
  ["missions FS2024", missions, 12]
];

let failed = false;
for (const [label, actual, expected] of checks) {
  const ok = actual === expected;
  console.log((ok ? "✓" : "✗") + " " + label + ": " + actual + "/" + expected);
  if (!ok) failed = true;
}

if (failed) {
  console.error("Le contenu PPL n'est plus conforme à la structure attendue.");
  process.exit(1);
}

console.log("Contenu PPL validé.");
