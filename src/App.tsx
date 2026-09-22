import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import "./styles.css";
import type { CourseWeek, Lesson, McqQuestion, Profile, View } from "./types";
import { weeks, lessons, getLesson, getWeek, finalQuestions, searchCourse } from "./lib/course";
import {
  ensureDefaultProfiles,
  getActiveProfileId,
  setActiveProfileId,
  saveProfile,
  createProfile,
  addStudy,
  weeklyMinutes,
  levelFromXp,
  exportProfiles,
  importProfiles
} from "./lib/storage";
import {
  accuracy,
  categoryMastery,
  completedWeekCount,
  currentWeekNumber,
  dueReviewIds,
  isWeekCompleted,
  isWeekUnlocked,
  nextLessonId,
  progressPercent,
  recentStudyDays,
  reviewAnswer,
  totalMinutes,
  weakQuestionIds,
  weekPercent
} from "./lib/progress";
import { badges, mcqBank, missions } from "./data/training";
import {
  CockpitTrainer,
  ConceptVisual,
  MarkdownLesson,
  MetarTrainer,
  RadioTrainer,
  WindLab
} from "./components/Learning";

const categoryIcon: Record<string, string> = {
  "Pilotage": "🛩️",
  "Avion & procédures": "⚙️",
  "Radio & réglementation": "🎙️",
  "Météo": "🌤️",
  "Navigation": "🧭",
  "Synthèse": "🎓"
};

function shuffled<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function formatMinutes(value: number): string {
  if (value < 60) return value + " min";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? hours + " h " + minutes : hours + " h";
}

