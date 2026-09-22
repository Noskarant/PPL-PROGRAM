import manual1 from "../content/manual-1.md?raw";
import manual2 from "../content/manual-2.md?raw";
import manual3 from "../content/manual-3.md?raw";
import type { Category, CourseWeek, Lesson, WeeklyControl } from "../types";

export const fullManual = [manual1, manual2, manual3]
  .join("\n")
  .replace(/\\pagebreak/g, "")
  .replace(/\r/g, "");

export function categoryForWeek(week: number): Category {
  if (week <= 4) return "Pilotage";
  if (week <= 8) return "Avion & procédures";
  if (week <= 13) return "Radio & réglementation";
  if (week <= 18) return "Météo";
  if (week <= 24) return "Navigation";
  return "Synthèse";
}

function cleanInline(value: string): string {
  return value
    .replace(/\*\*/g, "")
    .replace(/\[(R\d+)\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function numberedItems(block: string): string[] {
  const lines = block.split("\n");
  const items: string[] = [];
  let current = "";
  for (const line of lines) {
    const match = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (match) {
      if (current) items.push(cleanInline(current));
      current = match[1];
    } else if (current && line.trim() && !line.trim().startsWith("#")) {
      current += " " + line.trim();
    }
  }
  if (current) items.push(cleanInline(current));
  return items;
}

function parseControl(raw: string): WeeklyControl {
  const match = raw.match(
    /#### Contrôle hebdomadaire[^\n]*\n+\*\*Questions - sans regarder le cours\*\*\s*([\s\S]*?)\*\*Corrigé commenté\*\*\s*([\s\S]*?)\*\*Validation de semaine :\*\*\s*([\s\S]*?)(?=\n#{1,4}\s|$)/
  );

  if (!match) {
    return { questions: [], answers: [], validation: "" };
  }

  return {
    questions: numberedItems(match[1]),
    answers: numberedItems(match[2]),
    validation: cleanInline(match[3])
  };
}

function parseWeek(raw: string, number: number, title: string): CourseWeek {
  const firstDay = raw.search(/^### Jour 1 - /m);
  const intro = firstDay >= 0 ? raw.slice(0, firstDay) : raw;
  const objectiveMatch = intro.match(/\*\*Objectif de la semaine :\*\*\s*([^\n]+)/);
  const vocabMatch = intro.match(/\*\*Vocabulaire cible :\*\*\s*([^\n]+)/);

  const lessons: Lesson[] = [];
  const dayRegex = /^### Jour (\d+) - (.+)$/gm;
  const dayMatches = Array.from(raw.matchAll(dayRegex));

  for (let i = 0; i < dayMatches.length; i += 1) {
    const match = dayMatches[i];
    const day = Number(match[1]);
    const start = (match.index || 0) + match[0].length;
    const nextDay = dayMatches[i + 1];
    const controlIndex = raw.indexOf("#### Contrôle hebdomadaire", start);
    let end = nextDay ? nextDay.index || raw.length : raw.length;
    if (controlIndex >= 0 && controlIndex < end) end = controlIndex;

    const markdown = raw
      .slice(start, end)
      .trim()
      .replace(/^\s*---\s*$/gm, "");

    lessons.push({
      id: "s" + number + "-j" + day,
      week: number,
      day,
      title: cleanInline(match[2]),
      minutes: 30,
      markdown,
      hasFs2024: /FS2024|Flight Simulator/i.test(markdown)
    });
  }

  return {
    number,
    title: cleanInline(title),
    category: categoryForWeek(number),
    objective: cleanInline(objectiveMatch?.[1] || ""),
    vocabulary: (vocabMatch?.[1] || "")
      .split(",")
      .map(cleanInline)
      .filter(Boolean),
    lessons,
    control: parseControl(raw),
    raw
  };
}

function buildWeeks(): CourseWeek[] {
  const weekRegex = /^## Semaine (\d+) - (.+)$/gm;
  const matches = Array.from(fullManual.matchAll(weekRegex));
  const weeks: CourseWeek[] = [];

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    const number = Number(match[1]);
    const start = (match.index || 0) + match[0].length;
    const next = matches[i + 1];
    let end = next ? next.index || fullManual.length : fullManual.length;
    const annex = fullManual.indexOf("\n# Annexes de travail", start);
    if (annex >= 0 && annex < end) end = annex;
    weeks.push(parseWeek(fullManual.slice(start, end), number, match[2]));
  }

  return weeks;
}

export const weeks = buildWeeks();
export const lessons = weeks.flatMap(week => week.lessons);

export const finalQuestions: string[] = (() => {
  const match = fullManual.match(
    /## Annexe F - 60 questions de contrôle final\s*([\s\S]*?)(?=\n## Annexe G)/
  );
  return match ? numberedItems(match[1]) : [];
})();

export const sources: Array<{ id: string; title: string; url: string }> = (() => {
  const sourceBlock = fullManual.split("# Sources et lectures recommandées")[1] || "";
  const result: Array<{ id: string; title: string; url: string }> = [];
  const regex = /\*\*\[(R\d+)\]\s*([^*]+)\*\*[\s\S]*?(https?:\/\/[^\s]+)/g;
  for (const match of sourceBlock.matchAll(regex)) {
    result.push({ id: match[1], title: cleanInline(match[2]), url: match[3].replace(/[).,]+$/, "") });
  }
  return result;
})();

export function getWeek(number: number): CourseWeek | undefined {
  return weeks.find(week => week.number === number);
}

export function getLesson(id: string): Lesson | undefined {
  return lessons.find(lesson => lesson.id === id);
}

export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)(?:\{[^}]*\})?/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_>#`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchCourse(query: string): Array<{ lesson: Lesson; excerpt: string }> {
  const normalized = query.trim().toLocaleLowerCase("fr");
  if (normalized.length < 2) return [];
  const tokens = normalized.split(/\s+/).filter(Boolean);

  return lessons
    .map(lesson => {
      const haystack = (lesson.title + " " + stripMarkdown(lesson.markdown)).toLocaleLowerCase("fr");
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      const first = Math.max(0, haystack.indexOf(tokens[0]));
      const clean = stripMarkdown(lesson.markdown);
      const excerptStart = Math.max(0, first - 90);
      return {
        lesson,
        score,
        excerpt: clean.slice(excerptStart, excerptStart + 220) + (clean.length > excerptStart + 220 ? "…" : "")
      };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.lesson.week - b.lesson.week)
    .slice(0, 20)
    .map(({ lesson, excerpt }) => ({ lesson, excerpt }));
}
