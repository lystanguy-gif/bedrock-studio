import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, Mic, MicOff, Search, Loader2, ExternalLink, AlertTriangle,
  HelpCircle, XCircle, CheckCircle2, Video, VideoOff, ImagePlus, X,
  MessageSquare, Lock, Globe, ArrowRight, RotateCcw, Send, Hand, Flag, BookOpen, ChevronDown,
  LogIn, LogOut, UserPlus, ArrowLeft, Loader2 as Spinner
} from "lucide-react";
import { loadKnowledgeBase, scanForFiches } from "./lib/knowledgeBase.js";
import { supabase, isSupabaseConfigured } from "./lib/supabaseClient.js";

const C = {
  bg: "#08090b", panel: "#111318", panel2: "#171a21", line: "#30343d",
  text: "#eee8dd", mute: "#a9a59d", gold: "#b08a4a", pill: "#12151b",
  red: "#8d2b2b", blue: "#254f83", green: "#2e6a44", greyblue: "#536878",
  field: "#0c0e12",
};
const CAMP = [C.red, C.blue];
const STATUS = {
  correct:           { label: "Plausible",        color: C.green,     Icon: CheckCircle2 },
  a_nuancer:         { label: "À nuancer",         color: C.gold,      Icon: AlertTriangle },
  verifiable:        { label: "À vérifier",        color: C.greyblue,  Icon: HelpCircle },
  douteux:           { label: "Douteux",           color: "#9a6b3a",   Icon: AlertTriangle },
  probablement_faux: { label: "Probablement faux", color: C.red,       Icon: XCircle },
};
const BANNED = ["connard","conard","connasse","pute","salope","encule","enculé","enculer",
  "ntm","fdp","tg","ta gueule","pd","pédé","batard","bâtard","nègre","bougnoule","pétasse"];

const fmt = (s) => (s < 0 ? "-" : "") + String(Math.floor(Math.abs(s) / 60)).padStart(2, "0") + ":" + String(Math.abs(s) % 60).padStart(2, "0");
const other = (i) => (i === 0 ? 1 : 0);
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Inter, Arial, system-ui, sans-serif";

const cardStyle = { background: C.panel, border: "1px solid " + C.line, borderRadius: 18 };
const fieldStyle = { background: C.field, border: "1px solid " + C.line, color: C.text, borderRadius: 14 };

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [view, setView] = useState("home"); // home | auth | debate

  useEffect(() => {
    if (!isSupabaseConfigured) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Shell>
      {view === "auth" ? (
        <AuthScreen onBack={() => setView("home")} onDone={() => setView("home")} />
      ) : view === "debate" ? (
        <DebateApp onHome={() => setView("home")} />
      ) : (
        <Home
          session={session}
          authReady={authReady}
          onCreate={() => setView(session ? "debate" : "auth")}
          onSignIn={() => setView("auth")}
        />
      )}
    </Shell>
  );
}

// Le flux de débat existant (configuration + direct), inchangé visuellement.
function DebateApp({ onHome }) {
  const [phase, setPhase] = useState("setup");
  const [cfg, setCfg] = useState({
    panel: "Le contrechamp", topic: "L'État doit-il encadrer les prix de l'énergie ?",
    camps: ["Pour", "Contre"], minutes: 5, visibility: "prive", comments: true,
  });
  return phase === "setup"
    ? <Setup cfg={cfg} setCfg={setCfg} onStart={() => setPhase("live")} onHome={onHome} />
    : <Live cfg={cfg} onBack={() => setPhase("setup")} />;
}

// Pseudo affichable d'une session (métadonnée "pseudo" sinon début de l'email).
function pseudoOf(session) {
  if (!session?.user) return null;
  return session.user.user_metadata?.pseudo || (session.user.email || "").split("@")[0] || "Compte";
}

