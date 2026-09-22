import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { metarChallenges, radioScenarios } from "../data/training";

function Inline({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const tokens = text.split(/(\*\*[^*]+\*\*|\`[^\`]+\`|https?:\/\/[^\s]+)/g).filter(Boolean);
  return (
    <>
      {tokens.map((token, index) => {
        if (token.startsWith("**") && token.endsWith("**")) {
          return <strong key={index}>{token.slice(2, -2)}</strong>;
        }
        if (token.startsWith("`") && token.endsWith("`")) {
          return <code key={index}>{token.slice(1, -1)}</code>;
        }
        if (urlRegex.test(token)) {
          urlRegex.lastIndex = 0;
          return <a key={index} href={token} target="_blank" rel="noreferrer">{token}</a>;
        }
        urlRegex.lastIndex = 0;
        return <span key={index}>{token}</span>;
      })}
    </>
  );
}

function calloutClass(line: string): string {
  const lower = line.toLocaleLowerCase("fr");
  if (lower.includes("validation") || lower.includes("à retenir")) return "lesson-callout success";
  if (lower.includes("correction") || lower.includes("corrigé")) return "lesson-callout correction";
  if (lower.includes("fs2024") || lower.includes("travail pratique") || lower.includes("exercice")) return "lesson-callout practice";
  if (lower.includes("sécurité") || lower.includes("attention")) return "lesson-callout warning";
  return "lesson-callout";
}

export function MarkdownLesson({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const nodes: ReactNode[] = [];
  let list: Array<{ ordered: boolean; text: string }> = [];

  const flushList = () => {
    if (!list.length) return;
    const ordered = list[0].ordered;
    const children = list.map((item, i) => <li key={i}><Inline text={item.text} /></li>);
    nodes.push(ordered ? <ol key={"list-" + nodes.length}>{children}</ol> : <ul key={"list-" + nodes.length}>{children}</ul>);
    list = [];
  };

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line === "---") {
      flushList();
      return;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (image) {
      flushList();
      nodes.push(
        <div className="figure-card" key={index}>
          <span className="figure-icon">◈</span>
          <div>
            <strong>{image[1] || "Schéma pédagogique"}</strong>
            <small>Visualisation interactive associée au chapitre</small>
          </div>
        </div>
      );
      return;
    }

    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (ordered || bullet) {
      list.push({ ordered: Boolean(ordered), text: (ordered?.[1] || bullet?.[1] || "") });
      return;
    }

    flushList();

    if (line.startsWith("#### ")) {
      nodes.push(<h4 key={index}><Inline text={line.slice(5)} /></h4>);
    } else if (line.startsWith("### ")) {
      nodes.push(<h3 key={index}><Inline text={line.slice(4)} /></h3>);
    } else if (line.startsWith("## ")) {
      nodes.push(<h2 key={index}><Inline text={line.slice(3)} /></h2>);
    } else if (line.startsWith("> ")) {
      nodes.push(<blockquote key={index}><Inline text={line.slice(2)} /></blockquote>);
    } else if (/^\*\*(Travail pratique|Exercice|FS2024|Validation|Correction|À retenir|Règle de sécurité|Références)/i.test(line)) {
      nodes.push(<div className={calloutClass(line)} key={index}><Inline text={line} /></div>);
    } else {
      nodes.push(<p key={index}><Inline text={line} /></p>);
    }
  });
  flushList();

  return <div className="lesson-markdown">{nodes}</div>;
}

export function ConceptVisual({ week }: { week: number }) {
  if (week === 1) {
    return (
      <div className="concept-card">
        <div className="concept-head"><span>Visualisation</span><strong>Les 3 axes</strong></div>
        <svg viewBox="0 0 520 250" className="concept-svg" role="img" aria-label="Schéma des trois axes d'un avion">
          <path d="M105 130 L220 110 L300 55 L323 62 L291 112 L428 132 L291 150 L323 203 L300 210 L220 154 L105 145 Z" fill="currentColor" opacity=".14"/>
          <path d="M92 138 H442" stroke="currentColor" strokeWidth="4" strokeDasharray="8 8"/>
          <path d="M260 28 V225" stroke="#2f92ff" strokeWidth="4" strokeDasharray="8 8"/>
          <path d="M155 210 L370 55" stroke="#20b486" strokeWidth="4" strokeDasharray="8 8"/>
          <text x="365" y="124">Longitudinal → roulis</text>
          <text x="272" y="28">Vertical → lacet</text>
          <text x="320" y="55">Transversal → tangage</text>
        </svg>
      </div>
    );
  }

  if (week === 2) {
    return (
      <div className="concept-card">
        <div className="concept-head"><span>Visualisation</span><strong>Les quatre forces</strong></div>
        <div className="forces-diagram">
          <div className="force up">↑<b>Portance</b></div>
          <div className="force left">←<b>Traînée</b></div>
          <div className="plane-glyph">✈</div>
          <div className="force right"><b>Traction</b>→</div>
          <div className="force down">↓<b>Poids</b></div>
        </div>
      </div>
    );
  }

  if (week === 4) {
    const points = [0,10,20,30,40,45,50,55,60].map(angle => ({
      angle,
      n: 1 / Math.cos((angle * Math.PI) / 180)
    }));
    const path = points.map((p, i) => {
      const x = 38 + (p.angle / 60) * 420;
      const y = 190 - ((p.n - 1) / 1) * 130;
      return (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
    }).join(" ");
    return (
      <div className="concept-card">
        <div className="concept-head"><span>Courbe calculée</span><strong>Facteur de charge n = 1 / cos φ</strong></div>
        <svg viewBox="0 0 500 225" className="concept-svg" role="img" aria-label="Facteur de charge selon l'inclinaison">
          <path d="M38 35 V190 H468" fill="none" stroke="currentColor" opacity=".35" strokeWidth="2"/>
          <path d={path} fill="none" stroke="#2f92ff" strokeWidth="5"/>
          <text x="30" y="210">0°</text><text x="235" y="210">30°</text><text x="445" y="210">60°</text>
          <text x="6" y="193">1 g</text><text x="6" y="66">2 g</text>
          <circle cx="458" cy="60" r="7" fill="#20b486"/><text x="348" y="48">60° ≈ 2 g</text>
        </svg>
      </div>
    );
  }

  if (week === 6) return <InstrumentPanel compact />;
  if (week === 17) {
    return (
      <div className="concept-card metar-strip">
        <div className="concept-head"><span>Décodage</span><strong>METAR par blocs</strong></div>
        <div className="metar-code">
          <span data-label="Terrain">LFLL</span>
          <span data-label="Jour/heure UTC">221900Z</span>
          <span data-label="Vent">35008KT</span>
          <span data-label="Visibilité">9999</span>
          <span data-label="Nuages">FEW025</span>
          <span data-label="T / Td">18/10</span>
          <span data-label="QNH">Q1018</span>
        </div>
      </div>
    );
  }

  if (week === 20) return <WindLab compact />;
  return null;
}

const instruments = [
  { id:"asi", label:"Anémomètre", symbol:"ASI", hint:"Vitesse indiquée" },
  { id:"ai", label:"Horizon artificiel", symbol:"AI", hint:"Assiette et inclinaison" },
  { id:"alt", label:"Altimètre", symbol:"ALT", hint:"Altitude barométrique" },
  { id:"turn", label:"Indicateur de virage", symbol:"TC", hint:"Virage / coordination" },
  { id:"dg", label:"Conservateur de cap", symbol:"HDG", hint:"Référence de cap" },
  { id:"vsi", label:"Variomètre", symbol:"VSI", hint:"Vitesse verticale" }
];

export function InstrumentPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div className={"instrument-panel " + (compact ? "compact" : "")}>
      {instruments.map(instrument => (
        <div className="gauge" key={instrument.id}>
          <span>{instrument.symbol}</span>
          <b>{instrument.label}</b>
          {!compact && <small>{instrument.hint}</small>}
        </div>
      ))}
    </div>
  );
}

export function CockpitTrainer() {
  const [targetIndex, setTargetIndex] = useState(1);
  const [message, setMessage] = useState("Trouve : " + instruments[targetIndex].label);
  const [score, setScore] = useState(0);

  const choose = (index: number) => {
    if (index === targetIndex) {
      setScore(value => value + 1);
      const next = (targetIndex + 1 + Math.floor(Math.random() * (instruments.length - 1))) % instruments.length;
      setTargetIndex(next);
      setMessage("Correct ! Maintenant : " + instruments[next].label);
    } else {
      setMessage("Pas celui-ci. Indice : " + instruments[targetIndex].hint);
    }
  };

  return (
    <section className="lab-card">
      <div className="lab-title">
        <div><span className="eyebrow">Atelier cockpit</span><h3>Reconnaissance instruments</h3></div>
        <span className="score-pill">{score} ✓</span>
      </div>
      <p className="lab-prompt">{message}</p>
      <div className="instrument-panel interactive">
        {instruments.map((instrument, index) => (
          <button className="gauge" key={instrument.id} onClick={() => choose(index)}>
            <span>{instrument.symbol}</span><b>{instrument.label}</b>
          </button>
        ))}
      </div>
      <p className="microcopy">Schéma pédagogique générique : la disposition exacte dépend de l’avion et de son équipement.</p>
    </section>
  );
}

export function MetarTrainer() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const challenge = metarChallenges[index % metarChallenges.length];
  const isCorrect = selected === challenge.correct;

  return (
    <section className="lab-card">
      <div className="lab-title"><div><span className="eyebrow">METAR trainer</span><h3>Décodage météo</h3></div><span className="score-pill">{index + 1}/{metarChallenges.length}</span></div>
      <code className="big-code">{challenge.metar}</code>
      <p className="lab-prompt">{challenge.prompt}</p>
      <div className="option-grid">
        {challenge.options.map((option, optionIndex) => (
          <button
            key={option}
            className={"quiz-option " + (selected === null ? "" : optionIndex === challenge.correct ? "correct" : selected === optionIndex ? "wrong" : "")}
            onClick={() => setSelected(optionIndex)}
            disabled={selected !== null}
          >
            <span>{String.fromCharCode(65 + optionIndex)}</span>{option}
          </button>
        ))}
      </div>
      {selected !== null && (
        <div className={"feedback " + (isCorrect ? "good" : "bad")}>
          <strong>{isCorrect ? "Bonne réponse" : "À revoir"}</strong>
          <p>{challenge.explanation}</p>
          <button className="button small" onClick={() => { setSelected(null); setIndex(value => (value + 1) % metarChallenges.length); }}>Question suivante</button>
        </div>
      )}
    </section>
  );
}

export function RadioTrainer() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const scenario = radioScenarios[index % radioScenarios.length];

  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(scenario.sample);
    utterance.lang = "fr-FR";
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <section className="lab-card">
      <div className="lab-title"><div><span className="eyebrow">Radio trainer</span><h3>Décision & phraséologie</h3></div><button className="icon-button" onClick={speak} title="Écouter l'exemple">🔊</button></div>
      <div className="scenario-box">{scenario.situation}</div>
      <p className="lab-prompt">{scenario.prompt}</p>
      <div className="option-grid">
        {scenario.options.map((option, optionIndex) => (
          <button
            key={option}
            className={"quiz-option " + (selected === null ? "" : optionIndex === scenario.correct ? "correct" : selected === optionIndex ? "wrong" : "")}
            onClick={() => setSelected(optionIndex)}
            disabled={selected !== null}
          >
            <span>{String.fromCharCode(65 + optionIndex)}</span>{option}
          </button>
        ))}
      </div>
      {selected !== null && (
        <div className={"feedback " + (selected === scenario.correct ? "good" : "bad")}>
          <strong>{selected === scenario.correct ? "Correct" : "Pas encore"}</strong>
          <p>{scenario.explanation}</p>
          <p><b>Exemple :</b> {scenario.sample}</p>
          <button className="button small" onClick={() => { setSelected(null); setIndex(value => (value + 1) % radioScenarios.length); }}>Scénario suivant</button>
        </div>
      )}
    </section>
  );
}

export function WindLab({ compact = false }: { compact?: boolean }) {
  const [angle, setAngle] = useState(30);
  const [speed, setSpeed] = useState(12);
  const values = useMemo(() => {
    const radians = (angle * Math.PI) / 180;
    return {
      cross: Math.abs(speed * Math.sin(radians)),
      head: speed * Math.cos(radians)
    };
  }, [angle, speed]);

  return (
    <section className={"lab-card wind-lab " + (compact ? "compact" : "")}>
      <div className="lab-title"><div><span className="eyebrow">Vent</span><h3>Composantes de piste</h3></div><span className="score-pill">{angle}° / {speed} kt</span></div>
      {!compact && (
        <div className="slider-grid">
          <label>Angle avec l’axe <input type="range" min="0" max="90" step="5" value={angle} onChange={e => setAngle(Number(e.target.value))}/></label>
          <label>Vent <input type="range" min="0" max="30" step="1" value={speed} onChange={e => setSpeed(Number(e.target.value))}/></label>
        </div>
      )}
      <div className="wind-results">
        <div><span>Face</span><strong>{values.head.toFixed(1)} kt</strong><i style={{ width: Math.min(100, Math.abs(values.head) / 30 * 100) + "%" }}/></div>
        <div><span>Travers</span><strong>{values.cross.toFixed(1)} kt</strong><i style={{ width: Math.min(100, values.cross / 30 * 100) + "%" }}/></div>
      </div>
      <p className="microcopy">Calcul trigonométrique : face ≈ V·cos(θ), travers ≈ V·sin(θ). Pour l’exploitation réelle, appliquer les limitations et méthodes de l’avion/école.</p>
    </section>
  );
}


type CalcProblem = {
  prompt: string;
  answer: number;
  unit: string;
  tolerance: number;
  explanation: string;
};

function makeCalcProblem(): CalcProblem {
  const pick = Math.floor(Math.random() * 3);
  if (pick === 0) {
    const cm = [2, 3, 4, 6, 8, 10][Math.floor(Math.random() * 6)];
    return {
      prompt: "Carte 1:500 000 : " + cm + " cm représentent combien de kilomètres ?",
      answer: cm * 5,
      unit: "km",
      tolerance: 0.1,
      explanation: "À 1:500 000, 1 cm représente 5 km. On multiplie donc la distance carte par 5."
    };
  }
  if (pick === 1) {
    const distance = [30, 45, 60, 75, 90][Math.floor(Math.random() * 5)];
    const gs = [90, 100, 120, 150][Math.floor(Math.random() * 4)];
    return {
      prompt: distance + " NM à " + gs + " kt de vitesse sol : quel temps de vol en minutes ?",
      answer: distance / gs * 60,
      unit: "min",
      tolerance: 0.6,
      explanation: "Temps (min) = distance / vitesse sol × 60."
    };
  }
  const angle = [30, 45, 60][Math.floor(Math.random() * 3)];
  const n = 1 / Math.cos(angle * Math.PI / 180);
  return {
    prompt: "Virage en palier à " + angle + "° : quel facteur de charge approximatif ?",
    answer: n,
    unit: "g",
    tolerance: 0.08,
    explanation: "En virage coordonné en palier, n ≈ 1 / cos(φ)."
  };
}

export function CalculationTrainer() {
  const [problem, setProblem] = useState<CalcProblem>(() => makeCalcProblem());
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState<"good" | "bad" | null>(null);
  const [score, setScore] = useState(0);

  const verify = () => {
    const number = Number(value.replace(",", "."));
    if (!Number.isFinite(number)) return;
    const good = Math.abs(number - problem.answer) <= problem.tolerance;
    setChecked(good ? "good" : "bad");
    if (good) setScore(current => current + 1);
  };

  const next = () => {
    setProblem(makeCalcProblem());
    setValue("");
    setChecked(null);
  };

  return (
    <section className="lab-card">
      <div className="lab-title">
        <div><span className="eyebrow">Calcul trainer</span><h3>Calcul mental PPL</h3></div>
        <span className="score-pill">{score} ✓</span>
      </div>
      <p className="lab-prompt">{problem.prompt}</p>
      <div className="calc-input-row">
        <input
          inputMode="decimal"
          value={value}
          onChange={event => setValue(event.target.value)}
          onKeyDown={event => { if (event.key === "Enter") verify(); }}
          placeholder="Ta réponse"
          disabled={checked !== null}
        />
        <span>{problem.unit}</span>
        <button className="button primary" onClick={checked ? next : verify}>{checked ? "Suivant" : "Vérifier"}</button>
      </div>
      {checked && (
        <div className={"feedback " + checked}>
          <strong>{checked === "good" ? "Correct" : "À recalculer"}</strong>
          <p>Réponse : {problem.answer.toFixed(problem.unit === "g" ? 2 : 1)} {problem.unit}. {problem.explanation}</p>
        </div>
      )}
    </section>
  );
}
