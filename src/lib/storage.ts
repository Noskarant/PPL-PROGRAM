import type { Profile, StudyEvent } from "../types";

const DB_NAME = "ppl-program-db";
const DB_VERSION = 1;
const STORE = "profiles";
const ACTIVE_KEY = "ppl-program-active-profile";

function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

function makeId(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function createProfile(name: string, avatar?: string): Profile {
  const now = new Date().toISOString();
  return {
    id: makeId(name) || "pilote-" + Date.now(),
    name,
    avatar: avatar || (name.toLowerCase().startsWith("k") ? "🧭" : "✈️"),
    createdAt: now,
    updatedAt: now,
    xp: 0,
    streak: 0,
    completedLessons: [],
    weekTestScores: {},
    mcqResults: {},
    reviews: {},
    notes: {},
    bookmarks: [],
    missions: {},
    studyLog: [],
    badges: []
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getProfiles(): Promise<Profile[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as Profile[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getProfile(id: string): Promise<Profile | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result as Profile | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProfile(profile: Profile): Promise<void> {
  profile.updatedAt = new Date().toISOString();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(profile);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function ensureDefaultProfiles(): Promise<Profile[]> {
  let profiles = await getProfiles();
  if (profiles.length === 0) {
    const noe = createProfile("Noé", "✈️");
    const kelian = createProfile("Kélian", "🧭");
    await saveProfile(noe);
    await saveProfile(kelian);
    profiles = [noe, kelian];
  }
  return profiles.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}

export function addStudy(profile: Profile, type: StudyEvent["type"], minutes: number, xp: number): Profile {
  const key = todayKey();
  const clone: Profile = {
    ...profile,
    xp: profile.xp + xp,
    studyLog: [...profile.studyLog],
    badges: [...profile.badges]
  };

  if (clone.lastStudyDate !== key) {
    clone.streak = clone.lastStudyDate === yesterdayKey() ? clone.streak + 1 : 1;
    clone.lastStudyDate = key;
  }

  const existing = clone.studyLog.findIndex(event => event.date === key && event.type === type);
  if (existing >= 0) {
    const current = clone.studyLog[existing];
    clone.studyLog[existing] = { ...current, minutes: current.minutes + minutes, xp: current.xp + xp };
  } else {
    clone.studyLog.push({ date: key, type, minutes, xp });
  }

  return awardBadges(clone);
}

export function awardBadges(profile: Profile): Profile {
  const set = new Set(profile.badges);
  if (profile.completedLessons.length >= 1) set.add("premier-vol");
  if (profile.completedLessons.length >= 4) set.add("semaine-1");
  if (profile.completedLessons.length >= 52) set.add("mi-parcours");
  if (profile.completedLessons.length >= 104) set.add("ppl-ready");
  if (profile.streak >= 3) set.add("streak-3");
  if (profile.streak >= 7) set.add("streak-7");
  if (profile.streak >= 30) set.add("streak-30");
  if (profile.xp >= 1000) set.add("xp-1000");
  if (profile.xp >= 5000) set.add("xp-5000");
  if (Object.values(profile.weekTestScores).some(score => score >= 100)) set.add("sans-faute");
  if (profile.weekTestScores["18"] >= 80) set.add("meteo");
  if (profile.weekTestScores["24"] >= 80) set.add("navigation");
  return { ...profile, badges: Array.from(set) };
}

export function weeklyMinutes(profile: Profile): number {
  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return profile.studyLog
    .filter(event => new Date(event.date + "T12:00:00").getTime() >= monday.getTime())
    .reduce((sum, event) => sum + event.minutes, 0);
}

export function levelFromXp(xp: number): { level: number; current: number; target: number; percent: number } {
  const level = Math.floor(Math.sqrt(xp / 180)) + 1;
  const floor = Math.pow(level - 1, 2) * 180;
  const ceil = Math.pow(level, 2) * 180;
  const current = xp - floor;
  const target = ceil - floor;
  return { level, current, target, percent: Math.min(100, Math.round((current / target) * 100)) };
}

export async function exportProfiles(): Promise<string> {
  const profiles = await getProfiles();
  return JSON.stringify(
    {
      format: "ppl-program-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      profiles
    },
    null,
    2
  );
}

export async function importProfiles(raw: string): Promise<Profile[]> {
  const parsed = JSON.parse(raw) as { format?: string; profiles?: Profile[] };
  if (parsed.format !== "ppl-program-backup" || !Array.isArray(parsed.profiles)) {
    throw new Error("Fichier de sauvegarde PPL Program invalide.");
  }
  for (const profile of parsed.profiles) {
    if (!profile.id || !profile.name || !Array.isArray(profile.completedLessons)) {
      throw new Error("Une progression du fichier est incomplète.");
    }
    await saveProfile(profile);
  }
  return getProfiles();
}

export async function deleteProfile(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