/* ----------------------------- ACCUEIL ----------------------------- */
function Home({ session, authReady, onCreate, onSignIn }) {
  const pseudo = pseudoOf(session);
  const accountRight = !authReady ? null : (session ? (
    <div className="flex items-center gap-2">
      <span style={{ color: C.mute, fontSize: 13 }}>Bonjour, <strong style={{ color: C.text }}>{pseudo}</strong></span>
      <button onClick={() => supabase.auth.signOut()} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 12px", fontSize: 12 }}><LogOut size={13} /> Déconnexion</button>
    </div>
  ) : (
    <button onClick={onSignIn} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 14px", fontSize: 12 }}><LogIn size={13} /> Se connecter</button>
  ));
  return (
    <>
      <Header right={accountRight} />
      <div className="mx-auto" style={{ maxWidth: 1180, padding: "48px 18px 60px" }}>
        <Kicker>Régie de débat</Kicker>
        <h1 className="uppercase" style={{ fontFamily: SERIF, fontSize: "clamp(40px,8vw,76px)", lineHeight: 0.92, margin: "10px 0 14px", fontWeight: 700 }}>Le contrechamp</h1>
        <p style={{ color: C.mute, maxWidth: 720, lineHeight: 1.6, marginBottom: 36 }}>
          Deux camps, face à face. Le champ et le contrechamp. Pour regarder, c'est libre. Pour participer ou héberger, un compte suffit.
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={onCreate} className="inline-flex items-center gap-2 uppercase" style={{ borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "13px 26px", fontWeight: 700, letterSpacing: "0.12em", fontSize: 13, cursor: "pointer" }}>
            Créer un débat <ArrowRight size={16} />
          </button>
          <button disabled className="inline-flex items-center gap-2 uppercase" style={{ borderRadius: 999, background: C.pill, color: "#6f6b63", border: "1px solid " + C.line, padding: "13px 26px", fontWeight: 700, letterSpacing: "0.12em", fontSize: 13, cursor: "default" }}>
            Rejoindre un débat · bientôt
          </button>
        </div>
        {authReady && !session && <p style={{ color: "#6f6b63", fontSize: 12, marginTop: 16 }}>Créer un débat nécessite un compte (gratuit, rapide).</p>}
        {!isSupabaseConfigured && <p style={{ color: C.gold, fontSize: 12, marginTop: 16 }}>⚠️ Connexion à la base non configurée sur ce site (variables d'environnement manquantes).</p>}
      </div>
      <Footer />
    </>
  );
}

/* ----------------------------- COMPTES ----------------------------- */
function traduireErreur(msg) {
  const m = (msg || "").toLowerCase();
  if (m.includes("invalid login")) return "Email ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Email pas encore confirmé. Vérifie ta boîte mail.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Un compte existe déjà avec cet email.";
  if (m.includes("password should be")) return "Mot de passe trop court (6 caractères minimum).";
  if (m.includes("is invalid")) return "Cette adresse email semble invalide.";
  return msg || "Une erreur est survenue.";
}

function AuthScreen({ onBack, onDone }) {
  const [mode, setMode] = useState("signup"); // signup | signin
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit() {
    setError(""); setInfo("");
    if (!isSupabaseConfigured) { setError("La connexion n'est pas configurée sur ce site."); return; }
    if (!email.trim() || !password) { setError("Email et mot de passe requis."); return; }
    if (mode === "signup" && !pseudo.trim()) { setError("Choisis un pseudo."); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { pseudo: pseudo.trim() } } });
        if (error) setError(traduireErreur(error.message));
        else if (!data.session) { setInfo("Compte créé ! Vérifie ta boîte mail pour confirmer, puis connecte-toi."); setMode("signin"); }
        else onDone();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setError(traduireErreur(error.message));
        else onDone();
      }
    } finally { setBusy(false); }
  }

  const back = <button onClick={onBack} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 12px", fontSize: 12, color: C.mute }}><ArrowLeft size={13} /> Accueil</button>;
  return (
    <>
      <Header right={back} />
      <div className="mx-auto" style={{ maxWidth: 1180, padding: "48px 18px 60px" }}>
        <Kicker>Ton compte</Kicker>
        <h1 className="uppercase" style={{ fontFamily: SERIF, fontSize: "clamp(32px,6vw,56px)", lineHeight: 0.95, margin: "10px 0 24px", fontWeight: 700 }}>
          {mode === "signup" ? "Créer un compte" : "Se connecter"}
        </h1>

        <div style={{ ...cardStyle, padding: 24, maxWidth: 460 }}>
          <div className="flex gap-2" style={{ marginBottom: 20 }}>
            <Toggle on={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }} icon={<UserPlus size={14} />} label="Créer un compte" />
            <Toggle on={mode === "signin"} onClick={() => { setMode("signin"); setError(""); }} icon={<LogIn size={14} />} label="Se connecter" />
          </div>

          {mode === "signup" && (<>
            <Label>Pseudo</Label>
            <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Ton nom affiché" className="w-full" style={{ ...fieldStyle, padding: "10px 14px", marginBottom: 16 }} />
          </>)}
          <Label>Email</Label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="toi@email.fr" className="w-full" style={{ ...fieldStyle, padding: "10px 14px", marginBottom: 16 }} />
          <Label>Mot de passe</Label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="6 caractères minimum" onKeyDown={(e) => e.key === "Enter" && submit()} className="w-full" style={{ ...fieldStyle, padding: "10px 14px", marginBottom: 18 }} />

          {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          {info && <div style={{ color: C.green, fontSize: 13, marginBottom: 12 }}>{info}</div>}

          <button onClick={submit} disabled={busy} className="inline-flex items-center justify-center gap-2 uppercase w-full" style={{ borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "13px 26px", fontWeight: 700, letterSpacing: "0.1em", fontSize: 13, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
            {busy ? <Spinner size={15} className="spin" /> : (mode === "signup" ? <UserPlus size={15} /> : <LogIn size={15} />)}
            {mode === "signup" ? "Créer mon compte" : "Me connecter"}
          </button>
        </div>
        <p style={{ color: "#6f6b63", fontSize: 12, marginTop: 16 }}>Pour regarder un débat, aucun compte n'est nécessaire. Le compte sert à écrire, participer et héberger.</p>
      </div>
      <Footer />
    </>
  );
}

/* ----------------------------- SETUP ----------------------------- */
function Setup({ cfg, setCfg, onStart, onHome }) {
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  return (
    <>
      <Header right={onHome ? <button onClick={onHome} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 12px", fontSize: 12, color: C.mute }}><ArrowLeft size={13} /> Accueil</button> : null} />
      <div className="mx-auto" style={{ maxWidth: 1180, padding: "48px 18px 60px" }}>
        <Kicker>Régie de débat</Kicker>
        <h1 className="uppercase" style={{ fontFamily: SERIF, fontSize: "clamp(40px,8vw,76px)", lineHeight: 0.92, margin: "10px 0 14px", fontWeight: 700 }}>
          Ouvrir un panel
        </h1>
        <p style={{ color: C.mute, maxWidth: 720, lineHeight: 1.6, marginBottom: 36 }}>
          Deux camps, face à face. Le champ et le contrechamp. La vérification au centre, comme l'arbitre du débat.
        </p>

        <div style={{ ...cardStyle, padding: 24, maxWidth: 720 }}>
          <Label>Nom du panel</Label>
          <input value={cfg.panel} onChange={(e) => set("panel", e.target.value)} className="w-full" style={{ ...fieldStyle, padding: "10px 14px", marginBottom: 18 }} />
          <Label>Sujet du débat</Label>
          <input value={cfg.topic} onChange={(e) => set("topic", e.target.value)} className="w-full" style={{ ...fieldStyle, padding: "10px 14px", marginBottom: 18 }} />
          <div className="flex gap-4" style={{ marginBottom: 18 }}>
            {[0, 1].map((i) => (
              <div key={i} className="flex-1">
                <Label><span style={{ color: CAMP[i] }}>●</span> Camp {i + 1}</Label>
                <input value={cfg.camps[i]} onChange={(e) => set("camps", cfg.camps.map((x, k) => k === i ? e.target.value : x))} className="w-full" style={{ ...fieldStyle, padding: "10px 14px" }} />
              </div>
            ))}
          </div>
          <Label>Temps de parole par camp (minutes)</Label>
          <input type="number" min={1} max={60} value={cfg.minutes} onChange={(e) => set("minutes", Math.max(1, Math.min(60, Number(e.target.value) || 1)))} style={{ ...fieldStyle, padding: "10px 14px", width: 120, marginBottom: 22 }} />

          <Label>Visibilité</Label>
          <div className="flex gap-3" style={{ marginBottom: 16 }}>
            <Toggle on={cfg.visibility === "prive"} onClick={() => set("visibility", "prive")} icon={<Lock size={14} />} label="Privé — sur invitation" />
            <Toggle on={cfg.visibility === "public"} onClick={() => set("visibility", "public")} icon={<Globe size={14} />} label="Public — libre d'accès" />
          </div>
          <Toggle on={cfg.comments} onClick={() => set("comments", !cfg.comments)} icon={<MessageSquare size={14} />} label={cfg.comments ? "Commentaires des spectateurs autorisés" : "Commentaires bloqués"} wide />
        </div>

        <button onClick={onStart} className="inline-flex items-center gap-2 uppercase" style={{ marginTop: 26, borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "13px 26px", fontWeight: 700, letterSpacing: "0.12em", fontSize: 13, cursor: "pointer" }}>
          Ouvrir le débat <ArrowRight size={16} />
        </button>
        <p style={{ color: "#6f6b63", fontSize: 12, marginTop: 16 }}>
          Maquette une-fenêtre. Codes de salle, salons audio par camp et comptes arriveront avec la version serveur.
        </p>
      </div>
      <Footer />
    </>
  );
}

/* ----------------------------- LIVE ----------------------------- */
function Live({ cfg, onBack }) {
  const [floor, setFloor] = useState(null);
  const [clockRunning, setClockRunning] = useState(false);
  const [pending, setPending] = useState(null);
  const [request, setRequest] = useState(null);
  const [remaining, setRemaining] = useState([cfg.minutes * 60, cfg.minutes * 60]);
  const [micOn, setMicOn] = useState(false);
  const [segments, setSegments] = useState([]);
  const [interim, setInterim] = useState("");
  const [micError, setMicError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [manual, setManual] = useState("");
  const [images, setImages] = useState([[], []]);
  const [camOwner, setCamOwner] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState("");
  const [cError, setCError] = useState("");
  const [kbHits, setKbHits] = useState([]);
  const [kbReady, setKbReady] = useState(false);
  const [kbOpen, setKbOpen] = useState({});

  const kbRef = useRef(null), kbSeenRef = useRef(new Set());

  const recRef = useRef(null), wantRef = useRef(false), busyRef = useRef(false);
  const lastLenRef = useRef(0), floorRef = useRef(null), joinedRef = useRef("");
  const camStreamRef = useRef(null), vidRefs = [useRef(null), useRef(null)];

  useEffect(() => { floorRef.current = floor; }, [floor]);
  useEffect(() => { busyRef.current = analyzing; }, [analyzing]);
  useEffect(() => { joinedRef.current = segments.map((s) => s.text).join(" "); }, [segments]);

  // Base documentaire locale : chargée une fois.
  useEffect(() => { loadKnowledgeBase().then((kb) => { kbRef.current = kb; setKbReady(true); }).catch(() => {}); }, []);
  // À chaque évolution de la transcription, on repère les fiches dont un mot-clé
  // est prononcé, et on ajoute les nouvelles en haut de la liste.
  useEffect(() => {
    if (!kbRef.current) return;
    const found = scanForFiches(kbRef.current, joinedRef.current);
    const fresh = found.filter(({ fiche }) => !kbSeenRef.current.has(fiche.id));
    if (!fresh.length) return;
    const side = floorRef.current ?? 0;
    const stamp = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    fresh.forEach(({ fiche }) => kbSeenRef.current.add(fiche.id));
    setKbHits((p) => [...fresh.map(({ fiche, matched }) => ({ fiche, matched, side, stamp })), ...p].slice(0, 40));
  }, [segments, kbReady]);

  useEffect(() => {
    if (!clockRunning || floor === null) return;
    const id = setInterval(() => setRemaining((r) => { const n = [...r]; n[floorRef.current] -= 1; return n; }), 1000);
    return () => clearInterval(id);
  }, [clockRunning, floor]);

  const launch = () => { setFloor(0); setClockRunning(true); setPending(null); setRequest(null); };
  const cede = () => { stopMic(); setClockRunning(false); setPending(other(floor)); setRequest(null); };
  const accept = () => { stopMic(); setFloor(pending); setPending(null); setRequest(null); setClockRunning(true); };
  const askFloor = (i) => setRequest(i);
  const reset = () => { stopMic(); setFloor(null); setClockRunning(false); setPending(null); setRequest(null); setRemaining([cfg.minutes * 60, cfg.minutes * 60]); kbSeenRef.current = new Set(); setKbHits([]); };

  const analyze = useCallback(async (raw, withWeb = true) => {
    const chunk = (raw || "").trim().slice(-2000);
    if (chunk.length < 10 || busyRef.current) return;
    setAnalyzing(true); lastLenRef.current = joinedRef.current.length;
    const side = floorRef.current ?? 0;
    const prompt =
`Assistant de fact-checking d'un débat oral. Extrait récent (français) :
"""${chunk}"""
Repère jusqu'à 3 affirmations factuelles, chiffres, citations ou raisonnements à vérifier ou nuancer. Ignore les pures opinions.${withWeb ? " Utilise la recherche web pour vérifier et citer des sources." : ""}
Réponds UNIQUEMENT par un tableau JSON, sans texte ni backticks :
[{"claim":"reformulation courte","statut":"correct|a_nuancer|verifiable|douteux|probablement_faux","note":"une phrase max 200 car.","sources":[{"titre":"source","url":"https://..."}]}]
Rien à vérifier -> []. sources peut être vide.`;
    try {
      const body = { model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: prompt }] };
      if (withWeb) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("http");
      const data = await res.json();
      const text = (data.content || []).map((b) => b.type === "text" ? b.text : "").filter(Boolean).join("\n");
      const a = text.indexOf("["), b = text.lastIndexOf("]");
      const arr = (a !== -1 && b !== -1) ? JSON.parse(text.slice(a, b + 1)) : [];
      const stamp = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      const items = (Array.isArray(arr) ? arr : []).map((it, k) => ({
        id: Date.now() + "-" + k, side, stamp, claim: it.claim || "",
        statut: STATUS[it.statut] ? it.statut : "verifiable", note: it.note || "",
        sources: Array.isArray(it.sources) ? it.sources : [],
      }));
      if (items.length) setSuggestions((p) => [...items, ...p].slice(0, 40));
      setAnalyzing(false);
    } catch (e) {
      setAnalyzing(false);
      if (withWeb) { analyze(raw, false); return; }
      setSuggestions((p) => [{ id: Date.now() + "-e", error: true, note: "Vérification indisponible là, réessaie dans un instant." }, ...p].slice(0, 40));
    }
  }, []);

  useEffect(() => {
    if (!micOn) return;
    const id = setInterval(() => { const t = joinedRef.current; if (t.length - lastLenRef.current > 90 && !busyRef.current) analyze(t); }, 16000);
    return () => clearInterval(id);
  }, [micOn, analyze]);

  function appendSpeech(txt) {
    setSegments((prev) => {
      const side = floorRef.current ?? 0;
      if (prev.length && prev[prev.length - 1].side === side) {
        const c = [...prev]; c[c.length - 1] = { side, text: (c[c.length - 1].text + " " + txt).trim() }; return c;
      }
      return [...prev, { side, text: txt.trim() }];
    });
  }
  function startMic() {
    if (floor === null) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicError("Reconnaissance vocale non gérée ici. Utilise Chrome, ou la saisie en bas."); return; }
    setMicError(null);
    const rec = new SR(); rec.lang = "fr-FR"; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (ev) => {
      let fin = "", itm = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) ev.results[i].isFinal ? (fin += ev.results[i][0].transcript) : (itm += ev.results[i][0].transcript);
      if (fin) appendSpeech(fin.trim()); setInterim(itm);
    };
    rec.onerror = (ev) => { if (ev.error === "not-allowed" || ev.error === "service-not-allowed") { setMicError("Micro bloqué dans l'aperçu intégré. Ouvre la maquette dans son onglet, ou saisis en bas."); wantRef.current = false; setMicOn(false); } };
    rec.onend = () => { if (wantRef.current) { try { rec.start(); } catch (e) {} } else setMicOn(false); };
    recRef.current = rec; wantRef.current = true;
    try { rec.start(); setMicOn(true); } catch (e) {}
  }
  function stopMic() { wantRef.current = false; try { recRef.current && recRef.current.stop(); } catch (e) {} setMicOn(false); setInterim(""); }

  async function toggleCam(i) {
    if (camOwner === i) { camStreamRef.current && camStreamRef.current.getTracks().forEach((t) => t.stop()); camStreamRef.current = null; setCamOwner(null); return; }
    try {
      camStreamRef.current && camStreamRef.current.getTracks().forEach((t) => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      camStreamRef.current = s; setCamOwner(i);
    } catch (e) { setMicError("Caméra bloquée dans l'aperçu intégré. Ouvre la maquette dans son onglet."); }
  }
  useEffect(() => { if (camOwner !== null && vidRefs[camOwner].current && camStreamRef.current) vidRefs[camOwner].current.srcObject = camStreamRef.current; }, [camOwner]);
  useEffect(() => () => { wantRef.current = false; try { recRef.current && recRef.current.stop(); } catch (e) {} camStreamRef.current && camStreamRef.current.getTracks().forEach((t) => t.stop()); }, []);

  function addImages(i, files) {
    // Sur iPhone, le "type" du fichier est souvent vide : on accepte alors le
    // fichier quand même (le champ est déjà limité aux images via accept).
    const urls = Array.from(files).filter((f) => !f.type || f.type.startsWith("image/")).map((f) => URL.createObjectURL(f));
    setImages((im) => im.map((arr, k) => k === i ? [...arr, ...urls] : arr));
  }
  function postComment() {
    const v = draft.trim(); if (!v || !cfg.comments) return;
    const low = " " + v.toLowerCase().replace(/[^a-zàâçéèêëîïôûùü\s]/g, " ") + " ";
    if (BANNED.some((w) => low.includes(" " + w + " ") || low.includes(" " + w))) { setCError("Commentaire bloqué : langage interdit."); return; }
    setCError(""); setComments((c) => [{ id: Date.now(), txt: v, t: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }, ...c]); setDraft("");
  }

  // Le composant Camp est défini au niveau module (voir plus bas), pour ne
  // PAS se reconstruire à chaque rendu (sinon la vidéo clignote). On lui passe
  // l'état nécessaire en props.
  const campProps = { floor, pending, clockRunning, request, cfg, camOwner, vidRefs, camStreamRef, remaining, micOn, startMic, stopMic, cede, accept, askFloor, toggleCam, images, setImages, setLightbox, addImages };

  const bannerStatus = floor === null ? "Le modérateur lance le débat"
    : clockRunning ? "au temps de parole"
    : pending !== null ? "parole cédée — " + cfg.camps[pending] + " doit accepter"
    : "en pause";

  const headerRight = (
    <div className="flex items-center gap-2">
      {floor === null
        ? <button onClick={launch} className="inline-flex items-center gap-1.5 uppercase" style={{ borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "8px 16px", fontWeight: 700, letterSpacing: "0.1em", fontSize: 12, cursor: "pointer" }}><Flag size={13} /> Lancer</button>
        : <button onClick={() => pending === null && setClockRunning((r) => !r)} className="pill inline-flex items-center gap-1.5" style={{ padding: "8px 14px", fontSize: 13, opacity: pending === null ? 1 : 0.5 }}>{clockRunning ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Reprendre</>}</button>}
      <button onClick={reset} className="pill" style={{ padding: "8px 10px" }} title="Réinitialiser"><RotateCcw size={13} /></button>
      <button onClick={onBack} className="pill" style={{ padding: "8px 12px", fontSize: 12, color: C.mute }}>Réglages</button>
    </div>
  );

  return (
    <>
      <Header right={headerRight} />
      <div className="mx-auto" style={{ maxWidth: 1180, padding: "22px 18px 0" }}>
        <Kicker>{cfg.panel} · {cfg.visibility === "public" ? "public" : "privé"}</Kicker>
        <h2 style={{ fontFamily: SERIF, fontSize: "clamp(22px,3.4vw,32px)", lineHeight: 1.05, margin: "6px 0 18px" }}>{cfg.topic}</h2>

        <div className="flex items-center justify-between" style={{ background: C.panel2, border: "1px solid " + (floor !== null ? C.gold : C.line), borderRadius: 18, padding: "16px 22px" }}>
          <div>
            <div className="uppercase" style={{ color: floor !== null ? C.gold : "#6f6b63", letterSpacing: "0.18em", fontSize: 12, fontFamily: SERIF }}>{floor !== null ? cfg.camps[floor] : "—"}</div>
            <div style={{ color: C.mute, fontSize: 12, marginTop: 2 }}>{bannerStatus}</div>
          </div>
          <div style={{ fontFamily: SERIF, fontVariantNumeric: "tabular-nums", fontSize: 46, color: floor !== null && remaining[floor] < 0 ? C.red : floor !== null && remaining[floor] <= 15 ? C.gold : C.text }}>
            {fmt(floor !== null ? remaining[floor] : cfg.minutes * 60)}
          </div>
        </div>
      </div>

      <div className="mx-auto grid grid-cols-2 gap-3" style={{ maxWidth: 1180, padding: "14px 18px 0" }}>
        <Camp i={0} {...campProps} />
        <Camp i={1} {...campProps} />
      </div>

      {micError && <div className="mx-auto" style={{ maxWidth: 1180, padding: "14px 18px 0" }}><div style={{ background: "#1f1413", border: "1px solid " + C.red, borderRadius: 12, padding: 10, fontSize: 12, color: "#e0b3ac" }}>{micError}</div></div>}

      <div className="mx-auto grid grid-cols-1 lg:grid-cols-2 gap-3" style={{ maxWidth: 1180, padding: "14px 18px 0" }}>
        <div style={{ ...cardStyle, padding: 16, display: "flex", flexDirection: "column" }}>
          <Kicker>Retranscription complète</Kicker>
          <div className="overflow-y-auto flex flex-col gap-2" style={{ maxHeight: 230, minHeight: 120, marginTop: 10, fontSize: 14, lineHeight: 1.6 }}>
            {segments.length === 0 && <span style={{ color: "#6f6b63" }}>Tout ce qui est dit s'écrit ici, repérable par camp, et reste relisible.</span>}
            {segments.map((s, k) => (
              <div key={k}>
                <span className="uppercase" style={{ fontFamily: SERIF, color: CAMP[s.side], letterSpacing: "0.05em", fontSize: 12 }}>{cfg.camps[s.side]} · </span>
                <span style={{ color: C.text }}>{s.text}</span>
              </div>
            ))}
            {interim && <div style={{ color: C.mute }}>{interim}</div>}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="flex items-center justify-between">
            <Kicker>Vérifications</Kicker>
            <button onClick={() => analyze(joinedRef.current, true)} disabled={analyzing} className="inline-flex items-center gap-1.5 uppercase" style={{ borderRadius: 999, background: C.gold, color: C.bg, border: "1px solid " + C.gold, padding: "6px 14px", fontWeight: 700, letterSpacing: "0.08em", fontSize: 11, opacity: analyzing ? 0.6 : 1, cursor: analyzing ? "default" : "pointer" }}>
              {analyzing ? <Loader2 size={12} className="spin" /> : <Search size={12} />} Vérifier
            </button>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 180, minHeight: 80 }}>
            {suggestions.length === 0 && kbHits.length === 0 && <div style={{ color: "#6f6b63", fontSize: 12 }}>Les fiches et les points à vérifier apparaissent ici quand un terme connu est prononcé.</div>}
            {kbHits.map(({ fiche, side, stamp }) => { const open = !!kbOpen[fiche.id]; const toggle = () => setKbOpen((o) => ({ ...o, [fiche.id]: !o[fiche.id] })); return (
              <div key={fiche.id} style={{ background: C.panel2, border: "1px solid " + C.line, borderLeft: "3px solid " + C.greyblue, borderRadius: 12, padding: 10 }}>
                <div onClick={toggle} className="flex items-center justify-between cursor-pointer" style={{ gap: 8 }}>
                  <Badge color={C.greyblue}><BookOpen size={11} /> Fiche</Badge>
                  <span className="inline-flex items-center gap-1" style={{ color: "#6f6b63", fontSize: 11 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: CAMP[side] }} />{stamp}<ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} /></span>
                </div>
                <div onClick={toggle} className="cursor-pointer" style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{fiche.titre}</div>
                {open && (
                  <div style={{ marginTop: 6 }}>
                    {fiche.resume && <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{fiche.resume}</div>}
                    {fiche.reexplication && <div style={{ fontSize: 12, color: C.mute, marginTop: 6, lineHeight: 1.5 }}>{fiche.reexplication}</div>}
                    {Array.isArray(fiche.pointsCles) && fiche.pointsCles.length > 0 && (
                      <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 12, color: C.text, lineHeight: 1.6 }}>
                        {fiche.pointsCles.map((pt, k) => <li key={k}>{pt}</li>)}
                      </ul>
                    )}
                    {fiche.dossierLabel && <div className="inline-flex items-center gap-1" style={{ fontSize: 12, color: C.gold, marginTop: 6 }}><BookOpen size={11} /> {fiche.dossierLabel}</div>}
                  </div>
                )}
              </div>); })}
            {suggestions.map((it) => it.error
              ? <div key={it.id} style={{ border: "1px solid " + C.red, borderRadius: 12, padding: 10, fontSize: 12, color: "#e0b3ac" }}>{it.note}</div>
              : (() => { const st = STATUS[it.statut], Ic = st.Icon; return (
                <div key={it.id} style={{ background: C.panel2, border: "1px solid " + C.line, borderLeft: "3px solid " + st.color, borderRadius: 12, padding: 10 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 4, gap: 8 }}>
                    <Badge color={st.color}><Ic size={11} /> {st.label}</Badge>
                    <span className="inline-flex items-center gap-1" style={{ color: "#6f6b63", fontSize: 11 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: CAMP[it.side] }} />{it.stamp}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{it.claim}</div>
                  {it.note && <div style={{ fontSize: 12, color: C.mute, marginTop: 2 }}>{it.note}</div>}
                  {it.sources && it.sources.map((s, k) => (<a key={k} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 truncate" style={{ fontSize: 12, color: C.gold, marginTop: 4 }}><ExternalLink size={11} /> {s.titre || s.url}</a>))}
                </div>); })())}
          </div>
          <div className="flex items-end gap-2">
            <textarea value={manual} onChange={(e) => setManual(e.target.value)} rows={2} placeholder="Saisie manuelle (ou phrase de l'adversaire)…" className="flex-1" style={{ ...fieldStyle, padding: "8px 12px", fontSize: 14, resize: "none" }} />
            <button onClick={() => { if (manual.trim()) { appendSpeech(manual.trim()); analyze(manual, true); setManual(""); } }} className="pill inline-flex items-center" style={{ padding: "9px 13px" }}><Send size={14} /></button>
          </div>
        </div>
      </div>

      <div className="mx-auto" style={{ maxWidth: 1180, padding: "14px 18px 0" }}>
        <div style={{ ...cardStyle, padding: 18 }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
            <MessageSquare size={14} color={C.gold} />
            <span className="uppercase" style={{ fontFamily: SERIF, fontSize: 13, letterSpacing: "0.08em" }}>Spectateurs</span>
            <span style={{ color: "#6f6b63", fontSize: 12 }}>{cfg.visibility === "public" ? "panel public · " : "panel privé · "}{cfg.comments ? "commentaires ouverts · filtre de mots actif" : "commentaires bloqués"}</span>
          </div>
          {cfg.comments ? (
            <>
              <div className="flex gap-2" style={{ marginBottom: 8 }}>
                <input value={draft} onChange={(e) => { setDraft(e.target.value); setCError(""); }} onKeyDown={(e) => e.key === "Enter" && postComment()} placeholder="Écrire un commentaire…" className="flex-1" style={{ ...fieldStyle, padding: "9px 13px", fontSize: 14 }} />
                <button onClick={postComment} className="pill inline-flex items-center" style={{ padding: "9px 13px" }}><Send size={14} /></button>
              </div>
              {cError && <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{cError}</div>}
              <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 120 }}>
                {comments.length === 0 && <div style={{ color: "#6f6b63", fontSize: 12 }}>Les commentaires s'afficheront ici. Les mots interdits sont refusés. (Les vrais spectateurs à distance arrivent en v2.)</div>}
                {comments.map((c) => (<div key={c.id} className="flex gap-2" style={{ fontSize: 14 }}><span style={{ color: "#6f6b63" }}>{c.t}</span><span>{c.txt}</span></div>))}
              </div>
            </>
          ) : <div style={{ color: "#6f6b63", fontSize: 12 }}>Les commentaires sont désactivés pour ce panel.</div>}
        </div>
      </div>

      <Footer />

      {lightbox && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 flex items-center justify-center" style={{ background: "rgba(2,3,4,0.94)", zIndex: 50, padding: 24, cursor: "pointer" }}>
          <button className="absolute inline-flex items-center justify-center" style={{ top: 18, right: 18, width: 40, height: 40, borderRadius: 999, background: C.pill, border: "1px solid " + C.line, cursor: "pointer", color: C.text }}><X size={18} /></button>
          <img src={lightbox} alt="" style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: 12 }} />
        </div>
      )}
    </>
  );
}

