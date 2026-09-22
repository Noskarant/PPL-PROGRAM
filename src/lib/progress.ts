import type { CourseWeek, Profile, ReviewSchedule } from "../types";
import { lessons, weeks } from "./course";

const DAY = 24 * 60 * 60 * 1000;

function isoFromNow(days: number): string {
  return new Date(Date.now() + days * DAY).toISOString();
}

export function reviewAnswer(profile: Profile, id: string, correct: boolean): Profile {
  const current: ReviewSchedule = profile.reviews[id] || {
    id,
    dueAt: new Date().toISOString(),
    intervalDays: 0,
    repetitions: 0,
    correct: 0,
    wrong: 0
  };

  let intervalDays: number;
  let repetitions: number;

  if (!correct) {
    intervalDays = 1;
    repetitions = 0;
  } else {
    repetitions = current.repetitions + 1;
    const ladder = [1, 3, 7, 14, 30, 60, 120];
    intervalDays = ladder[Math.min(repetitions - 1, ladder.length - 1)];
  }

  return {
    ...profile,
    reviews: {
      ...profile.reviews,
      [id]: {
        ...current,
        dueAt: isoFromNow(intervalDays),
        intervalDays,
        repetitions,
        correct: current.correct + (correct ? 1 : 0),
        wrong: current.wrong + (correct ? 0 : 1)
      }
    }
  };
}

export function dueReviewIds(profile: Profile): string[] {
  const now = Date.now();
  return Object.values(profile.reviews)
    .filter(item => new Date(item.dueAt).getTime() <= now)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .map(item => item.id);
}

export function completedWeekCount(profile: Profile): number {
  return weeks.filter(week => week.lessons.every(lesson => profile.completedLessons.includes(lesson.id))).length;
}

export function isWeekCompleted(profile: Profile, week: CourseWeek): boolean {
  return week.lessons.every(lesson => profile.completedLessons.includes(lesson.id));
}

export function isWeekUnlocked(profile: Profile, weekNumber: number): boolean {
  if (weekNumber <= 1) return true;
  const previous = weeks.find(week => week.number === weekNumber - 1);
  if (!previous) return true;
  return previous.lessons.every(lesson => profile.completedLessons.includes(lesson.id));
}

export function currentWeekNumber(profile: Profile): number {
  const next = weeks.find(week => !isWeekCompleted(profile, week));
  return next?.number || 26;
}

export function nextLessonId(profile: Profile): string {
  const unlocked = lessons.find(lesson => {
    const week = weeks.find(item => item.number === lesson.week);
    return week && isWeekUnlocked(profile, week.number) && !profile.completedLessons.includes(lesson.id);
  });
  return unlocked?.id || lessons[lessons.length - 1]?.id || "s1-j1";
}

export function progressPercent(profile: Profile): number {
  return Math.round((profile.completedLessons.length / Math.max(1, lessons.length)) * 100);
}

export function weekPercent(profile: Profile, week: CourseWeek): number {
  const done = week.lessons.filter(lesson => profile.completedLessons.includes(lesson.id)).length;
  return Math.round((done / Math.max(1, week.lessons.length)) * 100);
}

export function categoryMastery(profile: Profile): Array<{ category: string; percent: number; done: number; total: number }> {
  const groups = new Map<string, { done: number; total: number }>();
  for (const lesson of lessons) {
    const week = weeks.find(item => item.number === lesson.week);
    if (!week) continue;
    const group = groups.get(week.category) || { done: 0, total: 0 };
    group.total += 1;
    if (profile.completedLessons.includes(lesson.id)) group.done += 1;
    groups.set(week.category, group);
  }
  return Array.from(groups.entries()).map(([category, value]) => ({
    category,
    done: value.done,
    total: value.total,
    percent: Math.round((value.done / Math.max(1, value.total)) * 100)
  }));
}

export function weakQuestionIds(profile: Profile): string[] {
  return Object.entries(profile.mcqResults)
    .filter(([, result]) => result.attempts >= 1 && result.correct / result.attempts < 0.7)
    .sort((a, b) => a[1].correct / a[1].attempts - b[1].correct / b[1].attempts)
    .map(([id]) => id);
}

export function accuracy(profile: Profile): number {
  const results = Object.values(profile.mcqResults);
  const attempts = results.reduce((sum, item) => sum + item.attempts, 0);
  const correct = results.reduce((sum, item) => sum + item.correct, 0);
  return attempts ? Math.round((correct / attempts) * 100) : 0;
}

export function totalMinutes(profile: Profile): number {
  return profile.studyLog.reduce((sum, item) => sum + item.minutes, 0);
}

export function recentStudyDays(profile: Profile, days = 7): Array<{ key: string; label: string; minutes: number }> {
  const result: Array<{ key: string; label: string; minutes: number }> = [];
  const formatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key =
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0");
    const minutes = profile.studyLog
      .filter(item => item.date === key)
      .reduce((sum, item) => sum + item.minutes, 0);
    result.push({ key, label: formatter.format(date).slice(0, 2), minutes });
  }
  return result;
}