function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(getActiveProfileId());
  const [view, setView] = useState<View>("home");
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedLesson, setSelectedLesson] = useState("s1-j1");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    ensureDefaultProfiles().then(result => {
      setProfiles(result);
      setLoading(false);
    });
  }, []);

  const profile = profiles.find(item => item.id === activeId);

  const persist = async (updated: Profile) => {
    await saveProfile(updated);
    setProfiles(current => current.map(item => item.id === updated.id ? updated : item));
  };

  const chooseProfile = (id: string) => {
    setActiveProfileId(id);
    setActiveId(id);
    setView("home");
  };

  const openWeek = (week: number) => {
    setSelectedWeek(week);
    setView("week");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openLesson = (id: string) => {
    const lesson = getLesson(id);
    if (lesson) setSelectedWeek(lesson.week);
    setSelectedLesson(id);
    setView("lesson");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) return <LoadingScreen />;
  if (!profile) {
    return <ProfileGate profiles={profiles} onChoose={chooseProfile} />;
  }

  const nav = (next: View) => {
    setView(next);
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const searchResults = searchCourse(search);

  return (
    <div className="app-shell">
      <TopBar
        profile={profile}
        profiles={profiles}
        onSwitch={chooseProfile}
        search={search}
        setSearch={setSearch}
        goHome={() => nav("home")}
      />

      {search.trim().length >= 2 && (
        <SearchOverlay
          query={search}
          results={searchResults}
          onOpen={id => { setSearch(""); openLesson(id); }}
          onClose={() => setSearch("")}
        />
      )}

      <main className="main-content">
        {view === "home" && (
          <HomePage profile={profile} profiles={profiles} onNavigate={nav} onOpenLesson={openLesson} onOpenWeek={openWeek} />
        )}
        {view === "path" && <PathPage profile={profile} onOpenWeek={openWeek} />}
        {view === "practice" && <PracticePage profile={profile} persist={persist} />}
        {view === "review" && <ReviewPage profile={profile} persist={persist} />}
        {view === "exams" && <ExamPage profile={profile} persist={persist} />}
        {view === "profile" && (
          <ProfilePage
            profile={profile}
            profiles={profiles}
            persist={persist}
            onProfiles={setProfiles}
            onChoose={chooseProfile}
          />
        )}
        {view === "week" && (
          <WeekPage
            week={getWeek(selectedWeek) || weeks[0]}
            profile={profile}
            persist={persist}
            onOpenLesson={openLesson}
            onBack={() => nav("path")}
          />
        )}
        {view === "lesson" && (
          <LessonPage
            lesson={getLesson(selectedLesson) || lessons[0]}
            profile={profile}
            persist={persist}
            onBack={() => openWeek((getLesson(selectedLesson) || lessons[0]).week)}
            onNext={openLesson}
          />
        )}
      </main>

      <BottomNav view={view} onNavigate={nav} />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="brand-mark large">✈</div>
      <h1>PPL Program</h1>
      <p>Préparation du cockpit…</p>
      <div className="loading-bar"><span /></div>
    </div>
  );
}

function ProfileGate({ profiles, onChoose }: { profiles: Profile[]; onChoose: (id: string) => void }) {
  return (
    <div className="profile-gate">
      <div className="gate-cloud gate-one" />
      <div className="gate-cloud gate-two" />
      <section className="gate-card">
        <div className="brand-mark large">✈</div>
        <p className="eyebrow">Préparation PPL(A) · DR400</p>
        <h1>Qui prend les commandes ?</h1>
        <p className="lead">Deux progressions indépendantes, enregistrées uniquement sur cet appareil.</p>
        <div className="profile-choice-grid">
          {profiles.map(profile => (
            <button key={profile.id} className="profile-choice" onClick={() => onChoose(profile.id)}>
              <span className="avatar large-avatar">{profile.avatar}</span>
              <strong>{profile.name}</strong>
              <small>{profile.completedLessons.length}/104 séances · {profile.xp} XP</small>
              <span className="button fake-button">Continuer →</span>
            </button>
          ))}
        </div>
        <div className="privacy-note">🔒 Aucun compte · aucune donnée envoyée · sauvegarde locale IndexedDB</div>
      </section>
    </div>
  );
}

function TopBar({
  profile, profiles, onSwitch, search, setSearch, goHome
}: {
  profile: Profile;
  profiles: Profile[];
  onSwitch: (id: string) => void;
  search: string;
  setSearch: (value: string) => void;
  goHome: () => void;
}) {
  return (
    <header className="topbar">
      <button className="brand" onClick={goHome}>
        <span className="brand-mark">✈</span>
        <span><b>PPL Program</b><small>Apprendre · pratiquer · voler demain</small></span>
      </button>
      <div className="top-actions">
        <label className="search-box">
          <span>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher QNH, décrochage, VAC…" />
        </label>
        <div className="profile-switch">
          <button className="active-profile">
            <span className="avatar">{profile.avatar}</span>
            <span><b>{profile.name}</b><small>{profile.xp} XP</small></span>
          </button>
          <div className="profile-menu">
            {profiles.map(item => (
              <button key={item.id} onClick={() => onSwitch(item.id)} className={item.id === profile.id ? "selected" : ""}>
                <span>{item.avatar}</span>{item.name}<small>{item.completedLessons.length}/104</small>
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function SearchOverlay({
  query, results, onOpen, onClose
}: {
  query: string;
  results: ReturnType<typeof searchCourse>;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-panel" onClick={event => event.stopPropagation()}>
        <div className="section-heading">
          <div><span className="eyebrow">Recherche dans les 104 séances</span><h2>“{query}”</h2></div>
          <button className="icon-button" onClick={onClose}>×</button>
        </div>
        {results.length === 0 ? <div className="empty-state">Aucun passage trouvé.</div> : (
          <div className="search-results">
            {results.map(result => (
              <button key={result.lesson.id} onClick={() => onOpen(result.lesson.id)}>
                <span className="mini-week">S{result.lesson.week} · J{result.lesson.day}</span>
                <strong>{result.lesson.title}</strong>
                <p>{result.excerpt}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HomePage({
  profile, profiles, onNavigate, onOpenLesson, onOpenWeek
}: {
  profile: Profile;
  profiles: Profile[];
  onNavigate: (view: View) => void;
  onOpenLesson: (id: string) => void;
  onOpenWeek: (week: number) => void;
}) {
  const level = levelFromXp(profile.xp);
  const progress = progressPercent(profile);
  const weekly = Math.min(120, weeklyMinutes(profile));
  const currentWeek = currentWeekNumber(profile);
  const nextId = nextLessonId(profile);
  const nextLesson = getLesson(nextId);
  const due = dueReviewIds(profile).length + weakQuestionIds(profile).length;
  const mastery = categoryMastery(profile);
  const chart = recentStudyDays(profile);
  const maxChart = Math.max(30, ...chart.map(item => item.minutes));
  const peer = profiles.find(item => item.id !== profile.id);

  return (
    <div className="page home-page">
      <section className="hero-dashboard">
        <div className="hero-copy">
          <span className="eyebrow light">Semaine {currentWeek} sur 26</span>
          <h1>Prêt pour la prochaine étape, {profile.name} ?</h1>
          <p>Deux heures par semaine, mais chaque séance doit devenir une connaissance réellement utilisable.</p>
          <div className="hero-actions">
            <button className="button primary light-button" onClick={() => onOpenLesson(nextId)}>
              ▶ Continuer · {nextLesson ? "J" + nextLesson.day + " " + nextLesson.title : "programme terminé"}
            </button>
            <button className="button ghost-light" onClick={() => onOpenWeek(currentWeek)}>Voir la semaine</button>
          </div>
        </div>
        <div className="hero-instruments">
          <ProgressDial value={progress} label="Programme" />
          <div className="mini-stat"><span>🔥</span><strong>{profile.streak}</strong><small>jours de série</small></div>
          <div className="mini-stat"><span>⭐</span><strong>{profile.xp}</strong><small>XP</small></div>
        </div>
      </section>

      <section className="quick-grid">
        <article className="card goal-card">
          <div className="card-title"><span className="icon-tile">⏱</span><div><small>Objectif hebdo</small><h3>2 heures</h3></div><b>{weekly}/120 min</b></div>
          <div className="progress-track large"><span style={{ width: (weekly / 120 * 100) + "%" }} /></div>
          <p>{weekly >= 120 ? "Objectif atteint. Consolide maintenant les points faibles." : "Encore " + (120 - weekly) + " min cette semaine."}</p>
        </article>

        <article className="card">
          <div className="card-title"><span className="icon-tile green">🧠</span><div><small>Révisions intelligentes</small><h3>{due ? due + " éléments" : "À jour"}</h3></div></div>
          <p>Les erreurs reviennent selon un rythme espacé pour éviter l’illusion de maîtrise.</p>
          <button className="text-button" onClick={() => onNavigate("review")}>Lancer une révision →</button>
        </article>

        <article className="card">
          <div className="card-title"><span className="icon-tile amber">🏅</span><div><small>Niveau {level.level}</small><h3>{level.current}/{level.target} XP</h3></div></div>
          <div className="progress-track"><span style={{ width: level.percent + "%" }} /></div>
          <p>{level.percent}% vers le niveau suivant.</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="card span-two">
          <div className="section-heading compact">
            <div><span className="eyebrow">Maîtrise par bloc</span><h2>Où tu en es vraiment</h2></div>
            <button className="text-button" onClick={() => onNavigate("path")}>Parcours complet →</button>
          </div>
          <div className="mastery-list">
            {mastery.map(item => (
              <button className="mastery-row" key={item.category} onClick={() => {
                const first = weeks.find(w => w.category === item.category);
                if (first) onOpenWeek(first.number);
              }}>
                <span className="category-icon">{categoryIcon[item.category]}</span>
                <span className="mastery-name"><b>{item.category}</b><small>{item.done}/{item.total} séances</small></span>
                <span className="progress-track"><i style={{ width: item.percent + "%" }} /></span>
                <strong>{item.percent}%</strong>
              </button>
            ))}
          </div>
        </article>

        <article className="card study-chart-card">
          <div className="section-heading compact"><div><span className="eyebrow">7 derniers jours</span><h2>Régularité</h2></div></div>
          <div className="study-chart">
            {chart.map(day => (
              <div className="chart-day" key={day.key}>
                <div className="bar-shell"><span style={{ height: Math.max(4, day.minutes / maxChart * 100) + "%" }} /></div>
                <b>{day.minutes}</b><small>{day.label}</small>
              </div>
            ))}
          </div>
          <p className="microcopy">Le but n’est pas de “farmer” les XP : la régularité et la restitution comptent davantage.</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <div className="section-heading compact"><div><span className="eyebrow">Cockpit de progression</span><h2>Statistiques</h2></div></div>
          <div className="stats-list">
            <div><span>📚</span><b>{profile.completedLessons.length}/104</b><small>Séances terminées</small></div>
            <div><span>🎯</span><b>{accuracy(profile)}%</b><small>Réussite QCM</small></div>
            <div><span>🕒</span><b>{formatMinutes(totalMinutes(profile))}</b><small>Travail enregistré</small></div>
            <div><span>✅</span><b>{completedWeekCount(profile)}/26</b><small>Semaines terminées</small></div>
          </div>
        </article>

        <article className="card">
          <div className="section-heading compact"><div><span className="eyebrow">À deux</span><h2>{peer ? profile.name + " vs " + peer.name : "Équipage"}</h2></div></div>
          {peer ? (
            <div className="duel">
              {[profile, peer].map(item => (
                <div key={item.id}>
                  <span className="avatar large-avatar">{item.avatar}</span>
                  <b>{item.name}</b>
                  <strong>{progressPercent(item)}%</strong>
                  <div className="progress-track"><span style={{ width: progressPercent(item) + "%" }} /></div>
                  <small>{item.xp} XP · 🔥 {item.streak}</small>
                </div>
              ))}
            </div>
          ) : <p>Ajoute un second profil local pour comparer vos progressions.</p>}
        </article>
      </section>

      <section className="card next-week-card">
        <div>
          <span className="eyebrow">Prochaine étape</span>
          <h2>Semaine {currentWeek} · {getWeek(currentWeek)?.title}</h2>
          <p>{getWeek(currentWeek)?.objective}</p>
        </div>
        <button className="button primary" onClick={() => onOpenWeek(currentWeek)}>Ouvrir la semaine →</button>
      </section>
    </div>
  );
}

function PathPage({ profile, onOpenWeek }: { profile: Profile; onOpenWeek: (week: number) => void }) {
  return (
    <div className="page">
      <PageIntro eyebrow="26 semaines · 104 séances" title="Ton plan de vol" text="Chaque semaine représente 2 h de travail : quatre séances guidées de 30 minutes. Termine un bloc pour ouvrir le suivant." />
      <div className="path-layout">
        {weeks.map((week, index) => {
          const unlocked = isWeekUnlocked(profile, week.number);
          const complete = isWeekCompleted(profile, week);
          const percent = weekPercent(profile, week);
          const month = Math.ceil(week.number / 4.34);
          return (
            <div className={"path-node " + (complete ? "complete " : "") + (!unlocked ? "locked" : "")} key={week.number}>
              <div className="path-rail">
                <span className="path-dot">{complete ? "✓" : unlocked ? week.number : "🔒"}</span>
                {index < weeks.length - 1 && <i />}
              </div>
              <button disabled={!unlocked} onClick={() => onOpenWeek(week.number)} className="week-card">
                <div className="week-card-top">
                  <span className="category-chip">{categoryIcon[week.category]} {week.category}</span>
                  <small>Mois {Math.min(6, month)} · 2 h</small>
                </div>
                <h2>Semaine {week.number} · {week.title}</h2>
                <p>{week.objective}</p>
                <div className="week-footer">
                  <div className="progress-track"><span style={{ width: percent + "%" }} /></div>
                  <b>{percent}%</b>
                  <span>{week.lessons.length} séances</span>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekPage({
  week, profile, persist, onOpenLesson, onBack
}: {
  week: CourseWeek;
  profile: Profile;
  persist: (profile: Profile) => Promise<void>;
  onOpenLesson: (id: string) => void;
  onBack: () => void;
}) {
  const [showTest, setShowTest] = useState(false);
  const complete = isWeekCompleted(profile, week);

  return (
    <div className="page">
      <button className="back-button" onClick={onBack}>← Parcours</button>
      <section className="week-hero">
        <div>
          <span className="category-chip light-chip">{categoryIcon[week.category]} {week.category}</span>
          <h1>Semaine {week.number}<br/><span>{week.title}</span></h1>
          <p>{week.objective}</p>
        </div>
        <ProgressDial value={weekPercent(profile, week)} label="Semaine" />
      </section>

      {week.vocabulary.length > 0 && (
        <section className="card vocab-card">
          <span className="eyebrow">Vocabulaire cible</span>
          <div className="vocab-chips">{week.vocabulary.map(term => <span key={term}>{term}</span>)}</div>
        </section>
      )}

      <ConceptVisual week={week.number} />

      <section className="lesson-list">
        {week.lessons.map(lesson => {
          const done = profile.completedLessons.includes(lesson.id);
          return (
            <button key={lesson.id} className={"lesson-row " + (done ? "done" : "")} onClick={() => onOpenLesson(lesson.id)}>
              <span className="day-badge">{done ? "✓" : lesson.day}</span>
              <span className="lesson-row-copy"><small>Jour {lesson.day} · 30 min {lesson.hasFs2024 ? "· FS2024" : ""}</small><strong>{lesson.title}</strong></span>
              <span className="lesson-type">{lesson.hasFs2024 ? "🎮" : "📖"}</span>
              <span>›</span>
            </button>
          );
        })}
      </section>

      <section className={"card weekly-test-card " + (complete ? "" : "muted")}>
        <div>
          <span className="eyebrow">Checkpoint</span>
          <h2>Contrôle de la semaine</h2>
          <p>{week.control.questions.length} questions ouvertes avec correction commentée. La restitution compte plus que la récitation.</p>
        </div>
        <button className="button primary" disabled={!complete} onClick={() => setShowTest(true)}>
          {profile.weekTestScores[String(week.number)] !== undefined ? "Refaire · " + profile.weekTestScores[String(week.number)] + "%" : "Lancer le contrôle"}
        </button>
      </section>

      {showTest && (
        <WeeklyTestModal
          week={week}
          profile={profile}
          persist={persist}
          onClose={() => setShowTest(false)}
        />
      )}
    </div>
  );
}

function LessonPage({
  lesson, profile, persist, onBack, onNext
}: {
  lesson: Lesson;
  profile: Profile;
  persist: (profile: Profile) => Promise<void>;
  onBack: () => void;
  onNext: (id: string) => void;
}) {
  const [note, setNote] = useState(profile.notes[lesson.id] || "");
  const week = getWeek(lesson.week) || weeks[0];
  const done = profile.completedLessons.includes(lesson.id);
  const bookmarked = profile.bookmarks.includes(lesson.id);
  const index = lessons.findIndex(item => item.id === lesson.id);
  const next = lessons[index + 1];

  const completeLesson = async () => {
    if (done) {
      if (next && isWeekUnlocked(profile, next.week)) onNext(next.id);
      return;
    }
    let updated: Profile = {
      ...profile,
      completedLessons: [...profile.completedLessons, lesson.id]
    };
    updated = addStudy(updated, "lesson", 30, 40);
    const sameWeekQuestions = mcqBank.filter(question => question.week === lesson.week);
    const reviews = { ...updated.reviews };
    for (const question of sameWeekQuestions) {
      if (!reviews[question.id]) {
        reviews[question.id] = {
          id: question.id,
          dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          intervalDays: 1,
          repetitions: 0,
          correct: 0,
          wrong: 0
        };
      }
    }
    await persist({ ...updated, reviews });
  };

  const saveNote = async () => {
    await persist({ ...profile, notes: { ...profile.notes, [lesson.id]: note } });
  };

  const toggleBookmark = async () => {
    const nextBookmarks = bookmarked
      ? profile.bookmarks.filter(id => id !== lesson.id)
      : [...profile.bookmarks, lesson.id];
    await persist({ ...profile, bookmarks: nextBookmarks });
  };

  return (
    <div className="page lesson-page">
      <div className="lesson-topline">
        <button className="back-button" onClick={onBack}>← Semaine {lesson.week}</button>
        <div className="lesson-actions">
          <button className={"icon-button " + (bookmarked ? "active" : "")} onClick={toggleBookmark} title="Favori">🔖</button>
          <span className="time-chip">⏱ 30 min</span>
        </div>
      </div>

      <header className="lesson-header">
        <span className="category-chip">{categoryIcon[week.category]} {week.category}</span>
        <small>Semaine {lesson.week} · Jour {lesson.day}</small>
        <h1>{lesson.title}</h1>
        <p className="lesson-intro">Lis activement : reformule à voix haute, fais l’application demandée et ne marque la séance terminée que lorsque tu peux l’expliquer.</p>
      </header>

      <ConceptVisual week={lesson.week} />

      <article className="lesson-paper">
        <div className="reading-progress-label"><span>COURS</span><span>Source : Manuel PPL Program V4</span></div>
        <MarkdownLesson markdown={lesson.markdown} />
      </article>

      <section className="card note-card">
        <div className="section-heading compact"><div><span className="eyebrow">Carnet pilote</span><h2>Ma note pour cette séance</h2></div></div>
        <textarea value={note} onChange={e => setNote(e.target.value)} onBlur={saveNote} placeholder="Ex. Je confonds encore incidence et assiette. À revoir avec Kélian…" />
        <small>Enregistré localement sur ton profil au changement de focus.</small>
      </section>

      <section className="lesson-finish">
        <div>
          <span className="eyebrow">{done ? "Séance validée" : "Fin de séance"}</span>
          <h2>{done ? "✓ Déjà terminée" : "Peux-tu l’expliquer sans regarder ?"}</h2>
          <p>{done ? "Tu peux la relire autant que nécessaire." : "Valider ajoute 30 min à ton objectif hebdo et 40 XP."}</p>
        </div>
        <button className={"button " + (done ? "secondary" : "primary")} onClick={completeLesson}>
          {done ? next ? "Séance suivante →" : "Programme terminé" : "✓ Marquer terminée"}
        </button>
      </section>
    </div>
  );
}

function WeeklyTestModal({
  week, profile, persist, onClose
}: {
  week: CourseWeek;
  profile: Profile;
  persist: (profile: Profile) => Promise<void>;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown] = useState<boolean[]>([]);
  const question = week.control.questions[index];
  const answer = week.control.answers[index] || "Réponse à reformuler à partir du cours.";

  const rate = async (value: boolean) => {
    const results = [...known, value];
    setKnown(results);
    if (index < week.control.questions.length - 1) {
      setIndex(index + 1);
      setRevealed(false);
      return;
    }
    const score = Math.round((results.filter(Boolean).length / Math.max(1, results.length)) * 100);
    let updated = {
      ...profile,
      weekTestScores: { ...profile.weekTestScores, [String(week.number)]: score }
    };
    updated = addStudy(updated, "quiz", 12, 50 + results.filter(Boolean).length * 15);
    await persist(updated);
    setIndex(week.control.questions.length);
  };

  if (index >= week.control.questions.length) {
    const score = Math.round((known.filter(Boolean).length / Math.max(1, known.length)) * 100);
    return (
      <Modal onClose={onClose}>
        <div className="result-screen">
          <span className="result-icon">{score >= 67 ? "🛫" : "🔁"}</span>
          <span className="eyebrow">Semaine {week.number}</span>
          <h2>{score}% de maîtrise déclarée</h2>
          <p>{score >= 67 ? "Checkpoint validé. Les notions mal maîtrisées doivent néanmoins revenir en révision." : "Reprends les passages difficiles avant de considérer le bloc acquis."}</p>
          <button className="button primary" onClick={onClose}>Fermer</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div className="quiz-modal">
        <div className="quiz-progress"><span style={{ width: ((index + 1) / week.control.questions.length * 100) + "%" }} /></div>
        <span className="eyebrow">Question {index + 1}/{week.control.questions.length}</span>
        <h2>{question}</h2>
        {!revealed ? (
          <>
            <div className="oral-prompt">Réponds à voix haute avant d’afficher la correction.</div>
            <button className="button primary" onClick={() => setRevealed(true)}>Afficher la correction</button>
          </>
        ) : (
          <>
            <div className="answer-box"><span>Corrigé commenté</span><p>{answer}</p></div>
            <div className="self-rate">
              <button className="button danger-soft" onClick={() => rate(false)}>↻ À revoir</button>
              <button className="button success" onClick={() => rate(true)}>✓ Je savais l’expliquer</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function PracticePage({ profile, persist }: { profile: Profile; persist: (profile: Profile) => Promise<void> }) {
  const [tab, setTab] = useState<"labs" | "missions">("labs");
  const current = currentWeekNumber(profile);

  const toggleMissionCheck = async (missionId: string, index: number, total: number) => {
    const mission = missions.find(item => item.id === missionId);
    if (!mission) return;
    const existing = profile.missions[missionId] || { completed: false, checks: Array(total).fill(false) };
    const checks = [...(existing.checks.length === total ? existing.checks : Array(total).fill(false))];
    checks[index] = !checks[index];
    const justCompleted = checks.every(Boolean) && !existing.completed;
    let updated: Profile = {
      ...profile,
      missions: {
        ...profile.missions,
        [missionId]: {
          ...existing,
          checks,
          completed: checks.every(Boolean),
          completedAt: checks.every(Boolean) ? new Date().toISOString() : existing.completedAt
        }
      }
    };
    if (justCompleted) updated = addStudy(updated, "mission", 20, mission.xp);
    await persist(updated);
  };

  return (
    <div className="page">
      <PageIntro eyebrow="Laboratoire" title="Apprendre en manipulant" text="La théorie devient utile quand tu peux reconnaître, décider, calculer et expliquer. Ces ateliers complètent le manuel et FS2024." />
      <div className="segmented">
        <button className={tab === "labs" ? "active" : ""} onClick={() => setTab("labs")}>Ateliers interactifs</button>
        <button className={tab === "missions" ? "active" : ""} onClick={() => setTab("missions")}>Missions FS2024</button>
      </div>

      {tab === "labs" ? (
        <div className="labs-grid">
          <CockpitTrainer />
          <MetarTrainer />
          <RadioTrainer />
          <WindLab />
        </div>
      ) : (
        <div className="mission-grid">
          {missions.map(mission => {
            const unlocked = current >= mission.week || completedWeekCount(profile) >= mission.week;
            const state = profile.missions[mission.id] || { completed: false, checks: [] };
            return (
              <article className={"mission-card " + (!unlocked ? "locked" : "") + (state.completed ? "completed" : "")} key={mission.id}>
                <div className="mission-cover">
                  <span>{state.completed ? "✓" : unlocked ? "✈" : "🔒"}</span>
                  <div><small>Semaine {mission.week} · {mission.duration}</small><b>{"★".repeat(mission.difficulty)}{"☆".repeat(5 - mission.difficulty)}</b></div>
                </div>
                <h2>{mission.title}</h2>
                <p>{mission.subtitle}</p>
                <div className="mission-section"><strong>Objectifs</strong>
                  {mission.objectives.map((objective, index) => (
                    <label key={objective} className="check-row">
                      <input
                        type="checkbox"
                        disabled={!unlocked}
                        checked={Boolean(state.checks[index])}
                        onChange={() => toggleMissionCheck(mission.id, index, mission.objectives.length)}
                      />
                      <span>{objective}</span>
                    </label>
                  ))}
                </div>
                <details><summary>Briefing</summary><ul>{mission.briefing.map(item => <li key={item}>{item}</li>)}</ul></details>
                <details><summary>Débrief</summary><ul>{mission.debrief.map(item => <li key={item}>{item}</li>)}</ul></details>
                <div className="mission-xp">+{mission.xp} XP à la première validation</div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReviewPage({ profile, persist }: { profile: Profile; persist: (profile: Profile) => Promise<void> }) {
  const due = dueReviewIds(profile);
  const weak = weakQuestionIds(profile);
  const ids = Array.from(new Set([...due, ...weak]));
  const dueQuestions = ids.map(id => mcqBank.find(q => q.id === id)).filter(Boolean) as McqQuestion[];
  const unlockedBank = mcqBank.filter(question => isWeekUnlocked(profile, question.week));
  const [session, setSession] = useState<McqQuestion[] | null>(null);

  return (
    <div className="page">
      <PageIntro eyebrow="Répétition espacée" title="Révisions intelligentes" text="Une erreur doit revenir au bon moment. Les bonnes réponses espacées deviennent progressivement moins fréquentes." />

      <section className="quick-grid">
        <article className="card"><div className="metric-big">{due.length}</div><b>À revoir aujourd’hui</b><p>Cartes dont la date de révision est arrivée.</p></article>
        <article className="card"><div className="metric-big">{weak.length}</div><b>Points faibles</b><p>Questions sous 70 % de réussite historique.</p></article>
        <article className="card"><div className="metric-big">{accuracy(profile)}%</div><b>Précision globale</b><p>Sur tous les QCM déjà tentés.</p></article>
      </section>

      <section className="card review-launch">
        <div><span className="eyebrow">Session du jour</span><h2>{dueQuestions.length ? dueQuestions.length + " cartes prioritaires" : "Aucune carte urgente"}</h2><p>{dueQuestions.length ? "Commence par tes erreurs et cartes arrivées à échéance." : "Tu peux faire une session mixte de consolidation."}</p></div>
        <button className="button primary" onClick={() => setSession(shuffled(dueQuestions.length ? dueQuestions : unlockedBank).slice(0, 10))}>Commencer →</button>
      </section>

      <section className="card">
        <div className="section-heading compact"><div><span className="eyebrow">Favoris</span><h2>Leçons marquées</h2></div></div>
        {profile.bookmarks.length ? (
          <div className="bookmark-list">{profile.bookmarks.map(id => {
            const lesson = getLesson(id);
            return lesson ? <div key={id}><span>S{lesson.week} · J{lesson.day}</span><b>{lesson.title}</b></div> : null;
          })}</div>
        ) : <p className="empty-inline">Aucune leçon enregistrée pour l’instant.</p>}
      </section>

      {session && <McqSession questions={session} profile={profile} persist={persist} onClose={() => setSession(null)} mode="review" />}
    </div>
  );
}

function ExamPage({ profile, persist }: { profile: Profile; persist: (profile: Profile) => Promise<void> }) {
  const current = currentWeekNumber(profile);
  const available = mcqBank.filter(question => question.week <= current);
  const [session, setSession] = useState<McqQuestion[] | null>(null);
  const [oralOpen, setOralOpen] = useState(false);

  return (
    <div className="page">
      <PageIntro eyebrow="Évaluation" title="Quiz & examens blancs" text="Les QCM vérifient des faits et décisions. L’oral final force à expliquer sans indice — indispensable pour repérer une compréhension fragile." />

      <div className="exam-grid">
        <article className="exam-card blue">
          <span className="exam-icon">⚡</span><small>10 questions</small><h2>Quiz express</h2>
          <p>Mélange aléatoire parmi les semaines déjà atteintes, correction immédiate.</p>
          <button className="button light-button" onClick={() => setSession(shuffled(available).slice(0, Math.min(10, available.length)))}>Lancer</button>
        </article>
        <article className="exam-card dark">
          <span className="exam-icon">🎓</span><small>20 questions</small><h2>Examen blanc</h2>
          <p>Score final, sans correction avant la fin. Idéal à chaque fin de mois.</p>
          <button className="button light-button" onClick={() => setSession(shuffled(available).slice(0, Math.min(20, available.length)))}>Commencer</button>
        </article>
        <article className="exam-card amber">
          <span className="exam-icon">🗣️</span><small>60 questions</small><h2>Grand oral PPL</h2>
          <p>Les 60 questions finales du manuel. Répondre à voix haute puis s’auto-évaluer.</p>
          <button className="button dark-button" onClick={() => setOralOpen(true)}>Ouvrir</button>
        </article>
      </div>

      <section className="card exam-stats">
        <div><strong>{Object.keys(profile.weekTestScores).length}</strong><span>checkpoints hebdo passés</span></div>
        <div><strong>{accuracy(profile)}%</strong><span>précision QCM</span></div>
        <div><strong>{weakQuestionIds(profile).length}</strong><span>questions faibles</span></div>
      </section>

      {session && <McqSession questions={session} profile={profile} persist={persist} onClose={() => setSession(null)} mode="exam" />}
      {oralOpen && <OralExam profile={profile} persist={persist} onClose={() => setOralOpen(false)} />}
    </div>
  );
}

function McqSession({
  questions, profile, persist, onClose, mode
}: {
  questions: McqQuestion[];
  profile: Profile;
  persist: (profile: Profile) => Promise<void>;
  onClose: () => void;
  mode: "review" | "exam";
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [workingProfile, setWorkingProfile] = useState(profile);
  const question = questions[index];
  const finished = index >= questions.length;
  const immediate = mode === "review";

  const answer = async (option: number) => {
    if (selected !== null || !question) return;
    setSelected(option);
    const correct = option === question.correct;
    const prev = workingProfile.mcqResults[question.id] || { attempts: 0, correct: 0, lastAt: "" };
    let updated: Profile = {
      ...workingProfile,
      mcqResults: {
        ...workingProfile.mcqResults,
        [question.id]: {
          attempts: prev.attempts + 1,
          correct: prev.correct + (correct ? 1 : 0),
          lastAt: new Date().toISOString()
        }
      }
    };
    updated = reviewAnswer(updated, question.id, correct);
    setWorkingProfile(updated);
    setAnswers(current => [...current, correct]);
    if (!immediate) {
      window.setTimeout(() => next(updated), 250);
    }
  };

  const next = async (current = workingProfile) => {
    if (index >= questions.length - 1) {
      let updated = addStudy(current, mode === "review" ? "review" : "exam", Math.max(5, Math.round(questions.length * 1.5)), answers.filter(Boolean).length * 2 + 10);
      await persist(updated);
      setWorkingProfile(updated);
      setIndex(questions.length);
      return;
    }
    setIndex(value => value + 1);
    setSelected(null);
  };

  if (finished) {
    const score = Math.round((answers.filter(Boolean).length / Math.max(1, answers.length)) * 100);
    return (
      <Modal onClose={onClose}>
        <div className="result-screen">
          <span className="result-icon">{score >= 80 ? "🏆" : score >= 60 ? "🛫" : "🔁"}</span>
          <span className="eyebrow">{mode === "exam" ? "Examen terminé" : "Révision terminée"}</span>
          <h2>{score}%</h2>
          <p>{score >= 80 ? "Très solide. Continue à espacer les révisions." : "Les erreurs sont déjà replacées dans ta file de révision."}</p>
          <button className="button primary" onClick={onClose}>Fermer</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <div className="quiz-modal">
        <div className="quiz-progress"><span style={{ width: ((index + 1) / questions.length * 100) + "%" }} /></div>
        <div className="quiz-meta"><span>Semaine {question.week} · {question.category}</span><b>{index + 1}/{questions.length}</b></div>
        <h2>{question.prompt}</h2>
        <div className="option-grid">
          {question.options.map((option, optionIndex) => (
            <button
              key={option}
              disabled={selected !== null}
              onClick={() => answer(optionIndex)}
              className={"quiz-option " + (
                selected === null ? "" :
                immediate && optionIndex === question.correct ? "correct" :
                selected === optionIndex && optionIndex !== question.correct ? "wrong" :
                selected === optionIndex ? "selected" : ""
              )}
            >
              <span>{String.fromCharCode(65 + optionIndex)}</span>{option}
            </button>
          ))}
        </div>
        {selected !== null && immediate && (
          <div className={"feedback " + (selected === question.correct ? "good" : "bad")}>
            <strong>{selected === question.correct ? "Bonne réponse" : "À revoir"}</strong>
            <p>{question.explanation}</p>
            <button className="button small" onClick={() => next()}>Continuer</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function OralExam({ profile, persist, onClose }: { profile: Profile; persist: (profile: Profile) => Promise<void>; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [known, setKnown] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const question = finalQuestions[index];

  const rate = async (ok: boolean) => {
    if (ok) setKnown(value => value + 1);
    if (index >= finalQuestions.length - 1) {
      let updated = addStudy(profile, "exam", 35, 120 + (known + (ok ? 1 : 0)) * 2);
      await persist(updated);
      setIndex(finalQuestions.length);
    } else {
      setIndex(value => value + 1);
      setShowHint(false);
    }
  };

  if (index >= finalQuestions.length) {
    const score = Math.round(known / Math.max(1, finalQuestions.length) * 100);
    return <Modal onClose={onClose}><div className="result-screen"><span className="result-icon">🎓</span><h2>{score}% auto-validé</h2><p>Ce score est une auto-évaluation orale, pas un résultat officiel PPL.</p><button className="button primary" onClick={onClose}>Fermer</button></div></Modal>;
  }

  return (
    <Modal onClose={onClose}>
      <div className="quiz-modal oral-exam">
        <div className="quiz-progress"><span style={{ width: ((index + 1) / finalQuestions.length * 100) + "%" }} /></div>
        <span className="eyebrow">Grand oral · {index + 1}/60</span>
        <h2>{question}</h2>
        <div className="oral-prompt">Réponds complètement à voix haute, comme si ton instructeur te posait la question.</div>
        {showHint && <div className="answer-box"><span>Indice</span><p>Retrouve le chapitre correspondant via la recherche globale et reformule la règle avec tes propres mots.</p></div>}
        <div className="self-rate">
          <button className="button secondary" onClick={() => setShowHint(true)}>Indice</button>
          <button className="button danger-soft" onClick={() => rate(false)}>À revoir</button>
          <button className="button success" onClick={() => rate(true)}>Je maîtrise</button>
        </div>
      </div>
    </Modal>
  );
}

function ProfilePage({
  profile, profiles, persist, onProfiles, onChoose
}: {
  profile: Profile;
  profiles: Profile[];
  persist: (profile: Profile) => Promise<void>;
  onProfiles: (profiles: Profile[]) => void;
  onChoose: (id: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const earned = new Set(profile.badges);
  const level = levelFromXp(profile.xp);

  const download = async () => {
    const raw = await exportProfiles();
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ppl-program-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await importProfiles(await file.text());
      onProfiles(result);
      const active = result.find(item => item.id === profile.id) || result[0];
      if (active) onChoose(active.id);
      alert("Sauvegarde importée.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Import impossible.");
    }
    event.target.value = "";
  };

  const addProfile = async () => {
    const name = newName.trim();
    if (!name) return;
    const candidate = createProfile(name, "🛩️");
    if (profiles.some(item => item.id === candidate.id)) {
      alert("Un profil avec ce nom existe déjà.");
      return;
    }
    await saveProfile(candidate);
    const result = [...profiles, candidate];
    onProfiles(result);
    setNewName("");
    onChoose(candidate.id);
  };

  const clearCurrent = async () => {
    if (!confirm("Réinitialiser toute la progression de " + profile.name + " ? Exporte une sauvegarde avant si nécessaire.")) return;
    const fresh = createProfile(profile.name, profile.avatar);
    fresh.id = profile.id;
    fresh.createdAt = profile.createdAt;
    await persist(fresh);
  };

  return (
    <div className="page">
      <section className="profile-hero">
        <span className="avatar mega-avatar">{profile.avatar}</span>
        <div><span className="eyebrow">Profil local</span><h1>{profile.name}</h1><p>Niveau {level.level} · {profile.xp} XP · 🔥 {profile.streak} jours</p></div>
        <ProgressDial value={progressPercent(profile)} label="PPL Program" />
      </section>

      <section className="card">
        <div className="section-heading compact"><div><span className="eyebrow">Badges</span><h2>{earned.size}/{badges.length} obtenus</h2></div></div>
        <div className="badge-grid">
          {badges.map(badge => (
            <div className={"badge-card " + (earned.has(badge.id) ? "earned" : "")} key={badge.id}>
              <span>{badge.icon}</span><b>{badge.name}</b><small>{badge.description}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-grid">
        <article className="card">
          <span className="eyebrow">Sauvegarde</span><h2>Exporter / importer</h2>
          <p>La progression reste sur ce navigateur. Exporte régulièrement un JSON pour la transférer ou la restaurer.</p>
          <div className="button-row">
            <button className="button primary" onClick={download}>↓ Exporter JSON</button>
            <label className="button secondary file-button">↑ Importer<input type="file" accept="application/json,.json" onChange={upload}/></label>
          </div>
        </article>
        <article className="card">
          <span className="eyebrow">Équipage local</span><h2>Ajouter un profil</h2>
          <p>Utile si une troisième personne veut travailler sur le même appareil.</p>
          <div className="inline-form"><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Prénom"/><button className="button primary" onClick={addProfile}>Ajouter</button></div>
        </article>
      </section>

      <section className="card source-card">
        <span className="eyebrow">Sécurité des données</span>
        <h2>100 % local, sans Supabase</h2>
        <p>IndexedDB stocke cours terminés, scores, notes et planning de révision. Le site n’envoie aucune progression à un serveur. Effacer les données du navigateur peut donc supprimer la progression si elle n’a pas été exportée.</p>
      </section>

      <button className="danger-link" onClick={clearCurrent}>Réinitialiser la progression de {profile.name}</button>
    </div>
  );
}

function BottomNav({ view, onNavigate }: { view: View; onNavigate: (view: View) => void }) {
  const items: Array<{ view: View; icon: string; label: string }> = [
    { view:"home", icon:"⌂", label:"Accueil" },
    { view:"path", icon:"▤", label:"Parcours" },
    { view:"practice", icon:"✦", label:"Pratique" },
    { view:"review", icon:"↻", label:"Révisions" },
    { view:"exams", icon:"✓", label:"Examens" },
    { view:"profile", icon:"●", label:"Profil" }
  ];
  return (
    <nav className="bottom-nav">
      {items.map(item => (
        <button key={item.view} className={view === item.view || (view === "week" || view === "lesson") && item.view === "path" ? "active" : ""} onClick={() => onNavigate(item.view)}>
          <span>{item.icon}</span><small>{item.label}</small>
        </button>
      ))}
    </nav>
  );
}

function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <header className="page-intro">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </header>
  );
}

function ProgressDial({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-dial" style={{ background: "conic-gradient(#46b4ff " + safe + "%, rgba(255,255,255,.16) 0)" }}>
      <div><strong>{safe}%</strong><small>{label}</small></div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={event => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        {children}
      </div>
    </div>
  );
}

export default App;