/* --------------------------- CAMP (stable) --------------------------- */
// Défini au niveau module pour conserver son identité entre les rendus :
// ainsi React ne remonte pas l'élément vidéo (plus de clignotement caméra).
function Camp({ i, floor, pending, clockRunning, request, cfg, camOwner, vidRefs, camStreamRef, remaining, micOn, startMic, stopMic, cede, accept, askFloor, toggleCam, images, setImages, setLightbox, addImages }) {
  const has = i === floor, isPending = pending === i, started = floor !== null;
  return (
    <div className="flex flex-col gap-2.5" style={{ background: has ? C.panel2 : C.panel, border: "1px solid " + (has ? C.gold : C.line), borderRadius: 18, padding: 14, boxShadow: has ? "0 16px 44px -26px " + C.gold : "none", transition: "border-color .15s,box-shadow .15s" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span style={{ width: 10, height: 10, borderRadius: 3, background: CAMP[i] }} />
          <span className="truncate uppercase" style={{ fontFamily: SERIF, fontSize: 16, letterSpacing: "0.06em" }}>{cfg.camps[i]}</span>
        </div>
        {has && <Badge color={C.gold}>{clockRunning ? "parole" : "pause"}</Badge>}
        {request === i && !has && <Badge color={C.gold}><Hand size={10} /> demande</Badge>}
      </div>

      <div className="overflow-hidden flex items-center justify-center" style={{ background: C.field, border: "1px solid " + C.line, borderRadius: 12, aspectRatio: "16/10" }}>
        {camOwner === i ? <video ref={(el) => { vidRefs[i].current = el; if (el && camStreamRef.current && el.srcObject !== camStreamRef.current) el.srcObject = camStreamRef.current; }} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} /> : <span style={{ color: "#6f6b63", fontSize: 12 }}>caméra éteinte</span>}
      </div>

      <div className="text-center" style={{ fontFamily: SERIF, fontVariantNumeric: "tabular-nums", fontSize: 30, color: remaining[i] < 0 ? C.red : C.text }}>{fmt(remaining[i])}</div>

      {!started ? (
        <div className="text-center" style={{ color: "#6f6b63", fontSize: 12, padding: "4px 0" }}>en attente du lancement</div>
      ) : has ? (
        <div className="flex gap-2">
          <button onClick={() => micOn ? stopMic() : startMic()} className={micOn ? "" : "pill"} style={micOn ? pillSolid(C.red) : pillBase()}>
            {micOn ? <><MicOff size={13} /> Couper le micro</> : <><Mic size={13} /> Activer le micro</>}
          </button>
          <button onClick={cede} style={pillSolid(C.gold, C.bg)}><ArrowRight size={13} /> Céder</button>
        </div>
      ) : isPending ? (
        <button onClick={accept} className="pulse" style={pillSolid(C.gold, C.bg)}><Hand size={13} /> Prendre la parole</button>
      ) : (
        <button onClick={() => askFloor(i)} disabled={request === i} className={request === i ? "" : "pill"} style={{ ...pillBase(), color: request === i ? "#6f6b63" : C.mute, cursor: request === i ? "default" : "pointer" }}>
          <Hand size={12} /> {request === i ? "demande envoyée" : "Demander la parole"}
        </button>
      )}

      <div className="flex gap-2">
        <button onClick={() => toggleCam(i)} className={camOwner === i ? "" : "pill"} style={camOwner === i ? pillSolid(CAMP[i]) : pillBase()}>
          {camOwner === i ? <Video size={12} /> : <VideoOff size={12} />} Caméra
        </button>
        <label className="pill inline-flex items-center justify-center gap-1.5 cursor-pointer" style={{ ...pillBase(), flex: 1 }}>
          <ImagePlus size={12} /> Image
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(i, e.target.files); e.target.value = ""; }} />
        </label>
      </div>

      {images[i].length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images[i].map((u, k) => (
            <div key={k} className="relative">
              <img src={u} alt="" onClick={() => setLightbox(u)} className="object-cover cursor-pointer" style={{ width: 76, height: 76, borderRadius: 10, border: "1px solid " + C.line }} />
              <button onClick={() => setImages((im) => im.map((arr, kk) => kk === i ? arr.filter((_, j) => j !== k) : arr))} className="absolute" style={{ top: -6, right: -6, borderRadius: 999, background: C.bg, border: "1px solid " + C.line, padding: 1, cursor: "pointer" }}>
                <X size={11} color={C.mute} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- UI bits ----------------------------- */
function pillBase() { return { flex: 1, borderRadius: 999, background: C.pill, border: "1px solid " + C.line, color: C.text, padding: "8px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }; }
function pillSolid(bg, fg = "#fff") { return { ...pillBase(), background: bg, color: fg, border: "1px solid " + bg }; }

function Shell({ children }) {
  return (
    <div className="app-bg" style={{ minHeight: "100vh", color: C.text, fontFamily: SANS, background: "linear-gradient(180deg,#0b0c0f,#060608)" }}>
      <style>{`
        *{box-sizing:border-box} .hidden{display:none}
        html,body{margin:0} html{scroll-behavior:smooth}
        button,input,textarea{font-family:inherit}
        button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid ${C.gold};outline-offset:2px}
        .spin{animation:s 1s linear infinite}@keyframes s{to{transform:rotate(360deg)}}
        .pulse{animation:p 1.4s ease-in-out infinite}@keyframes p{0%,100%{opacity:1}50%{opacity:.55}}
        @media (prefers-reduced-motion:reduce){.pulse,.spin{animation:none}}
        ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:${C.line};border-radius:8px}
        .pill{transition:border-color .15s,transform .15s,background .15s}
        .pill:hover{border-color:#565b67}
        .app-bg::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;
          background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);
          background-size:46px 46px;}
        .app-bg::after{content:"";position:fixed;top:-200px;left:-200px;width:700px;height:700px;z-index:0;pointer-events:none;
          background:radial-gradient(circle,rgba(150,150,160,.05),transparent 70%);}
        a{text-decoration:none}
      `}</style>
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}
function Header({ right }) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(8,9,11,0.72)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", borderBottom: "1px solid " + C.line }}>
      <div className="mx-auto flex items-center justify-between" style={{ maxWidth: 1180, padding: "12px 18px" }}>
        <span className="uppercase" style={{ fontFamily: SERIF, letterSpacing: "0.2em", fontSize: 15 }}>Le contrechamp</span>
        {right}
      </div>
    </header>
  );
}
function Footer() {
  return (
    <footer style={{ borderTop: "1px solid " + C.line, marginTop: 32 }}>
      <div className="mx-auto text-center" style={{ maxWidth: 1180, padding: "18px", color: "#6f6b63", fontSize: 12, letterSpacing: "0.04em" }}>
        Le contrechamp — régie de débat · maquette
      </div>
    </footer>
  );
}
const Kicker = ({ children }) => (<div className="uppercase" style={{ color: C.gold, fontSize: 11, letterSpacing: "0.22em", fontWeight: 700 }}>{children}</div>);
const Label = ({ children }) => (<div className="uppercase" style={{ color: C.mute, fontSize: 11, letterSpacing: "0.12em", marginBottom: 6 }}>{children}</div>);
function Badge({ children, color }) {
  return <span className="inline-flex items-center gap-1 uppercase" style={{ borderRadius: 999, border: "1px solid " + color, color, fontSize: 10, letterSpacing: "0.08em", padding: "2px 8px", fontWeight: 700 }}>{children}</span>;
}
function Toggle({ on, onClick, icon, label, wide }) {
  return (
    <button onClick={onClick} className={(wide ? "w-full justify-start" : "flex-1 justify-center") + " inline-flex items-center gap-2"} style={{ borderRadius: 999, background: on ? C.gold : C.field, color: on ? C.bg : C.mute, border: "1px solid " + (on ? C.gold : C.line), padding: "9px 14px", fontSize: 13, fontWeight: on ? 700 : 400, cursor: "pointer" }}>
      {icon} {label}
    </button>
  );
}
